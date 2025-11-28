-- =====================================================
-- FORMA WORKFORCE OS - COMPLETE DATABASE SCHEMA DUMP
-- Generated: 2025-01-28
-- =====================================================
-- This file contains the complete database schema including:
-- - All table definitions
-- - All views
-- - All functions
-- - All triggers
-- - All indexes and constraints
-- =====================================================

-- =====================================================
-- CUSTOM TYPES
-- =====================================================

CREATE TYPE app_role AS ENUM ('admin', 'field_user');

-- =====================================================
-- TABLE DEFINITIONS
-- =====================================================

-- Activity Log
CREATE TABLE public.activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Archived Daily Logs (Legacy)
CREATE TABLE public.archived_daily_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id uuid NOT NULL,
  date date NOT NULL,
  worker_id uuid NOT NULL,
  project_id uuid NOT NULL,
  hours_worked numeric NOT NULL,
  notes text,
  trade_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  archived_at timestamp with time zone NOT NULL DEFAULT now(),
  archived_by uuid
);

-- Bid Invitations
CREATE TABLE public.bid_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_package_id uuid NOT NULL REFERENCES bid_packages(id),
  sub_id uuid NOT NULL REFERENCES subs(id),
  status text DEFAULT 'invited'::text,
  invited_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  notes text
);

-- Bid Packages
CREATE TABLE public.bid_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  title text NOT NULL,
  scope_summary text,
  cost_code_ids uuid[],
  bid_due_date date,
  desired_start_date date,
  attachments jsonb,
  status text DEFAULT 'draft'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Budget Revisions
CREATE TABLE public.budget_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  revision_number integer NOT NULL,
  revision_type text NOT NULL,
  description text,
  previous_budget numeric,
  revision_amount numeric NOT NULL,
  new_budget numeric NOT NULL,
  approved_by uuid,
  approved_at timestamp with time zone,
  status text DEFAULT 'pending'::text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Companies
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Cost Codes (Canonical)
CREATE TABLE public.cost_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  default_trade_id uuid REFERENCES trades(id),
  trade_id uuid REFERENCES trades(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Cost Entries (Legacy - Read Only)
CREATE TABLE public.cost_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  cost_code_id uuid REFERENCES cost_codes(id),
  entry_type text NOT NULL,
  entry_date date NOT NULL,
  description text,
  quantity numeric,
  unit text,
  unit_cost numeric,
  total_cost numeric NOT NULL,
  source_type text,
  source_id uuid,
  vendor_name text,
  invoice_number text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Costs (Canonical - Non-Labor Expenses)
CREATE TABLE public.costs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  company_id uuid REFERENCES companies(id),
  vendor_type text,
  vendor_id uuid,
  description text NOT NULL,
  cost_code_id uuid REFERENCES cost_codes(id),
  category text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  date_incurred date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'unpaid'::text,
  payment_id uuid REFERENCES vendor_payments(id),
  paid_date date,
  notes text,
  quantity numeric,
  unit_cost numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Customer Payments
CREATE TABLE public.customer_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  invoice_id uuid REFERENCES invoices(id),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL,
  payment_method text,
  reference_number text,
  notes text,
  applied_to_retention numeric DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Daily Logs (Legacy - Read Only)
CREATE TABLE public.daily_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL DEFAULT CURRENT_DATE,
  worker_id uuid NOT NULL REFERENCES workers(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  hours_worked numeric NOT NULL,
  notes text,
  trade_id uuid REFERENCES trades(id),
  cost_code_id uuid REFERENCES cost_codes(id),
  payment_status text DEFAULT 'unpaid'::text,
  paid_amount numeric DEFAULT 0,
  payment_id uuid REFERENCES payments(id),
  schedule_id uuid REFERENCES work_schedules(id),
  last_synced_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Day Cards (Legacy - Read Only)
CREATE TABLE public.day_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id uuid NOT NULL REFERENCES workers(id),
  date date NOT NULL,
  scheduled_hours numeric DEFAULT 0,
  logged_hours numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled'::text,
  pay_rate numeric,
  pay_status text DEFAULT 'unpaid'::text,
  company_id uuid REFERENCES companies(id),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  lifecycle_status text DEFAULT 'scheduled'::text,
  locked boolean DEFAULT false,
  approved_at timestamp with time zone,
  approved_by uuid,
  paid_at timestamp with time zone,
  archived_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(worker_id, date)
);

-- Day Card Jobs (Legacy - Read Only)
CREATE TABLE public.day_card_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_card_id uuid NOT NULL REFERENCES day_cards(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  trade_id uuid REFERENCES trades(id),
  cost_code_id uuid REFERENCES cost_codes(id),
  hours numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Documents
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint,
  mime_type text,
  storage_path text,
  project_id uuid REFERENCES projects(id),
  owner_type text,
  owner_id uuid,
  cost_code_id uuid REFERENCES cost_codes(id),
  title text,
  description text,
  doc_type text,
  document_type text,
  document_date date,
  amount numeric,
  vendor_name text,
  tags text[],
  status text,
  source text,
  auto_classified boolean DEFAULT false,
  extracted_text text,
  ai_status text,
  ai_doc_type text,
  ai_title text,
  ai_summary text,
  ai_counterparty_name text,
  ai_total_amount numeric,
  ai_currency text DEFAULT 'USD'::text,
  ai_effective_date date,
  ai_expiration_date date,
  ai_tags text[],
  ai_extracted_data jsonb,
  ai_last_run_at timestamp with time zone,
  ai_last_run_status text,
  uploaded_by uuid,
  uploaded_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Entity Change Log
CREATE TABLE public.entity_change_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  version integer NOT NULL,
  change_type text NOT NULL,
  change_summary text,
  changes jsonb DEFAULT '{}'::jsonb,
  changed_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Estimate Items
CREATE TABLE public.estimate_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id uuid NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'ea'::text,
  unit_price numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  category text,
  area_name text,
  scope_group text,
  planned_hours numeric,
  is_allowance boolean DEFAULT false,
  cost_code_id uuid REFERENCES cost_codes(id),
  trade_id uuid REFERENCES trades(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Estimates
CREATE TABLE public.estimates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text,
  subtotal_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  margin_percent numeric DEFAULT 0,
  is_budget_source boolean DEFAULT false,
  version integer DEFAULT 1,
  parent_estimate_id uuid REFERENCES estimates(id),
  change_log jsonb DEFAULT '[]'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Invitations
CREATE TABLE public.invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'field_user'::app_role,
  invited_by uuid,
  used boolean DEFAULT false,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Invoice Items
CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'ea'::text,
  unit_price numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  category text,
  cost_code_id uuid REFERENCES cost_codes(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Invoices
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  invoice_number text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status text NOT NULL DEFAULT 'draft'::text,
  client_name text,
  subtotal_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  retention_percent numeric DEFAULT 10,
  retention_amount numeric DEFAULT 0,
  previously_invoiced numeric DEFAULT 0,
  balance_to_finish numeric DEFAULT 0,
  sov_based boolean DEFAULT false,
  payment_terms text DEFAULT 'Net 30'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Labor Pay Run Items (Canonical)
CREATE TABLE public.labor_pay_run_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pay_run_id uuid NOT NULL REFERENCES labor_pay_runs(id) ON DELETE CASCADE,
  time_log_id uuid NOT NULL REFERENCES time_logs(id),
  worker_id uuid REFERENCES workers(id),
  hours numeric,
  rate numeric,
  amount numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Labor Pay Runs (Canonical)
CREATE TABLE public.labor_pay_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  payer_company_id uuid REFERENCES companies(id),
  payee_company_id uuid REFERENCES companies(id),
  total_hours numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  status text DEFAULT 'draft'::text,
  payment_date date,
  payment_method text,
  payment_reference text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Material Receipts
CREATE TABLE public.material_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  vendor text NOT NULL,
  vendor_id uuid REFERENCES material_vendors(id),
  receipt_date date NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric DEFAULT 0,
  shipping numeric DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  cost_code_id uuid REFERENCES cost_codes(id),
  notes text,
  linked_cost_id uuid REFERENCES costs(id),
  linked_document_id uuid REFERENCES documents(id),
  receipt_document_id uuid REFERENCES documents(id),
  auto_classified boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Material Vendors
CREATE TABLE public.material_vendors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  company_name text,
  phone text,
  email text,
  notes text,
  trade_id uuid REFERENCES trades(id),
  default_cost_code_id uuid REFERENCES cost_codes(id),
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Payments (Legacy - Read Only)
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  start_date date NOT NULL,
  end_date date NOT NULL,
  paid_by text NOT NULL,
  paid_via text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  reimbursement_status text,
  reimbursement_date date,
  company_id uuid REFERENCES companies(id),
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Project Budget Lines
CREATE TABLE public.project_budget_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  cost_code_id uuid REFERENCES cost_codes(id),
  category text NOT NULL,
  description text,
  budget_amount numeric NOT NULL DEFAULT 0,
  budget_hours numeric,
  actual_cost numeric DEFAULT 0,
  actual_hours numeric DEFAULT 0,
  estimated_cost numeric,
  estimated_hours numeric,
  variance numeric DEFAULT 0,
  percent_complete numeric DEFAULT 0,
  forecast_at_completion numeric DEFAULT 0,
  is_allowance boolean DEFAULT false,
  source_estimate_id uuid REFERENCES estimates(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Project Budgets
CREATE TABLE public.project_budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) UNIQUE,
  labor_budget numeric DEFAULT 0,
  subs_budget numeric DEFAULT 0,
  materials_budget numeric DEFAULT 0,
  other_budget numeric DEFAULT 0,
  baseline_estimate_id uuid REFERENCES estimates(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Projects (Canonical)
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name text NOT NULL,
  project_number text,
  status text DEFAULT 'active'::text,
  start_date date,
  end_date date,
  street_address text,
  city text,
  state text,
  zip_code text,
  client_name text,
  client_email text,
  client_phone text,
  description text,
  notes text,
  company_id uuid REFERENCES companies(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Proposal Events
CREATE TABLE public.proposal_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_name text,
  actor_email text,
  actor_ip text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Proposal Sections
CREATE TABLE public.proposal_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  section_type text NOT NULL,
  title text,
  content jsonb DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Proposal Settings
CREATE TABLE public.proposal_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text,
  company_logo_url text,
  company_address text,
  company_phone text,
  company_email text,
  default_payment_terms text,
  default_validity_period integer DEFAULT 30,
  default_template jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Proposal Templates
CREATE TABLE public.proposal_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  sections jsonb DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Proposals
CREATE TABLE public.proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  title text NOT NULL,
  proposal_number text,
  status text DEFAULT 'draft'::text,
  valid_until date,
  subtotal numeric DEFAULT 0,
  tax_percent numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  payment_terms text,
  cover_content jsonb DEFAULT '{}'::jsonb,
  acceptance_status text DEFAULT 'pending'::text,
  acceptance_date timestamp with time zone,
  accepted_by_name text,
  accepted_by_email text,
  acceptance_notes text,
  client_signature text,
  acceptance_ip text,
  public_token text UNIQUE,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Schedule of Values Items
CREATE TABLE public.schedule_of_values_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  cost_code_id uuid REFERENCES cost_codes(id),
  description text NOT NULL,
  scheduled_value numeric NOT NULL,
  previous_billed numeric DEFAULT 0,
  current_billed numeric DEFAULT 0,
  total_billed numeric DEFAULT 0,
  percent_complete numeric DEFAULT 0,
  retention_percent numeric DEFAULT 10,
  retention_amount numeric DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Scope Blocks
CREATE TABLE public.scope_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id uuid NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  scope_group text NOT NULL,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Scope Items
CREATE TABLE public.scope_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_block_id uuid NOT NULL REFERENCES scope_blocks(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'ea'::text,
  unit_price numeric NOT NULL DEFAULT 0,
  markup_percent numeric DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  trade_id uuid REFERENCES trades(id),
  cost_code_id uuid REFERENCES cost_codes(id),
  is_allowance boolean DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Sub Contracts
CREATE TABLE public.sub_contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  sub_id uuid NOT NULL REFERENCES subs(id),
  contract_amount numeric NOT NULL,
  retention_percent numeric DEFAULT 10,
  start_date date,
  end_date date,
  status text DEFAULT 'active'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Sub Invoices
CREATE TABLE public.sub_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  sub_id uuid NOT NULL REFERENCES subs(id),
  invoice_number text NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  amount numeric NOT NULL,
  retention_amount numeric DEFAULT 0,
  status text DEFAULT 'unpaid'::text,
  paid_date date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Sub Logs (Legacy - Read Only for Financial Aggregation)
CREATE TABLE public.sub_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  sub_id uuid NOT NULL REFERENCES subs(id),
  date date NOT NULL DEFAULT CURRENT_DATE,
  hours_worked numeric NOT NULL,
  workers_count integer DEFAULT 1,
  cost_code_id uuid REFERENCES cost_codes(id),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Sub Scheduled Shifts (Legacy - Read Only)
CREATE TABLE public.sub_scheduled_shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_id uuid NOT NULL REFERENCES subs(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  scheduled_date date NOT NULL,
  scheduled_hours numeric NOT NULL DEFAULT 8,
  workers_count integer DEFAULT 1,
  cost_code_id uuid REFERENCES cost_codes(id),
  notes text,
  status text DEFAULT 'planned'::text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Subs (Subcontractors)
CREATE TABLE public.subs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  company_name text,
  email text,
  phone text,
  address text,
  trade_id uuid REFERENCES trades(id),
  default_cost_code_id uuid REFERENCES cost_codes(id),
  hourly_rate numeric,
  status text DEFAULT 'active'::text,
  notes text,
  compliance_coi_expiration date,
  compliance_w9_received boolean DEFAULT false,
  compliance_license_expiration date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Time Log Allocations (Legacy - Read Only)
CREATE TABLE public.time_log_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_card_id uuid NOT NULL REFERENCES day_cards(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id),
  trade_id uuid REFERENCES trades(id),
  cost_code_id uuid REFERENCES cost_codes(id),
  hours numeric NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Time Logs (Canonical - Actual Labor)
CREATE TABLE public.time_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id uuid NOT NULL REFERENCES workers(id),
  date date NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(id),
  company_id uuid REFERENCES companies(id),
  trade_id uuid REFERENCES trades(id),
  cost_code_id uuid REFERENCES cost_codes(id),
  hours_worked numeric NOT NULL,
  hourly_rate numeric,
  labor_cost numeric GENERATED ALWAYS AS (hours_worked * COALESCE(hourly_rate, 0)) STORED,
  notes text,
  payment_status text DEFAULT 'unpaid'::text,
  paid_amount numeric,
  source_schedule_id uuid REFERENCES work_schedules(id),
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Trades
CREATE TABLE public.trades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  default_labor_cost_code_id uuid REFERENCES cost_codes(id),
  default_sub_cost_code_id uuid REFERENCES cost_codes(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'field_user'::app_role,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Vendor Payment Items
CREATE TABLE public.vendor_payment_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES vendor_payments(id) ON DELETE CASCADE,
  cost_id uuid NOT NULL REFERENCES costs(id),
  amount numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Vendor Payments
CREATE TABLE public.vendor_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id),
  vendor_type text NOT NULL,
  vendor_id uuid NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL,
  method text,
  reference text,
  notes text,
  status text DEFAULT 'recorded'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Work Schedules (Canonical - Planned Labor)
CREATE TABLE public.work_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id uuid NOT NULL REFERENCES workers(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  company_id uuid REFERENCES companies(id),
  trade_id uuid REFERENCES trades(id),
  cost_code_id uuid REFERENCES cost_codes(id),
  scheduled_date date NOT NULL,
  scheduled_hours numeric NOT NULL,
  notes text,
  status text DEFAULT 'planned'::text,
  converted_to_timelog boolean DEFAULT false,
  last_synced_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Workers
CREATE TABLE public.workers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  hourly_rate numeric,
  trade_id uuid REFERENCES trades(id),
  status text DEFAULT 'active'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Activity Log
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- Costs
CREATE INDEX idx_costs_project ON costs(project_id);
CREATE INDEX idx_costs_status ON costs(status);
CREATE INDEX idx_costs_category ON costs(category);
CREATE INDEX idx_costs_date_incurred ON costs(date_incurred);
CREATE INDEX idx_costs_vendor ON costs(vendor_type, vendor_id);

-- Documents
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_documents_owner ON documents(owner_type, owner_id);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at DESC);

-- Invoices
CREATE INDEX idx_invoices_project_status ON invoices(project_id, status);

-- Labor Pay Run Items
CREATE INDEX idx_labor_pay_run_items_pay_run ON labor_pay_run_items(pay_run_id);
CREATE INDEX idx_labor_pay_run_items_time_log ON labor_pay_run_items(time_log_id);

-- Labor Pay Runs
CREATE INDEX idx_labor_pay_runs_date_range ON labor_pay_runs(date_range_start, date_range_end);
CREATE INDEX idx_labor_pay_runs_status ON labor_pay_runs(status);

-- Material Receipts
CREATE INDEX idx_material_receipts_project ON material_receipts(project_id);
CREATE INDEX idx_material_receipts_vendor ON material_receipts(vendor_id);

-- Project Budget Lines
CREATE INDEX idx_project_budget_lines_project ON project_budget_lines(project_id);
CREATE INDEX idx_project_budget_lines_cost_code ON project_budget_lines(cost_code_id);

-- Time Logs
CREATE INDEX idx_time_logs_worker_date ON time_logs(worker_id, date);
CREATE INDEX idx_time_logs_project ON time_logs(project_id);
CREATE INDEX idx_time_logs_date ON time_logs(date);
CREATE INDEX idx_time_logs_payment_status ON time_logs(payment_status);
CREATE INDEX idx_time_logs_source_schedule ON time_logs(source_schedule_id);

-- Vendor Payment Items
CREATE INDEX idx_vendor_payment_items_payment ON vendor_payment_items(payment_id);
CREATE INDEX idx_vendor_payment_items_cost ON vendor_payment_items(cost_id);

-- Work Schedules
CREATE INDEX idx_work_schedules_worker_date ON work_schedules(worker_id, scheduled_date);
CREATE INDEX idx_work_schedules_project ON work_schedules(project_id);
CREATE INDEX idx_work_schedules_date ON work_schedules(scheduled_date);
CREATE INDEX idx_work_schedules_status ON work_schedules(status);

-- =====================================================
-- VIEWS
-- =====================================================

-- Company Payroll Summary
CREATE VIEW company_payroll_summary AS
SELECT 
  c.id AS company_id,
  c.name AS company_name,
  COUNT(DISTINCT dc.worker_id) AS worker_count,
  SUM(dc.logged_hours) AS total_hours,
  SUM(CASE WHEN dc.pay_status = 'unpaid' AND dc.logged_hours > 0 THEN dc.logged_hours * dc.pay_rate ELSE 0 END) AS total_unpaid,
  SUM(CASE WHEN dc.pay_status = 'paid' AND dc.logged_hours > 0 THEN dc.logged_hours * dc.pay_rate ELSE 0 END) AS total_paid,
  MAX(dc.date) AS last_activity_date
FROM companies c
LEFT JOIN day_cards dc ON dc.company_id = c.id
WHERE dc.logged_hours > 0
GROUP BY c.id, c.name;

-- Project Labor Summary View (Canonical)
CREATE VIEW project_labor_summary_view AS
SELECT
  tl.project_id,
  tl.cost_code_id,
  SUM(tl.hours_worked) AS total_hours,
  SUM(tl.labor_cost) AS total_labor_cost,
  SUM(CASE WHEN tl.payment_status = 'unpaid' THEN tl.labor_cost ELSE 0 END) AS unpaid_labor_cost,
  SUM(CASE WHEN tl.payment_status = 'paid' THEN tl.labor_cost ELSE 0 END) AS paid_labor_cost,
  COUNT(DISTINCT tl.worker_id) AS worker_count,
  COUNT(*) AS entry_count
FROM time_logs tl
GROUP BY tl.project_id, tl.cost_code_id;

-- Project Cost Summary View (Canonical)
CREATE VIEW project_cost_summary_view AS
SELECT
  c.project_id,
  c.category,
  c.cost_code_id,
  SUM(c.amount) AS total_cost,
  SUM(CASE WHEN c.status = 'unpaid' THEN c.amount ELSE 0 END) AS unpaid_cost,
  SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END) AS paid_cost,
  COUNT(*) AS cost_count
FROM costs c
WHERE c.status != 'void'
GROUP BY c.project_id, c.category, c.cost_code_id;

-- Project Revenue Summary View
CREATE VIEW project_revenue_summary_view AS
SELECT
  i.project_id,
  SUM(i.total_amount) AS billed_amount
FROM invoices i
WHERE i.status != 'void'
GROUP BY i.project_id;

-- Global Financial Summary View
CREATE VIEW global_financial_summary_view AS
WITH labor_summary AS (
  SELECT
    COALESCE(SUM(labor_cost), 0) AS total_labor_cost,
    COALESCE(SUM(CASE WHEN payment_status = 'unpaid' THEN labor_cost ELSE 0 END), 0) AS unpaid_labor_cost
  FROM time_logs
),
costs_summary AS (
  SELECT
    COALESCE(SUM(CASE WHEN category = 'subs' THEN amount ELSE 0 END), 0) AS subs_cost,
    COALESCE(SUM(CASE WHEN category = 'subs' AND status = 'unpaid' THEN amount ELSE 0 END), 0) AS subs_unpaid,
    COALESCE(SUM(CASE WHEN category = 'materials' THEN amount ELSE 0 END), 0) AS materials_cost,
    COALESCE(SUM(CASE WHEN category = 'materials' AND status = 'unpaid' THEN amount ELSE 0 END), 0) AS materials_unpaid,
    COALESCE(SUM(CASE WHEN category = 'misc' THEN amount ELSE 0 END), 0) AS misc_cost,
    COALESCE(SUM(CASE WHEN category = 'misc' AND status = 'unpaid' THEN amount ELSE 0 END), 0) AS misc_unpaid
  FROM costs
  WHERE status != 'void'
),
revenue_summary AS (
  SELECT COALESCE(SUM(total_amount), 0) AS total_revenue
  FROM estimates
  WHERE status = 'accepted'
)
SELECT
  r.total_revenue AS revenue,
  l.total_labor_cost AS labor_actual,
  l.unpaid_labor_cost AS labor_unpaid,
  c.subs_cost AS subs_actual,
  c.subs_unpaid,
  c.materials_cost AS materials_actual,
  c.materials_unpaid,
  c.misc_cost AS misc_actual,
  c.misc_unpaid,
  (l.total_labor_cost + c.subs_cost + c.materials_cost + c.misc_cost) AS total_costs,
  (r.total_revenue - (l.total_labor_cost + c.subs_cost + c.materials_cost + c.misc_cost)) AS profit,
  (l.unpaid_labor_cost + c.subs_unpaid + c.materials_unpaid + c.misc_unpaid) AS total_outstanding,
  0 AS retention_held
FROM labor_summary l, costs_summary c, revenue_summary r;

-- Workers Public View
CREATE VIEW workers_public AS
SELECT
  id,
  name,
  email,
  phone,
  hourly_rate,
  trade_id,
  status
FROM workers;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Auto-populate company_id from project
CREATE OR REPLACE FUNCTION auto_populate_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM projects
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Auto-populate worker hourly_rate
CREATE OR REPLACE FUNCTION auto_populate_worker_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.hourly_rate IS NULL AND NEW.worker_id IS NOT NULL THEN
    SELECT hourly_rate INTO NEW.hourly_rate
    FROM workers
    WHERE id = NEW.worker_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Auto-set schedule trade from worker
CREATE OR REPLACE FUNCTION auto_set_schedule_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_worker_trade_id uuid;
BEGIN
  IF NEW.trade_id IS NULL THEN
    SELECT trade_id INTO v_worker_trade_id
    FROM workers
    WHERE id = NEW.worker_id;
    NEW.trade_id := v_worker_trade_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Auto-set time log trade and cost code
CREATE OR REPLACE FUNCTION auto_set_time_log_trade_and_cost_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_worker_trade_id uuid;
  v_schedule_trade_id uuid;
  v_final_trade_id uuid;
  v_cost_code_id uuid;
BEGIN
  -- Priority 1: explicit value
  IF NEW.trade_id IS NOT NULL THEN
    v_final_trade_id := NEW.trade_id;
  -- Priority 2: from linked schedule
  ELSIF NEW.source_schedule_id IS NOT NULL THEN
    SELECT trade_id INTO v_schedule_trade_id
    FROM work_schedules
    WHERE id = NEW.source_schedule_id;
    v_final_trade_id := v_schedule_trade_id;
  END IF;
  
  -- Priority 3: from worker
  IF v_final_trade_id IS NULL THEN
    SELECT trade_id INTO v_worker_trade_id
    FROM workers
    WHERE id = NEW.worker_id;
    v_final_trade_id := v_worker_trade_id;
  END IF;
  
  NEW.trade_id := v_final_trade_id;
  
  -- Auto-assign cost code if missing
  IF NEW.cost_code_id IS NULL AND v_final_trade_id IS NOT NULL THEN
    SELECT default_labor_cost_code_id INTO v_cost_code_id
    FROM trades
    WHERE id = v_final_trade_id;
    NEW.cost_code_id := v_cost_code_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Sync work_schedule to time_log
CREATE OR REPLACE FUNCTION sync_work_schedule_to_time_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_existing_timelog_id UUID;
  v_should_sync BOOLEAN := FALSE;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.scheduled_date < CURRENT_DATE THEN
    v_should_sync := TRUE;
  ELSIF (NEW.converted_to_timelog = TRUE AND COALESCE(OLD.converted_to_timelog, FALSE) = FALSE) THEN
    v_should_sync := TRUE;
  END IF;

  IF NOT v_should_sync THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing_timelog_id
  FROM time_logs
  WHERE source_schedule_id = NEW.id
  LIMIT 1;

  IF v_existing_timelog_id IS NOT NULL THEN
    UPDATE time_logs
    SET
      worker_id = NEW.worker_id,
      company_id = NEW.company_id,
      project_id = NEW.project_id,
      trade_id = NEW.trade_id,
      cost_code_id = NEW.cost_code_id,
      hours_worked = NEW.scheduled_hours,
      notes = NEW.notes,
      date = NEW.scheduled_date,
      last_synced_at = now()
    WHERE id = v_existing_timelog_id;
  ELSE
    INSERT INTO time_logs (
      source_schedule_id, worker_id, company_id, project_id,
      trade_id, cost_code_id, hours_worked, notes, date, last_synced_at
    ) VALUES (
      NEW.id, NEW.worker_id, NEW.company_id, NEW.project_id,
      NEW.trade_id, NEW.cost_code_id, NEW.scheduled_hours, NEW.notes,
      NEW.scheduled_date, now()
    );
  END IF;

  IF NEW.status != 'synced' THEN
    UPDATE work_schedules
    SET status = 'synced', converted_to_timelog = TRUE, last_synced_at = now()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Sync time_log back to work_schedule
CREATE OR REPLACE FUNCTION sync_time_log_to_work_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  schedule_date DATE;
BEGIN
  IF NEW.source_schedule_id IS NOT NULL THEN
    SELECT scheduled_date INTO schedule_date
    FROM work_schedules
    WHERE id = NEW.source_schedule_id;
    
    IF schedule_date IS NOT NULL AND schedule_date < CURRENT_DATE THEN
      UPDATE work_schedules
      SET
        worker_id = NEW.worker_id,
        project_id = NEW.project_id,
        company_id = NEW.company_id,
        trade_id = NEW.trade_id,
        cost_code_id = NEW.cost_code_id,
        scheduled_hours = NEW.hours_worked,
        notes = NEW.notes,
        scheduled_date = NEW.date,
        status = 'synced',
        last_synced_at = now()
      WHERE id = NEW.source_schedule_id
      AND (
        worker_id IS DISTINCT FROM NEW.worker_id OR
        project_id IS DISTINCT FROM NEW.project_id OR
        company_id IS DISTINCT FROM NEW.company_id OR
        trade_id IS DISTINCT FROM NEW.trade_id OR
        cost_code_id IS DISTINCT FROM NEW.cost_code_id OR
        scheduled_hours IS DISTINCT FROM NEW.hours_worked OR
        notes IS DISTINCT FROM NEW.notes OR
        scheduled_date IS DISTINCT FROM NEW.date
      );
      
      NEW.last_synced_at := now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Mark time logs paid when pay run is paid
CREATE OR REPLACE FUNCTION mark_time_logs_paid_on_pay_run()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    UPDATE time_logs
    SET 
      payment_status = 'paid',
      paid_amount = labor_cost
    FROM labor_pay_run_items
    WHERE labor_pay_run_items.time_log_id = time_logs.id
    AND labor_pay_run_items.pay_run_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Mark costs paid when vendor payment is recorded
CREATE OR REPLACE FUNCTION mark_costs_paid_on_vendor_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status = 'recorded' AND (OLD.status IS NULL OR OLD.status <> 'recorded') THEN
    UPDATE costs c
    SET
      status = 'paid',
      paid_date = NEW.payment_date,
      payment_id = NEW.id,
      updated_at = now()
    FROM vendor_payment_items i
    WHERE i.payment_id = NEW.id
      AND i.cost_id = c.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Split schedule for multi-project
CREATE OR REPLACE FUNCTION split_schedule_for_multi_project(
  p_original_schedule_id uuid,
  p_time_log_entries jsonb
)
RETURNS TABLE(schedule_id uuid, time_log_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_original_schedule RECORD;
  v_entry JSONB;
  v_new_schedule_id UUID;
  v_new_timelog_id UUID;
  v_first_iteration BOOLEAN := true;
  v_existing_timelog_id UUID;
  v_cost_code_id UUID;
BEGIN
  SELECT * INTO v_original_schedule
  FROM work_schedules
  WHERE id = p_original_schedule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original schedule not found: %', p_original_schedule_id;
  END IF;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_time_log_entries)
  LOOP
    v_cost_code_id := COALESCE((v_entry->>'cost_code_id')::UUID, v_original_schedule.cost_code_id);

    IF v_first_iteration THEN
      UPDATE work_schedules
      SET
        project_id = (v_entry->>'project_id')::UUID,
        scheduled_hours = (v_entry->>'hours')::NUMERIC,
        trade_id = (v_entry->>'trade_id')::UUID,
        cost_code_id = v_cost_code_id,
        notes = COALESCE(v_entry->>'notes', notes),
        status = 'split_modified',
        converted_to_timelog = true,
        updated_at = now(),
        last_synced_at = now()
      WHERE id = p_original_schedule_id
      RETURNING id INTO v_new_schedule_id;

      SELECT id INTO v_existing_timelog_id
      FROM time_logs
      WHERE source_schedule_id = v_new_schedule_id;

      IF v_existing_timelog_id IS NOT NULL THEN
        UPDATE time_logs
        SET
          project_id = (v_entry->>'project_id')::UUID,
          hours_worked = (v_entry->>'hours')::NUMERIC,
          trade_id = (v_entry->>'trade_id')::UUID,
          cost_code_id = v_cost_code_id,
          notes = v_entry->>'notes',
          last_synced_at = now()
        WHERE id = v_existing_timelog_id
        RETURNING id INTO v_new_timelog_id;
      ELSE
        INSERT INTO time_logs (
          source_schedule_id, worker_id, project_id, trade_id, cost_code_id,
          hours_worked, notes, date, company_id, last_synced_at
        ) VALUES (
          v_new_schedule_id, v_original_schedule.worker_id,
          (v_entry->>'project_id')::UUID, (v_entry->>'trade_id')::UUID,
          v_cost_code_id, (v_entry->>'hours')::NUMERIC, v_entry->>'notes',
          v_original_schedule.scheduled_date, v_original_schedule.company_id, now()
        )
        RETURNING id INTO v_new_timelog_id;
      END IF;

      v_first_iteration := false;
    ELSE
      INSERT INTO work_schedules (
        worker_id, project_id, trade_id, cost_code_id, scheduled_date,
        scheduled_hours, notes, status, created_by, company_id,
        converted_to_timelog, last_synced_at
      ) VALUES (
        v_original_schedule.worker_id, (v_entry->>'project_id')::UUID,
        (v_entry->>'trade_id')::UUID, v_cost_code_id,
        v_original_schedule.scheduled_date, (v_entry->>'hours')::NUMERIC,
        v_entry->>'notes', 'split_created', v_original_schedule.created_by,
        v_original_schedule.company_id, true, now()
      )
      RETURNING id INTO v_new_schedule_id;

      IF v_new_schedule_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create new schedule for split';
      END IF;

      INSERT INTO time_logs (
        source_schedule_id, worker_id, project_id, trade_id, cost_code_id,
        hours_worked, notes, date, company_id, last_synced_at
      ) VALUES (
        v_new_schedule_id, v_original_schedule.worker_id,
        (v_entry->>'project_id')::UUID, (v_entry->>'trade_id')::UUID,
        v_cost_code_id, (v_entry->>'hours')::NUMERIC, v_entry->>'notes',
        v_original_schedule.scheduled_date, v_original_schedule.company_id, now()
      )
      RETURNING id INTO v_new_timelog_id;
    END IF;

    RETURN QUERY SELECT v_new_schedule_id, v_new_timelog_id;
  END LOOP;
END;
$$;

-- Split time log for multi-project
CREATE OR REPLACE FUNCTION split_time_log_for_multi_project(
  p_original_time_log_id uuid,
  p_entries jsonb
)
RETURNS TABLE(time_log_id uuid, source_schedule_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_original_log RECORD;
  v_entry JSONB;
  v_new_timelog_id UUID;
  v_first_iteration BOOLEAN := true;
  v_cost_code_id UUID;
BEGIN
  SELECT * INTO v_original_log
  FROM time_logs
  WHERE id = p_original_time_log_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original time log not found: %', p_original_time_log_id;
  END IF;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    v_cost_code_id := COALESCE((v_entry->>'cost_code_id')::UUID, v_original_log.cost_code_id);

    IF v_first_iteration THEN
      UPDATE time_logs
      SET
        project_id = (v_entry->>'project_id')::UUID,
        hours_worked = (v_entry->>'hours')::NUMERIC,
        trade_id = (v_entry->>'trade_id')::UUID,
        cost_code_id = v_cost_code_id,
        notes = v_entry->>'notes',
        last_synced_at = now()
      WHERE id = p_original_time_log_id
      RETURNING id INTO v_new_timelog_id;

      v_first_iteration := false;
    ELSE
      INSERT INTO time_logs (
        source_schedule_id, worker_id, project_id, trade_id, cost_code_id,
        hours_worked, notes, date, company_id, last_synced_at
      ) VALUES (
        v_original_log.source_schedule_id, v_original_log.worker_id,
        (v_entry->>'project_id')::UUID, (v_entry->>'trade_id')::UUID,
        v_cost_code_id, (v_entry->>'hours')::NUMERIC, v_entry->>'notes',
        v_original_log.date, v_original_log.company_id, now()
      )
      RETURNING id INTO v_new_timelog_id;
    END IF;

    RETURN QUERY SELECT v_new_timelog_id, v_original_log.source_schedule_id;
  END LOOP;
END;
$$;

-- Sync estimate to budget
CREATE OR REPLACE FUNCTION sync_estimate_to_budget(p_estimate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_project_id UUID;
  v_labor_total NUMERIC := 0;
  v_subs_total NUMERIC := 0;
  v_materials_total NUMERIC := 0;
  v_other_total NUMERIC := 0;
BEGIN
  SELECT project_id INTO v_project_id
  FROM estimates
  WHERE id = p_estimate_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Estimate not found';
  END IF;

  UPDATE estimates SET is_budget_source = false
  WHERE project_id = v_project_id AND id != p_estimate_id;

  UPDATE estimates
  SET is_budget_source = true, status = 'accepted', updated_at = now()
  WHERE id = p_estimate_id;

  SELECT 
    COALESCE(SUM(CASE WHEN category = 'Labor' THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category IN ('Subs', 'Subcontractors') THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'Materials' THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category IN ('Allowance', 'Other') THEN line_total ELSE 0 END), 0)
  INTO v_labor_total, v_subs_total, v_materials_total, v_other_total
  FROM estimate_items
  WHERE estimate_id = p_estimate_id;

  INSERT INTO project_budgets (
    project_id, labor_budget, subs_budget, materials_budget,
    other_budget, baseline_estimate_id
  ) VALUES (
    v_project_id, v_labor_total, v_subs_total, v_materials_total,
    v_other_total, p_estimate_id
  )
  ON CONFLICT (project_id) DO UPDATE SET
    labor_budget = EXCLUDED.labor_budget,
    subs_budget = EXCLUDED.subs_budget,
    materials_budget = EXCLUDED.materials_budget,
    other_budget = EXCLUDED.other_budget,
    baseline_estimate_id = EXCLUDED.baseline_estimate_id,
    updated_at = now();

  DELETE FROM project_budget_lines WHERE project_id = v_project_id;

  INSERT INTO project_budget_lines (
    project_id, cost_code_id, category, description,
    budget_amount, budget_hours, is_allowance, source_estimate_id
  )
  SELECT 
    v_project_id,
    cost_code_id,
    CASE 
      WHEN category = 'Labor' THEN 'labor'
      WHEN category IN ('Subs', 'Subcontractors') THEN 'subs'
      WHEN category = 'Materials' THEN 'materials'
      ELSE 'other'
    END,
    string_agg(DISTINCT description, ' | '),
    SUM(line_total),
    SUM(planned_hours),
    bool_and(is_allowance),
    p_estimate_id
  FROM estimate_items
  WHERE estimate_id = p_estimate_id
  GROUP BY cost_code_id, 
    CASE 
      WHEN category = 'Labor' THEN 'labor'
      WHEN category IN ('Subs', 'Subcontractors') THEN 'subs'
      WHEN category = 'Materials' THEN 'materials'
      ELSE 'other'
    END;
END;
$$;

-- Sync material receipt to cost
CREATE OR REPLACE FUNCTION sync_material_receipt_to_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_vendor_name TEXT;
  v_description TEXT;
BEGIN
  IF NEW.vendor_id IS NOT NULL THEN
    SELECT name INTO v_vendor_name FROM material_vendors WHERE id = NEW.vendor_id;
  END IF;
  
  IF v_vendor_name IS NULL THEN
    v_vendor_name := COALESCE(NEW.vendor, 'Unknown Vendor');
  END IF;

  v_description := 'Material Receipt - ' || v_vendor_name;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO costs (
      project_id, vendor_id, vendor_type, cost_code_id, category,
      amount, date_incurred, description, notes, status
    ) VALUES (
      NEW.project_id, NEW.vendor_id, 'material_vendor', NEW.cost_code_id,
      'materials', NEW.total, NEW.receipt_date, v_description, NEW.notes, 'unpaid'
    )
    RETURNING id INTO NEW.linked_cost_id;
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.linked_cost_id IS NOT NULL THEN
      UPDATE costs
      SET
        project_id = NEW.project_id,
        vendor_id = NEW.vendor_id,
        vendor_type = 'material_vendor',
        cost_code_id = NEW.cost_code_id,
        category = 'materials',
        amount = NEW.total,
        date_incurred = NEW.receipt_date,
        description = v_description,
        notes = NEW.notes,
        updated_at = now()
      WHERE id = NEW.linked_cost_id;
    ELSE
      INSERT INTO costs (
        project_id, vendor_id, vendor_type, cost_code_id, category,
        amount, date_incurred, description, notes, status
      ) VALUES (
        NEW.project_id, NEW.vendor_id, 'material_vendor', NEW.cost_code_id,
        'materials', NEW.total, NEW.receipt_date, v_description, NEW.notes, 'unpaid'
      )
      RETURNING id INTO NEW.linked_cost_id;
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.linked_cost_id IS NOT NULL THEN
      DELETE FROM costs WHERE id = OLD.linked_cost_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Log activity
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO activity_log (entity_type, entity_id, action, actor_id, metadata)
  VALUES (
    TG_ARGV[0]::TEXT,
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' THEN 'updated'
      WHEN TG_OP = 'DELETE' THEN 'deleted'
    END,
    COALESCE(
      CASE WHEN TG_OP = 'INSERT' THEN NEW.created_by ELSE NULL END,
      auth.uid()
    ),
    CASE
      WHEN TG_OP = 'UPDATE' THEN 
        jsonb_build_object('new', to_jsonb(NEW), 'old', to_jsonb(OLD))
      WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW)
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE '{}'::jsonb
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-populate triggers on work_schedules
CREATE TRIGGER auto_populate_company_id_work_schedules
  BEFORE INSERT ON work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_company_id();

CREATE TRIGGER auto_set_schedule_trade_trigger
  BEFORE INSERT ON work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_schedule_trade();

-- Auto-populate triggers on time_logs
CREATE TRIGGER auto_populate_company_id_time_logs
  BEFORE INSERT ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_company_id();

CREATE TRIGGER auto_populate_worker_rate_time_logs
  BEFORE INSERT ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_worker_rate();

CREATE TRIGGER auto_set_time_log_trade_and_cost_code_trigger
  BEFORE INSERT ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_time_log_trade_and_cost_code();

-- Sync triggers
CREATE TRIGGER sync_work_schedule_to_time_log_trigger
  AFTER INSERT OR UPDATE ON work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION sync_work_schedule_to_time_log();

CREATE TRIGGER sync_time_log_to_work_schedule_trigger
  AFTER INSERT OR UPDATE ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION sync_time_log_to_work_schedule();

-- Payment triggers
CREATE TRIGGER mark_time_logs_paid_trigger
  AFTER UPDATE OF status ON labor_pay_runs
  FOR EACH ROW
  EXECUTE FUNCTION mark_time_logs_paid_on_pay_run();

CREATE TRIGGER mark_costs_paid_trigger
  AFTER INSERT OR UPDATE OF status ON vendor_payments
  FOR EACH ROW
  EXECUTE FUNCTION mark_costs_paid_on_vendor_payment();

-- Material receipt sync trigger
CREATE TRIGGER sync_material_receipt_to_cost_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON material_receipts
  FOR EACH ROW
  EXECUTE FUNCTION sync_material_receipt_to_cost();

-- Updated_at triggers
CREATE TRIGGER update_updated_at_work_schedules
  BEFORE UPDATE ON work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_updated_at_time_logs
  BEFORE UPDATE ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_updated_at_costs
  BEFORE UPDATE ON costs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_card_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_pay_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_pay_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (anyone can read/write for now)
-- In production, these should be restricted based on user roles

CREATE POLICY "Anyone can view activity log" ON activity_log FOR SELECT USING (true);
CREATE POLICY "Anyone can insert activity log" ON activity_log FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view cost codes" ON cost_codes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert cost codes" ON cost_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update cost codes" ON cost_codes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete cost codes" ON cost_codes FOR DELETE USING (true);

CREATE POLICY "Anyone can view costs" ON costs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert costs" ON costs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update costs" ON costs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete costs" ON costs FOR DELETE USING (true);

CREATE POLICY "Anyone can view time logs" ON time_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert time logs" ON time_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update time logs" ON time_logs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete time logs" ON time_logs FOR DELETE USING (true);

CREATE POLICY "Anyone can view work schedules" ON work_schedules FOR SELECT USING (true);
CREATE POLICY "Anyone can insert work schedules" ON work_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update work schedules" ON work_schedules FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete work schedules" ON work_schedules FOR DELETE USING (true);

CREATE POLICY "Anyone can view workers" ON workers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert workers" ON workers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update workers" ON workers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete workers" ON workers FOR DELETE USING (true);

CREATE POLICY "Anyone can view labor pay runs" ON labor_pay_runs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert labor pay runs" ON labor_pay_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update labor pay runs" ON labor_pay_runs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete labor pay runs" ON labor_pay_runs FOR DELETE USING (true);

CREATE POLICY "Anyone can view labor pay run items" ON labor_pay_run_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert labor pay run items" ON labor_pay_run_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update labor pay run items" ON labor_pay_run_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete labor pay run items" ON labor_pay_run_items FOR DELETE USING (true);

-- =====================================================
-- END OF SCHEMA DUMP
-- =====================================================
