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

CREATE INDEX IF NOT EXISTS idx_time_logs_company ON public.time_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_project ON public.time_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_worker ON public.time_logs(worker_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_date ON public.time_logs(date);

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

CREATE INDEX IF NOT EXISTS idx_work_schedules_company ON public.work_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_project ON public.work_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_worker ON public.work_schedules(worker_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_date ON public.work_schedules(scheduled_date);

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

CREATE INDEX IF NOT EXISTS idx_costs_company ON public.costs(company_id);
CREATE INDEX IF NOT EXISTS idx_costs_project ON public.costs(project_id);
CREATE INDEX IF NOT EXISTS idx_costs_cost_code ON public.costs(cost_code_id);

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

CREATE INDEX IF NOT EXISTS idx_cost_entries_company ON public.cost_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_project ON public.cost_entries(project_id);

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

CREATE INDEX IF NOT EXISTS idx_labor_pay_runs_company ON public.labor_pay_runs(company_id);

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

CREATE INDEX IF NOT EXISTS idx_labor_pay_run_items_pay_run ON public.labor_pay_run_items(pay_run_id);
CREATE INDEX IF NOT EXISTS idx_labor_pay_run_items_company ON public.labor_pay_run_items(company_id);

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

CREATE INDEX IF NOT EXISTS idx_material_vendors_company ON public.material_vendors(company_id);

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

CREATE INDEX IF NOT EXISTS idx_customer_payments_company ON public.customer_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_invoice ON public.customer_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_project ON public.customer_payments(project_id);

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

CREATE INDEX IF NOT EXISTS idx_document_tags_document ON public.document_tags(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag ON public.document_tags(tag);

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
CREATE UNIQUE INDEX IF NOT EXISTS measurement_units_code_key ON public.measurement_units(code);

CREATE INDEX IF NOT EXISTS idx_measurement_units_company ON public.measurement_units(company_id);

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

CREATE INDEX IF NOT EXISTS idx_project_budget_groups_project ON public.project_budget_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_project_budget_groups_company ON public.project_budget_groups(company_id);

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

CREATE INDEX IF NOT EXISTS idx_scope_block_cost_items_scope_block ON public.scope_block_cost_items(scope_block_id);
CREATE INDEX IF NOT EXISTS idx_scope_block_cost_items_company ON public.scope_block_cost_items(company_id);

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

CREATE INDEX IF NOT EXISTS idx_budget_revisions_project ON public.budget_revisions(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_revisions_company ON public.budget_revisions(company_id);

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

CREATE INDEX IF NOT EXISTS idx_schedule_of_values_project ON public.schedule_of_values(project_id);
CREATE INDEX IF NOT EXISTS idx_schedule_of_values_company ON public.schedule_of_values(company_id);

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

CREATE INDEX IF NOT EXISTS idx_proposal_events_proposal ON public.proposal_events(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_events_company ON public.proposal_events(company_id);
CREATE INDEX IF NOT EXISTS idx_proposal_events_created_at ON public.proposal_events(created_at);

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

CREATE INDEX IF NOT EXISTS idx_proposal_settings_company ON public.proposal_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_proposal_settings_proposal ON public.proposal_settings(proposal_id);

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

CREATE INDEX IF NOT EXISTS idx_proposal_templates_company ON public.proposal_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_proposal_templates_name ON public.proposal_templates(name);

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

CREATE INDEX IF NOT EXISTS idx_proposal_sections_proposal ON public.proposal_sections(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_sections_company ON public.proposal_sections(company_id);

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

CREATE INDEX IF NOT EXISTS idx_scope_blocks_entity ON public.scope_blocks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_scope_blocks_company ON public.scope_blocks(company_id);

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

