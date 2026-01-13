-- ============================================================================
-- CANONICAL FIX: Proposal totals must reflect priced scope source (estimate or proposal)
-- ============================================================================
-- PROVEN ROOT CAUSE:
-- - Frontend Proposal Builder currently renders priced scope (`proposal.allItems`)
--   by reading scope blocks for the *linked estimate*:
--     scope_blocks(entity_type='estimate', entity_id=proposal.primary_estimate_id)
-- - However, the DB recalc path for milestone schedules used proposals.total_amount
--   and/or proposal-scoped scope blocks to compute contract total.
-- - Many proposals have total_amount=0 because they are estimate-sourced and do not
--   have proposal-scoped scope blocks. Result: milestone scheduled_amount recalcs to $0.
--
-- FIX:
-- 1) Make public.recalculate_proposal_total(proposal_id) compute totals from:
--    - proposal-scoped blocks if present, else
--    - the linked estimate's priced scope (primary_estimate_id)
-- 2) Update scope_item triggers to keep proposal totals in sync when:
--    - proposal-scoped items change, OR
--    - estimate-scoped items change (updates all proposals referencing that estimate)
-- 3) Ensure get_proposal_contract_total follows the same source-of-truth logic
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Canonical contract total helper (read-only, tenant-safe)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_proposal_contract_total(p_proposal_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_proposal public.proposals;
  v_total numeric := 0;
  v_has_proposal_blocks boolean := false;
BEGIN
  SELECT * INTO v_proposal
  FROM public.proposals p
  WHERE p.id = p_proposal_id
    AND p.company_id = ANY(public.authed_company_ids());

  IF v_proposal.id IS NULL THEN
    RETURN 0;
  END IF;

  -- Prefer stored total_amount if present and non-zero (fast path)
  IF COALESCE(v_proposal.total_amount, 0) > 0 THEN
    RETURN v_proposal.total_amount;
  END IF;

  -- If proposal has its own scope blocks, sum them
  SELECT EXISTS (
    SELECT 1 FROM public.scope_blocks sb
    WHERE sb.entity_type = 'proposal'
      AND sb.entity_id = p_proposal_id
  ) INTO v_has_proposal_blocks;

  IF v_has_proposal_blocks THEN
    SELECT COALESCE(SUM(sbci.line_total), 0)
    INTO v_total
    FROM public.scope_blocks sb
    JOIN public.scope_block_cost_items sbci ON sbci.scope_block_id = sb.id
    WHERE sb.entity_type = 'proposal'
      AND sb.entity_id = p_proposal_id;
    RETURN COALESCE(v_total, 0);
  END IF;

  -- Else: estimate-sourced proposal → sum estimate priced scope
  IF v_proposal.primary_estimate_id IS NOT NULL THEN
    SELECT COALESCE(SUM(sbci.line_total), 0)
    INTO v_total
    FROM public.scope_blocks sb
    JOIN public.scope_block_cost_items sbci ON sbci.scope_block_id = sb.id
    WHERE sb.entity_type = 'estimate'
      AND sb.entity_id = v_proposal.primary_estimate_id;
    RETURN COALESCE(v_total, 0);
  END IF;

  RETURN 0;
END;
$$;

COMMENT ON FUNCTION public.get_proposal_contract_total(uuid) IS
  'Canonical proposal contract total. If proposal has scoped blocks, sums them; otherwise sums linked estimate scope (primary_estimate_id). Tenant-safe.';

-- ============================================================================
-- PART 2: Canonical writer RPC - recalculate_proposal_total
-- ============================================================================
CREATE OR REPLACE FUNCTION public.recalculate_proposal_total(p_proposal_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_company_id uuid;
  v_total numeric := 0;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.proposals
  WHERE id = p_proposal_id;

  IF v_company_id IS NULL OR NOT (v_company_id = ANY(public.authed_company_ids())) THEN
    RAISE EXCEPTION 'proposal not found or access denied' USING ERRCODE='42501';
  END IF;

  v_total := public.get_proposal_contract_total(p_proposal_id);

  UPDATE public.proposals
  SET
    subtotal_amount = v_total,
    total_amount = v_total,
    updated_at = now()
  WHERE id = p_proposal_id;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_proposal_total(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_proposal_total(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_proposal_total(uuid) TO service_role;

COMMENT ON FUNCTION public.recalculate_proposal_total(uuid) IS
  'Recomputes proposals.total_amount/subtotal_amount using canonical priced scope source (proposal blocks if present; else linked estimate scope). Tenant-safe.';

-- ============================================================================
-- PART 3: Triggers - keep proposal totals in sync on scope item changes
-- ============================================================================
-- We only need to update proposals impacted by the changed scope blocks:
-- - If the block is proposal-scoped: update that proposal
-- - If the block is estimate-scoped: update all proposals referencing that estimate (primary_estimate_id)

CREATE OR REPLACE FUNCTION public.tg_sync_proposal_totals_from_scope_items_ins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
BEGIN
  -- Proposal-scoped blocks directly
  UPDATE public.proposals p
  SET subtotal_amount = public.get_proposal_contract_total(p.id),
      total_amount = public.get_proposal_contract_total(p.id),
      updated_at = now()
  WHERE p.id IN (
    SELECT DISTINCT sb.entity_id
    FROM new_rows r
    JOIN public.scope_blocks sb ON sb.id = r.scope_block_id
    WHERE sb.entity_type = 'proposal'
  )
    AND p.company_id = ANY(public.authed_company_ids());

  -- Estimate-scoped blocks: update all proposals referencing those estimates
  UPDATE public.proposals p
  SET subtotal_amount = public.get_proposal_contract_total(p.id),
      total_amount = public.get_proposal_contract_total(p.id),
      updated_at = now()
  WHERE p.primary_estimate_id IN (
    SELECT DISTINCT sb.entity_id
    FROM new_rows r
    JOIN public.scope_blocks sb ON sb.id = r.scope_block_id
    WHERE sb.entity_type = 'estimate'
  )
    AND p.company_id = ANY(public.authed_company_ids());

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_sync_proposal_totals_from_scope_items_upd()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
BEGIN
  -- Proposal-scoped blocks (new + old)
  UPDATE public.proposals p
  SET subtotal_amount = public.get_proposal_contract_total(p.id),
      total_amount = public.get_proposal_contract_total(p.id),
      updated_at = now()
  WHERE p.id IN (
    SELECT DISTINCT sb.entity_id
    FROM (
      SELECT scope_block_id FROM new_rows
      UNION
      SELECT scope_block_id FROM old_rows
    ) r
    JOIN public.scope_blocks sb ON sb.id = r.scope_block_id
    WHERE sb.entity_type = 'proposal'
  )
    AND p.company_id = ANY(public.authed_company_ids());

  -- Estimate-scoped blocks: update all proposals referencing those estimates (new + old)
  UPDATE public.proposals p
  SET subtotal_amount = public.get_proposal_contract_total(p.id),
      total_amount = public.get_proposal_contract_total(p.id),
      updated_at = now()
  WHERE p.primary_estimate_id IN (
    SELECT DISTINCT sb.entity_id
    FROM (
      SELECT scope_block_id FROM new_rows
      UNION
      SELECT scope_block_id FROM old_rows
    ) r
    JOIN public.scope_blocks sb ON sb.id = r.scope_block_id
    WHERE sb.entity_type = 'estimate'
  )
    AND p.company_id = ANY(public.authed_company_ids());

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_sync_proposal_totals_from_scope_items_del()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
BEGIN
  -- Proposal-scoped blocks
  UPDATE public.proposals p
  SET subtotal_amount = public.get_proposal_contract_total(p.id),
      total_amount = public.get_proposal_contract_total(p.id),
      updated_at = now()
  WHERE p.id IN (
    SELECT DISTINCT sb.entity_id
    FROM old_rows r
    JOIN public.scope_blocks sb ON sb.id = r.scope_block_id
    WHERE sb.entity_type = 'proposal'
  )
    AND p.company_id = ANY(public.authed_company_ids());

  -- Estimate-scoped blocks
  UPDATE public.proposals p
  SET subtotal_amount = public.get_proposal_contract_total(p.id),
      total_amount = public.get_proposal_contract_total(p.id),
      updated_at = now()
  WHERE p.primary_estimate_id IN (
    SELECT DISTINCT sb.entity_id
    FROM old_rows r
    JOIN public.scope_blocks sb ON sb.id = r.scope_block_id
    WHERE sb.entity_type = 'estimate'
  )
    AND p.company_id = ANY(public.authed_company_ids());

  RETURN OLD;
END;
$$;

-- Replace existing triggers from prior migration with canonical ones (idempotent)
DROP TRIGGER IF EXISTS trg_scope_items_recalc_proposal_total_ins ON public.scope_block_cost_items;
CREATE TRIGGER trg_scope_items_recalc_proposal_total_ins
AFTER INSERT ON public.scope_block_cost_items
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.tg_sync_proposal_totals_from_scope_items_ins();

DROP TRIGGER IF EXISTS trg_scope_items_recalc_proposal_total_upd ON public.scope_block_cost_items;
CREATE TRIGGER trg_scope_items_recalc_proposal_total_upd
AFTER UPDATE ON public.scope_block_cost_items
REFERENCING NEW TABLE AS new_rows OLD TABLE AS old_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.tg_sync_proposal_totals_from_scope_items_upd();

DROP TRIGGER IF EXISTS trg_scope_items_recalc_proposal_total_del ON public.scope_block_cost_items;
CREATE TRIGGER trg_scope_items_recalc_proposal_total_del
AFTER DELETE ON public.scope_block_cost_items
REFERENCING OLD TABLE AS old_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.tg_sync_proposal_totals_from_scope_items_del();

-- ============================================================================
-- PART 4: Make milestone contract-total source use canonical proposal total
-- ============================================================================
-- Ensure pre-baseline contract total uses the same canonical contract total helper.
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

  -- Prefer baseline total when present
  SELECT * INTO v_baseline
  FROM public.contract_baselines cb
  WHERE cb.project_id = v_ps.project_id
  ORDER BY cb.created_at DESC
  LIMIT 1;

  IF v_baseline.id IS NOT NULL THEN
    RETURN COALESCE(v_baseline.current_contract_total,
      COALESCE(v_baseline.base_contract_total, 0) + COALESCE(v_baseline.approved_change_order_total, 0));
  END IF;

  -- Pre-baseline: use canonical proposal contract total (estimate-backed or proposal-backed)
  IF v_ps.proposal_id IS NOT NULL THEN
    -- Keep stored proposal totals in sync so UI + DB agree
    BEGIN
      PERFORM public.recalculate_proposal_total(v_ps.proposal_id);
    EXCEPTION WHEN others THEN
      NULL;
    END;

    RETURN public.get_proposal_contract_total(v_ps.proposal_id);
  END IF;

  RETURN 0;
END;
$$;

COMMIT;

-- ============================================================================
-- PROOF QUERIES (copy/paste)
-- ============================================================================
-- 1) Proposals where UI-estimate scope sum > 0 but DB total_amount is 0 (should trend to 0 over time)
-- SELECT p.id, p.primary_estimate_id, p.total_amount,
--        COALESCE((SELECT SUM(sbci.line_total)
--                  FROM public.scope_blocks sb
--                  JOIN public.scope_block_cost_items sbci ON sbci.scope_block_id = sb.id
--                  WHERE sb.entity_type='estimate' AND sb.entity_id=p.primary_estimate_id),0) AS estimate_scope_sum
-- FROM public.proposals p
-- WHERE p.primary_estimate_id IS NOT NULL
--   AND p.total_amount = 0
--   AND COALESCE((SELECT SUM(sbci.line_total)
--                 FROM public.scope_blocks sb
--                 JOIN public.scope_block_cost_items sbci ON sbci.scope_block_id = sb.id
--                 WHERE sb.entity_type='estimate' AND sb.entity_id=p.primary_estimate_id),0) > 0;
--
-- 2) Recompute one proposal deterministically
-- SELECT public.recalculate_proposal_total('<proposal_id>'::uuid);


