-- ============================================================================
-- FIX: payment_schedule_items scheduled_amount calculation
-- ============================================================================
-- PROBLEM: The recalc_payment_schedule_item_amount function uses sov_items sum
--          as contract value. For milestone-type contracts, there are no SOV items,
--          so scheduled_amount always becomes 0.
--
-- SOLUTION: For milestone contracts, use the proposal's total_amount instead.
--           Fall back to SOV sum only for progress_billing/SOV contracts.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalc_payment_schedule_item_amount(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_schedule_id uuid;
  v_project_id uuid;
  v_proposal_id uuid;
  v_contract numeric := 0;
  v_pct numeric;
  v_fixed numeric;
  v_contract_type text;
  v_proposal_total numeric;
BEGIN
  -- Get item details
  SELECT payment_schedule_id, percent_of_contract, fixed_amount
  INTO v_schedule_id, v_pct, v_fixed
  FROM public.payment_schedule_items
  WHERE id = p_item_id;

  IF v_schedule_id IS NULL THEN
    RETURN;
  END IF;

  -- Get schedule's project and proposal
  SELECT project_id, proposal_id
  INTO v_project_id, v_proposal_id
  FROM public.payment_schedules
  WHERE id = v_schedule_id;

  -- Determine contract value based on contract type
  IF v_proposal_id IS NOT NULL THEN
    -- Get proposal's contract type and total
    SELECT contract_type, total_amount
    INTO v_contract_type, v_proposal_total
    FROM public.proposals
    WHERE id = v_proposal_id;

    -- For milestone contracts, use proposal total (or scope items sum)
    IF v_contract_type = 'milestone' OR v_contract_type = 'fixed_price' THEN
      -- Try proposal.total_amount first
      v_contract := COALESCE(v_proposal_total, 0);
      
      -- If proposal total is 0, try summing scope_block_cost_items
      IF v_contract = 0 THEN
        SELECT COALESCE(SUM(line_total), 0)
        INTO v_contract
        FROM public.scope_block_cost_items sbci
        JOIN public.scope_blocks sb ON sb.id = sbci.scope_block_id
        WHERE sb.proposal_id = v_proposal_id;
      END IF;
    ELSE
      -- For SOV/progress_billing contracts, use SOV items sum (original behavior)
      SELECT COALESCE(SUM(scheduled_value), 0)
      INTO v_contract
      FROM public.sov_items
      WHERE project_id = v_project_id AND is_archived = false;
    END IF;
  ELSE
    -- No proposal linked, fall back to SOV items (original behavior)
    SELECT COALESCE(SUM(scheduled_value), 0)
    INTO v_contract
    FROM public.sov_items
    WHERE project_id = v_project_id AND is_archived = false;
  END IF;

  -- Update scheduled_amount
  UPDATE public.payment_schedule_items
  SET scheduled_amount = CASE
    WHEN v_fixed IS NOT NULL THEN v_fixed
    WHEN v_pct IS NOT NULL THEN (v_contract * (v_pct / 100.0))
    ELSE 0
  END
  WHERE id = p_item_id;
END;
$$;

COMMENT ON FUNCTION public.recalc_payment_schedule_item_amount(uuid) IS 
  'Recalculates scheduled_amount for a payment_schedule_item.
   For milestone/fixed_price contracts: uses proposal.total_amount or scope items sum.
   For SOV/progress_billing contracts: uses sov_items sum.';

