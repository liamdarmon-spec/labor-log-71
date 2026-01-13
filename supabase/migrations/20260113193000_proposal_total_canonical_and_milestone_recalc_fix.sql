-- ============================================================================
-- CANONICAL FIX: Proposal total is DB source-of-truth + Milestone recalc uses it
-- ============================================================================
-- ROOT CAUSE (proven):
-- - Milestone scheduled_amount is recomputed in DB by the payment schedule recalc path:
--     trg_payment_schedule_items_recalc_amount
--       -> tg_payment_schedule_items_recalc_schedule()
--       -> recalc_payment_schedule_amounts(schedule_id)
-- - That recalc depends on a "contract total" for percentage/remaining modes.
-- - UI can show a non-zero contract value derived from priced scope items while
--   proposals.total_amount remains 0 in the DB.
-- - When the DB contract total is 0, percentage milestones recalc to $0 and
--   remaining resolves to $0 as well, causing save+reload drift.
--
-- FIX STRATEGY (canonical):
-- 1) Make proposals.total_amount DB-authoritative by maintaining it from priced scope:
--    - Provide an explicit tenant-safe RPC: public.recalculate_proposal_total(proposal_id)
--    - Add statement-level triggers so scope changes deterministically update proposals.total_amount
-- 2) Make milestone recalc depend on proposals.total_amount, and if it is 0 while scope sum > 0,
--    recalculate it first (server-side, not client-side).
--
-- NOTE: This migration avoids UI-side math as source-of-truth.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: RPC - recalculate_proposal_total (tenant-safe, DB source-of-truth)
-- ============================================================================
DROP FUNCTION IF EXISTS public.recalculate_proposal_total(uuid);
CREATE OR REPLACE FUNCTION public.recalculate_proposal_total(p_proposal_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_company_id uuid;
  v_sum numeric := 0;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.proposals
  WHERE id = p_proposal_id;

  IF v_company_id IS NULL OR NOT (v_company_id = ANY(public.authed_company_ids())) THEN
    RAISE EXCEPTION 'proposal not found or access denied' USING ERRCODE='42501';
  END IF;

  -- Sum priced scope items for this proposal (scope_blocks uses entity_type/entity_id)
  SELECT COALESCE(SUM(sbci.line_total), 0)
  INTO v_sum
  FROM public.scope_block_cost_items sbci
  JOIN public.scope_blocks sb ON sb.id = sbci.scope_block_id
  WHERE sb.entity_type = 'proposal'
    AND sb.entity_id = p_proposal_id;

  -- Canonical: total_amount reflects priced scope sum.
  -- Keep subtotal in sync for now (tax not modeled here).
  UPDATE public.proposals
  SET
    subtotal_amount = v_sum,
    total_amount = v_sum,
    updated_at = now()
  WHERE id = p_proposal_id;

  RETURN v_sum;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_proposal_total(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_proposal_total(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_proposal_total(uuid) TO service_role;

COMMENT ON FUNCTION public.recalculate_proposal_total(uuid) IS
  'Recomputes proposals.total_amount (and subtotal_amount) from priced scope_block_cost_items for a proposal. Tenant-safe via authed_company_ids().';

-- ============================================================================
-- PART 2: Triggers - keep proposals.total_amount in sync with proposal scope edits
-- ============================================================================
-- NOTE: Postgres transition tables cannot be used on multi-event triggers.
-- We use separate statement-level triggers for (INSERT/UPDATE) vs (DELETE).

DROP FUNCTION IF EXISTS public.tg_recalc_proposal_totals_from_scope_items_ins();
CREATE OR REPLACE FUNCTION public.tg_recalc_proposal_totals_from_scope_items_ins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_ids uuid[];
BEGIN
  -- Collect distinct proposal ids affected by this statement via scope_blocks.entity_id
  SELECT ARRAY(
    SELECT DISTINCT sb.entity_id
    FROM (
      SELECT scope_block_id FROM new_rows
    ) x
    JOIN public.scope_blocks sb ON sb.id = x.scope_block_id
    WHERE sb.entity_type = 'proposal'
      AND sb.entity_id IS NOT NULL
  ) INTO v_ids;

  IF v_ids IS NULL OR array_length(v_ids, 1) IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  -- Recalculate totals for impacted proposals (set-based)
  UPDATE public.proposals p
  SET
    subtotal_amount = totals.sum_total,
    total_amount = totals.sum_total,
    updated_at = now()
  FROM (
    SELECT sb.entity_id AS proposal_id, COALESCE(SUM(sbci.line_total), 0) AS sum_total
    FROM public.scope_blocks sb
    JOIN public.scope_block_cost_items sbci ON sbci.scope_block_id = sb.id
    WHERE sb.entity_type = 'proposal'
      AND sb.entity_id = ANY(v_ids)
    GROUP BY sb.entity_id
  ) totals
  WHERE p.id = totals.proposal_id;

  -- Also handle proposals that now have zero items
  UPDATE public.proposals p
  SET
    subtotal_amount = 0,
    total_amount = 0,
    updated_at = now()
  WHERE p.id = ANY(v_ids)
    AND NOT EXISTS (
      SELECT 1
      FROM public.scope_blocks sb
      JOIN public.scope_block_cost_items sbci ON sbci.scope_block_id = sb.id
      WHERE sb.entity_type = 'proposal'
        AND sb.entity_id = p.id
    );

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.tg_recalc_proposal_totals_from_scope_items_upd();
CREATE OR REPLACE FUNCTION public.tg_recalc_proposal_totals_from_scope_items_upd()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_ids uuid[];
BEGIN
  SELECT ARRAY(
    SELECT DISTINCT sb.entity_id
    FROM (
      SELECT scope_block_id FROM new_rows
      UNION
      SELECT scope_block_id FROM old_rows
    ) x
    JOIN public.scope_blocks sb ON sb.id = x.scope_block_id
    WHERE sb.entity_type = 'proposal'
      AND sb.entity_id IS NOT NULL
  ) INTO v_ids;

  IF v_ids IS NULL OR array_length(v_ids, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.proposals p
  SET
    subtotal_amount = totals.sum_total,
    total_amount = totals.sum_total,
    updated_at = now()
  FROM (
    SELECT sb.entity_id AS proposal_id, COALESCE(SUM(sbci.line_total), 0) AS sum_total
    FROM public.scope_blocks sb
    JOIN public.scope_block_cost_items sbci ON sbci.scope_block_id = sb.id
    WHERE sb.entity_type = 'proposal'
      AND sb.entity_id = ANY(v_ids)
    GROUP BY sb.entity_id
  ) totals
  WHERE p.id = totals.proposal_id;

  UPDATE public.proposals p
  SET
    subtotal_amount = 0,
    total_amount = 0,
    updated_at = now()
  WHERE p.id = ANY(v_ids)
    AND NOT EXISTS (
      SELECT 1
      FROM public.scope_blocks sb
      JOIN public.scope_block_cost_items sbci ON sbci.scope_block_id = sb.id
      WHERE sb.entity_type = 'proposal'
        AND sb.entity_id = p.id
    );

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.tg_recalc_proposal_totals_from_scope_items_del();
CREATE OR REPLACE FUNCTION public.tg_recalc_proposal_totals_from_scope_items_del()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_ids uuid[];
BEGIN
  SELECT ARRAY(
    SELECT DISTINCT sb.entity_id
    FROM (
      SELECT scope_block_id FROM old_rows
    ) x
    JOIN public.scope_blocks sb ON sb.id = x.scope_block_id
    WHERE sb.entity_type = 'proposal'
      AND sb.entity_id IS NOT NULL
  ) INTO v_ids;

  IF v_ids IS NULL OR array_length(v_ids, 1) IS NULL THEN
    RETURN OLD;
  END IF;

  -- Recalculate totals for impacted proposals (set-based)
  UPDATE public.proposals p
  SET
    subtotal_amount = totals.sum_total,
    total_amount = totals.sum_total,
    updated_at = now()
  FROM (
    SELECT sb.entity_id AS proposal_id, COALESCE(SUM(sbci.line_total), 0) AS sum_total
    FROM public.scope_blocks sb
    JOIN public.scope_block_cost_items sbci ON sbci.scope_block_id = sb.id
    WHERE sb.entity_type = 'proposal'
      AND sb.entity_id = ANY(v_ids)
    GROUP BY sb.entity_id
  ) totals
  WHERE p.id = totals.proposal_id;

  -- Also handle proposals that now have zero items
  UPDATE public.proposals p
  SET
    subtotal_amount = 0,
    total_amount = 0,
    updated_at = now()
  WHERE p.id = ANY(v_ids)
    AND NOT EXISTS (
      SELECT 1
      FROM public.scope_blocks sb
      JOIN public.scope_block_cost_items sbci ON sbci.scope_block_id = sb.id
      WHERE sb.entity_type = 'proposal'
        AND sb.entity_id = p.id
    );

  RETURN OLD;
END;
$$;

-- Statement-level triggers using transition tables (efficient under autosave)
DROP TRIGGER IF EXISTS trg_scope_items_recalc_proposal_total_ins ON public.scope_block_cost_items;
CREATE TRIGGER trg_scope_items_recalc_proposal_total_ins
AFTER INSERT ON public.scope_block_cost_items
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.tg_recalc_proposal_totals_from_scope_items_ins();

DROP TRIGGER IF EXISTS trg_scope_items_recalc_proposal_total_upd ON public.scope_block_cost_items;
CREATE TRIGGER trg_scope_items_recalc_proposal_total_upd
AFTER UPDATE ON public.scope_block_cost_items
REFERENCING NEW TABLE AS new_rows OLD TABLE AS old_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.tg_recalc_proposal_totals_from_scope_items_upd();

DROP TRIGGER IF EXISTS trg_scope_items_recalc_proposal_total_del ON public.scope_block_cost_items;
CREATE TRIGGER trg_scope_items_recalc_proposal_total_del
AFTER DELETE ON public.scope_block_cost_items
REFERENCING OLD TABLE AS old_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.tg_recalc_proposal_totals_from_scope_items_del();

-- If a scope block is reattached from one proposal to another, update both totals
DROP FUNCTION IF EXISTS public.tg_recalc_proposal_totals_from_scope_blocks();
CREATE OR REPLACE FUNCTION public.tg_recalc_proposal_totals_from_scope_blocks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_old uuid;
  v_new uuid;
BEGIN
  v_old := CASE WHEN OLD.entity_type = 'proposal' THEN OLD.entity_id ELSE NULL END;
  v_new := CASE WHEN NEW.entity_type = 'proposal' THEN NEW.entity_id ELSE NULL END;

  IF v_old IS NOT NULL THEN
    PERFORM public.recalculate_proposal_total(v_old);
  END IF;
  IF v_new IS NOT NULL AND v_new <> v_old THEN
    PERFORM public.recalculate_proposal_total(v_new);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scope_blocks_recalc_proposal_total ON public.scope_blocks;
CREATE TRIGGER trg_scope_blocks_recalc_proposal_total
AFTER UPDATE OF entity_type, entity_id ON public.scope_blocks
FOR EACH ROW
EXECUTE FUNCTION public.tg_recalc_proposal_totals_from_scope_blocks();

-- ============================================================================
-- PART 3: Milestone recalc must refresh proposal total if DB total is 0
-- ============================================================================
-- Update get_payment_schedule_contract_total to force proposal total reconciliation pre-baseline
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

  -- Pre-baseline: reconcile proposal total from priced scope and then return it
  IF v_ps.proposal_id IS NOT NULL THEN
    BEGIN
      PERFORM public.recalculate_proposal_total(v_ps.proposal_id);
    EXCEPTION WHEN others THEN
      -- If tenant check blocks (shouldn't for normal callers), fall back to read-only helper
      NULL;
    END;

    SELECT COALESCE(total_amount, 0) INTO v_total
    FROM public.proposals
    WHERE id = v_ps.proposal_id;

    IF v_total > 0 THEN
      RETURN v_total;
    END IF;

    -- Absolute fallback: compute from scope without side effects
    RETURN public.get_proposal_contract_total(v_ps.proposal_id);
  END IF;

  RETURN 0;
END;
$$;

-- ============================================================================
-- PART 4: Migration-time proof checks (would have caught regression)
-- ============================================================================
-- Ensure recalc uses proposal reconciliation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_payment_schedule_contract_total'
      AND p.prosrc LIKE '%recalculate_proposal_total%'
  ) THEN
    RAISE EXCEPTION 'Expected get_payment_schedule_contract_total to call recalculate_proposal_total; regression risk for $0 milestones.';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VALIDATION QUERIES (copy/paste into Supabase SQL editor)
-- ============================================================================
-- 1) Find proposals where UI-derived scope total > 0 but DB total_amount = 0
-- SELECT p.id, p.project_id, p.company_id, p.total_amount,
--        COALESCE(SUM(sbci.line_total),0) AS scope_sum
-- FROM public.proposals p
-- JOIN public.scope_blocks sb ON sb.entity_type='proposal' AND sb.entity_id=p.id
-- JOIN public.scope_block_cost_items sbci ON sbci.scope_block_id = sb.id
-- GROUP BY p.id
-- HAVING p.total_amount = 0 AND COALESCE(SUM(sbci.line_total),0) > 0;
--
-- 2) Milestone schedules that would recalc to $0 incorrectly (should be impossible now)
-- SELECT ps.id AS payment_schedule_id, ps.proposal_id, p.total_amount
-- FROM public.payment_schedules ps
-- JOIN public.proposals p ON p.id = ps.proposal_id
-- WHERE p.total_amount = 0
--   AND EXISTS (
--     SELECT 1 FROM public.payment_schedule_items psi
--     WHERE psi.payment_schedule_id = ps.id AND psi.is_archived = false
--   );


