-- ============================================================================
-- Billing Brain: Canonical billing model with SOV schedules + Document snapshots
-- ============================================================================
-- Big 3 Alignment:
-- 1. CANONICAL: Single source of truth via get_project_billing_summary
-- 2. SECURITY: All tables have RLS with tenant_* policies
-- 3. PERFORMANCE: Proper indexes for hot paths
-- ============================================================================

-- ============================================================================
-- PART 1: SOV Schedules (parent entity for SOV items)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sov_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  base_proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT 'Schedule of Values',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'locked', 'archived')),
  total_scheduled_value numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sov_schedules_company ON public.sov_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_sov_schedules_project ON public.sov_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_sov_schedules_company_project ON public.sov_schedules(company_id, project_id);
CREATE INDEX IF NOT EXISTS idx_sov_schedules_status ON public.sov_schedules(status);

-- RLS
ALTER TABLE public.sov_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON public.sov_schedules;
DROP POLICY IF EXISTS tenant_insert ON public.sov_schedules;
DROP POLICY IF EXISTS tenant_update ON public.sov_schedules;
DROP POLICY IF EXISTS tenant_delete ON public.sov_schedules;

CREATE POLICY tenant_select ON public.sov_schedules
FOR SELECT TO authenticated USING (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_insert ON public.sov_schedules
FOR INSERT TO authenticated WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_update ON public.sov_schedules
FOR UPDATE TO authenticated
USING (company_id = ANY(public.authed_company_ids()))
WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_delete ON public.sov_schedules
FOR DELETE TO authenticated USING (company_id = ANY(public.authed_company_ids()));

-- Company ID autofill trigger
DROP TRIGGER IF EXISTS set_company_id_from_project ON public.sov_schedules;
CREATE TRIGGER set_company_id_from_project
  BEFORE INSERT OR UPDATE OF project_id, company_id
  ON public.sov_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_company_id_from_project();


-- ============================================================================
-- PART 2: Add sov_schedule_id to sov_items (optional link)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sov_items' AND column_name = 'sov_schedule_id'
  ) THEN
    ALTER TABLE public.sov_items ADD COLUMN sov_schedule_id uuid REFERENCES public.sov_schedules(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_sov_items_schedule ON public.sov_items(sov_schedule_id);
  END IF;
END $$;


-- ============================================================================
-- PART 3: Document Snapshots (PDF-ready)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('proposal', 'change_order', 'invoice', 'pay_application')),
  entity_id uuid NOT NULL,
  snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  template_version text DEFAULT 'v1',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_snapshots_company ON public.document_snapshots(company_id);
CREATE INDEX IF NOT EXISTS idx_document_snapshots_project ON public.document_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_document_snapshots_entity ON public.document_snapshots(entity_type, entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_snapshots_unique_entity 
  ON public.document_snapshots(entity_type, entity_id, template_version);

-- RLS
ALTER TABLE public.document_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON public.document_snapshots;
DROP POLICY IF EXISTS tenant_insert ON public.document_snapshots;
DROP POLICY IF EXISTS tenant_delete ON public.document_snapshots;

CREATE POLICY tenant_select ON public.document_snapshots
FOR SELECT TO authenticated USING (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_insert ON public.document_snapshots
FOR INSERT TO authenticated WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_delete ON public.document_snapshots
FOR DELETE TO authenticated USING (company_id = ANY(public.authed_company_ids()));

-- Company ID autofill trigger
DROP TRIGGER IF EXISTS set_company_id_from_project ON public.document_snapshots;
CREATE TRIGGER set_company_id_from_project
  BEFORE INSERT OR UPDATE OF project_id, company_id
  ON public.document_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_company_id_from_project();


-- ============================================================================
-- PART 4: Add FK constraint on proposals.parent_proposal_id
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'proposals_parent_proposal_id_fkey'
  ) THEN
    ALTER TABLE public.proposals 
      ADD CONSTRAINT proposals_parent_proposal_id_fkey 
      FOREIGN KEY (parent_proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ============================================================================
-- PART 5: Canonical Billing Brain - Single Source of Truth
-- ============================================================================

-- Drop old function to change signature
DROP FUNCTION IF EXISTS public.get_project_billing_summary(uuid);

CREATE OR REPLACE FUNCTION public.get_project_billing_summary(p_project_id uuid)
RETURNS TABLE(
  -- Contract
  base_contract_value numeric,
  approved_change_orders numeric,
  contract_value numeric,
  has_base_proposal boolean,
  change_order_count integer,
  
  -- SOV
  sov_schedule_id uuid,
  sov_schedule_status text,
  sov_total numeric,
  sov_item_count integer,
  sov_variance numeric,  -- contract_value - sov_total (should be 0 ideally)
  
  -- Billing
  invoiced_total numeric,
  paid_total numeric,
  outstanding_balance numeric,
  balance_to_finish numeric,
  retention_held numeric,
  
  -- Counts & Dates
  invoice_count integer,
  payment_count integer,
  last_invoice_date date,
  last_payment_date date
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_base_contract numeric := 0;
  v_approved_cos numeric := 0;
  v_has_base boolean := false;
  v_co_count integer := 0;
  v_sov_schedule_id uuid := null;
  v_sov_status text := null;
  v_sov_total numeric := 0;
  v_sov_count integer := 0;
  v_invoiced numeric := 0;
  v_paid numeric := 0;
  v_retention numeric := 0;
  v_inv_count integer := 0;
  v_pay_count integer := 0;
  v_last_inv_date date;
  v_last_pay_date date;
BEGIN
  -- ========================================
  -- CONTRACT VALUE (Base + Accepted COs)
  -- ========================================
  
  -- Base contract: accepted proposals with no parent
  SELECT COALESCE(SUM(p.total_amount), 0),
         EXISTS(SELECT 1 FROM public.proposals p2 
                WHERE p2.project_id = p_project_id 
                  AND p2.acceptance_status = 'accepted' 
                  AND p2.parent_proposal_id IS NULL)
  INTO v_base_contract, v_has_base
  FROM public.proposals p
  WHERE p.project_id = p_project_id
    AND p.acceptance_status = 'accepted'
    AND p.parent_proposal_id IS NULL;

  -- Approved COs: accepted proposals WITH parent_proposal_id
  SELECT COALESCE(SUM(p.total_amount), 0), COUNT(*)
  INTO v_approved_cos, v_co_count
  FROM public.proposals p
  WHERE p.project_id = p_project_id
    AND p.acceptance_status = 'accepted'
    AND p.parent_proposal_id IS NOT NULL;

  -- Also include from change_orders table if used (legacy support)
  SELECT v_approved_cos + COALESCE(SUM(co.total_amount), 0), 
         v_co_count + COUNT(*)
  INTO v_approved_cos, v_co_count
  FROM public.change_orders co
  WHERE co.project_id = p_project_id
    AND co.status = 'approved';

  -- ========================================
  -- SOV SCHEDULE
  -- ========================================
  
  -- Get active SOV schedule
  SELECT ss.id, ss.status
  INTO v_sov_schedule_id, v_sov_status
  FROM public.sov_schedules ss
  WHERE ss.project_id = p_project_id
    AND ss.status IN ('active', 'draft')
  ORDER BY ss.status = 'active' DESC, ss.created_at DESC
  LIMIT 1;

  -- Sum SOV items (either from schedule or direct project link)
  SELECT COALESCE(SUM(si.scheduled_value), 0), COUNT(*)
  INTO v_sov_total, v_sov_count
  FROM public.sov_items si
  WHERE si.project_id = p_project_id
    AND si.is_archived = false
    AND (si.sov_schedule_id = v_sov_schedule_id OR v_sov_schedule_id IS NULL);

  -- ========================================
  -- INVOICING
  -- ========================================
  
  SELECT COALESCE(SUM(i.total_amount), 0), 
         COUNT(*), 
         MAX(i.issue_date)
  INTO v_invoiced, v_inv_count, v_last_inv_date
  FROM public.invoices i
  WHERE i.project_id = p_project_id
    AND i.status NOT IN ('void', 'draft');

  -- Retention held
  SELECT COALESCE(SUM(i.retention_amount), 0)
  INTO v_retention
  FROM public.invoices i
  WHERE i.project_id = p_project_id
    AND i.status NOT IN ('void', 'draft');

  -- ========================================
  -- PAYMENTS
  -- ========================================
  
  SELECT COALESCE(SUM(cp.amount), 0), 
         COUNT(*), 
         MAX(cp.payment_date)
  INTO v_paid, v_pay_count, v_last_pay_date
  FROM public.customer_payments cp
  WHERE cp.project_id = p_project_id;

  -- ========================================
  -- RETURN CANONICAL DATA
  -- ========================================
  
  RETURN QUERY SELECT
    v_base_contract,                                          -- base_contract_value
    v_approved_cos,                                           -- approved_change_orders
    (v_base_contract + v_approved_cos),                       -- contract_value
    v_has_base,                                               -- has_base_proposal
    v_co_count,                                               -- change_order_count
    v_sov_schedule_id,                                        -- sov_schedule_id
    v_sov_status,                                             -- sov_schedule_status
    v_sov_total,                                              -- sov_total
    v_sov_count,                                              -- sov_item_count
    ((v_base_contract + v_approved_cos) - v_sov_total),       -- sov_variance
    v_invoiced,                                               -- invoiced_total
    v_paid,                                                   -- paid_total
    (v_invoiced - v_paid),                                    -- outstanding_balance
    ((v_base_contract + v_approved_cos) - v_invoiced),        -- balance_to_finish
    v_retention,                                              -- retention_held
    v_inv_count,                                              -- invoice_count
    v_pay_count,                                              -- payment_count
    v_last_inv_date,                                          -- last_invoice_date
    v_last_pay_date;                                          -- last_payment_date
END;
$$;

COMMENT ON FUNCTION public.get_project_billing_summary(uuid) IS 
  'Canonical billing brain - single source of truth for all project billing metrics. Frontend should NEVER compute these values.';


-- ============================================================================
-- PART 6: Snapshot Generation Functions
-- ============================================================================

-- Generate proposal snapshot (base or CO)
CREATE OR REPLACE FUNCTION public.build_proposal_snapshot(p_proposal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_snapshot jsonb;
BEGIN
  SELECT jsonb_build_object(
    'proposal_id', p.id,
    'project_id', p.project_id,
    'company_id', p.company_id,
    'proposal_number', p.proposal_number,
    'title', p.title,
    'status', p.status,
    'acceptance_status', p.acceptance_status,
    'proposal_kind', p.proposal_kind,
    'parent_proposal_id', p.parent_proposal_id,
    'is_change_order', p.parent_proposal_id IS NOT NULL,
    'subtotal_amount', p.subtotal_amount,
    'tax_amount', p.tax_amount,
    'total_amount', p.total_amount,
    'proposal_date', p.proposal_date,
    'valid_until', p.valid_until,
    'validity_days', p.validity_days,
    'payment_terms', p.payment_terms,
    'intro_text', p.intro_text,
    'branding', p.branding,
    'template_settings', p.template_settings,
    'accepted_by_name', p.accepted_by_name,
    'accepted_by_email', p.accepted_by_email,
    'acceptance_date', p.acceptance_date,
    'client_signature', p.client_signature,
    'snapshot_at', now()
  )
  INTO v_snapshot
  FROM public.proposals p
  WHERE p.id = p_proposal_id;

  RETURN v_snapshot;
END;
$$;

-- Generate invoice snapshot
CREATE OR REPLACE FUNCTION public.build_invoice_snapshot(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_snapshot jsonb;
  v_items jsonb;
BEGIN
  -- Get invoice items
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ii.id,
      'description', ii.description,
      'quantity', ii.quantity,
      'unit_price', ii.unit_price,
      'amount', ii.amount
    )
  ), '[]'::jsonb)
  INTO v_items
  FROM public.invoice_items ii
  WHERE ii.invoice_id = p_invoice_id;

  -- Build snapshot
  SELECT jsonb_build_object(
    'invoice_id', i.id,
    'project_id', i.project_id,
    'company_id', i.company_id,
    'invoice_number', i.invoice_number,
    'status', i.status,
    'issue_date', i.issue_date,
    'due_date', i.due_date,
    'subtotal_amount', i.subtotal_amount,
    'tax_amount', i.tax_amount,
    'total_amount', i.total_amount,
    'retention_percent', i.retention_percent,
    'retention_amount', i.retention_amount,
    'payment_terms', i.payment_terms,
    'notes', i.notes,
    'client_name', i.client_name,
    'items', v_items,
    'snapshot_at', now()
  )
  INTO v_snapshot
  FROM public.invoices i
  WHERE i.id = p_invoice_id;

  RETURN v_snapshot;
END;
$$;

-- Generate pay application snapshot
CREATE OR REPLACE FUNCTION public.build_pay_application_snapshot(p_pay_app_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_snapshot jsonb;
  v_items jsonb;
BEGIN
  -- Get line items
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', pai.id,
      'description', pai.description,
      'scheduled_value', pai.scheduled_value,
      'previous_applications', pai.previous_applications,
      'this_period', pai.this_period,
      'materials_stored', pai.materials_stored,
      'total_completed', pai.total_completed,
      'percent_complete', pai.percent_complete,
      'balance_to_finish', pai.balance_to_finish
    )
  ), '[]'::jsonb)
  INTO v_items
  FROM public.payment_application_items pai
  WHERE pai.payment_application_id = p_pay_app_id;

  -- Build snapshot
  SELECT jsonb_build_object(
    'pay_application_id', pa.id,
    'project_id', pa.project_id,
    'company_id', pa.company_id,
    'application_number', pa.application_number,
    'application_date', pa.application_date,
    'period_from', pa.period_from,
    'period_to', pa.period_to,
    'status', pa.status,
    'scheduled_value', pa.scheduled_value,
    'previous_applications', pa.previous_applications,
    'this_period', pa.this_period,
    'materials_stored', pa.materials_stored,
    'total_completed', pa.total_completed,
    'percent_complete', pa.percent_complete,
    'balance_to_finish', pa.balance_to_finish,
    'retention_percent', pa.retention_percent,
    'retention_held', pa.retention_held,
    'current_payment_due', pa.current_payment_due,
    'items', v_items,
    'snapshot_at', now()
  )
  INTO v_snapshot
  FROM public.payment_applications pa
  WHERE pa.id = p_pay_app_id;

  RETURN v_snapshot;
END;
$$;


-- ============================================================================
-- PART 7: Change Order Accept/Reject Functions
-- ============================================================================

-- Accept a change order (proposal-based)
CREATE OR REPLACE FUNCTION public.accept_change_order(
  p_proposal_id uuid,
  p_accepted_by_name text DEFAULT NULL,
  p_accepted_by_email text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_proposal public.proposals;
  v_result jsonb;
BEGIN
  -- Get proposal and verify it's a CO
  SELECT * INTO v_proposal
  FROM public.proposals
  WHERE id = p_proposal_id
    AND company_id = ANY(public.authed_company_ids());

  IF v_proposal.id IS NULL THEN
    RAISE EXCEPTION 'Change order not found or access denied';
  END IF;

  IF v_proposal.parent_proposal_id IS NULL THEN
    RAISE EXCEPTION 'This is not a change order (no parent_proposal_id)';
  END IF;

  IF v_proposal.acceptance_status = 'accepted' THEN
    RAISE EXCEPTION 'Change order is already accepted';
  END IF;

  -- Update the proposal
  UPDATE public.proposals
  SET 
    acceptance_status = 'accepted',
    accepted_by_name = COALESCE(p_accepted_by_name, accepted_by_name),
    accepted_by_email = COALESCE(p_accepted_by_email, accepted_by_email),
    acceptance_notes = COALESCE(p_notes, acceptance_notes),
    acceptance_date = now(),
    status = 'accepted',
    updated_at = now()
  WHERE id = p_proposal_id;

  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'proposal_id', p_proposal_id,
    'acceptance_status', 'accepted',
    'accepted_at', now()
  );

  RETURN v_result;
END;
$$;

-- Reject a change order
CREATE OR REPLACE FUNCTION public.reject_change_order(
  p_proposal_id uuid,
  p_rejection_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_proposal public.proposals;
  v_result jsonb;
BEGIN
  -- Get proposal and verify it's a CO
  SELECT * INTO v_proposal
  FROM public.proposals
  WHERE id = p_proposal_id
    AND company_id = ANY(public.authed_company_ids());

  IF v_proposal.id IS NULL THEN
    RAISE EXCEPTION 'Change order not found or access denied';
  END IF;

  IF v_proposal.parent_proposal_id IS NULL THEN
    RAISE EXCEPTION 'This is not a change order (no parent_proposal_id)';
  END IF;

  IF v_proposal.acceptance_status = 'rejected' THEN
    RAISE EXCEPTION 'Change order is already rejected';
  END IF;

  -- Update the proposal
  UPDATE public.proposals
  SET 
    acceptance_status = 'rejected',
    acceptance_notes = COALESCE(p_rejection_notes, acceptance_notes),
    acceptance_date = now(),
    status = 'rejected',
    updated_at = now()
  WHERE id = p_proposal_id;

  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'proposal_id', p_proposal_id,
    'acceptance_status', 'rejected',
    'rejected_at', now()
  );

  RETURN v_result;
END;
$$;


-- ============================================================================
-- PART 8: SOV Schedule Auto-Sync Trigger
-- ============================================================================

-- Update sov_schedules.total_scheduled_value when sov_items change
CREATE OR REPLACE FUNCTION public.sync_sov_schedule_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the schedule total if item has a schedule_id
  IF NEW.sov_schedule_id IS NOT NULL THEN
    UPDATE public.sov_schedules
    SET total_scheduled_value = (
      SELECT COALESCE(SUM(scheduled_value), 0)
      FROM public.sov_items
      WHERE sov_schedule_id = NEW.sov_schedule_id
        AND is_archived = false
    ),
    updated_at = now()
    WHERE id = NEW.sov_schedule_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_sov_schedule_total ON public.sov_items;
CREATE TRIGGER sync_sov_schedule_total
  AFTER INSERT OR UPDATE OR DELETE
  ON public.sov_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_sov_schedule_total();


-- ============================================================================
-- PART 9: Payment Schedules / Milestones View (read-only convenience)
-- ============================================================================

CREATE OR REPLACE VIEW public.project_billing_milestones AS
SELECT
  ps.id,
  ps.project_id,
  ps.proposal_id,
  ps.name,
  ps.status::text,
  ps.created_at,
  (SELECT COALESCE(SUM(psi.scheduled_amount), 0) FROM public.payment_schedule_items psi WHERE psi.payment_schedule_id = ps.id) as total_amount,
  (SELECT COUNT(*) FROM public.payment_schedule_items psi WHERE psi.payment_schedule_id = ps.id) as item_count
FROM public.payment_schedules ps;


-- ============================================================================
-- PART 10: Ensure indexes for hot paths
-- ============================================================================

-- Proposals (CO queries)
CREATE INDEX IF NOT EXISTS idx_proposals_parent ON public.proposals(parent_proposal_id) WHERE parent_proposal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_project_acceptance ON public.proposals(project_id, acceptance_status);
CREATE INDEX IF NOT EXISTS idx_proposals_kind ON public.proposals(proposal_kind);

-- Invoices (billing queries)
CREATE INDEX IF NOT EXISTS idx_invoices_project_status_v2 ON public.invoices(project_id, status) WHERE status NOT IN ('void', 'draft');

-- Customer payments
CREATE INDEX IF NOT EXISTS idx_customer_payments_project_v2 ON public.customer_payments(project_id);

COMMENT ON VIEW public.project_billing_milestones IS 'Read-only view of payment schedules with totals for the billing hub UI';

