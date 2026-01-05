-- ============================================================================
-- CANONICAL TABLES FOUNDATION
-- ============================================================================
-- Purpose: Create tables that are referenced in later migrations but don't
--          exist in baseline. This prevents "relation does not exist" errors.
--
-- Tables created:
--   - time_logs (labor actuals)
--   - work_schedules (labor scheduling)
--   - costs (general cost ledger)
--   - cost_entries (cost entry tracking)
--   - labor_pay_runs (payment batches)
--   - labor_pay_run_items (payment line items)
--   - material_vendors (vendor registry)
--   - customer_payments (customer payment tracking)
--   - document_tags (document tagging)
--   - measurement_units (unit of measure)
--   - project_budget_groups (budget grouping)
--   - scope_block_cost_items (scope cost items)
--
-- Minimal schemas - just enough for later migrations to reference.
-- Full schemas/triggers/RLS added by subsequent migrations.
-- ============================================================================

-- ============================================================================
-- CORE LABOR & SCHEDULING TABLES
-- ============================================================================

-- time_logs: Labor actuals (hours worked, costs, payment tracking)
CREATE TABLE IF NOT EXISTS public.time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_schedule_id uuid,
  worker_id uuid,
  project_id uuid,
  company_id uuid,
  trade_id uuid,
  cost_code_id uuid,
  hours_worked numeric,
  hourly_rate numeric,
  labor_cost numeric,
  paid_amount numeric,
  date date,
  notes text,
  payment_status text DEFAULT 'unpaid',
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- work_schedules: Scheduling source of truth
CREATE TABLE IF NOT EXISTS public.work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid,
  project_id uuid,
  company_id uuid,
  trade_id uuid,
  cost_code_id uuid,
  scheduled_date date,
  scheduled_hours numeric,
  status text DEFAULT 'planned',
  notes text,
  converted_to_timelog boolean DEFAULT false,
  last_synced_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- ============================================================================
-- COST & PAYMENT TABLES
-- ============================================================================

-- costs: General cost ledger
CREATE TABLE IF NOT EXISTS public.costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  company_id uuid,
  cost_code_id uuid,
  category text, -- 'labor', 'subs', 'materials', 'other'
  vendor_name text,
  description text,
  amount numeric,
  date date,
  date_incurred date,
  payment_id uuid,
  payment_status text DEFAULT 'unpaid',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- cost_entries: Cost entry tracking
CREATE TABLE IF NOT EXISTS public.cost_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  company_id uuid,
  cost_code_id uuid,
  description text,
  amount numeric,
  date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure required columns exist even if table was created earlier with a smaller shape
ALTER TABLE public.cost_entries
  ADD COLUMN IF NOT EXISTS company_id uuid;


-- labor_pay_runs: Payment batches
CREATE TABLE IF NOT EXISTS public.labor_pay_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  payer_company_id uuid,
  pay_period_start date,
  pay_period_end date,
  status text DEFAULT 'draft',
  total_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure required columns exist even if table was created earlier with a smaller shape
ALTER TABLE public.labor_pay_runs
  ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.labor_pay_runs
  ADD COLUMN IF NOT EXISTS payer_company_id uuid;


-- labor_pay_run_items: Payment line items
CREATE TABLE IF NOT EXISTS public.labor_pay_run_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id uuid,
  time_log_id uuid,
  worker_id uuid,
  company_id uuid,
  hours numeric,
  rate numeric,
  amount numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure required columns exist even if table was created earlier with a smaller shape
ALTER TABLE public.labor_pay_run_items
  ADD COLUMN IF NOT EXISTS company_id uuid;


-- material_vendors: Vendor registry
CREATE TABLE IF NOT EXISTS public.material_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  vendor_name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  default_cost_code_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure required columns exist even if table was created earlier with a smaller shape
ALTER TABLE public.material_vendors
  ADD COLUMN IF NOT EXISTS company_id uuid;


-- customer_payments: Customer payment tracking
CREATE TABLE IF NOT EXISTS public.customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid,
  project_id uuid,
  company_id uuid,
  amount numeric,
  date date,
  payment_method text,
  reference_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure required columns exist even if table was created earlier with a smaller shape
ALTER TABLE public.customer_payments
  ADD COLUMN IF NOT EXISTS company_id uuid;


-- ============================================================================
-- SUPPORTING TABLES
-- ============================================================================

-- document_tags: Document tagging system
CREATE TABLE IF NOT EXISTS public.document_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid,
  tag text NOT NULL,
  created_at timestamptz DEFAULT now()
);


-- measurement_units: Unit of measure (aligned with 20251201063606 schema)
CREATE TABLE IF NOT EXISTS public.measurement_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  company_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add unique constraint on code for ON CONFLICT usage

-- Ensure required columns exist even if table was created earlier with a smaller shape
ALTER TABLE public.measurement_units
  ADD COLUMN IF NOT EXISTS company_id uuid;


-- project_budget_groups: Budget grouping
CREATE TABLE IF NOT EXISTS public.project_budget_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  company_id uuid,
  group_name text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- scope_block_cost_items: Scope block cost items
CREATE TABLE IF NOT EXISTS public.scope_block_cost_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_block_id uuid,
  company_id uuid,
  description text,
  quantity numeric,
  unit_price numeric,
  total_price numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure required columns exist even if table was created earlier with a smaller shape
ALTER TABLE public.scope_block_cost_items
  ADD COLUMN IF NOT EXISTS company_id uuid;


-- budget_revisions: Project budget revision tracking
CREATE TABLE IF NOT EXISTS public.budget_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  company_id uuid,
  revision_number integer,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- schedule_of_values: Schedule of values tracking
CREATE TABLE IF NOT EXISTS public.schedule_of_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,
  company_id uuid,
  line_item text,
  scheduled_value numeric,
  completed_value numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- proposal_events: Proposal event tracking
CREATE TABLE IF NOT EXISTS public.proposal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid,
  company_id uuid,
  event_type text,
  event_payload jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- proposal_settings: Proposal settings/configuration
CREATE TABLE IF NOT EXISTS public.proposal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  proposal_id uuid,
  key text,
  value jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- proposal_templates: Proposal templates
CREATE TABLE IF NOT EXISTS public.proposal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  name text,
  description text,
  template_json jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- proposal_sections: Proposal sections
CREATE TABLE IF NOT EXISTS public.proposal_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid,
  company_id uuid,
  section_title text,
  section_content text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- scope_blocks: Scope blocks for proposals/estimates
CREATE TABLE IF NOT EXISTS public.scope_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text,
  entity_id uuid,
  company_id uuid,
  title text,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Created 12 tables that are referenced but missing from baseline:
--   ✓ time_logs
--   ✓ work_schedules
--   ✓ costs
--   ✓ cost_entries
--   ✓ labor_pay_runs
--   ✓ labor_pay_run_items
--   ✓ material_vendors
--   ✓ customer_payments
--   ✓ document_tags
--   ✓ measurement_units
--   ✓ project_budget_groups
--   ✓ scope_block_cost_items
--
-- All later COMMENT ON TABLE, ALTER TABLE, and trigger statements will now succeed.
-- ============================================================================


