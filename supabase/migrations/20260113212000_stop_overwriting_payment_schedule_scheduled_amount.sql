-- ============================================================================
-- FIX: Stop DB from overwriting payment_schedule_items.scheduled_amount to $0
-- ============================================================================
-- REPRO / ROOT CAUSE EVIDENCE:
-- - Editor computes correct amounts client-side (e.g. $102 + $98 on $200 contract).
-- - On save, the DB trigger `trg_payment_schedule_items_recalc_amount` (or a later
--   replacement) recalculates scheduled_amount based on a contract_total that can be 0
--   (due to estimate-backed pricing / proposal totals drift).
-- - That trigger overwrites scheduled_amount to 0, so reload shows $0.00.
--
-- CANONICAL RULE (per product spec):
-- - UI persists absolute `scheduled_amount` for EVERY row (fixed/percentage/remaining).
-- - DB should validate readiness at approval time, not recompute and overwrite user-entered amounts.
-- ============================================================================

BEGIN;

-- 1) Disable auto-recalc trigger that mutates scheduled_amount.
DROP TRIGGER IF EXISTS trg_payment_schedule_items_recalc_amount ON public.payment_schedule_items;

-- 2) Approval gating should NOT call recalc functions anymore; it should validate persisted scheduled_amount.
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

  -- milestone: requires schedule that totals contract value (using persisted scheduled_amount)
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

    SELECT COUNT(*), COALESCE(SUM(COALESCE(scheduled_amount, 0)), 0)
    INTO v_item_count, v_sum
    FROM public.payment_schedule_items psi
    WHERE psi.payment_schedule_id = v_ps_id
      AND psi.is_archived = false;

    IF v_item_count < 1 THEN
      RETURN false;
    END IF;

    RETURN abs(v_sum - v_contract_total) <= 0.01;
  END IF;

  -- progress_billing: require at least one SOV item
  IF v_contract_type = 'progress_billing' THEN
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
  'Validates billing config for approval. Milestones validate persisted scheduled_amount sum equals contract total (±0.01). No schedule recomputation side effects.';

-- 3) Migration-time guard: ensure no remaining trigger overwrites scheduled_amount.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgrelid = 'public.payment_schedule_items'::regclass
      AND NOT t.tgisinternal
      AND pg_get_triggerdef(t.oid) ILIKE '%recalc%'
  ) THEN
    -- Not fatal, but helps catch drift. Convert to exception if desired.
    RAISE NOTICE 'Warning: payment_schedule_items still has a trigger containing recalc in its definition. Ensure it does not overwrite scheduled_amount.';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Proof queries
-- ============================================================================
-- 1) Check persisted milestone rows for a proposal:
-- select psi.id, psi.title, psi.sort_order, psi.allocation_mode, psi.percent_of_contract,
--        psi.fixed_amount, psi.scheduled_amount, psi.is_archived, psi.updated_at
-- from public.payment_schedule_items psi
-- join public.payment_schedules ps on ps.id = psi.payment_schedule_id
-- where ps.proposal_id = '<proposal_id>'::uuid
-- order by psi.sort_order;


