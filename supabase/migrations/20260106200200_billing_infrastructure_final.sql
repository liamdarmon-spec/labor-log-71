-- ============================================================================
-- Billing Infrastructure: Final Production Setup
-- ============================================================================
-- - Contract baselines with frozen billing plans
-- - Billing basis enforcement (PPS XOR SOV)
-- - Invoice source constraints
-- - Payment application
-- - PDF readiness with document_artifacts
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) Ensure contract_baselines table exists with proper structure
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.contract_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  base_contract_total numeric(14,2) NOT NULL,
  billing_basis text NOT NULL CHECK (billing_basis IN ('payment_schedule', 'sov')),
  frozen_milestones jsonb, -- Only if billing_basis = 'payment_schedule'
  frozen_sov_lines jsonb,  -- Only if billing_basis = 'sov'
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (project_id) -- One baseline per project
);

-- Add billing_basis to proposals if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'billing_basis'
  ) THEN
    ALTER TABLE public.proposals ADD COLUMN billing_basis text CHECK (billing_basis IN ('payment_schedule', 'sov'));
  END IF;
END $$;

-- RLS for contract_baselines
ALTER TABLE public.contract_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contract_baselines_select ON public.contract_baselines;
CREATE POLICY contract_baselines_select ON public.contract_baselines
  FOR SELECT TO authenticated
  USING (company_id = ANY(public.authed_company_ids()));

DROP POLICY IF EXISTS contract_baselines_insert ON public.contract_baselines;
CREATE POLICY contract_baselines_insert ON public.contract_baselines
  FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.authed_company_ids()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contract_baselines_company ON public.contract_baselines(company_id);
CREATE INDEX IF NOT EXISTS idx_contract_baselines_project ON public.contract_baselines(project_id);

-- ============================================================================
-- 2) document_artifacts - Immutable PDF storage
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.document_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  
  -- Source reference
  entity_type text NOT NULL CHECK (entity_type IN ('proposal', 'change_order', 'invoice', 'receipt', 'pay_application')),
  entity_id uuid NOT NULL,
  
  -- Document details
  document_type text NOT NULL CHECK (document_type IN ('pdf', 'snapshot')),
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  
  -- Content
  storage_path text, -- Path in Supabase storage
  content_hash text, -- SHA256 for immutability verification
  snapshot_data jsonb, -- Frozen data used to generate PDF
  
  -- Metadata
  generated_at timestamptz,
  sent_at timestamptz,
  frozen_at timestamptz, -- Once set, document is immutable
  
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  -- Ensure one active version per entity
  UNIQUE (entity_type, entity_id, version)
);

-- RLS
ALTER TABLE public.document_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_artifacts_select ON public.document_artifacts;
CREATE POLICY document_artifacts_select ON public.document_artifacts
  FOR SELECT TO authenticated
  USING (company_id = ANY(public.authed_company_ids()));

DROP POLICY IF EXISTS document_artifacts_insert ON public.document_artifacts;
CREATE POLICY document_artifacts_insert ON public.document_artifacts
  FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.authed_company_ids()));

DROP POLICY IF EXISTS document_artifacts_update ON public.document_artifacts;
CREATE POLICY document_artifacts_update ON public.document_artifacts
  FOR UPDATE TO authenticated
  USING (
    company_id = ANY(public.authed_company_ids())
    AND frozen_at IS NULL -- Cannot update frozen documents
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_artifacts_entity ON public.document_artifacts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_document_artifacts_company ON public.document_artifacts(company_id);
CREATE INDEX IF NOT EXISTS idx_document_artifacts_project ON public.document_artifacts(project_id);

-- ============================================================================
-- 3) Billing indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_invoices_project_created ON public.invoices(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_company_status ON public.invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_payments_project ON public.customer_payments(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_project_status ON public.proposals(project_id, acceptance_status);

-- ============================================================================
-- 4) accept_proposal_and_create_baseline - Atomic proposal acceptance
-- ============================================================================
CREATE OR REPLACE FUNCTION public.accept_proposal_and_create_baseline(
  p_proposal_id uuid,
  p_accepted_by_name text DEFAULT null,
  p_accepted_by_email text DEFAULT null,
  p_notes text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proposal record;
  v_baseline_id uuid;
  v_milestones jsonb;
  v_sov_lines jsonb;
BEGIN
  -- Get proposal with lock
  SELECT p.*, pr.company_id as project_company_id
  INTO v_proposal
  FROM public.proposals p
  JOIN public.projects pr ON pr.id = p.project_id
  WHERE p.id = p_proposal_id
  FOR UPDATE OF p;
  
  IF v_proposal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Proposal not found');
  END IF;
  
  -- Verify company membership
  IF NOT public.is_company_member(v_proposal.company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;
  
  -- Check if already accepted
  IF v_proposal.acceptance_status = 'accepted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Proposal already accepted');
  END IF;
  
  -- Check if this is a base proposal (not a CO)
  IF v_proposal.parent_proposal_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Use accept_change_order for change orders');
  END IF;
  
  -- Check if baseline already exists for this project
  IF EXISTS (SELECT 1 FROM public.contract_baselines WHERE project_id = v_proposal.project_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contract baseline already exists for this project');
  END IF;
  
  -- Determine billing basis (default to payment_schedule if not set)
  IF v_proposal.billing_basis IS NULL THEN
    UPDATE public.proposals SET billing_basis = 'payment_schedule' WHERE id = p_proposal_id;
    v_proposal.billing_basis := 'payment_schedule';
  END IF;
  
  -- Freeze milestones or SOV lines based on billing basis
  IF v_proposal.billing_basis = 'payment_schedule' THEN
    -- Get payment schedule items as frozen milestones
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', psi.id,
        'description', psi.description,
        'amount', psi.scheduled_amount,
        'due_date', psi.due_date,
        'sort_order', psi.sort_order
      ) ORDER BY psi.sort_order
    )
    INTO v_milestones
    FROM public.payment_schedule_items psi
    WHERE psi.proposal_id = p_proposal_id;
    
    v_sov_lines := null;
  ELSE
    -- Get SOV items as frozen lines
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', si.id,
        'description', si.description,
        'amount', si.scheduled_value,
        'sort_order', si.sort_order
      ) ORDER BY si.sort_order
    )
    INTO v_sov_lines
    FROM public.sov_items si
    JOIN public.sov_schedules ss ON ss.id = si.sov_schedule_id
    WHERE ss.project_id = v_proposal.project_id;
    
    v_milestones := null;
  END IF;
  
  -- Create contract baseline
  INSERT INTO public.contract_baselines (
    company_id,
    project_id,
    proposal_id,
    base_contract_total,
    billing_basis,
    frozen_milestones,
    frozen_sov_lines,
    created_by
  )
  VALUES (
    v_proposal.company_id,
    v_proposal.project_id,
    p_proposal_id,
    COALESCE(v_proposal.total_amount, 0),
    v_proposal.billing_basis,
    v_milestones,
    v_sov_lines,
    (SELECT auth.uid())
  )
  RETURNING id INTO v_baseline_id;
  
  -- Update proposal status
  UPDATE public.proposals
  SET 
    status = 'accepted',
    acceptance_status = 'accepted',
    accepted_at = now(),
    accepted_by_name = p_accepted_by_name,
    accepted_by_email = p_accepted_by_email,
    acceptance_notes = p_notes,
    acceptance_method = 'manual'
  WHERE id = p_proposal_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'baseline_id', v_baseline_id,
    'billing_basis', v_proposal.billing_basis,
    'contract_total', v_proposal.total_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_proposal_and_create_baseline(uuid, text, text, text) TO authenticated;

-- ============================================================================
-- 5) get_project_billing_summary - Canonical billing KPIs
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_project_billing_summary(uuid);

CREATE OR REPLACE FUNCTION public.get_project_billing_summary(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_baseline record;
  v_approved_cos numeric;
  v_invoiced numeric;
  v_paid numeric;
BEGIN
  -- Get contract baseline
  SELECT * INTO v_baseline
  FROM public.contract_baselines
  WHERE project_id = p_project_id;
  
  -- Calculate approved change orders total
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_approved_cos
  FROM public.proposals
  WHERE project_id = p_project_id
    AND parent_proposal_id IS NOT NULL
    AND acceptance_status = 'accepted';
  
  -- Calculate invoiced total
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_invoiced
  FROM public.invoices
  WHERE project_id = p_project_id
    AND status != 'void';
  
  -- Calculate paid total
  SELECT COALESCE(SUM(amount), 0)
  INTO v_paid
  FROM public.customer_payments
  WHERE project_id = p_project_id;
  
  RETURN jsonb_build_object(
    'has_baseline', v_baseline IS NOT NULL,
    'billing_basis', v_baseline.billing_basis,
    'base_contract_total', COALESCE(v_baseline.base_contract_total, 0),
    'approved_change_orders', v_approved_cos,
    'contract_total', COALESCE(v_baseline.base_contract_total, 0) + v_approved_cos,
    'invoiced_total', v_invoiced,
    'paid_total', v_paid,
    'outstanding', v_invoiced - v_paid,
    'remaining_to_bill', COALESCE(v_baseline.base_contract_total, 0) + v_approved_cos - v_invoiced,
    'frozen_milestones', v_baseline.frozen_milestones,
    'frozen_sov_lines', v_baseline.frozen_sov_lines
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_billing_summary(uuid) TO authenticated;

-- ============================================================================
-- 6) create_invoice_from_milestone - PPS invoice creation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_invoice_from_milestone(
  p_project_id uuid,
  p_milestone_ids uuid[],
  p_notes text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_baseline record;
  v_total numeric := 0;
  v_invoice_id uuid;
  v_invoice_number text;
  v_company_id uuid;
BEGIN
  -- Get baseline and verify
  SELECT cb.*, p.company_id 
  INTO v_baseline
  FROM public.contract_baselines cb
  JOIN public.projects p ON p.id = cb.project_id
  WHERE cb.project_id = p_project_id;
  
  IF v_baseline IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No contract baseline exists');
  END IF;
  
  IF v_baseline.billing_basis != 'payment_schedule' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project uses SOV billing, not payment schedule');
  END IF;
  
  v_company_id := v_baseline.company_id;
  
  -- Verify company membership
  IF NOT public.is_company_member(v_company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;
  
  -- Calculate total from milestones
  SELECT COALESCE(SUM((m->>'amount')::numeric), 0)
  INTO v_total
  FROM jsonb_array_elements(v_baseline.frozen_milestones) m
  WHERE (m->>'id')::uuid = ANY(p_milestone_ids);
  
  IF v_total <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No valid milestones selected');
  END IF;
  
  -- Generate invoice number
  SELECT 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || 
         lpad((COALESCE(MAX(NULLIF(regexp_replace(invoice_number, '[^0-9]', '', 'g'), '')::int), 0) + 1)::text, 4, '0')
  INTO v_invoice_number
  FROM public.invoices
  WHERE company_id = v_company_id;
  
  -- Create invoice
  INSERT INTO public.invoices (
    company_id,
    project_id,
    invoice_number,
    invoice_date,
    due_date,
    total_amount,
    status,
    notes,
    invoice_source_type,
    invoice_source_id
  )
  VALUES (
    v_company_id,
    p_project_id,
    v_invoice_number,
    CURRENT_DATE,
    CURRENT_DATE + interval '30 days',
    v_total,
    'draft',
    p_notes,
    'milestone',
    p_milestone_ids[1] -- Primary milestone reference
  )
  RETURNING id INTO v_invoice_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'total', v_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_invoice_from_milestone(uuid, uuid[], text) TO authenticated;

COMMIT;

