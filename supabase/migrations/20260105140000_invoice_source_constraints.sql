-- ============================================================================
-- Invoice Source Constraints: No free-form billing
-- ============================================================================
-- Every invoice must trace to a canonical source:
-- - milestone: Payment schedule milestone(s)
-- - sov_period: SOV billing period
-- - change_order: Approved change order
-- - deposit: Deposit/retainer (doesn't affect contract value)
-- ============================================================================

-- Add invoice_type column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'invoice_type'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN invoice_type text DEFAULT 'standard';
  END IF;
END $$;

-- Add check constraint for valid source types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_source_type_check'
  ) THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_source_type_check
      CHECK (source_type IS NULL OR source_type IN ('milestone', 'sov_period', 'change_order', 'deposit', 'proposal', 'payment_schedule', 'manual'));
  END IF;
END $$;

-- Add check constraint for valid invoice types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_invoice_type_check'
  ) THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_invoice_type_check
      CHECK (invoice_type IN ('standard', 'progress', 'deposit', 'retainer', 'final', 'retention_release'));
  END IF;
END $$;

-- Add change_order_id column if not exists (for CO-linked invoices)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'change_order_id'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN change_order_id uuid REFERENCES public.change_orders(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_invoices_change_order ON public.invoices(change_order_id);
  END IF;
END $$;

-- Add billing_period columns for SOV invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'billing_period_from'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN billing_period_from date;
    ALTER TABLE public.invoices ADD COLUMN billing_period_to date;
  END IF;
END $$;


-- ============================================================================
-- Change Orders: Ensure status enum and tracking columns exist
-- ============================================================================

-- Ensure status check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'change_orders_status_check'
  ) THEN
    ALTER TABLE public.change_orders ADD CONSTRAINT change_orders_status_check
      CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'void'));
  END IF;
END $$;

-- Add invoiced_amount tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'change_orders' AND column_name = 'invoiced_amount'
  ) THEN
    ALTER TABLE public.change_orders ADD COLUMN invoiced_amount numeric NOT NULL DEFAULT 0;
  END IF;
END $$;


-- ============================================================================
-- Extended Billing Summary: Include more detail
-- ============================================================================

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
  
  -- Billing progress
  billed_to_date numeric,
  paid_to_date numeric,
  open_ar numeric,
  remaining_to_bill numeric,
  retention_held numeric,
  
  -- Counts
  invoice_count integer,
  payment_count integer,
  
  -- Invoice breakdown
  draft_invoice_count integer,
  sent_invoice_count integer,
  paid_invoice_count integer,
  
  -- Proposal info
  has_base_proposal boolean,
  base_proposal_id uuid,
  base_proposal_total numeric
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
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
  v_billed numeric := 0;
  v_paid numeric := 0;
  v_retention numeric := 0;
  v_inv_count integer := 0;
  v_pay_count integer := 0;
  v_draft_inv integer := 0;
  v_sent_inv integer := 0;
  v_paid_inv integer := 0;
  v_has_base_proposal boolean := false;
  v_base_proposal_id uuid := null;
  v_base_proposal_total numeric := 0;
BEGIN
  -- Get contract baseline
  SELECT * INTO v_baseline
  FROM public.contract_baselines cb
  WHERE cb.project_id = p_project_id
  LIMIT 1;

  IF v_baseline.id IS NOT NULL THEN
    v_has_baseline := true;
    v_billing_basis := v_baseline.billing_basis;
    v_base_contract := v_baseline.base_contract_total;
    v_approved_co_total := v_baseline.approved_change_order_total;
  ELSE
    -- Fall back to accepted proposal if no baseline yet
    SELECT p.id, p.total_amount, p.billing_basis, true
    INTO v_base_proposal_id, v_base_proposal_total, v_billing_basis, v_has_base_proposal
    FROM public.proposals p
    WHERE p.project_id = p_project_id
      AND p.acceptance_status = 'accepted'
      AND p.parent_proposal_id IS NULL
    LIMIT 1;
    
    v_base_contract := COALESCE(v_base_proposal_total, 0);
  END IF;

  -- Change order counts
  SELECT 
    COUNT(*) FILTER (WHERE co.status IN ('draft', 'sent')),
    COUNT(*) FILTER (WHERE co.status = 'approved'),
    COALESCE(SUM(co.total_amount) FILTER (WHERE co.status IN ('draft', 'sent')), 0)
  INTO v_pending_co_count, v_approved_co_count, v_pending_co_value
  FROM public.change_orders co
  WHERE co.project_id = p_project_id
    AND co.status NOT IN ('rejected', 'void');

  -- If no baseline, calculate approved CO total
  IF NOT v_has_baseline THEN
    SELECT COALESCE(SUM(co.total_amount), 0)
    INTO v_approved_co_total
    FROM public.change_orders co
    WHERE co.project_id = p_project_id AND co.status = 'approved';
  END IF;

  -- Invoice totals and counts by status
  SELECT 
    COALESCE(SUM(i.total_amount) FILTER (WHERE i.status NOT IN ('void', 'draft')), 0),
    COUNT(*) FILTER (WHERE i.status NOT IN ('void')),
    COALESCE(SUM(i.retention_amount) FILTER (WHERE i.status NOT IN ('void', 'draft')), 0),
    COUNT(*) FILTER (WHERE i.status = 'draft'),
    COUNT(*) FILTER (WHERE i.status = 'sent'),
    COUNT(*) FILTER (WHERE i.status IN ('paid', 'partially_paid'))
  INTO v_billed, v_inv_count, v_retention, v_draft_inv, v_sent_inv, v_paid_inv
  FROM public.invoices i
  WHERE i.project_id = p_project_id;

  -- Payment totals
  SELECT COALESCE(SUM(cp.amount), 0), COUNT(*)
  INTO v_paid, v_pay_count
  FROM public.customer_payments cp
  WHERE cp.project_id = p_project_id;

  -- Base proposal fallback
  IF NOT v_has_baseline AND v_base_proposal_id IS NULL THEN
    SELECT p.id, p.total_amount, true
    INTO v_base_proposal_id, v_base_proposal_total, v_has_base_proposal
    FROM public.proposals p
    WHERE p.project_id = p_project_id
      AND p.acceptance_status = 'accepted'
      AND p.parent_proposal_id IS NULL
    LIMIT 1;
  END IF;

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
    v_billed,
    v_paid,
    (v_billed - v_paid),
    ((v_base_contract + v_approved_co_total) - v_billed),
    v_retention,
    v_inv_count,
    v_pay_count,
    v_draft_inv,
    v_sent_inv,
    v_paid_inv,
    v_has_base_proposal OR v_has_baseline,
    v_base_proposal_id,
    v_base_proposal_total;
END;
$$;


-- ============================================================================
-- Create Invoice from Source (with validation)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_invoice_from_source(
  p_project_id uuid,
  p_source_type text,  -- 'milestone', 'sov_period', 'change_order', 'deposit'
  p_source_id uuid DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_milestone_allocations jsonb DEFAULT NULL,  -- For milestone: [{milestone_id, amount}]
  p_sov_lines jsonb DEFAULT NULL,              -- For SOV: [{sov_line_id, this_period_amount}]
  p_billing_period_from date DEFAULT NULL,
  p_billing_period_to date DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_baseline public.contract_baselines;
  v_invoice_id uuid;
  v_total_amount numeric := 0;
  v_company_id uuid;
  v_invoice_type text := 'standard';
  v_result jsonb;
BEGIN
  -- Get and validate baseline
  SELECT * INTO v_baseline
  FROM public.contract_baselines cb
  WHERE cb.project_id = p_project_id
    AND cb.company_id = ANY(public.authed_company_ids());

  IF v_baseline.id IS NULL THEN
    RAISE EXCEPTION 'No contract baseline found. Accept a proposal first.';
  END IF;

  v_company_id := v_baseline.company_id;

  -- Route based on source type
  CASE p_source_type
    -- Milestone Invoice
    WHEN 'milestone' THEN
      IF v_baseline.billing_basis != 'payment_schedule' THEN
        RAISE EXCEPTION 'Project uses SOV billing, not milestones';
      END IF;
      IF p_milestone_allocations IS NULL OR jsonb_array_length(p_milestone_allocations) = 0 THEN
        RAISE EXCEPTION 'Milestone allocations required';
      END IF;
      v_invoice_type := 'progress';
      -- Delegate to existing function
      v_result := public.create_invoice_from_milestones(p_project_id, p_milestone_allocations);
      RETURN v_result;

    -- SOV Period Invoice
    WHEN 'sov_period' THEN
      IF v_baseline.billing_basis != 'sov' THEN
        RAISE EXCEPTION 'Project uses payment schedule billing, not SOV';
      END IF;
      IF p_sov_lines IS NULL OR jsonb_array_length(p_sov_lines) = 0 THEN
        RAISE EXCEPTION 'SOV lines required';
      END IF;
      v_invoice_type := 'progress';
      -- Delegate to existing function
      v_result := public.create_invoice_from_sov(p_project_id, p_sov_lines);
      RETURN v_result;

    -- Change Order Invoice
    WHEN 'change_order' THEN
      IF p_source_id IS NULL THEN
        RAISE EXCEPTION 'Change order ID required';
      END IF;
      -- Validate CO is approved and has remaining balance
      DECLARE
        v_co public.change_orders;
        v_available numeric;
      BEGIN
        SELECT * INTO v_co
        FROM public.change_orders co
        WHERE co.id = p_source_id
          AND co.project_id = p_project_id
          AND co.status = 'approved';
        
        IF v_co.id IS NULL THEN
          RAISE EXCEPTION 'Change order not found or not approved';
        END IF;
        
        v_available := v_co.total_amount - COALESCE(v_co.invoiced_amount, 0);
        v_total_amount := COALESCE(p_amount, v_available);
        
        IF v_total_amount > v_available THEN
          RAISE EXCEPTION 'Invoice amount (%) exceeds available CO balance (%)', v_total_amount, v_available;
        END IF;
      END;
      v_invoice_type := 'standard';

    -- Deposit Invoice
    WHEN 'deposit' THEN
      IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Deposit amount required';
      END IF;
      v_total_amount := p_amount;
      v_invoice_type := 'deposit';

    ELSE
      RAISE EXCEPTION 'Invalid source type: %. Must be milestone, sov_period, change_order, or deposit', p_source_type;
  END CASE;

  -- Create the invoice for CO and Deposit types
  INSERT INTO public.invoices (
    company_id,
    project_id,
    invoice_number,
    invoice_type,
    status,
    issue_date,
    subtotal_amount,
    total_amount,
    source_type,
    source_id,
    change_order_id,
    billing_period_from,
    billing_period_to,
    notes
  )
  VALUES (
    v_company_id,
    p_project_id,
    '',  -- Auto-generated
    v_invoice_type,
    'draft',
    CURRENT_DATE,
    v_total_amount,
    v_total_amount,
    p_source_type,
    p_source_id,
    CASE WHEN p_source_type = 'change_order' THEN p_source_id ELSE NULL END,
    p_billing_period_from,
    p_billing_period_to,
    p_notes
  )
  RETURNING id INTO v_invoice_id;

  -- Update CO invoiced amount if applicable
  IF p_source_type = 'change_order' THEN
    UPDATE public.change_orders
    SET invoiced_amount = COALESCE(invoiced_amount, 0) + v_total_amount
    WHERE id = p_source_id;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'invoice_type', v_invoice_type,
    'source_type', p_source_type,
    'total_amount', v_total_amount
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.create_invoice_from_source IS 
  'Canonical invoice creation - every invoice must have a source (milestone, sov_period, change_order, or deposit)';

