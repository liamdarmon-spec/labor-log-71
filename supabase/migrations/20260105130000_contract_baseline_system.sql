-- ============================================================================
-- Contract Baseline System: Canonical, Auditable, Production-Ready Billing
-- ============================================================================
-- HARD PRINCIPLES:
-- 1. CANONICAL: Every billing number traces to an approved upstream decision
-- 2. SECURITY: Full RLS with authed_company_ids()
-- 3. PERFORMANCE: Indexes on hot paths, summary functions are STABLE
-- ============================================================================

-- ============================================================================
-- PART 1: Contract Baselines Table
-- ============================================================================
-- One active baseline per project. Freezes the accepted proposal.

CREATE TABLE IF NOT EXISTS public.contract_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL,
  accepted_proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE RESTRICT,
  
  -- Billing basis (LOCKED at creation)
  billing_basis text NOT NULL CHECK (billing_basis IN ('payment_schedule', 'sov')),
  
  -- Contract totals
  base_contract_total numeric NOT NULL DEFAULT 0,
  approved_change_order_total numeric NOT NULL DEFAULT 0,
  
  -- Metadata
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Only one active baseline per project
  UNIQUE (project_id)
);

-- Generated column for current_contract_total (computed, always correct)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'contract_baselines' AND column_name = 'current_contract_total'
  ) THEN
    ALTER TABLE public.contract_baselines 
      ADD COLUMN current_contract_total numeric GENERATED ALWAYS AS (base_contract_total + approved_change_order_total) STORED;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contract_baselines_company ON public.contract_baselines(company_id);
CREATE INDEX IF NOT EXISTS idx_contract_baselines_project ON public.contract_baselines(project_id);
CREATE INDEX IF NOT EXISTS idx_contract_baselines_proposal ON public.contract_baselines(accepted_proposal_id);

-- RLS
ALTER TABLE public.contract_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON public.contract_baselines;
DROP POLICY IF EXISTS tenant_insert ON public.contract_baselines;
DROP POLICY IF EXISTS tenant_update ON public.contract_baselines;
DROP POLICY IF EXISTS tenant_delete ON public.contract_baselines;

CREATE POLICY tenant_select ON public.contract_baselines
FOR SELECT TO authenticated USING (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_insert ON public.contract_baselines
FOR INSERT TO authenticated WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_update ON public.contract_baselines
FOR UPDATE TO authenticated
USING (company_id = ANY(public.authed_company_ids()))
WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_delete ON public.contract_baselines
FOR DELETE TO authenticated USING (company_id = ANY(public.authed_company_ids()));

-- Company ID autofill trigger
DROP TRIGGER IF EXISTS set_company_id_from_project ON public.contract_baselines;
CREATE TRIGGER set_company_id_from_project
  BEFORE INSERT OR UPDATE OF project_id, company_id
  ON public.contract_baselines
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_company_id_from_project();


-- ============================================================================
-- PART 2: Contract Milestones (Frozen baseline copy from payment_schedule_items)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contract_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contract_baseline_id uuid NOT NULL REFERENCES public.contract_baselines(id) ON DELETE CASCADE,
  
  -- Frozen from payment_schedule_items
  source_payment_schedule_item_id uuid,
  name text NOT NULL,
  scheduled_amount numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  
  -- Tracking (computed from invoices)
  invoiced_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  remaining_amount numeric GENERATED ALWAYS AS (scheduled_amount - invoiced_amount) STORED,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contract_milestones_company ON public.contract_milestones(company_id);
CREATE INDEX IF NOT EXISTS idx_contract_milestones_project ON public.contract_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_contract_milestones_baseline ON public.contract_milestones(contract_baseline_id);

-- RLS
ALTER TABLE public.contract_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON public.contract_milestones;
DROP POLICY IF EXISTS tenant_insert ON public.contract_milestones;
DROP POLICY IF EXISTS tenant_update ON public.contract_milestones;
DROP POLICY IF EXISTS tenant_delete ON public.contract_milestones;

CREATE POLICY tenant_select ON public.contract_milestones
FOR SELECT TO authenticated USING (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_insert ON public.contract_milestones
FOR INSERT TO authenticated WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_update ON public.contract_milestones
FOR UPDATE TO authenticated
USING (company_id = ANY(public.authed_company_ids()))
WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_delete ON public.contract_milestones
FOR DELETE TO authenticated USING (company_id = ANY(public.authed_company_ids()));

-- Company ID autofill trigger
DROP TRIGGER IF EXISTS set_company_id_from_project ON public.contract_milestones;
CREATE TRIGGER set_company_id_from_project
  BEFORE INSERT OR UPDATE OF project_id, company_id
  ON public.contract_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_company_id_from_project();


-- ============================================================================
-- PART 3: Contract SOV Lines (Frozen baseline copy from sov_items)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contract_sov_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contract_baseline_id uuid NOT NULL REFERENCES public.contract_baselines(id) ON DELETE CASCADE,
  
  -- Frozen from sov_items
  source_sov_item_id uuid REFERENCES public.sov_items(id) ON DELETE SET NULL,
  code text,
  description text NOT NULL,
  scheduled_value numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  
  -- Tracking (computed from invoices)
  previous_billed numeric NOT NULL DEFAULT 0,
  current_billed numeric NOT NULL DEFAULT 0,
  total_billed numeric GENERATED ALWAYS AS (previous_billed + current_billed) STORED,
  remaining_value numeric GENERATED ALWAYS AS (scheduled_value - previous_billed - current_billed) STORED,
  percent_complete numeric GENERATED ALWAYS AS (
    CASE WHEN scheduled_value > 0 
    THEN ((previous_billed + current_billed) / scheduled_value * 100)
    ELSE 0 END
  ) STORED,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contract_sov_lines_company ON public.contract_sov_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_contract_sov_lines_project ON public.contract_sov_lines(project_id);
CREATE INDEX IF NOT EXISTS idx_contract_sov_lines_baseline ON public.contract_sov_lines(contract_baseline_id);

-- RLS
ALTER TABLE public.contract_sov_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON public.contract_sov_lines;
DROP POLICY IF EXISTS tenant_insert ON public.contract_sov_lines;
DROP POLICY IF EXISTS tenant_update ON public.contract_sov_lines;
DROP POLICY IF EXISTS tenant_delete ON public.contract_sov_lines;

CREATE POLICY tenant_select ON public.contract_sov_lines
FOR SELECT TO authenticated USING (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_insert ON public.contract_sov_lines
FOR INSERT TO authenticated WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_update ON public.contract_sov_lines
FOR UPDATE TO authenticated
USING (company_id = ANY(public.authed_company_ids()))
WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_delete ON public.contract_sov_lines
FOR DELETE TO authenticated USING (company_id = ANY(public.authed_company_ids()));

-- Company ID autofill trigger
DROP TRIGGER IF EXISTS set_company_id_from_project ON public.contract_sov_lines;
CREATE TRIGGER set_company_id_from_project
  BEFORE INSERT OR UPDATE OF project_id, company_id
  ON public.contract_sov_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_company_id_from_project();


-- ============================================================================
-- PART 4: Invoice Milestone Allocations (for payment_schedule billing basis)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invoice_milestone_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  contract_milestone_id uuid NOT NULL REFERENCES public.contract_milestones(id) ON DELETE RESTRICT,
  
  -- Allocation
  amount numeric NOT NULL CHECK (amount > 0),
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_milestone_alloc_company ON public.invoice_milestone_allocations(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_milestone_alloc_invoice ON public.invoice_milestone_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_milestone_alloc_milestone ON public.invoice_milestone_allocations(contract_milestone_id);

-- RLS
ALTER TABLE public.invoice_milestone_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON public.invoice_milestone_allocations;
DROP POLICY IF EXISTS tenant_insert ON public.invoice_milestone_allocations;
DROP POLICY IF EXISTS tenant_delete ON public.invoice_milestone_allocations;

CREATE POLICY tenant_select ON public.invoice_milestone_allocations
FOR SELECT TO authenticated USING (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_insert ON public.invoice_milestone_allocations
FOR INSERT TO authenticated WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_delete ON public.invoice_milestone_allocations
FOR DELETE TO authenticated USING (company_id = ANY(public.authed_company_ids()));


-- ============================================================================
-- PART 5: Invoice SOV Lines (for sov billing basis)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invoice_sov_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  contract_sov_line_id uuid NOT NULL REFERENCES public.contract_sov_lines(id) ON DELETE RESTRICT,
  
  -- This period's billing
  this_period_amount numeric NOT NULL DEFAULT 0 CHECK (this_period_amount >= 0),
  this_period_percent numeric,
  stored_materials numeric NOT NULL DEFAULT 0,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_sov_lines_company ON public.invoice_sov_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_sov_lines_invoice ON public.invoice_sov_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_sov_lines_sov ON public.invoice_sov_lines(contract_sov_line_id);

-- RLS
ALTER TABLE public.invoice_sov_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON public.invoice_sov_lines;
DROP POLICY IF EXISTS tenant_insert ON public.invoice_sov_lines;
DROP POLICY IF EXISTS tenant_delete ON public.invoice_sov_lines;

CREATE POLICY tenant_select ON public.invoice_sov_lines
FOR SELECT TO authenticated USING (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_insert ON public.invoice_sov_lines
FOR INSERT TO authenticated WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_delete ON public.invoice_sov_lines
FOR DELETE TO authenticated USING (company_id = ANY(public.authed_company_ids()));


-- ============================================================================
-- PART 6: Update change_orders to link to contract_baseline
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'change_orders' AND column_name = 'contract_baseline_id'
  ) THEN
    ALTER TABLE public.change_orders ADD COLUMN contract_baseline_id uuid REFERENCES public.contract_baselines(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_change_orders_baseline ON public.change_orders(contract_baseline_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'change_orders' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE public.change_orders ADD COLUMN sent_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'change_orders' AND column_name = 'pdf_document_id'
  ) THEN
    ALTER TABLE public.change_orders ADD COLUMN pdf_document_id uuid;
  END IF;
END $$;


-- ============================================================================
-- PART 7: Add billing_basis to proposals (chosen at creation, locked at baseline)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'billing_basis'
  ) THEN
    ALTER TABLE public.proposals ADD COLUMN billing_basis text CHECK (billing_basis IN ('payment_schedule', 'sov'));
  END IF;
END $$;


-- ============================================================================
-- PART 8: Canonical Billing Summary Function
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_project_billing_summary(uuid);

CREATE OR REPLACE FUNCTION public.get_project_billing_summary(p_project_id uuid)
RETURNS TABLE(
  -- Contract baseline info
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

  -- Change order counts (linked to baseline or project)
  SELECT 
    COUNT(*) FILTER (WHERE co.status IN ('draft', 'sent')),
    COUNT(*) FILTER (WHERE co.status = 'approved'),
    COALESCE(SUM(co.total_amount) FILTER (WHERE co.status IN ('draft', 'sent')), 0)
  INTO v_pending_co_count, v_approved_co_count, v_pending_co_value
  FROM public.change_orders co
  WHERE co.project_id = p_project_id
    AND co.status NOT IN ('rejected', 'void');

  -- If no baseline, calculate approved CO total from change_orders + proposal COs
  IF NOT v_has_baseline THEN
    SELECT COALESCE(SUM(co.total_amount), 0)
    INTO v_approved_co_total
    FROM public.change_orders co
    WHERE co.project_id = p_project_id AND co.status = 'approved';
    
    -- Also add accepted proposal COs
    SELECT v_approved_co_total + COALESCE(SUM(p.total_amount), 0)
    INTO v_approved_co_total
    FROM public.proposals p
    WHERE p.project_id = p_project_id
      AND p.acceptance_status = 'accepted'
      AND p.parent_proposal_id IS NOT NULL;
  END IF;

  -- Invoicing totals
  SELECT 
    COALESCE(SUM(i.total_amount), 0),
    COUNT(*),
    COALESCE(SUM(i.retention_amount), 0)
  INTO v_billed, v_inv_count, v_retention
  FROM public.invoices i
  WHERE i.project_id = p_project_id
    AND i.status NOT IN ('void', 'draft');

  -- Payment totals
  SELECT COALESCE(SUM(cp.amount), 0), COUNT(*)
  INTO v_paid, v_pay_count
  FROM public.customer_payments cp
  WHERE cp.project_id = p_project_id;

  -- Base proposal fallback if no baseline
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
    (v_base_contract + v_approved_co_total),  -- current_contract_total
    v_pending_co_count,
    v_approved_co_count,
    v_pending_co_value,
    v_billed,
    v_paid,
    (v_billed - v_paid),  -- open_ar
    ((v_base_contract + v_approved_co_total) - v_billed),  -- remaining_to_bill
    v_retention,
    v_inv_count,
    v_pay_count,
    v_has_base_proposal OR v_has_baseline,
    v_base_proposal_id,
    v_base_proposal_total;
END;
$$;

COMMENT ON FUNCTION public.get_project_billing_summary(uuid) IS 
  'Canonical billing summary - SINGLE SOURCE OF TRUTH for all billing metrics. Frontend should NEVER compute these values.';


-- ============================================================================
-- PART 9: Accept Proposal → Create Contract Baseline
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_proposal_create_baseline(
  p_proposal_id uuid,
  p_accepted_by_name text DEFAULT NULL,
  p_accepted_by_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_proposal public.proposals;
  v_baseline_id uuid;
  v_billing_basis text;
  v_result jsonb;
BEGIN
  -- Get and validate proposal
  SELECT * INTO v_proposal
  FROM public.proposals p
  WHERE p.id = p_proposal_id
    AND p.company_id = ANY(public.authed_company_ids());

  IF v_proposal.id IS NULL THEN
    RAISE EXCEPTION 'Proposal not found or access denied';
  END IF;

  IF v_proposal.parent_proposal_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot create baseline from a change order';
  END IF;

  IF v_proposal.acceptance_status = 'accepted' THEN
    -- Check if baseline already exists
    IF EXISTS (SELECT 1 FROM public.contract_baselines WHERE accepted_proposal_id = p_proposal_id) THEN
      RAISE EXCEPTION 'Contract baseline already exists for this proposal';
    END IF;
  END IF;

  -- Determine billing basis (default to payment_schedule if not set)
  v_billing_basis := COALESCE(v_proposal.billing_basis, 'payment_schedule');

  -- Update proposal status
  UPDATE public.proposals
  SET 
    acceptance_status = 'accepted',
    accepted_by_name = COALESCE(p_accepted_by_name, accepted_by_name),
    accepted_by_email = COALESCE(p_accepted_by_email, accepted_by_email),
    acceptance_date = now(),
    status = 'accepted',
    billing_basis = v_billing_basis,
    updated_at = now()
  WHERE id = p_proposal_id;

  -- Create contract baseline
  INSERT INTO public.contract_baselines (
    company_id,
    project_id,
    accepted_proposal_id,
    billing_basis,
    base_contract_total,
    created_by
  )
  VALUES (
    v_proposal.company_id,
    v_proposal.project_id,
    p_proposal_id,
    v_billing_basis,
    v_proposal.total_amount,
    public.authed_user_id()
  )
  RETURNING id INTO v_baseline_id;

  -- Create frozen milestones if billing_basis = 'payment_schedule'
  IF v_billing_basis = 'payment_schedule' THEN
    INSERT INTO public.contract_milestones (
      company_id,
      project_id,
      contract_baseline_id,
      source_payment_schedule_item_id,
      name,
      scheduled_amount,
      sort_order
    )
    SELECT 
      v_proposal.company_id,
      v_proposal.project_id,
      v_baseline_id,
      psi.id,
      psi.title,
      psi.scheduled_amount,
      psi.sort_order
    FROM public.payment_schedules ps
    JOIN public.payment_schedule_items psi ON psi.payment_schedule_id = ps.id
    WHERE ps.proposal_id = p_proposal_id
      AND psi.is_archived = false
    ORDER BY psi.sort_order;
  END IF;

  -- Create frozen SOV lines if billing_basis = 'sov'
  IF v_billing_basis = 'sov' THEN
    INSERT INTO public.contract_sov_lines (
      company_id,
      project_id,
      contract_baseline_id,
      source_sov_item_id,
      code,
      description,
      scheduled_value,
      sort_order
    )
    SELECT 
      v_proposal.company_id,
      v_proposal.project_id,
      v_baseline_id,
      si.id,
      COALESCE(cc.code, ''),
      si.description,
      si.scheduled_value,
      si.sort_order
    FROM public.sov_items si
    LEFT JOIN public.cost_codes cc ON cc.id = si.cost_code_id
    WHERE si.project_id = v_proposal.project_id
      AND si.is_archived = false
    ORDER BY si.sort_order;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'contract_baseline_id', v_baseline_id,
    'billing_basis', v_billing_basis,
    'base_contract_total', v_proposal.total_amount,
    'accepted_at', now()
  );

  RETURN v_result;
END;
$$;


-- ============================================================================
-- PART 10: Approve Change Order → Update Baseline Total
-- ============================================================================

CREATE OR REPLACE FUNCTION public.approve_change_order(
  p_change_order_id uuid,
  p_approved_by_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_co public.change_orders;
  v_baseline public.contract_baselines;
  v_new_total numeric;
  v_result jsonb;
BEGIN
  -- Get and validate change order
  SELECT * INTO v_co
  FROM public.change_orders co
  WHERE co.id = p_change_order_id
    AND co.company_id = ANY(public.authed_company_ids());

  IF v_co.id IS NULL THEN
    RAISE EXCEPTION 'Change order not found or access denied';
  END IF;

  IF v_co.status = 'approved' THEN
    RAISE EXCEPTION 'Change order is already approved';
  END IF;

  IF v_co.status = 'void' OR v_co.status = 'rejected' THEN
    RAISE EXCEPTION 'Cannot approve a voided or rejected change order';
  END IF;

  -- Get contract baseline
  SELECT * INTO v_baseline
  FROM public.contract_baselines cb
  WHERE cb.project_id = v_co.project_id;

  IF v_baseline.id IS NULL THEN
    RAISE EXCEPTION 'No contract baseline exists for this project';
  END IF;

  -- Update change order status
  UPDATE public.change_orders
  SET 
    status = 'approved',
    approved_at = now(),
    contract_baseline_id = v_baseline.id,
    updated_at = now()
  WHERE id = p_change_order_id;

  -- Update baseline approved CO total
  UPDATE public.contract_baselines
  SET 
    approved_change_order_total = approved_change_order_total + v_co.total_amount,
    updated_at = now()
  WHERE id = v_baseline.id
  RETURNING approved_change_order_total INTO v_new_total;

  v_result := jsonb_build_object(
    'success', true,
    'change_order_id', p_change_order_id,
    'approved_at', now(),
    'change_order_amount', v_co.total_amount,
    'new_approved_co_total', v_new_total,
    'new_contract_total', v_baseline.base_contract_total + v_new_total
  );

  RETURN v_result;
END;
$$;


-- ============================================================================
-- PART 11: Create Invoice from Milestones
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_invoice_from_milestones(
  p_project_id uuid,
  p_milestone_allocations jsonb  -- Array of {milestone_id, amount}
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
  v_alloc jsonb;
  v_milestone public.contract_milestones;
  v_available numeric;
  v_company_id uuid;
  v_result jsonb;
BEGIN
  -- Validate baseline exists and is payment_schedule basis
  SELECT * INTO v_baseline
  FROM public.contract_baselines cb
  WHERE cb.project_id = p_project_id
    AND cb.company_id = ANY(public.authed_company_ids());

  IF v_baseline.id IS NULL THEN
    RAISE EXCEPTION 'No contract baseline found for this project';
  END IF;

  IF v_baseline.billing_basis != 'payment_schedule' THEN
    RAISE EXCEPTION 'Project uses SOV billing, not payment schedule';
  END IF;

  v_company_id := v_baseline.company_id;

  -- Validate all allocations and calculate total
  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_milestone_allocations)
  LOOP
    SELECT * INTO v_milestone
    FROM public.contract_milestones cm
    WHERE cm.id = (v_alloc->>'milestone_id')::uuid
      AND cm.project_id = p_project_id;

    IF v_milestone.id IS NULL THEN
      RAISE EXCEPTION 'Milestone not found: %', v_alloc->>'milestone_id';
    END IF;

    v_available := v_milestone.scheduled_amount - v_milestone.invoiced_amount;
    
    IF (v_alloc->>'amount')::numeric > v_available THEN
      RAISE EXCEPTION 'Allocation exceeds available amount for milestone %. Available: %, Requested: %',
        v_milestone.name, v_available, (v_alloc->>'amount')::numeric;
    END IF;

    v_total_amount := v_total_amount + (v_alloc->>'amount')::numeric;
  END LOOP;

  -- Create invoice
  INSERT INTO public.invoices (
    company_id,
    project_id,
    invoice_number,
    status,
    issue_date,
    subtotal_amount,
    total_amount,
    source_type
  )
  VALUES (
    v_company_id,
    p_project_id,
    '',  -- Will be auto-generated by trigger
    'draft',
    CURRENT_DATE,
    v_total_amount,
    v_total_amount,
    'payment_schedule'
  )
  RETURNING id INTO v_invoice_id;

  -- Create allocations
  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_milestone_allocations)
  LOOP
    -- Insert allocation
    INSERT INTO public.invoice_milestone_allocations (
      company_id,
      invoice_id,
      contract_milestone_id,
      amount
    )
    VALUES (
      v_company_id,
      v_invoice_id,
      (v_alloc->>'milestone_id')::uuid,
      (v_alloc->>'amount')::numeric
    );

    -- Update milestone invoiced amount
    UPDATE public.contract_milestones
    SET invoiced_amount = invoiced_amount + (v_alloc->>'amount')::numeric
    WHERE id = (v_alloc->>'milestone_id')::uuid;

    -- Create invoice item
    INSERT INTO public.invoice_items (
      company_id,
      invoice_id,
      description,
      quantity,
      unit_price,
      line_total
    )
    SELECT 
      v_company_id,
      v_invoice_id,
      cm.name,
      1,
      (v_alloc->>'amount')::numeric,
      (v_alloc->>'amount')::numeric
    FROM public.contract_milestones cm
    WHERE cm.id = (v_alloc->>'milestone_id')::uuid;
  END LOOP;

  v_result := jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'total_amount', v_total_amount,
    'allocation_count', jsonb_array_length(p_milestone_allocations)
  );

  RETURN v_result;
END;
$$;


-- ============================================================================
-- PART 12: Create Invoice from SOV (Pay App)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_invoice_from_sov(
  p_project_id uuid,
  p_sov_lines jsonb  -- Array of {sov_line_id, this_period_amount}
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
  v_line jsonb;
  v_sov_line public.contract_sov_lines;
  v_available numeric;
  v_company_id uuid;
  v_result jsonb;
BEGIN
  -- Validate baseline exists and is SOV basis
  SELECT * INTO v_baseline
  FROM public.contract_baselines cb
  WHERE cb.project_id = p_project_id
    AND cb.company_id = ANY(public.authed_company_ids());

  IF v_baseline.id IS NULL THEN
    RAISE EXCEPTION 'No contract baseline found for this project';
  END IF;

  IF v_baseline.billing_basis != 'sov' THEN
    RAISE EXCEPTION 'Project uses payment schedule billing, not SOV';
  END IF;

  v_company_id := v_baseline.company_id;

  -- Validate all lines and calculate total
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_sov_lines)
  LOOP
    SELECT * INTO v_sov_line
    FROM public.contract_sov_lines csl
    WHERE csl.id = (v_line->>'sov_line_id')::uuid
      AND csl.project_id = p_project_id;

    IF v_sov_line.id IS NULL THEN
      RAISE EXCEPTION 'SOV line not found: %', v_line->>'sov_line_id';
    END IF;

    v_available := v_sov_line.scheduled_value - v_sov_line.previous_billed - v_sov_line.current_billed;
    
    IF (v_line->>'this_period_amount')::numeric > v_available THEN
      RAISE EXCEPTION 'Amount exceeds remaining value for SOV line %. Available: %, Requested: %',
        v_sov_line.description, v_available, (v_line->>'this_period_amount')::numeric;
    END IF;

    v_total_amount := v_total_amount + (v_line->>'this_period_amount')::numeric;
  END LOOP;

  -- Create invoice
  INSERT INTO public.invoices (
    company_id,
    project_id,
    invoice_number,
    status,
    issue_date,
    subtotal_amount,
    total_amount,
    source_type,
    sov_based
  )
  VALUES (
    v_company_id,
    p_project_id,
    '',  -- Will be auto-generated
    'draft',
    CURRENT_DATE,
    v_total_amount,
    v_total_amount,
    'manual',
    true
  )
  RETURNING id INTO v_invoice_id;

  -- Create SOV invoice lines
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_sov_lines)
  LOOP
    -- Insert invoice SOV line
    INSERT INTO public.invoice_sov_lines (
      company_id,
      invoice_id,
      contract_sov_line_id,
      this_period_amount
    )
    VALUES (
      v_company_id,
      v_invoice_id,
      (v_line->>'sov_line_id')::uuid,
      (v_line->>'this_period_amount')::numeric
    );

    -- Update SOV line billed amounts (move current to previous, add new to current)
    UPDATE public.contract_sov_lines
    SET 
      previous_billed = previous_billed + current_billed,
      current_billed = (v_line->>'this_period_amount')::numeric
    WHERE id = (v_line->>'sov_line_id')::uuid;

    -- Create invoice item
    INSERT INTO public.invoice_items (
      company_id,
      invoice_id,
      description,
      quantity,
      unit_price,
      line_total
    )
    SELECT 
      v_company_id,
      v_invoice_id,
      csl.description,
      1,
      (v_line->>'this_period_amount')::numeric,
      (v_line->>'this_period_amount')::numeric
    FROM public.contract_sov_lines csl
    WHERE csl.id = (v_line->>'sov_line_id')::uuid;
  END LOOP;

  v_result := jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'total_amount', v_total_amount,
    'line_count', jsonb_array_length(p_sov_lines)
  );

  RETURN v_result;
END;
$$;


-- ============================================================================
-- PART 13: PDF Generation Placeholders
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_change_order_pdf(p_change_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_co public.change_orders;
  v_doc_id uuid;
  v_snapshot jsonb;
BEGIN
  -- Validate access
  SELECT * INTO v_co
  FROM public.change_orders co
  WHERE co.id = p_change_order_id
    AND co.company_id = ANY(public.authed_company_ids());

  IF v_co.id IS NULL THEN
    RAISE EXCEPTION 'Change order not found or access denied';
  END IF;

  -- Build snapshot
  v_snapshot := jsonb_build_object(
    'change_order_id', v_co.id,
    'project_id', v_co.project_id,
    'company_id', v_co.company_id,
    'change_order_number', v_co.change_order_number,
    'title', v_co.title,
    'description', v_co.description,
    'amount', v_co.total_amount,
    'status', v_co.status,
    'generated_at', now()
  );

  -- Create document record
  INSERT INTO public.document_snapshots (
    company_id,
    project_id,
    entity_type,
    entity_id,
    snapshot_json,
    template_version
  )
  VALUES (
    v_co.company_id,
    v_co.project_id,
    'change_order',
    v_co.id,
    v_snapshot,
    'v1'
  )
  ON CONFLICT (entity_type, entity_id, template_version) 
  DO UPDATE SET snapshot_json = EXCLUDED.snapshot_json
  RETURNING id INTO v_doc_id;

  -- Update change order with document reference
  UPDATE public.change_orders
  SET pdf_document_id = v_doc_id
  WHERE id = p_change_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'document_id', v_doc_id,
    'status', 'pending',
    'message', 'PDF generation queued. Snapshot stored.'
  );
END;
$$;


CREATE OR REPLACE FUNCTION public.generate_invoice_pdf(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_invoice public.invoices;
  v_doc_id uuid;
  v_snapshot jsonb;
BEGIN
  -- Validate access
  SELECT * INTO v_invoice
  FROM public.invoices i
  WHERE i.id = p_invoice_id
    AND i.company_id = ANY(public.authed_company_ids());

  IF v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found or access denied';
  END IF;

  -- Build snapshot using existing function
  v_snapshot := public.build_invoice_snapshot(p_invoice_id);

  -- Create document record
  INSERT INTO public.document_snapshots (
    company_id,
    project_id,
    entity_type,
    entity_id,
    snapshot_json,
    template_version
  )
  VALUES (
    v_invoice.company_id,
    v_invoice.project_id,
    'invoice',
    v_invoice.id,
    v_snapshot,
    'v1'
  )
  ON CONFLICT (entity_type, entity_id, template_version) 
  DO UPDATE SET snapshot_json = EXCLUDED.snapshot_json
  RETURNING id INTO v_doc_id;

  -- Update invoice with document reference
  UPDATE public.invoices
  SET pdf_document_id = v_doc_id
  WHERE id = p_invoice_id;

  RETURN jsonb_build_object(
    'success', true,
    'document_id', v_doc_id,
    'status', 'pending',
    'message', 'PDF generation queued. Snapshot stored.'
  );
END;
$$;


-- ============================================================================
-- PART 14: Get Contract Milestones/SOV with Status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_contract_billing_lines(p_project_id uuid)
RETURNS TABLE(
  billing_basis text,
  line_id uuid,
  line_name text,
  scheduled_amount numeric,
  invoiced_amount numeric,
  paid_amount numeric,
  remaining_amount numeric,
  percent_complete numeric,
  sort_order integer
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_baseline public.contract_baselines;
BEGIN
  SELECT * INTO v_baseline
  FROM public.contract_baselines cb
  WHERE cb.project_id = p_project_id
    AND cb.company_id = ANY(public.authed_company_ids());

  IF v_baseline.id IS NULL THEN
    RETURN;  -- No baseline, return empty
  END IF;

  IF v_baseline.billing_basis = 'payment_schedule' THEN
    RETURN QUERY
    SELECT 
      'payment_schedule'::text,
      cm.id,
      cm.name,
      cm.scheduled_amount,
      cm.invoiced_amount,
      cm.paid_amount,
      cm.remaining_amount,
      CASE WHEN cm.scheduled_amount > 0 
        THEN (cm.invoiced_amount / cm.scheduled_amount * 100)
        ELSE 0 
      END,
      cm.sort_order
    FROM public.contract_milestones cm
    WHERE cm.contract_baseline_id = v_baseline.id
    ORDER BY cm.sort_order;
  ELSE
    RETURN QUERY
    SELECT 
      'sov'::text,
      csl.id,
      csl.description,
      csl.scheduled_value,
      csl.total_billed,
      0::numeric,  -- paid tracking TBD
      csl.remaining_value,
      csl.percent_complete,
      csl.sort_order
    FROM public.contract_sov_lines csl
    WHERE csl.contract_baseline_id = v_baseline.id
    ORDER BY csl.sort_order;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_contract_billing_lines(uuid) IS 
  'Returns billing line items (milestones or SOV lines) based on billing basis, with status tracking.';

