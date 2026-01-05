-- ============================================================================
-- Billing Hub: SOV + Payment Applications + Change Order tenant isolation
-- ============================================================================
-- This migration:
-- 1) Adds company_id to sov_items and change_orders
-- 2) Adds RLS policies to sov_items and change_orders
-- 3) Creates payment_applications and payment_application_items tables
-- 4) Adds company_id autofill triggers
-- 5) Adds PDF snapshot fields to proposals and invoices
-- ============================================================================

-- ============================================================================
-- PART 1: Add company_id to sov_items
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sov_items' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.sov_items ADD COLUMN company_id uuid;
  END IF;
END $$;

-- Backfill company_id from project
UPDATE public.sov_items s
SET company_id = p.company_id
FROM public.projects p
WHERE s.project_id = p.id
  AND s.company_id IS NULL
  AND p.company_id IS NOT NULL;

-- Add constraint (not null after backfill)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sov_items_company_id_not_null'
  ) THEN
    ALTER TABLE public.sov_items ADD CONSTRAINT sov_items_company_id_not_null CHECK (company_id IS NOT NULL) NOT VALID;
  END IF;
END $$;

-- Validate constraint if no nulls
DO $$
DECLARE
  nulls bigint;
BEGIN
  SELECT count(*) INTO nulls FROM public.sov_items WHERE company_id IS NULL;
  IF nulls = 0 THEN
    ALTER TABLE public.sov_items VALIDATE CONSTRAINT sov_items_company_id_not_null;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add index
CREATE INDEX IF NOT EXISTS idx_sov_items_company_id ON public.sov_items(company_id);
CREATE INDEX IF NOT EXISTS idx_sov_items_company_project ON public.sov_items(company_id, project_id);

-- Enable RLS
ALTER TABLE public.sov_items ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS tenant_select ON public.sov_items;
DROP POLICY IF EXISTS tenant_insert ON public.sov_items;
DROP POLICY IF EXISTS tenant_update ON public.sov_items;
DROP POLICY IF EXISTS tenant_delete ON public.sov_items;

CREATE POLICY tenant_select ON public.sov_items
FOR SELECT TO authenticated
USING (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_insert ON public.sov_items
FOR INSERT TO authenticated
WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_update ON public.sov_items
FOR UPDATE TO authenticated
USING (company_id = ANY(public.authed_company_ids()))
WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_delete ON public.sov_items
FOR DELETE TO authenticated
USING (company_id = ANY(public.authed_company_ids()));

-- Add trigger for company_id autofill
DROP TRIGGER IF EXISTS set_company_id_from_project ON public.sov_items;
CREATE TRIGGER set_company_id_from_project
  BEFORE INSERT OR UPDATE OF project_id, company_id
  ON public.sov_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_company_id_from_project();


-- ============================================================================
-- PART 2: Add company_id to change_orders
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'change_orders' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.change_orders ADD COLUMN company_id uuid;
  END IF;
END $$;

-- Backfill company_id from project
UPDATE public.change_orders co
SET company_id = p.company_id
FROM public.projects p
WHERE co.project_id = p.id
  AND co.company_id IS NULL
  AND p.company_id IS NOT NULL;

-- Add constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'change_orders_company_id_not_null'
  ) THEN
    ALTER TABLE public.change_orders ADD CONSTRAINT change_orders_company_id_not_null CHECK (company_id IS NOT NULL) NOT VALID;
  END IF;
END $$;

-- Validate if no nulls
DO $$
DECLARE
  nulls bigint;
BEGIN
  SELECT count(*) INTO nulls FROM public.change_orders WHERE company_id IS NULL;
  IF nulls = 0 THEN
    ALTER TABLE public.change_orders VALIDATE CONSTRAINT change_orders_company_id_not_null;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_change_orders_company_id ON public.change_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_company_project ON public.change_orders(company_id, project_id);

-- Enable RLS
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS tenant_select ON public.change_orders;
DROP POLICY IF EXISTS tenant_insert ON public.change_orders;
DROP POLICY IF EXISTS tenant_update ON public.change_orders;
DROP POLICY IF EXISTS tenant_delete ON public.change_orders;

CREATE POLICY tenant_select ON public.change_orders
FOR SELECT TO authenticated
USING (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_insert ON public.change_orders
FOR INSERT TO authenticated
WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_update ON public.change_orders
FOR UPDATE TO authenticated
USING (company_id = ANY(public.authed_company_ids()))
WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_delete ON public.change_orders
FOR DELETE TO authenticated
USING (company_id = ANY(public.authed_company_ids()));

-- Trigger
DROP TRIGGER IF EXISTS set_company_id_from_project ON public.change_orders;
CREATE TRIGGER set_company_id_from_project
  BEFORE INSERT OR UPDATE OF project_id, company_id
  ON public.change_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_company_id_from_project();


-- ============================================================================
-- PART 3: Create payment_applications table (Pay Apps / Progress Payments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  
  -- Application details
  application_number integer NOT NULL DEFAULT 1,
  application_date date NOT NULL DEFAULT CURRENT_DATE,
  period_from date,
  period_to date,
  
  -- Status
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  
  -- Amounts (calculated from line items)
  scheduled_value numeric NOT NULL DEFAULT 0,
  previous_applications numeric NOT NULL DEFAULT 0,
  this_period numeric NOT NULL DEFAULT 0,
  materials_stored numeric NOT NULL DEFAULT 0,
  total_completed numeric NOT NULL DEFAULT 0,
  percent_complete numeric NOT NULL DEFAULT 0,
  balance_to_finish numeric NOT NULL DEFAULT 0,
  
  -- Retention
  retention_percent numeric NOT NULL DEFAULT 10,
  retention_held numeric NOT NULL DEFAULT 0,
  retention_released numeric NOT NULL DEFAULT 0,
  
  -- Net amounts
  gross_amount numeric NOT NULL DEFAULT 0,
  less_retention numeric NOT NULL DEFAULT 0,
  less_previous_certificates numeric NOT NULL DEFAULT 0,
  current_payment_due numeric NOT NULL DEFAULT 0,
  
  -- Links
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  
  -- Timestamps
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for payment_applications
CREATE INDEX IF NOT EXISTS idx_payment_applications_project ON public.payment_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_applications_company ON public.payment_applications(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_applications_company_project ON public.payment_applications(company_id, project_id);
CREATE INDEX IF NOT EXISTS idx_payment_applications_status ON public.payment_applications(status);
CREATE INDEX IF NOT EXISTS idx_payment_applications_invoice ON public.payment_applications(invoice_id);

-- RLS for payment_applications
ALTER TABLE public.payment_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON public.payment_applications;
DROP POLICY IF EXISTS tenant_insert ON public.payment_applications;
DROP POLICY IF EXISTS tenant_update ON public.payment_applications;
DROP POLICY IF EXISTS tenant_delete ON public.payment_applications;

CREATE POLICY tenant_select ON public.payment_applications
FOR SELECT TO authenticated
USING (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_insert ON public.payment_applications
FOR INSERT TO authenticated
WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_update ON public.payment_applications
FOR UPDATE TO authenticated
USING (company_id = ANY(public.authed_company_ids()))
WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_delete ON public.payment_applications
FOR DELETE TO authenticated
USING (company_id = ANY(public.authed_company_ids()));

-- Trigger for company_id autofill
DROP TRIGGER IF EXISTS set_company_id_from_project ON public.payment_applications;
CREATE TRIGGER set_company_id_from_project
  BEFORE INSERT OR UPDATE OF project_id, company_id
  ON public.payment_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_company_id_from_project();


-- ============================================================================
-- PART 4: Create payment_application_items table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_application_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_application_id uuid NOT NULL REFERENCES public.payment_applications(id) ON DELETE CASCADE,
  sov_item_id uuid REFERENCES public.sov_items(id) ON DELETE SET NULL,
  company_id uuid NOT NULL,
  
  -- Item details
  description text NOT NULL,
  scheduled_value numeric NOT NULL DEFAULT 0,
  
  -- Progress tracking
  previous_applications numeric NOT NULL DEFAULT 0,
  this_period numeric NOT NULL DEFAULT 0,
  materials_stored numeric NOT NULL DEFAULT 0,
  total_completed numeric NOT NULL DEFAULT 0,
  percent_complete numeric NOT NULL DEFAULT 0,
  balance_to_finish numeric NOT NULL DEFAULT 0,
  
  -- Retention
  retention_percent numeric NOT NULL DEFAULT 10,
  retention_this_period numeric NOT NULL DEFAULT 0,
  
  sort_order integer NOT NULL DEFAULT 0,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_application_items_app ON public.payment_application_items(payment_application_id);
CREATE INDEX IF NOT EXISTS idx_payment_application_items_sov ON public.payment_application_items(sov_item_id);
CREATE INDEX IF NOT EXISTS idx_payment_application_items_company ON public.payment_application_items(company_id);

-- RLS
ALTER TABLE public.payment_application_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON public.payment_application_items;
DROP POLICY IF EXISTS tenant_insert ON public.payment_application_items;
DROP POLICY IF EXISTS tenant_update ON public.payment_application_items;
DROP POLICY IF EXISTS tenant_delete ON public.payment_application_items;

CREATE POLICY tenant_select ON public.payment_application_items
FOR SELECT TO authenticated
USING (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_insert ON public.payment_application_items
FOR INSERT TO authenticated
WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_update ON public.payment_application_items
FOR UPDATE TO authenticated
USING (company_id = ANY(public.authed_company_ids()))
WITH CHECK (company_id = ANY(public.authed_company_ids()));

CREATE POLICY tenant_delete ON public.payment_application_items
FOR DELETE TO authenticated
USING (company_id = ANY(public.authed_company_ids()));

-- Company_id autofill from payment_application
CREATE OR REPLACE FUNCTION public.tg_set_company_id_from_payment_app()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF NEW.payment_application_id IS NOT NULL THEN
    SELECT pa.company_id INTO v_company_id
    FROM public.payment_applications pa
    WHERE pa.id = NEW.payment_application_id;

    IF v_company_id IS NULL THEN
      RAISE EXCEPTION 'company_id required (could not infer from payment_application_id=%)', NEW.payment_application_id;
    END IF;

    IF NEW.company_id IS NULL THEN
      NEW.company_id := v_company_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_company_id_from_payment_app ON public.payment_application_items;
CREATE TRIGGER set_company_id_from_payment_app
  BEFORE INSERT OR UPDATE OF payment_application_id, company_id
  ON public.payment_application_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_company_id_from_payment_app();


-- ============================================================================
-- PART 5: Add PDF snapshot fields to proposals and invoices
-- ============================================================================

-- Proposals: add pdf_snapshot if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'pdf_snapshot'
  ) THEN
    ALTER TABLE public.proposals ADD COLUMN pdf_snapshot jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'pdf_document_id'
  ) THEN
    ALTER TABLE public.proposals ADD COLUMN pdf_document_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE public.proposals ADD COLUMN sent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'issued_at'
  ) THEN
    ALTER TABLE public.proposals ADD COLUMN issued_at timestamptz;
  END IF;
END $$;

-- Invoices: add pdf_snapshot if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'pdf_snapshot'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN pdf_snapshot jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'pdf_document_id'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN pdf_document_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'issued_at'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN issued_at timestamptz;
  END IF;
END $$;

-- Payment applications: add pdf_snapshot
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_applications' AND column_name = 'pdf_snapshot'
  ) THEN
    ALTER TABLE public.payment_applications ADD COLUMN pdf_snapshot jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_applications' AND column_name = 'pdf_document_id'
  ) THEN
    ALTER TABLE public.payment_applications ADD COLUMN pdf_document_id uuid;
  END IF;
END $$;


-- ============================================================================
-- PART 6: Updated get_project_billing_summary function
-- ============================================================================

-- Must drop first since return type is changing
DROP FUNCTION IF EXISTS public.get_project_billing_summary(uuid);

CREATE OR REPLACE FUNCTION public.get_project_billing_summary(p_project_id uuid)
RETURNS TABLE(
  base_contract_value numeric,
  approved_change_orders numeric,
  contract_value numeric,
  invoiced_total numeric,
  paid_total numeric,
  outstanding_balance numeric,
  balance_to_finish numeric,
  retention_held numeric,
  has_base_proposal boolean,
  change_order_count integer,
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
  v_invoiced numeric := 0;
  v_paid numeric := 0;
  v_retention numeric := 0;
  v_has_base boolean := false;
  v_co_count integer := 0;
  v_inv_count integer := 0;
  v_pay_count integer := 0;
  v_last_inv_date date;
  v_last_pay_date date;
BEGIN
  -- Base contract: accepted proposals with no parent (base proposals)
  SELECT COALESCE(SUM(p.total_amount), 0), EXISTS(SELECT 1 FROM public.proposals p2 WHERE p2.project_id = p_project_id AND p2.acceptance_status = 'accepted' AND p2.parent_proposal_id IS NULL)
  INTO v_base_contract, v_has_base
  FROM public.proposals p
  WHERE p.project_id = p_project_id
    AND p.acceptance_status = 'accepted'
    AND p.parent_proposal_id IS NULL;

  -- Approved change orders: accepted proposals with parent (change orders)
  SELECT COALESCE(SUM(p.total_amount), 0), COUNT(*)
  INTO v_approved_cos, v_co_count
  FROM public.proposals p
  WHERE p.project_id = p_project_id
    AND p.acceptance_status = 'accepted'
    AND p.parent_proposal_id IS NOT NULL;

  -- Also count from change_orders table if used
  SELECT v_approved_cos + COALESCE(SUM(co.total_amount), 0), v_co_count + COUNT(*)
  INTO v_approved_cos, v_co_count
  FROM public.change_orders co
  WHERE co.project_id = p_project_id
    AND co.status = 'approved';

  -- Invoiced total
  SELECT COALESCE(SUM(i.total_amount), 0), COUNT(*), MAX(i.issue_date)
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

  -- Paid total
  SELECT COALESCE(SUM(cp.amount), 0), COUNT(*), MAX(cp.payment_date)
  INTO v_paid, v_pay_count, v_last_pay_date
  FROM public.customer_payments cp
  WHERE cp.project_id = p_project_id;

  RETURN QUERY SELECT
    v_base_contract,
    v_approved_cos,
    (v_base_contract + v_approved_cos),  -- contract_value
    v_invoiced,
    v_paid,
    (v_invoiced - v_paid),  -- outstanding_balance
    ((v_base_contract + v_approved_cos) - v_invoiced),  -- balance_to_finish
    v_retention,
    v_has_base,
    v_co_count,
    v_inv_count,
    v_pay_count,
    v_last_inv_date,
    v_last_pay_date;
END;
$$;

COMMENT ON FUNCTION public.get_project_billing_summary(uuid) IS 
  'Returns comprehensive billing summary for a project including contract value, change orders, invoices, payments, and retention.';

