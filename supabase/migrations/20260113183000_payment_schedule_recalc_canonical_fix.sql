-- ============================================================================
-- CANONICAL DB FIX: Milestone Schedule Save + Recalc (Percent + Remaining)
-- ============================================================================
-- REPRO / EVIDENCE
-- - UI writes to public.payment_schedule_items (Save milestone schedule)
-- - Trigger: trg_payment_schedule_items_recalc_amount
--   -> tg_payment_schedule_items_recalc_amount()
--   -> recalc_payment_schedule_item_amount(new.id)
-- - In some deployed DBs, recalc_payment_schedule_item_amount referenced:
--     JOIN public.scope_blocks sb ... WHERE sb.proposal_id = <proposal_id>
--   But scope_blocks does NOT have proposal_id (it uses entity_type/entity_id),
--   causing: "column sb.proposal_id does not exist"
--
-- ROOT CAUSE
-- - Incorrect join/alias in the recalc function (wrong column on scope_blocks).
-- - Additionally, the legacy recalc function used SOV totals for contract value,
--   which is incorrect for milestone contracts.
--
-- FIX OVERVIEW
-- 1) Add explicit allocation mode to payment_schedule_items:
--      allocation_mode in ('fixed','percentage','remaining')
--    This makes "Remaining" first-class and avoids relying on frontend hacks.
-- 2) Replace recalc path to recompute the ENTIRE schedule deterministically:
--      - fixed: fixed_amount authoritative
--      - percentage: scheduled_amount = round(contract_total * pct/100, 2)
--      - remaining: scheduled_amount = contract_total - sum(other scheduled_amounts)
-- 3) Contract total source of truth:
--      - If contract baseline exists for the project: use baseline current total
--      - Else: use proposal.total_amount, falling back to proposal scope items sum
-- 4) Approval gating remains enforced:
--      is_proposal_billing_ready() now validates milestone totals within 0.01
-- 5) Proof:
--      - Migration-time self-check blocks any function source containing sb.proposal_id
--      - Copy/pastable SQL validation queries included at bottom (comments)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 0: Self-check: block invalid column reference from ever shipping again
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosrc LIKE '%sb.proposal_id%'
  ) THEN
    RAISE EXCEPTION 'Found forbidden reference to sb.proposal_id in a DB function. This would break milestone saves.';
  END IF;
END $$;

-- ============================================================================
-- PART 1: payment_schedule_items allocation_mode (idempotent)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payment_schedule_items'
      AND column_name = 'allocation_mode'
  ) THEN
    ALTER TABLE public.payment_schedule_items
      ADD COLUMN allocation_mode text;
  END IF;
END $$;

-- Normalize existing data
UPDATE public.payment_schedule_items
SET allocation_mode =
  CASE
    WHEN fixed_amount IS NOT NULL THEN 'fixed'
    WHEN percent_of_contract IS NOT NULL THEN 'percentage'
    ELSE 'remaining'
  END
WHERE allocation_mode IS NULL;

-- Constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.payment_schedule_items'::regclass
      AND conname = 'payment_schedule_items_allocation_mode_check'
  ) THEN
    ALTER TABLE public.payment_schedule_items
      ADD CONSTRAINT payment_schedule_items_allocation_mode_check
      CHECK (allocation_mode IN ('fixed','percentage','remaining'));
  END IF;
END $$;

-- At most one active "remaining" per schedule (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_schedule_items_one_remaining_per_schedule
  ON public.payment_schedule_items(payment_schedule_id)
  WHERE is_archived = false AND allocation_mode = 'remaining';

-- ============================================================================
-- PART 2: Helper - proposal contract total (tenant safe)
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_proposal_contract_total(uuid);
CREATE OR REPLACE FUNCTION public.get_proposal_contract_total(p_proposal_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company_id uuid;
  v_total numeric := 0;
BEGIN
  SELECT company_id, COALESCE(total_amount, 0)
  INTO v_company_id, v_total
  FROM public.proposals
  WHERE id = p_proposal_id;

  IF v_company_id IS NULL OR NOT (v_company_id = ANY(public.authed_company_ids())) THEN
    -- Return 0 for cross-tenant or missing rows (gating will fail closed)
    RETURN 0;
  END IF;

  IF v_total > 0 THEN
    RETURN v_total;
  END IF;

  -- Fallback: sum proposal scope items (scope_blocks uses entity_type/entity_id)
  SELECT COALESCE(SUM(sbci.line_total), 0)
  INTO v_total
  FROM public.scope_block_cost_items sbci
  JOIN public.scope_blocks sb ON sb.id = sbci.scope_block_id
  WHERE sb.entity_type = 'proposal'
    AND sb.entity_id = p_proposal_id;

  RETURN COALESCE(v_total, 0);
END;
$$;

-- ============================================================================
-- PART 3: Helper - schedule contract total (baseline-aware)
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_payment_schedule_contract_total(uuid);
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
  v_total numeric := 0;
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

  -- Pre-baseline: use proposal total
  IF v_ps.proposal_id IS NOT NULL THEN
    RETURN public.get_proposal_contract_total(v_ps.proposal_id);
  END IF;

  RETURN 0;
END;
$$;

-- ============================================================================
-- PART 4: Canonical schedule recalculation (Percent + Remaining)
-- ============================================================================
DROP FUNCTION IF EXISTS public.recalc_payment_schedule_amounts(uuid);
CREATE OR REPLACE FUNCTION public.recalc_payment_schedule_amounts(p_payment_schedule_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_contract_total numeric := 0;
  v_remaining_id uuid := null;
  v_sum_others numeric := 0;
  v_remaining_value numeric := 0;
BEGIN
  v_contract_total := public.get_payment_schedule_contract_total(p_payment_schedule_id);

  -- Identify remaining row (if any)
  SELECT id INTO v_remaining_id
  FROM public.payment_schedule_items
  WHERE payment_schedule_id = p_payment_schedule_id
    AND is_archived = false
    AND allocation_mode = 'remaining'
  ORDER BY sort_order
  LIMIT 1;

  -- First pass: compute scheduled amounts for fixed + percentage (exclude remaining)
  UPDATE public.payment_schedule_items psi
  SET scheduled_amount = CASE
      WHEN psi.is_archived THEN 0
      WHEN psi.allocation_mode = 'fixed' THEN COALESCE(psi.fixed_amount, 0)
      WHEN psi.allocation_mode = 'percentage' THEN round(v_contract_total * (COALESCE(psi.percent_of_contract, 0) / 100.0), 2)
      WHEN psi.allocation_mode = 'remaining' THEN psi.scheduled_amount -- set in second pass
      ELSE psi.scheduled_amount
    END,
    updated_at = now()
  WHERE psi.payment_schedule_id = p_payment_schedule_id
    AND psi.is_archived = false
    AND (v_remaining_id IS NULL OR psi.id <> v_remaining_id);

  -- Sum others
  SELECT COALESCE(SUM(scheduled_amount), 0)
  INTO v_sum_others
  FROM public.payment_schedule_items
  WHERE payment_schedule_id = p_payment_schedule_id
    AND is_archived = false
    AND (v_remaining_id IS NULL OR id <> v_remaining_id);

  -- Second pass: remaining = contract_total - sum(others)
  IF v_remaining_id IS NOT NULL THEN
    v_remaining_value := round(v_contract_total - v_sum_others, 2);
    IF v_remaining_value < 0 THEN
      -- Don't persist negative milestone amounts; keep it at 0 and let readiness fail-closed.
      v_remaining_value := 0;
    END IF;

    UPDATE public.payment_schedule_items
    SET scheduled_amount = v_remaining_value,
        updated_at = now()
    WHERE id = v_remaining_id;
  END IF;
END;
$$;

-- Backwards compatible API (trigger calls this)
CREATE OR REPLACE FUNCTION public.recalc_payment_schedule_item_amount(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_schedule_id uuid;
BEGIN
  SELECT payment_schedule_id INTO v_schedule_id
  FROM public.payment_schedule_items
  WHERE id = p_item_id;

  IF v_schedule_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.recalc_payment_schedule_amounts(v_schedule_id);
END;
$$;

-- ============================================================================
-- PART 5: Trigger - recalc entire schedule on any relevant change
-- ============================================================================
DROP FUNCTION IF EXISTS public.tg_payment_schedule_items_recalc_schedule();
CREATE OR REPLACE FUNCTION public.tg_payment_schedule_items_recalc_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_schedule_id uuid;
BEGIN
  v_schedule_id := COALESCE(NEW.payment_schedule_id, OLD.payment_schedule_id);
  IF v_schedule_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  PERFORM public.recalc_payment_schedule_amounts(v_schedule_id);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Replace the trigger to cover allocation_mode + ordering + archive
DROP TRIGGER IF EXISTS trg_payment_schedule_items_recalc_amount ON public.payment_schedule_items;
CREATE TRIGGER trg_payment_schedule_items_recalc_amount
AFTER INSERT OR UPDATE OF percent_of_contract, fixed_amount, allocation_mode, sort_order, is_archived OR DELETE
ON public.payment_schedule_items
FOR EACH ROW
EXECUTE FUNCTION public.tg_payment_schedule_items_recalc_schedule();

-- ============================================================================
-- PART 6: Approval gating: milestone schedules must match contract total
-- ============================================================================
-- Replace function to include deterministic validation for milestone schedules.
CREATE OR REPLACE FUNCTION public.is_proposal_billing_ready(p_proposal_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_proposal public.proposals;
  v_auth_companies uuid[];
  v_contract_type text;
  v_contract_total numeric := 0;
  v_ps_id uuid;
  v_item_count int := 0;
  v_sum numeric := 0;
BEGIN
  v_auth_companies := public.authed_company_ids();

  SELECT * INTO v_proposal
  FROM public.proposals p
  WHERE p.id = p_proposal_id
    AND p.company_id = ANY(v_auth_companies);

  IF v_proposal IS NULL THEN
    RETURN false;
  END IF;

  v_contract_type := COALESCE(v_proposal.contract_type, 'fixed_price');

  -- fixed_price: always billable (baseline optional)
  IF v_contract_type = 'fixed_price' THEN
    RETURN true;
  END IF;

  -- milestone: requires schedule that totals contract value
  IF v_contract_type = 'milestone' THEN
    v_contract_total := public.get_proposal_contract_total(p_proposal_id);
    IF v_contract_total <= 0 THEN
      RETURN false;
    END IF;

    SELECT ps.id INTO v_ps_id
    FROM public.payment_schedules ps
    WHERE ps.proposal_id = p_proposal_id
    ORDER BY ps.created_at DESC
    LIMIT 1;

    IF v_ps_id IS NULL THEN
      RETURN false;
    END IF;

    -- Deterministic: ensure scheduled_amounts are up to date for percent/remaining
    PERFORM public.recalc_payment_schedule_amounts(v_ps_id);

    SELECT COUNT(*), COALESCE(SUM(scheduled_amount), 0)
    INTO v_item_count, v_sum
    FROM public.payment_schedule_items psi
    WHERE psi.payment_schedule_id = v_ps_id
      AND psi.is_archived = false;

    IF v_item_count < 1 THEN
      RETURN false;
    END IF;

    RETURN abs(v_sum - v_contract_total) <= 0.01;
  END IF;

  -- progress_billing: requires SOV readiness (existing rules elsewhere)
  IF v_contract_type = 'progress_billing' THEN
    -- Keep existing behavior: require at least one SOV item
    RETURN EXISTS (
      SELECT 1 FROM public.sov_items si
      WHERE si.proposal_id = p_proposal_id
        AND NOT COALESCE(si.is_archived, false)
    );
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.is_proposal_billing_ready(uuid) IS
  'Checks if proposal billing configuration is valid for approval. Milestone schedules must total contract value (±0.01).';

COMMIT;

-- ============================================================================
-- VALIDATION QUERIES (copy/paste into Supabase SQL editor)
-- ============================================================================
-- 1) Any DB function still referencing the invalid column
-- SELECT n.nspname, p.proname
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.prosrc LIKE '%sb.proposal_id%';
--
-- 2) Accepted/approved milestone proposals with zero schedule items
-- SELECT p.id, p.project_id, p.company_id, p.approved_at
-- FROM public.proposals p
-- WHERE p.acceptance_status = 'accepted'
--   AND p.contract_type = 'milestone'
--   AND NOT EXISTS (
--     SELECT 1
--     FROM public.payment_schedules ps
--     JOIN public.payment_schedule_items psi ON psi.payment_schedule_id = ps.id
--     WHERE ps.proposal_id = p.id AND psi.is_archived = false
--   );
--
-- 3) Milestone schedules where sum(scheduled_amount) != contract total
-- WITH contract_totals AS (
--   SELECT ps.id AS payment_schedule_id,
--          public.get_payment_schedule_contract_total(ps.id) AS contract_total
--   FROM public.payment_schedules ps
-- )
-- SELECT ps.id, ct.contract_total, SUM(psi.scheduled_amount) AS schedule_total
-- FROM public.payment_schedules ps
-- JOIN contract_totals ct ON ct.payment_schedule_id = ps.id
-- JOIN public.payment_schedule_items psi ON psi.payment_schedule_id = ps.id
-- WHERE psi.is_archived = false
-- GROUP BY ps.id, ct.contract_total
-- HAVING abs(SUM(psi.scheduled_amount) - ct.contract_total) > 0.01;
--
-- 4) Invalid mode combos (fixed with percent, remaining with percent/fixed)
-- SELECT *
-- FROM public.payment_schedule_items
-- WHERE (allocation_mode = 'fixed' AND percent_of_contract IS NOT NULL)
--    OR (allocation_mode = 'percentage' AND fixed_amount IS NOT NULL)
--    OR (allocation_mode = 'remaining' AND (fixed_amount IS NOT NULL OR percent_of_contract IS NOT NULL));


