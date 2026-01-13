-- ============================================================================
-- FIX: Proposal approval "tuple already modified" (no self-updates in triggers)
-- ============================================================================
-- REPRO / EVIDENCE
-- - Frontend approval uses RPC `approve_proposal_manual` (updates public.proposals).
-- - public.proposals has BEFORE UPDATE trigger `tg_enforce_proposal_billing_on_approval()`
--   which calls `public.is_proposal_billing_ready(NEW.id)`.
-- - Readiness path calls `public.recalc_payment_schedule_amounts(schedule_id)` which calls
--   `public.get_payment_schedule_contract_total(schedule_id)`.
-- - In the deployed function body, `get_payment_schedule_contract_total` executed:
--
--     PERFORM public.recalculate_proposal_total(v_ps.proposal_id);
--
--   which performs `UPDATE public.proposals ... WHERE id = p_proposal_id` (same row currently
--   being updated in the approval UPDATE). Postgres correctly errors:
--   "tuple to be updated was already modified by an operation triggered by the current command"
--
-- ROOT CAUSE
-- - A helper used during BEFORE UPDATE of proposals performed an UPDATE on proposals (side-effect),
--   violating the rule: triggers must only mutate NEW, never UPDATE the same row again.
--
-- FIX
-- 1) Make `get_payment_schedule_contract_total` side-effect free (read-only).
-- 2) Make `tg_enforce_proposal_billing_on_approval` and `_on_insert` compare milestone totals
--    against canonical contract total (`get_proposal_contract_total`) instead of NEW.total_amount.
-- 3) Add a migration-time self-check that forbids "UPDATE public.proposals" inside trigger helpers.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Side-effect free contract total for milestone recalc
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_payment_schedule_contract_total(p_payment_schedule_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_ps public.payment_schedules;
  v_baseline public.contract_baselines;
BEGIN
  SELECT * INTO v_ps
  FROM public.payment_schedules
  WHERE id = p_payment_schedule_id;

  IF v_ps.id IS NULL THEN
    RETURN 0;
  END IF;

  -- Prefer baseline total when present (canonical once baseline exists)
  SELECT * INTO v_baseline
  FROM public.contract_baselines cb
  WHERE cb.project_id = v_ps.project_id
  ORDER BY cb.created_at DESC
  LIMIT 1;

  IF v_baseline.id IS NOT NULL THEN
    RETURN COALESCE(v_baseline.current_contract_total,
      COALESCE(v_baseline.base_contract_total, 0) + COALESCE(v_baseline.approved_change_order_total, 0));
  END IF;

  -- Pre-baseline: read-only canonical proposal contract total (estimate-backed or proposal-backed)
  IF v_ps.proposal_id IS NOT NULL THEN
    RETURN public.get_proposal_contract_total(v_ps.proposal_id);
  END IF;

  RETURN 0;
END;
$$;

COMMENT ON FUNCTION public.get_payment_schedule_contract_total(uuid) IS
  'Returns contract total for a payment schedule. Side-effect free (no proposal updates). Pre-baseline derives from get_proposal_contract_total.';

-- ---------------------------------------------------------------------------
-- 2) Trigger helpers: compare against canonical contract total, not NEW.total_amount
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_enforce_proposal_billing_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_is_ready boolean;
  v_contract_type text;
  v_contract_total numeric := 0;
  v_milestone_total numeric;
  v_sov_total numeric;
BEGIN
  -- Only fire when acceptance_status transitions to 'accepted'
  -- or when approved_at transitions from NULL to NOT NULL
  IF (
    (OLD.acceptance_status IS DISTINCT FROM 'accepted' AND NEW.acceptance_status = 'accepted')
    OR
    (OLD.approved_at IS NULL AND NEW.approved_at IS NOT NULL)
  ) THEN
    -- Require contract_type to be set
    v_contract_type := COALESCE(NEW.contract_type, 'fixed_price');
    IF NEW.contract_type IS NULL THEN
      NEW.contract_type := 'fixed_price';
      v_contract_type := 'fixed_price';
    END IF;

    -- Canonical contract total (read-only)
    v_contract_total := public.get_proposal_contract_total(NEW.id);

    -- Check billing readiness (must be side-effect free relative to proposals row)
    v_is_ready := public.is_proposal_billing_ready(NEW.id);

    IF NOT v_is_ready THEN
      IF v_contract_type = 'milestone' THEN
        SELECT COALESCE(SUM(COALESCE(psi.scheduled_amount, 0)), 0)
        INTO v_milestone_total
        FROM public.payment_schedule_items psi
        JOIN public.payment_schedules ps ON ps.id = psi.payment_schedule_id
        WHERE ps.proposal_id = NEW.id
          AND NOT COALESCE(psi.is_archived, false);

        RAISE EXCEPTION 'Cannot approve milestone proposal: milestone sum ($%) does not equal contract total ($%). Difference: $%',
          COALESCE(v_milestone_total, 0),
          COALESCE(v_contract_total, 0),
          ABS(COALESCE(v_milestone_total, 0) - COALESCE(v_contract_total, 0))
        USING ERRCODE = 'check_violation';
      ELSIF v_contract_type IN ('sov', 'progress_billing') THEN
        SELECT COALESCE(SUM(COALESCE(si.scheduled_value, 0)), 0)
        INTO v_sov_total
        FROM public.sov_items si
        WHERE si.proposal_id = NEW.id
          AND NOT COALESCE(si.is_archived, false);

        RAISE EXCEPTION 'Cannot approve SOV proposal: SOV sum ($%) does not equal contract total ($%). Difference: $%',
          COALESCE(v_sov_total, 0),
          COALESCE(v_contract_total, 0),
          ABS(COALESCE(v_sov_total, 0) - COALESCE(v_contract_total, 0))
        USING ERRCODE = 'check_violation';
      ELSE
        RAISE EXCEPTION 'Cannot approve proposal: billing configuration incomplete for contract type "%"',
          v_contract_type
        USING ERRCODE = 'check_violation';
      END IF;
    END IF;

    -- CANONICAL: Set both flags together
    NEW.billing_readiness := 'locked';
    NEW.approved_at := COALESCE(NEW.approved_at, now());
    NEW.acceptance_status := 'accepted';

    -- Ensure billing_basis is set deterministically
    NEW.billing_basis := CASE v_contract_type
      WHEN 'sov' THEN 'sov'
      WHEN 'progress_billing' THEN 'sov'
      WHEN 'milestone' THEN 'payment_schedule'
      ELSE 'payment_schedule'
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Keep insert gating consistent (no reliance on NEW.total_amount)
CREATE OR REPLACE FUNCTION public.tg_enforce_proposal_billing_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_is_ready boolean;
BEGIN
  IF NEW.acceptance_status = 'accepted' OR NEW.approved_at IS NOT NULL OR NEW.billing_readiness = 'locked' THEN
    v_is_ready := public.is_proposal_billing_ready(NEW.id);
    IF NOT v_is_ready THEN
      RAISE EXCEPTION 'Cannot insert approved proposal: billing configuration is incomplete for contract type "%".',
        COALESCE(NEW.contract_type, 'fixed_price')
      USING ERRCODE = 'check_violation';
    END IF;
    NEW.billing_readiness := 'locked';
    NEW.approved_at := COALESCE(NEW.approved_at, now());
    NEW.acceptance_status := 'accepted';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Regression self-check: no trigger helper may UPDATE proposals
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_payment_schedule_contract_total', 'is_proposal_billing_ready', 'tg_enforce_proposal_billing_on_approval', 'tg_enforce_proposal_billing_on_insert')
      AND p.prosrc ILIKE '%update public.proposals%'
  ) THEN
    RAISE EXCEPTION 'Trigger helper contains UPDATE public.proposals. This can cause tuple self-update errors on approval.';
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Proof query snippets (manual)
-- ---------------------------------------------------------------------------
-- 1) Approve should succeed without tuple self-conflict
--    (perform via UI or RPC) and then verify:
-- SELECT acceptance_status, approved_at, billing_readiness, billing_basis
-- FROM public.proposals WHERE id = '<proposal_id>'::uuid;
--
-- 2) Baseline exists exactly once for the project:
-- SELECT COUNT(*) FROM public.contract_baselines WHERE project_id = '<project_id>'::uuid;


