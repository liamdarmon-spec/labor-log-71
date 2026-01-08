-- ============================================================================
-- Fix get_project_billing_summary contract math + signature drift
--
-- Launch-killer fixes:
-- - Ensure function signature matches frontend expectation (RETURNS TABLE ...)
-- - Ensure standalone/manual invoices do NOT reduce contract remaining_to_bill
-- - Keep AR totals including standalone invoices
-- ============================================================================

-- The remote DB currently has get_project_billing_summary(uuid) with a different
-- return type in some environments (jsonb vs TABLE). We must DROP first to
-- avoid SQLSTATE 42P13 "cannot change return type".
DROP FUNCTION IF EXISTS public.get_project_billing_summary(uuid);

CREATE OR REPLACE FUNCTION public.get_project_billing_summary(p_project_id uuid)
RETURNS TABLE(
  -- Baseline
  has_contract_baseline boolean,
  contract_baseline_id uuid,
  billing_basis text,

  -- Contract totals
  base_contract_total numeric,
  approved_change_order_total numeric,
  current_contract_total numeric,

  -- Change order counts
  pending_change_order_count integer,
  approved_change_order_count integer,
  pending_change_order_value numeric,

  -- Billing progress (CONTRACT basis, excludes standalone/manual invoices)
  billed_to_date numeric,
  paid_to_date numeric,
  open_ar numeric,
  remaining_to_bill numeric,
  retention_held numeric,

  -- Counts (contract-basis invoice count; payments count)
  invoice_count integer,
  payment_count integer,

  -- Proposal info (fallback if no baseline)
  has_base_proposal boolean,
  base_proposal_id uuid,
  base_proposal_total numeric
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_baseline public.contract_baselines;
  v_has_baseline boolean := false;
  v_billing_basis text := null;
  v_base_contract numeric := 0;

  v_approved_co_total numeric := 0;
  v_pending_co_count integer := 0;
  v_approved_co_count integer := 0;
  v_pending_co_value numeric := 0;

  v_contract_billed numeric := 0;
  v_all_billed numeric := 0;
  v_paid numeric := 0;
  v_retention numeric := 0;
  v_contract_inv_count integer := 0;
  v_pay_count integer := 0;

  v_has_base_proposal boolean := false;
  v_base_proposal_id uuid := null;
  v_base_proposal_total numeric := 0;
BEGIN
  -- Baseline (tenant-scoped)
  SELECT * INTO v_baseline
  FROM public.contract_baselines cb
  WHERE cb.project_id = p_project_id
    AND cb.company_id = ANY(public.authed_company_ids())
  LIMIT 1;

  IF v_baseline.id IS NOT NULL THEN
    v_has_baseline := true;
    v_billing_basis := v_baseline.billing_basis;
    v_base_contract := COALESCE(v_baseline.base_contract_total, 0);
  ELSE
    -- Fall back to accepted proposal if no baseline yet (tenant-scoped)
    SELECT p.id, p.total_amount, p.billing_basis, true
    INTO v_base_proposal_id, v_base_proposal_total, v_billing_basis, v_has_base_proposal
    FROM public.proposals p
    WHERE p.project_id = p_project_id
      AND p.company_id = ANY(public.authed_company_ids())
      AND p.acceptance_status = 'accepted'
      AND p.parent_proposal_id IS NULL
    LIMIT 1;

    v_base_contract := COALESCE(v_base_proposal_total, 0);
  END IF;

  -- Change order counts & pending value (tenant-scoped)
  SELECT
    COUNT(*) FILTER (WHERE co.status IN ('draft', 'sent')),
    COUNT(*) FILTER (WHERE co.status = 'approved'),
    COALESCE(SUM(co.total_amount) FILTER (WHERE co.status IN ('draft', 'sent')), 0)
  INTO v_pending_co_count, v_approved_co_count, v_pending_co_value
  FROM public.change_orders co
  WHERE co.project_id = p_project_id
    AND co.company_id = ANY(public.authed_company_ids())
    AND co.status NOT IN ('rejected', 'void');

  -- Approved change orders (include both systems to avoid undercount)
  SELECT COALESCE(SUM(co.total_amount), 0)
  INTO v_approved_co_total
  FROM public.change_orders co
  WHERE co.project_id = p_project_id
    AND co.company_id = ANY(public.authed_company_ids())
    AND co.status = 'approved';

  -- Also include accepted proposal-based COs (legacy support)
  SELECT v_approved_co_total + COALESCE(SUM(p.total_amount), 0)
  INTO v_approved_co_total
  FROM public.proposals p
  WHERE p.project_id = p_project_id
    AND p.company_id = ANY(public.authed_company_ids())
    AND p.acceptance_status = 'accepted'
    AND p.parent_proposal_id IS NOT NULL;

  -- Invoice totals:
  -- - v_contract_billed excludes standalone/manual and deposits (does not change contract remaining)
  -- - v_all_billed includes all invoice types for AR
  SELECT
    COALESCE(SUM(i.total_amount) FILTER (
      WHERE i.status NOT IN ('void', 'draft')
        AND (i.source_type IS DISTINCT FROM 'manual')
        AND (i.source_type IS DISTINCT FROM 'deposit')
        AND (i.invoice_type IS DISTINCT FROM 'deposit')
    ), 0),
    COALESCE(SUM(i.total_amount) FILTER (WHERE i.status NOT IN ('void', 'draft')), 0),
    COUNT(*) FILTER (
      WHERE i.status NOT IN ('void', 'draft')
        AND (i.source_type IS DISTINCT FROM 'manual')
        AND (i.source_type IS DISTINCT FROM 'deposit')
        AND (i.invoice_type IS DISTINCT FROM 'deposit')
    ),
    COALESCE(SUM(i.retention_amount) FILTER (
      WHERE i.status NOT IN ('void', 'draft')
        AND (i.source_type IS DISTINCT FROM 'manual')
    ), 0)
  INTO v_contract_billed, v_all_billed, v_contract_inv_count, v_retention
  FROM public.invoices i
  WHERE i.project_id = p_project_id
    AND i.company_id = ANY(public.authed_company_ids());

  -- Payments (tenant-scoped via project/company; customer_payments already company-scoped)
  SELECT COALESCE(SUM(cp.amount), 0), COUNT(*)
  INTO v_paid, v_pay_count
  FROM public.customer_payments cp
  WHERE cp.project_id = p_project_id
    AND cp.company_id = ANY(public.authed_company_ids());

  RETURN QUERY SELECT
    v_has_baseline,
    v_baseline.id,
    v_billing_basis,
    v_base_contract,
    v_approved_co_total,
    (v_base_contract + v_approved_co_total),
    v_pending_co_count,
    v_approved_co_count,
    v_pending_co_value,
    v_contract_billed,
    v_paid,
    (v_all_billed - v_paid),                    -- open_ar includes standalone invoices
    ((v_base_contract + v_approved_co_total) - v_contract_billed),
    v_retention,
    v_contract_inv_count,
    v_pay_count,
    v_has_base_proposal OR v_has_baseline,
    v_base_proposal_id,
    v_base_proposal_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_billing_summary(uuid) TO authenticated;


