-- ============================================================================
-- Fix: get_project_billing_summary has unused parameter p_project_id
-- ============================================================================
-- Problem: The function accepts p_project_id but returns hardcoded zeros.
-- Supabase lint reports: WARNING: unused parameter p_project_id
--
-- Solution: Implement the function properly using the parameter to query
-- real billing data from invoices, customer_payments, and proposals.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_project_billing_summary(p_project_id uuid)
RETURNS TABLE(
  approved_proposal_total numeric,
  approved_change_order_total numeric,
  contract_value numeric,
  invoiced_total numeric,
  paid_total numeric,
  outstanding_invoiced_balance numeric,
  balance_to_finish numeric,
  has_base_proposal boolean
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_approved_proposal_total numeric := 0;
  v_approved_change_order_total numeric := 0;
  v_invoiced_total numeric := 0;
  v_paid_total numeric := 0;
  v_has_base_proposal boolean := false;
BEGIN
  -- Sum of accepted base proposals (not change orders)
  SELECT COALESCE(SUM(p.total_amount), 0)
  INTO v_approved_proposal_total
  FROM public.proposals p
  WHERE p.project_id = p_project_id
    AND p.acceptance_status = 'accepted'
    AND (p.parent_proposal_id IS NULL);  -- Base proposals have no parent

  -- Check if there's at least one accepted base proposal
  SELECT EXISTS(
    SELECT 1
    FROM public.proposals p
    WHERE p.project_id = p_project_id
      AND p.acceptance_status = 'accepted'
      AND p.parent_proposal_id IS NULL
  )
  INTO v_has_base_proposal;

  -- Sum of accepted change order proposals (have a parent_proposal_id)
  SELECT COALESCE(SUM(p.total_amount), 0)
  INTO v_approved_change_order_total
  FROM public.proposals p
  WHERE p.project_id = p_project_id
    AND p.acceptance_status = 'accepted'
    AND p.parent_proposal_id IS NOT NULL;  -- Change orders have a parent

  -- Sum of all invoices for this project
  SELECT COALESCE(SUM(i.total_amount), 0)
  INTO v_invoiced_total
  FROM public.invoices i
  WHERE i.project_id = p_project_id;

  -- Sum of all payments for this project
  SELECT COALESCE(SUM(cp.amount), 0)
  INTO v_paid_total
  FROM public.customer_payments cp
  WHERE cp.project_id = p_project_id;

  RETURN QUERY SELECT
    v_approved_proposal_total,
    v_approved_change_order_total,
    (v_approved_proposal_total + v_approved_change_order_total),  -- contract_value
    v_invoiced_total,
    v_paid_total,
    (v_invoiced_total - v_paid_total),  -- outstanding_invoiced_balance
    ((v_approved_proposal_total + v_approved_change_order_total) - v_invoiced_total),  -- balance_to_finish
    v_has_base_proposal;
END;
$$;

COMMENT ON FUNCTION public.get_project_billing_summary(uuid) IS 
  'Returns billing summary for a project: proposal totals, invoiced amounts, payments, and balances.';

