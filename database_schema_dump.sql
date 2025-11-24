-- ============================================================================
-- COMPLETE SUPABASE SCHEMA DUMP
-- Generated: 2024-11-24
-- Database: Construction Management System
-- ============================================================================

-- ============================================================================
-- SECTION 1: CUSTOM TYPES (ENUMS)
-- ============================================================================

-- User role enum type
CREATE TYPE app_role AS ENUM ('admin', 'field_user');


-- ============================================================================
-- SECTION 2: TABLE DEFINITIONS
-- ============================================================================

-- Activity Log Table
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT activity_log_entity_type_check CHECK (entity_type IS NOT NULL AND length(entity_type) > 0)
);

-- Archived Daily Logs Table
CREATE TABLE archived_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID NOT NULL,
  date DATE NOT NULL,
  worker_id UUID NOT NULL,
  project_id UUID NOT NULL,
  hours_worked NUMERIC NOT NULL,
  notes TEXT,
  trade_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_by UUID
);

-- Bid Invitations Table
CREATE TABLE bid_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_package_id UUID NOT NULL,
  sub_id UUID NOT NULL,
  status TEXT DEFAULT 'invited',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  notes TEXT,
  CONSTRAINT bid_invitations_bid_package_id_sub_id_key UNIQUE (bid_package_id, sub_id)
);

-- Bid Packages Table
CREATE TABLE bid_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  scope_summary TEXT,
  cost_code_ids UUID[],
  bid_due_date DATE,
  desired_start_date DATE,
  attachments JSONB,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Budget Revisions Table
CREATE TABLE budget_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  revision_number INTEGER NOT NULL,
  revision_type TEXT NOT NULL,
  description TEXT,
  previous_budget NUMERIC,
  revision_amount NUMERIC NOT NULL,
  new_budget NUMERIC NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Companies Table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cost Codes Table
CREATE TABLE cost_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  default_trade_id UUID,
  trade_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cost Entries Table
CREATE TABLE cost_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  cost_code_id UUID,
  entry_type TEXT NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  quantity NUMERIC,
  unit TEXT,
  unit_cost NUMERIC,
  total_cost NUMERIC NOT NULL,
  source_type TEXT,
  source_id UUID,
  vendor_name TEXT,
  invoice_number TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Costs Table
CREATE TABLE costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  company_id UUID,
  vendor_type TEXT,
  vendor_id UUID,
  description TEXT NOT NULL,
  cost_code_id UUID,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  date_incurred DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'unpaid',
  payment_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Customer Payments Table
CREATE TABLE customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  invoice_id UUID,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  applied_to_retention NUMERIC DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Daily Logs Table (Time Logs)
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  worker_id UUID NOT NULL,
  project_id UUID NOT NULL,
  hours_worked NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  trade_id UUID,
  schedule_id UUID,
  last_synced_at TIMESTAMPTZ,
  cost_code_id UUID,
  payment_status TEXT DEFAULT 'unpaid',
  payment_id UUID,
  paid_amount NUMERIC DEFAULT 0
);

-- Day Card Jobs Table
CREATE TABLE day_card_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_card_id UUID NOT NULL,
  project_id UUID NOT NULL,
  trade_id UUID,
  cost_code_id UUID,
  hours NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Day Cards Table
CREATE TABLE day_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL,
  date DATE NOT NULL,
  scheduled_hours NUMERIC DEFAULT 0,
  logged_hours NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled',
  pay_rate NUMERIC,
  pay_status TEXT DEFAULT 'unpaid',
  company_id UUID,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  locked BOOLEAN DEFAULT false,
  lifecycle_status TEXT DEFAULT 'scheduled',
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  paid_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  CONSTRAINT day_cards_worker_id_date_key UNIQUE (worker_id, date)
);

-- Documents Table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  document_type TEXT,
  cost_code_id UUID,
  auto_classified BOOLEAN DEFAULT false,
  extracted_text TEXT,
  tags TEXT[],
  vendor_name TEXT,
  amount NUMERIC,
  document_date DATE,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  owner_type TEXT,
  owner_id UUID,
  storage_path TEXT,
  mime_type TEXT,
  doc_type TEXT,
  title TEXT,
  source TEXT,
  status TEXT,
  ai_status TEXT,
  ai_doc_type TEXT,
  ai_summary TEXT,
  ai_title TEXT,
  ai_counterparty_name TEXT,
  ai_tags TEXT[],
  ai_currency TEXT DEFAULT 'USD',
  ai_last_run_status TEXT,
  ai_extracted_data JSONB,
  ai_effective_date DATE,
  ai_expiration_date DATE,
  ai_total_amount NUMERIC,
  ai_last_run_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  size_bytes BIGINT,
  description TEXT
);

-- Entity Change Log Table
CREATE TABLE entity_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  version INTEGER NOT NULL,
  change_type TEXT NOT NULL,
  change_summary TEXT,
  changed_by UUID,
  changes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Estimate Items Table
CREATE TABLE estimate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'ea',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  trade_id UUID,
  cost_code_id UUID,
  area_name TEXT,
  scope_group TEXT,
  is_allowance BOOLEAN DEFAULT false,
  planned_hours NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Estimates Table
CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  margin_percent NUMERIC DEFAULT 0,
  is_budget_source BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  parent_estimate_id UUID,
  change_log JSONB DEFAULT '[]'::jsonb,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invitations Table
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'field_user',
  invited_by UUID,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invoice Items Table
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'ea',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  cost_code_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invoices Table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  client_name TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  subtotal_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  retention_percent NUMERIC DEFAULT 10,
  retention_amount NUMERIC DEFAULT 0,
  previously_invoiced NUMERIC DEFAULT 0,
  balance_to_finish NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  sov_based BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Labor Pay Run Items Table
CREATE TABLE labor_pay_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id UUID NOT NULL,
  time_log_id UUID NOT NULL,
  worker_id UUID,
  amount NUMERIC NOT NULL,
  hours NUMERIC,
  rate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Labor Pay Runs Table
CREATE TABLE labor_pay_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  status TEXT DEFAULT 'draft',
  total_amount NUMERIC DEFAULT 0,
  payment_method TEXT,
  payer_company_id UUID,
  payee_company_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Material Receipts Table
CREATE TABLE material_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  vendor TEXT NOT NULL,
  vendor_id UUID,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_date DATE NOT NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  shipping NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  cost_code_id UUID,
  linked_document_id UUID,
  receipt_document_id UUID,
  auto_classified BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  linked_cost_id UUID
);

-- Material Vendors Table
CREATE TABLE material_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  trade_id UUID,
  default_cost_code_id UUID,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payments Table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_by TEXT NOT NULL,
  paid_via TEXT,
  reimbursement_status TEXT,
  reimbursement_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Project Budget Lines Table
CREATE TABLE project_budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  cost_code_id UUID,
  category TEXT NOT NULL,
  description TEXT,
  budget_amount NUMERIC NOT NULL DEFAULT 0,
  budget_hours NUMERIC,
  is_allowance BOOLEAN DEFAULT false,
  source_estimate_id UUID,
  estimated_hours NUMERIC,
  actual_hours NUMERIC DEFAULT 0,
  estimated_cost NUMERIC,
  actual_cost NUMERIC DEFAULT 0,
  variance NUMERIC DEFAULT 0,
  percent_complete NUMERIC DEFAULT 0,
  forecast_at_completion NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT project_budget_lines_project_cost_code_unique UNIQUE (project_id, cost_code_id)
);

-- Project Budgets Table
CREATE TABLE project_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE,
  labor_budget NUMERIC DEFAULT 0,
  subs_budget NUMERIC DEFAULT 0,
  materials_budget NUMERIC DEFAULT 0,
  other_budget NUMERIC DEFAULT 0,
  baseline_estimate_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Projects Table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  client_name TEXT,
  address TEXT,
  status TEXT DEFAULT 'planning',
  project_manager TEXT,
  start_date DATE,
  completion_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  company_id UUID,
  archived BOOLEAN DEFAULT false,
  color TEXT,
  project_number TEXT
);

-- Proposals Table
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  primary_estimate_id UUID,
  title TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  public_token TEXT UNIQUE,
  public_link_enabled BOOLEAN DEFAULT false,
  acceptance_status TEXT DEFAULT 'pending',
  acceptance_date TIMESTAMPTZ,
  accepted_by_name TEXT,
  accepted_by_email TEXT,
  acceptance_notes TEXT,
  client_signature TEXT,
  acceptance_ip TEXT
);

-- Proposal Events Table
CREATE TABLE proposal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  actor_name TEXT,
  actor_email TEXT,
  actor_ip TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Proposal Sections Table
CREATE TABLE proposal_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  content_richtext TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  config JSONB,
  group_type TEXT,
  is_visible BOOLEAN DEFAULT true,
  show_section_total BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Schedule Modifications Table
CREATE TABLE schedule_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_schedule_id UUID NOT NULL,
  new_schedule_id UUID,
  modification_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scope Blocks Table
CREATE TABLE scope_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  markup_percent NUMERIC DEFAULT 0,
  margin_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scope Items Table
CREATE TABLE scope_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_block_id UUID NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'ea',
  unit_price NUMERIC DEFAULT 0,
  markup_percent NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  trade_id UUID,
  cost_code_id UUID,
  is_allowance BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scheduled Shifts Table (Legacy - being phased out)
CREATE TABLE scheduled_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL,
  project_id UUID NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_hours NUMERIC NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'scheduled',
  trade_id UUID,
  cost_code_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_synced_at TIMESTAMPTZ,
  converted_to_timelog BOOLEAN DEFAULT false
);

-- SOV Items Table (Schedule of Values)
CREATE TABLE sov_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  scheduled_value NUMERIC NOT NULL DEFAULT 0,
  cost_code_id UUID,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SOV Line Updates Table
CREATE TABLE sov_line_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL,
  sov_item_id UUID NOT NULL,
  work_completed_this_period NUMERIC DEFAULT 0,
  materials_stored NUMERIC DEFAULT 0,
  total_completed_and_stored NUMERIC DEFAULT 0,
  percent_complete NUMERIC DEFAULT 0,
  balance_to_finish NUMERIC DEFAULT 0,
  retention_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sub Contracts Table
CREATE TABLE sub_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  sub_id UUID NOT NULL,
  contract_value NUMERIC NOT NULL DEFAULT 0,
  retention_percentage NUMERIC DEFAULT 10,
  status TEXT DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sub Invoices Table
CREATE TABLE sub_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  invoice_number TEXT,
  invoice_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  retention_held NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  paid_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sub Scheduled Shifts Table
CREATE TABLE sub_scheduled_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_id UUID NOT NULL,
  project_id UUID NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_hours NUMERIC NOT NULL DEFAULT 8,
  crew_size INTEGER DEFAULT 1,
  notes TEXT,
  status TEXT DEFAULT 'scheduled',
  cost_code_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subs (Subcontractors) Table
CREATE TABLE subs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  trade_id UUID,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  insurance_expiration DATE,
  w9_on_file BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  license_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  compliance_coi_expiration DATE,
  compliance_w9_received BOOLEAN DEFAULT false,
  compliance_license_expiration DATE
);

-- Time Log Allocations Table
CREATE TABLE time_log_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_card_id UUID NOT NULL,
  project_id UUID NOT NULL,
  trade_id UUID,
  cost_code_id UUID,
  hours NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Time Logs Table (New system)
CREATE TABLE time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL,
  company_id UUID,
  project_id UUID NOT NULL,
  trade_id UUID,
  cost_code_id UUID,
  date DATE NOT NULL,
  hours_worked NUMERIC NOT NULL,
  hourly_rate NUMERIC,
  labor_cost NUMERIC GENERATED ALWAYS AS (hours_worked * COALESCE(hourly_rate, 0)) STORED,
  notes TEXT,
  payment_status TEXT DEFAULT 'unpaid',
  paid_amount NUMERIC DEFAULT 0,
  source_schedule_id UUID,
  last_synced_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trades Table
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  default_labor_cost_code_id UUID,
  default_sub_cost_code_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Roles Table
CREATE TABLE user_roles (
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'field_user',
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

-- Workers Table
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trade_id UUID,
  hourly_rate NUMERIC NOT NULL,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Work Schedules Table (New unified system)
CREATE TABLE work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL,
  project_id UUID NOT NULL,
  company_id UUID,
  trade_id UUID,
  cost_code_id UUID,
  scheduled_date DATE NOT NULL,
  scheduled_hours NUMERIC NOT NULL DEFAULT 8,
  notes TEXT,
  status TEXT DEFAULT 'scheduled',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_synced_at TIMESTAMPTZ,
  converted_to_timelog BOOLEAN DEFAULT false
);


-- ============================================================================
-- SECTION 3: INDEXES
-- ============================================================================

-- Activity Log Indexes
CREATE INDEX idx_activity_log_created ON activity_log (created_at DESC);
CREATE INDEX idx_activity_log_entity ON activity_log (entity_type, entity_id);

-- Bid Invitations Indexes
CREATE INDEX idx_bid_invitations_package ON bid_invitations (bid_package_id);

-- Bid Packages Indexes
CREATE INDEX idx_bid_packages_project ON bid_packages (project_id);

-- Budget Revisions Indexes
CREATE INDEX idx_budget_revisions_project ON budget_revisions (project_id);

-- Cost Codes Indexes
CREATE UNIQUE INDEX idx_cost_codes_trade_category_unique ON cost_codes (trade_id, category) 
  WHERE is_active = true AND trade_id IS NOT NULL;
CREATE INDEX idx_cost_codes_trade_id ON cost_codes (trade_id);

-- Cost Entries Indexes
CREATE INDEX idx_cost_entries_code ON cost_entries (cost_code_id);
CREATE INDEX idx_cost_entries_date ON cost_entries (entry_date);
CREATE INDEX idx_cost_entries_project ON cost_entries (project_id);
CREATE INDEX idx_cost_entries_type ON cost_entries (entry_type);

-- Costs Indexes
CREATE INDEX idx_costs_category ON costs (category);
CREATE INDEX idx_costs_category_subs ON costs (category, project_id) WHERE category = 'subs';
CREATE INDEX idx_costs_company_id ON costs (company_id);
CREATE INDEX idx_costs_date_incurred ON costs (date_incurred);
CREATE INDEX idx_costs_linked_receipt ON costs (vendor_type) WHERE vendor_type = 'material_vendor';
CREATE INDEX idx_costs_project_category ON costs (project_id, category);
CREATE INDEX idx_costs_project_id ON costs (project_id);
CREATE INDEX idx_costs_status ON costs (status);
CREATE INDEX idx_costs_vendor_id ON costs (vendor_id);
CREATE INDEX idx_costs_vendor_sub ON costs (vendor_id, vendor_type) WHERE vendor_type = 'sub';
CREATE INDEX idx_costs_vendor_type_category ON costs (vendor_type, category);

-- Customer Payments Indexes
CREATE INDEX idx_customer_payments_invoice ON customer_payments (invoice_id);
CREATE INDEX idx_customer_payments_project ON customer_payments (project_id);

-- Daily Logs Indexes
CREATE INDEX idx_daily_logs_cost_code ON daily_logs (cost_code_id);
CREATE INDEX idx_daily_logs_cost_code_id ON daily_logs (cost_code_id);
CREATE INDEX idx_daily_logs_created_at ON daily_logs (created_at DESC);
CREATE INDEX idx_daily_logs_date ON daily_logs (date);
CREATE INDEX idx_daily_logs_payment_status ON daily_logs (project_id, payment_status) WHERE payment_status = 'unpaid';
CREATE INDEX idx_daily_logs_project ON daily_logs (project_id);
CREATE UNIQUE INDEX idx_daily_logs_schedule_id ON daily_logs (schedule_id) WHERE schedule_id IS NOT NULL;
CREATE INDEX idx_daily_logs_trade_id ON daily_logs (trade_id);
CREATE INDEX idx_daily_logs_worker ON daily_logs (worker_id);
CREATE INDEX idx_daily_logs_worker_id ON daily_logs (worker_id);

-- Day Card Jobs Indexes
CREATE INDEX idx_day_card_jobs_day_card ON day_card_jobs (day_card_id);
CREATE INDEX idx_day_card_jobs_project ON day_card_jobs (project_id);

-- Day Cards Indexes
CREATE INDEX idx_day_cards_date ON day_cards (date);
CREATE INDEX idx_day_cards_pay_status ON day_cards (pay_status);
CREATE INDEX idx_day_cards_status ON day_cards (status);
CREATE INDEX idx_day_cards_worker_date ON day_cards (worker_id, date);

-- Documents Indexes
CREATE INDEX idx_documents_ai_expiration_date ON documents (ai_expiration_date);
CREATE INDEX idx_documents_ai_last_run_status ON documents (ai_last_run_status);
CREATE INDEX idx_documents_ai_status ON documents (ai_status);
CREATE INDEX idx_documents_cost_code ON documents (cost_code_id);
CREATE INDEX idx_documents_doc_type ON documents (doc_type);
CREATE INDEX idx_documents_owner ON documents (owner_type, owner_id);
CREATE INDEX idx_documents_project ON documents (project_id);
CREATE INDEX idx_documents_type ON documents (document_type);
CREATE INDEX idx_documents_uploaded_at ON documents (uploaded_at);

-- Entity Change Log Indexes
CREATE INDEX idx_change_log_entity ON entity_change_log (entity_type, entity_id);
CREATE INDEX idx_change_log_version ON entity_change_log (entity_type, entity_id, version);

-- Estimate Items Indexes
CREATE INDEX idx_estimate_items_cost_code ON estimate_items (cost_code_id);
CREATE INDEX idx_estimate_items_estimate_id ON estimate_items (estimate_id);
CREATE INDEX idx_estimate_items_trade ON estimate_items (trade_id);

-- Estimates Indexes
CREATE INDEX idx_estimates_project_id ON estimates (project_id);
CREATE INDEX idx_estimates_status ON estimates (status);

-- Invitations Indexes
CREATE INDEX idx_invitations_email ON invitations (email);
CREATE INDEX idx_invitations_used ON invitations (used);

-- Invoice Items Indexes
CREATE INDEX idx_invoice_items_cost_code_id ON invoice_items (cost_code_id);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items (invoice_id);

-- Invoices Indexes
CREATE INDEX idx_invoices_project_id ON invoices (project_id);
CREATE INDEX idx_invoices_status ON invoices (status);

-- Labor Pay Run Items Indexes
CREATE INDEX idx_labor_pay_run_items_pay_run ON labor_pay_run_items (pay_run_id);
CREATE INDEX idx_labor_pay_run_items_time_log ON labor_pay_run_items (time_log_id);

-- Labor Pay Runs Indexes
CREATE INDEX idx_labor_pay_runs_dates ON labor_pay_runs (date_range_start, date_range_end);
CREATE INDEX idx_labor_pay_runs_status ON labor_pay_runs (status);

-- Material Receipts Indexes
CREATE INDEX idx_material_receipts_cost_code ON material_receipts (cost_code_id);
CREATE INDEX idx_material_receipts_linked_cost_id ON material_receipts (linked_cost_id);
CREATE INDEX idx_material_receipts_project ON material_receipts (project_id);
CREATE INDEX idx_material_receipts_project_id ON material_receipts (project_id);
CREATE INDEX idx_material_receipts_receipt_date ON material_receipts (receipt_date);
CREATE INDEX idx_material_receipts_vendor_id ON material_receipts (vendor_id);

-- Material Vendors Indexes
CREATE INDEX idx_material_vendors_active ON material_vendors (active);
CREATE INDEX idx_material_vendors_trade_id ON material_vendors (trade_id);

-- Payments Indexes
CREATE INDEX idx_payments_company ON payments (company_id);
CREATE INDEX idx_payments_company_id ON payments (company_id);
CREATE INDEX idx_payments_created_at ON payments (created_at DESC);
CREATE INDEX idx_payments_dates ON payments (start_date, end_date);

-- Project Budget Lines Indexes
CREATE INDEX idx_project_budget_lines_cost_code ON project_budget_lines (cost_code_id);
CREATE INDEX idx_project_budget_lines_project ON project_budget_lines (project_id);

-- Projects Indexes
CREATE INDEX idx_projects_company_id ON projects (company_id);
CREATE INDEX idx_projects_status ON projects (status);

-- Proposals Indexes
CREATE INDEX idx_proposals_project_id ON proposals (project_id);
CREATE INDEX idx_proposals_public_token ON proposals (public_token);

-- Proposal Events Indexes
CREATE INDEX idx_proposal_events_proposal_id ON proposal_events (proposal_id);
CREATE INDEX idx_proposal_events_type ON proposal_events (event_type);

-- Proposal Sections Indexes
CREATE INDEX idx_proposal_sections_proposal_id ON proposal_sections (proposal_id);
CREATE INDEX idx_proposal_sections_sort_order ON proposal_sections (proposal_id, sort_order);

-- Schedule Modifications Indexes
CREATE INDEX idx_schedule_modifications_original ON schedule_modifications (original_schedule_id);

-- Scope Blocks Indexes
CREATE INDEX idx_scope_blocks_estimate_id ON scope_blocks (estimate_id);

-- Scope Items Indexes
CREATE INDEX idx_scope_items_block_id ON scope_items (scope_block_id);

-- Scheduled Shifts Indexes (Legacy)
CREATE INDEX idx_scheduled_shifts_date ON scheduled_shifts (scheduled_date);
CREATE INDEX idx_scheduled_shifts_project ON scheduled_shifts (project_id);
CREATE INDEX idx_scheduled_shifts_worker ON scheduled_shifts (worker_id);
CREATE INDEX idx_scheduled_shifts_worker_date ON scheduled_shifts (worker_id, scheduled_date);

-- SOV Items Indexes
CREATE INDEX idx_sov_items_project ON sov_items (project_id);

-- SOV Line Updates Indexes
CREATE INDEX idx_sov_line_updates_invoice ON sov_line_updates (invoice_id);
CREATE INDEX idx_sov_line_updates_sov_item ON sov_line_updates (sov_item_id);

-- Sub Contracts Indexes
CREATE INDEX idx_sub_contracts_project ON sub_contracts (project_id);
CREATE INDEX idx_sub_contracts_sub ON sub_contracts (sub_id);

-- Sub Invoices Indexes
CREATE INDEX idx_sub_invoices_contract ON sub_invoices (contract_id);
CREATE INDEX idx_sub_invoices_date ON sub_invoices (invoice_date);
CREATE INDEX idx_sub_invoices_status ON sub_invoices (payment_status);

-- Sub Scheduled Shifts Indexes
CREATE INDEX idx_sub_scheduled_shifts_date ON sub_scheduled_shifts (scheduled_date);
CREATE INDEX idx_sub_scheduled_shifts_project ON sub_scheduled_shifts (project_id);
CREATE INDEX idx_sub_scheduled_shifts_sub ON sub_scheduled_shifts (sub_id);

-- Subs Indexes
CREATE INDEX idx_subs_active ON subs (active);
CREATE INDEX idx_subs_trade_id ON subs (trade_id);

-- Time Log Allocations Indexes
CREATE INDEX idx_time_log_allocations_day_card ON time_log_allocations (day_card_id);
CREATE INDEX idx_time_log_allocations_project ON time_log_allocations (project_id);

-- Time Logs Indexes
CREATE INDEX idx_time_logs_company ON time_logs (company_id);
CREATE INDEX idx_time_logs_date ON time_logs (date);
CREATE INDEX idx_time_logs_project ON time_logs (project_id);
CREATE INDEX idx_time_logs_status ON time_logs (payment_status);
CREATE INDEX idx_time_logs_worker ON time_logs (worker_id);
CREATE UNIQUE INDEX idx_time_logs_source_schedule ON time_logs (source_schedule_id) WHERE source_schedule_id IS NOT NULL;

-- Workers Indexes
CREATE INDEX idx_workers_active ON workers (active);
CREATE INDEX idx_workers_trade_id ON workers (trade_id);

-- Work Schedules Indexes
CREATE INDEX idx_work_schedules_company ON work_schedules (company_id);
CREATE INDEX idx_work_schedules_date ON work_schedules (scheduled_date);
CREATE INDEX idx_work_schedules_project ON work_schedules (project_id);
CREATE INDEX idx_work_schedules_worker ON work_schedules (worker_id);
CREATE INDEX idx_work_schedules_worker_date ON work_schedules (worker_id, scheduled_date);


-- ============================================================================
-- SECTION 4: VIEWS
-- ============================================================================

-- Company Payroll Summary View
CREATE VIEW company_payroll_summary AS
SELECT 
  c.id as company_id,
  c.name as company_name,
  COUNT(DISTINCT dc.worker_id) as worker_count,
  COALESCE(SUM(dc.logged_hours), 0) as total_hours,
  COALESCE(SUM(dc.logged_hours * COALESCE(dc.pay_rate, w.hourly_rate)), 0) as total_unpaid,
  COALESCE(SUM(CASE WHEN dc.pay_status = 'paid' THEN dc.logged_hours * COALESCE(dc.pay_rate, w.hourly_rate) ELSE 0 END), 0) as total_paid,
  MAX(dc.date) as last_activity_date
FROM companies c
LEFT JOIN day_cards dc ON dc.company_id = c.id AND dc.logged_hours > 0
LEFT JOIN workers w ON w.id = dc.worker_id
GROUP BY c.id, c.name;

-- Cost Code Actuals View
CREATE VIEW cost_code_actuals AS
SELECT 
  cc.id as cost_code_id,
  cc.code,
  cc.name as cost_code_name,
  cc.category,
  dl.project_id,
  p.project_name,
  COALESCE(SUM(dl.hours_worked), 0) as actual_hours,
  COALESCE(SUM(dl.hours_worked * w.hourly_rate), 0) as actual_cost,
  COUNT(DISTINCT dl.worker_id) as worker_count
FROM cost_codes cc
LEFT JOIN daily_logs dl ON dl.cost_code_id = cc.id
LEFT JOIN projects p ON p.id = dl.project_id
LEFT JOIN workers w ON w.id = dl.worker_id
WHERE cc.category = 'labor'
GROUP BY cc.id, cc.code, cc.name, cc.category, dl.project_id, p.project_name;

-- Day Cards With Details View
CREATE VIEW day_cards_with_details AS
SELECT 
  dc.*,
  w.name as worker_name,
  w.hourly_rate as worker_default_rate,
  t.name as trade_name,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', dcj.id,
        'project_id', dcj.project_id,
        'project_name', p.project_name,
        'hours', dcj.hours,
        'cost_code_id', dcj.cost_code_id,
        'trade_id', dcj.trade_id,
        'notes', dcj.notes
      ) ORDER BY dcj.created_at
    ) FILTER (WHERE dcj.id IS NOT NULL),
    '[]'::jsonb
  ) as jobs
FROM day_cards dc
JOIN workers w ON w.id = dc.worker_id
LEFT JOIN trades t ON t.id = w.trade_id
LEFT JOIN day_card_jobs dcj ON dcj.day_card_id = dc.id
LEFT JOIN projects p ON p.id = dcj.project_id
GROUP BY dc.id, w.name, w.hourly_rate, t.name;

-- Labor Actuals By Cost Code View
CREATE VIEW labor_actuals_by_cost_code AS
SELECT 
  cc.id as cost_code_id,
  cc.code as cost_code,
  cc.name as cost_code_name,
  tl.project_id,
  COALESCE(SUM(tl.hours_worked), 0) as actual_hours,
  COALESCE(SUM(tl.labor_cost), 0) as actual_cost,
  COUNT(DISTINCT tl.worker_id) as worker_count
FROM cost_codes cc
LEFT JOIN time_logs tl ON tl.cost_code_id = cc.id
WHERE cc.category = 'labor'
GROUP BY cc.id, cc.code, cc.name, tl.project_id;

-- Material Actuals By Project View
CREATE VIEW material_actuals_by_project AS
SELECT 
  p.id as project_id,
  p.project_name,
  p.company_id,
  pb.materials_budget,
  COALESCE(SUM(c.amount), 0) as material_actual,
  pb.materials_budget - COALESCE(SUM(c.amount), 0) as material_variance,
  COUNT(DISTINCT mr.id) as receipt_count,
  COUNT(DISTINCT mr.vendor_id) as vendor_count
FROM projects p
LEFT JOIN project_budgets pb ON pb.project_id = p.id
LEFT JOIN costs c ON c.project_id = p.id AND c.category = 'materials' AND c.status != 'void'
LEFT JOIN material_receipts mr ON mr.project_id = p.id
GROUP BY p.id, p.project_name, p.company_id, pb.materials_budget;

-- Payment Labor Summary View
CREATE VIEW payment_labor_summary AS
SELECT 
  p.id as payment_id,
  p.start_date,
  p.end_date,
  p.payment_date,
  p.paid_by,
  dl.worker_id,
  w.name as worker_name,
  t.name as worker_trade,
  dl.project_id,
  proj.project_name,
  SUM(dl.hours_worked) as total_hours,
  SUM(dl.hours_worked * w.hourly_rate) as labor_cost
FROM payments p
JOIN daily_logs dl ON dl.date BETWEEN p.start_date AND p.end_date AND dl.payment_id = p.id
JOIN workers w ON w.id = dl.worker_id
LEFT JOIN trades t ON t.id = w.trade_id
LEFT JOIN projects proj ON proj.id = dl.project_id
GROUP BY p.id, p.start_date, p.end_date, p.payment_date, p.paid_by, 
         dl.worker_id, w.name, t.name, dl.project_id, proj.project_name;

-- Project Activity View
CREATE VIEW project_activity_view AS
SELECT 
  dl.id as log_id,
  dl.schedule_id,
  dl.date,
  dl.worker_id,
  w.name as worker_name,
  w.trade_id,
  t.name as worker_trade,
  dl.project_id,
  p.project_name,
  dl.hours_worked,
  dl.hours_worked * w.hourly_rate as cost,
  dl.notes,
  dl.created_at
FROM daily_logs dl
JOIN workers w ON w.id = dl.worker_id
LEFT JOIN trades t ON t.id = w.trade_id
LEFT JOIN projects p ON p.id = dl.project_id
ORDER BY dl.date DESC, dl.created_at DESC;

-- Project Costs View
CREATE VIEW project_costs_view AS
SELECT 
  p.id as project_id,
  p.project_name,
  p.client_name,
  p.status,
  pb.labor_budget,
  COALESCE(SUM(CASE WHEN dl.hours_worked > 0 THEN dl.hours_worked ELSE 0 END), 0) as labor_total_hours,
  COALESCE(SUM(CASE WHEN dl.hours_worked > 0 THEN dl.hours_worked * w.hourly_rate ELSE 0 END), 0) as labor_total_cost,
  COALESCE(SUM(CASE WHEN dl.payment_status = 'paid' THEN dl.hours_worked ELSE 0 END), 0) as labor_paid_hours,
  COALESCE(SUM(CASE WHEN dl.payment_status = 'paid' THEN dl.hours_worked * w.hourly_rate ELSE 0 END), 0) as labor_paid_cost,
  COALESCE(SUM(CASE WHEN dl.payment_status = 'unpaid' THEN dl.hours_worked ELSE 0 END), 0) as labor_unpaid_hours,
  COALESCE(SUM(CASE WHEN dl.payment_status = 'unpaid' THEN dl.hours_worked * w.hourly_rate ELSE 0 END), 0) as labor_unpaid_cost,
  MAX(CASE WHEN dl.payment_status = 'paid' THEN dl.date END) as last_paid_at,
  pb.labor_budget - COALESCE(SUM(CASE WHEN dl.hours_worked > 0 THEN dl.hours_worked * w.hourly_rate ELSE 0 END), 0) as labor_budget_remaining,
  CASE 
    WHEN pb.labor_budget > 0 THEN 
      ((pb.labor_budget - COALESCE(SUM(CASE WHEN dl.hours_worked > 0 THEN dl.hours_worked * w.hourly_rate ELSE 0 END), 0)) / pb.labor_budget * 100)
    ELSE 0 
  END as labor_budget_variance,
  pb.subs_budget,
  pb.materials_budget,
  pb.other_budget
FROM projects p
LEFT JOIN project_budgets pb ON pb.project_id = p.id
LEFT JOIN daily_logs dl ON dl.project_id = p.id
LEFT JOIN workers w ON w.id = dl.worker_id
GROUP BY p.id, p.project_name, p.client_name, p.status, 
         pb.labor_budget, pb.subs_budget, pb.materials_budget, pb.other_budget;

-- Project Dashboard View
CREATE VIEW project_dashboard_view AS
SELECT 
  p.id as project_id,
  p.project_name,
  p.client_name,
  p.address,
  p.status,
  p.project_manager,
  p.company_id,
  COUNT(DISTINCT dl.worker_id) as worker_count,
  COALESCE(SUM(dl.hours_worked), 0) as total_hours,
  COALESCE(SUM(dl.hours_worked * w.hourly_rate), 0) as total_cost,
  MAX(dl.date) as last_activity
FROM projects p
LEFT JOIN daily_logs dl ON dl.project_id = p.id
LEFT JOIN workers w ON w.id = dl.worker_id
GROUP BY p.id, p.project_name, p.client_name, p.address, p.status, p.project_manager, p.company_id;

-- Project Labor Summary View
CREATE VIEW project_labor_summary AS
SELECT 
  p.id as project_id,
  p.project_name,
  COUNT(DISTINCT tl.worker_id) as worker_count,
  COALESCE(SUM(tl.hours_worked), 0) as total_hours_logged,
  COALESCE(SUM(ws.scheduled_hours), 0) as total_hours_scheduled,
  COALESCE(SUM(tl.labor_cost), 0) as total_labor_cost,
  COALESCE(SUM(CASE WHEN tl.payment_status = 'unpaid' THEN tl.labor_cost ELSE 0 END), 0) as unpaid_labor_cost,
  COALESCE(SUM(CASE WHEN tl.payment_status = 'paid' THEN tl.labor_cost ELSE 0 END), 0) as paid_labor_cost,
  MAX(tl.date) as last_activity_date
FROM projects p
LEFT JOIN time_logs tl ON tl.project_id = p.id
LEFT JOIN work_schedules ws ON ws.project_id = p.id
GROUP BY p.id, p.project_name;

-- Project Schedule View
CREATE VIEW project_schedule_view AS
SELECT 
  ws.id as schedule_id,
  ws.scheduled_date,
  ws.worker_id,
  w.name as worker_name,
  ws.project_id,
  p.project_name,
  ws.scheduled_hours,
  ws.status,
  ws.notes,
  ws.converted_to_timelog,
  tl.id as time_log_id,
  tl.hours_worked as actual_hours,
  ws.created_at
FROM work_schedules ws
JOIN workers w ON w.id = ws.worker_id
LEFT JOIN projects p ON p.id = ws.project_id
LEFT JOIN time_logs tl ON tl.source_schedule_id = ws.id
ORDER BY ws.scheduled_date DESC;

-- Sub Contract Summary View
CREATE VIEW sub_contract_summary AS
SELECT 
  sc.id as contract_id,
  sc.project_id,
  sc.sub_id,
  s.company_name as sub_name,
  s.company_name,
  t.name as trade,
  sc.contract_value,
  sc.retention_percentage,
  sc.status,
  COALESCE(SUM(si.amount), 0) as total_billed,
  COALESCE(SUM(CASE WHEN si.payment_status = 'paid' THEN si.amount - si.retention_held ELSE 0 END), 0) as total_paid,
  COALESCE(SUM(si.retention_held), 0) as total_retention_held,
  COALESCE(SUM(CASE WHEN si.payment_status = 'paid' THEN si.retention_held ELSE 0 END), 0) as total_retention_released,
  sc.contract_value - COALESCE(SUM(si.amount), 0) as remaining_to_bill,
  COALESCE(SUM(CASE WHEN si.payment_status != 'paid' THEN si.amount - si.retention_held ELSE 0 END), 0) as outstanding_balance
FROM sub_contracts sc
JOIN subs s ON s.id = sc.sub_id
LEFT JOIN trades t ON t.id = s.trade_id
LEFT JOIN sub_invoices si ON si.contract_id = sc.id
GROUP BY sc.id, sc.project_id, sc.sub_id, s.company_name, t.name, 
         sc.contract_value, sc.retention_percentage, sc.status;

-- Unpaid Labor Bills View
CREATE VIEW unpaid_labor_bills AS
SELECT 
  dc.company_id,
  c.name as company_name,
  dc.date as period_start,
  dc.date as period_end,
  dcj.project_id,
  p.project_name,
  COUNT(DISTINCT dc.id) as log_count,
  SUM(dcj.hours) as total_hours,
  SUM(dcj.hours * COALESCE(dc.pay_rate, w.hourly_rate)) as total_amount
FROM day_cards dc
JOIN day_card_jobs dcj ON dcj.day_card_id = dc.id
JOIN workers w ON w.id = dc.worker_id
LEFT JOIN companies c ON c.id = dc.company_id
LEFT JOIN projects p ON p.id = dcj.project_id
WHERE dc.pay_status = 'unpaid' AND dc.logged_hours > 0
GROUP BY dc.company_id, c.name, dc.date, dcj.project_id, p.project_name;

-- Worker Day Summary View
CREATE VIEW worker_day_summary AS
SELECT 
  dc.id as day_card_id,
  dc.worker_id,
  w.name as worker_name,
  dc.date,
  dc.scheduled_hours,
  dc.logged_hours,
  dc.status,
  dc.pay_status,
  dc.pay_rate,
  w.hourly_rate as worker_rate,
  COALESCE(dc.pay_rate, w.hourly_rate) as effective_rate,
  dc.logged_hours * COALESCE(dc.pay_rate, w.hourly_rate) as total_pay,
  COUNT(dcj.id) as job_count,
  jsonb_agg(
    jsonb_build_object(
      'project_id', dcj.project_id,
      'project_name', p.project_name,
      'hours', dcj.hours,
      'cost_code_id', dcj.cost_code_id,
      'notes', dcj.notes
    ) ORDER BY dcj.created_at
  ) FILTER (WHERE dcj.id IS NOT NULL) as jobs
FROM day_cards dc
JOIN workers w ON w.id = dc.worker_id
LEFT JOIN day_card_jobs dcj ON dcj.day_card_id = dc.id
LEFT JOIN projects p ON p.id = dcj.project_id
GROUP BY dc.id, dc.worker_id, w.name, dc.date, dc.scheduled_hours, 
         dc.logged_hours, dc.status, dc.pay_status, dc.pay_rate, w.hourly_rate;

-- Workers Public View
CREATE VIEW workers_public AS
SELECT 
  w.id,
  w.name,
  w.trade_id,
  t.name as trade_name,
  w.hourly_rate,
  w.phone,
  w.active
FROM workers w
LEFT JOIN trades t ON t.id = w.trade_id
WHERE w.active = true;

-- Workforce Activity Feed View
CREATE VIEW workforce_activity_feed AS
SELECT 
  dc.id,
  dc.worker_id,
  w.name as worker_name,
  dc.date,
  dc.logged_hours,
  dc.pay_status,
  dc.company_id,
  c.name as company_name,
  jsonb_agg(
    jsonb_build_object(
      'project_id', dcj.project_id,
      'project_name', p.project_name,
      'hours', dcj.hours
    )
  ) FILTER (WHERE dcj.id IS NOT NULL) as projects
FROM day_cards dc
JOIN workers w ON w.id = dc.worker_id
LEFT JOIN companies c ON c.id = dc.company_id
LEFT JOIN day_card_jobs dcj ON dcj.day_card_id = dc.id
LEFT JOIN projects p ON p.id = dcj.project_id
WHERE dc.logged_hours > 0
GROUP BY dc.id, dc.worker_id, w.name, dc.date, dc.logged_hours, dc.pay_status, dc.company_id, c.name
ORDER BY dc.date DESC, dc.id DESC;


-- ============================================================================
-- SECTION 5: FUNCTIONS
-- ============================================================================

-- Function: Auto Assign Labor Cost Code
CREATE OR REPLACE FUNCTION auto_assign_labor_cost_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trade_id UUID;
  v_labor_cost_code_id UUID;
BEGIN
  IF NEW.cost_code_id IS NULL THEN
    SELECT trade_id INTO v_trade_id FROM workers WHERE id = NEW.worker_id;
    IF v_trade_id IS NOT NULL THEN
      SELECT default_labor_cost_code_id INTO v_labor_cost_code_id FROM trades WHERE id = v_trade_id;
      IF v_labor_cost_code_id IS NOT NULL THEN
        NEW.cost_code_id := v_labor_cost_code_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Function: Auto Assign Sub Cost Code
CREATE OR REPLACE FUNCTION auto_assign_sub_cost_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trade_id UUID;
  v_sub_cost_code_id UUID;
BEGIN
  IF NEW.cost_code_id IS NULL THEN
    SELECT trade_id INTO v_trade_id FROM subs WHERE id = NEW.sub_id;
    IF v_trade_id IS NOT NULL THEN
      SELECT default_sub_cost_code_id INTO v_sub_cost_code_id FROM trades WHERE id = v_trade_id;
      IF v_sub_cost_code_id IS NOT NULL THEN
        NEW.cost_code_id := v_sub_cost_code_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Function: Auto Populate Company ID
CREATE OR REPLACE FUNCTION auto_populate_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id FROM projects WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Function: Auto Populate Worker Rate
CREATE OR REPLACE FUNCTION auto_populate_worker_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.hourly_rate IS NULL AND NEW.worker_id IS NOT NULL THEN
    SELECT hourly_rate INTO NEW.hourly_rate FROM workers WHERE id = NEW.worker_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Function: Calculate Scope Item Line Total
CREATE OR REPLACE FUNCTION calculate_scope_item_line_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.line_total = NEW.quantity * NEW.unit_price * (1 + COALESCE(NEW.markup_percent, 0) / 100);
  RETURN NEW;
END;
$$;

-- Function: Delete Old Archived Logs
CREATE OR REPLACE FUNCTION delete_old_archived_logs()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM archived_daily_logs WHERE archived_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Function: Generate Proposal Public Token
CREATE OR REPLACE FUNCTION generate_proposal_public_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    new_token := encode(gen_random_bytes(24), 'base64');
    new_token := replace(replace(replace(new_token, '/', '_'), '+', '-'), '=', '');
    SELECT EXISTS(SELECT 1 FROM proposals WHERE public_token = new_token) INTO token_exists;
    EXIT WHEN NOT token_exists;
  END LOOP;
  RETURN new_token;
END;
$$;

-- Function: Get Material Actuals By Cost Code
CREATE OR REPLACE FUNCTION get_material_actuals_by_cost_code(p_project_id UUID, p_cost_code_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM costs
  WHERE project_id = p_project_id AND category = 'materials' 
    AND cost_code_id = p_cost_code_id AND status != 'void';
$$;

-- Function: Get Material Actuals By Project
CREATE OR REPLACE FUNCTION get_material_actuals_by_project(p_project_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM costs
  WHERE project_id = p_project_id AND category = 'materials' AND status != 'void';
$$;

-- Function: Handle New User
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'field_user');
  RETURN NEW;
END;
$$;

-- Function: Has Role
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function: Log Activity
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('new', to_jsonb(NEW), 'old', to_jsonb(OLD))
      WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW)
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE '{}'::jsonb
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function: Log Proposal Event
CREATE OR REPLACE FUNCTION log_proposal_event(
  p_proposal_id UUID, 
  p_event_type TEXT, 
  p_actor_name TEXT DEFAULT NULL, 
  p_actor_email TEXT DEFAULT NULL, 
  p_actor_ip TEXT DEFAULT NULL, 
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
  v_last_viewed TIMESTAMPTZ;
BEGIN
  IF p_event_type = 'viewed' THEN
    SELECT created_at INTO v_last_viewed
    FROM proposal_events
    WHERE proposal_id = p_proposal_id AND event_type = 'viewed'
    ORDER BY created_at DESC LIMIT 1;
    
    IF v_last_viewed IS NOT NULL AND v_last_viewed > (now() - interval '5 minutes') THEN
      RETURN NULL;
    END IF;
  END IF;
  
  INSERT INTO proposal_events (proposal_id, event_type, actor_name, actor_email, actor_ip, metadata)
  VALUES (p_proposal_id, p_event_type, p_actor_name, p_actor_email, p_actor_ip, p_metadata)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- Function: Mark Time Logs Paid On Pay Run
CREATE OR REPLACE FUNCTION mark_time_logs_paid_on_pay_run()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    UPDATE time_logs
    SET payment_status = 'paid', paid_amount = labor_cost
    FROM labor_pay_run_items
    WHERE labor_pay_run_items.time_log_id = time_logs.id
    AND labor_pay_run_items.pay_run_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Function: Sync Estimate To Budget
CREATE OR REPLACE FUNCTION sync_estimate_to_budget(p_estimate_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project_id UUID;
  v_labor_total NUMERIC := 0;
  v_subs_total NUMERIC := 0;
  v_materials_total NUMERIC := 0;
  v_other_total NUMERIC := 0;
BEGIN
  SELECT project_id INTO v_project_id FROM estimates WHERE id = p_estimate_id;
  IF v_project_id IS NULL THEN RAISE EXCEPTION 'Estimate not found'; END IF;
  
  UPDATE estimates SET is_budget_source = false 
  WHERE project_id = v_project_id AND id != p_estimate_id;
  
  UPDATE estimates SET is_budget_source = true, status = 'accepted', updated_at = now() 
  WHERE id = p_estimate_id;
  
  SELECT 
    COALESCE(SUM(CASE WHEN category = 'Labor' THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category IN ('Subs', 'Subcontractors') THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'Materials' THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category IN ('Allowance', 'Other') THEN line_total ELSE 0 END), 0)
  INTO v_labor_total, v_subs_total, v_materials_total, v_other_total
  FROM estimate_items WHERE estimate_id = p_estimate_id;
  
  INSERT INTO project_budgets (project_id, labor_budget, subs_budget, materials_budget, other_budget, baseline_estimate_id)
  VALUES (v_project_id, v_labor_total, v_subs_total, v_materials_total, v_other_total, p_estimate_id)
  ON CONFLICT (project_id) DO UPDATE SET
    labor_budget = EXCLUDED.labor_budget,
    subs_budget = EXCLUDED.subs_budget,
    materials_budget = EXCLUDED.materials_budget,
    other_budget = EXCLUDED.other_budget,
    baseline_estimate_id = EXCLUDED.baseline_estimate_id,
    updated_at = now();
    
  DELETE FROM project_budget_lines WHERE project_id = v_project_id;
  
  INSERT INTO project_budget_lines (project_id, cost_code_id, category, description, budget_amount, budget_hours, is_allowance, source_estimate_id)
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

-- Function: Sync Material Receipt To Cost
CREATE OR REPLACE FUNCTION sync_material_receipt_to_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    INSERT INTO costs (project_id, vendor_id, vendor_type, cost_code_id, category, amount, date_incurred, description, notes, status)
    VALUES (NEW.project_id, NEW.vendor_id, 'material_vendor', NEW.cost_code_id, 'materials', NEW.total, NEW.receipt_date, v_description, NEW.notes, 'unpaid')
    RETURNING id INTO NEW.linked_cost_id;
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.linked_cost_id IS NOT NULL THEN
      UPDATE costs SET
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
      INSERT INTO costs (project_id, vendor_id, vendor_type, cost_code_id, category, amount, date_incurred, description, notes, status)
      VALUES (NEW.project_id, NEW.vendor_id, 'material_vendor', NEW.cost_code_id, 'materials', NEW.total, NEW.receipt_date, v_description, NEW.notes, 'unpaid')
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

-- Function: Sync Payment To Logs
CREATE OR REPLACE FUNCTION sync_payment_to_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE day_cards
  SET 
    pay_status = 'paid',
    lifecycle_status = 'paid',
    paid_at = NEW.payment_date,
    locked = true
  WHERE 
    company_id = NEW.company_id
    AND date BETWEEN NEW.start_date AND NEW.end_date
    AND pay_status = 'unpaid'
    AND logged_hours > 0;
  RETURN NEW;
END;
$$;

-- Function: Sync Work Schedule To Time Log
CREATE OR REPLACE FUNCTION sync_work_schedule_to_time_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only auto-sync if date has ALREADY PASSED (not today, must be in past)
  IF NEW.scheduled_date < CURRENT_DATE THEN
    IF EXISTS (SELECT 1 FROM time_logs WHERE source_schedule_id = NEW.id) THEN
      UPDATE time_logs SET
        worker_id = NEW.worker_id,
        project_id = NEW.project_id,
        company_id = NEW.company_id,
        trade_id = NEW.trade_id,
        cost_code_id = NEW.cost_code_id,
        hours_worked = NEW.scheduled_hours,
        notes = NEW.notes,
        date = NEW.scheduled_date,
        last_synced_at = now()
      WHERE source_schedule_id = NEW.id
      AND (worker_id IS DISTINCT FROM NEW.worker_id OR project_id IS DISTINCT FROM NEW.project_id 
        OR company_id IS DISTINCT FROM NEW.company_id OR trade_id IS DISTINCT FROM NEW.trade_id 
        OR cost_code_id IS DISTINCT FROM NEW.cost_code_id OR hours_worked IS DISTINCT FROM NEW.scheduled_hours 
        OR notes IS DISTINCT FROM NEW.notes OR date IS DISTINCT FROM NEW.scheduled_date);
    ELSE
      INSERT INTO time_logs (source_schedule_id, worker_id, project_id, company_id, trade_id, cost_code_id, 
                           hours_worked, notes, date, last_synced_at)
      VALUES (NEW.id, NEW.worker_id, NEW.project_id, NEW.company_id, NEW.trade_id, NEW.cost_code_id,
            NEW.scheduled_hours, NEW.notes, NEW.scheduled_date, now());
    END IF;
    NEW.status := 'synced';
    NEW.last_synced_at := now();
    NEW.converted_to_timelog := true;
    
  ELSIF NEW.converted_to_timelog = true AND (OLD.converted_to_timelog IS NULL OR OLD.converted_to_timelog = false) THEN
    -- MANUAL CONVERSION
    IF NOT EXISTS (SELECT 1 FROM time_logs WHERE source_schedule_id = NEW.id) THEN
      INSERT INTO time_logs (source_schedule_id, worker_id, project_id, company_id, trade_id, cost_code_id,
                           hours_worked, notes, date, last_synced_at)
      VALUES (NEW.id, NEW.worker_id, NEW.project_id, NEW.company_id, NEW.trade_id, NEW.cost_code_id,
            NEW.scheduled_hours, NEW.notes, NEW.scheduled_date, now());
    END IF;
    NEW.status := 'synced';
    NEW.last_synced_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function: Sync Time Log To Work Schedule
CREATE OR REPLACE FUNCTION sync_time_log_to_work_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  schedule_date DATE;
BEGIN
  IF NEW.source_schedule_id IS NOT NULL THEN
    SELECT scheduled_date INTO schedule_date FROM work_schedules WHERE id = NEW.source_schedule_id;
    
    IF schedule_date IS NOT NULL AND schedule_date < CURRENT_DATE THEN
      UPDATE work_schedules SET
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
      AND (worker_id IS DISTINCT FROM NEW.worker_id OR project_id IS DISTINCT FROM NEW.project_id 
        OR company_id IS DISTINCT FROM NEW.company_id OR trade_id IS DISTINCT FROM NEW.trade_id 
        OR cost_code_id IS DISTINCT FROM NEW.cost_code_id OR scheduled_hours IS DISTINCT FROM NEW.hours_worked 
        OR notes IS DISTINCT FROM NEW.notes OR scheduled_date IS DISTINCT FROM NEW.date);
      
      NEW.last_synced_at := now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function: Update Sub Compliance From Document
CREATE OR REPLACE FUNCTION update_sub_compliance_from_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.ai_doc_type = 'COI' AND NEW.owner_type = 'sub' AND NEW.owner_id IS NOT NULL THEN
    UPDATE subs SET compliance_coi_expiration = NEW.ai_expiration_date
    WHERE id = NEW.owner_id::uuid
      AND (compliance_coi_expiration IS NULL OR NEW.ai_expiration_date > compliance_coi_expiration);
  END IF;
  
  IF NEW.ai_doc_type = 'W9' AND NEW.owner_type = 'sub' AND NEW.owner_id IS NOT NULL THEN
    UPDATE subs SET compliance_w9_received = true WHERE id = NEW.owner_id::uuid;
  END IF;
  
  IF NEW.ai_doc_type = 'license' AND NEW.owner_type = 'sub' AND NEW.owner_id IS NOT NULL THEN
    UPDATE subs SET compliance_license_expiration = NEW.ai_expiration_date
    WHERE id = NEW.owner_id::uuid
      AND (compliance_license_expiration IS NULL OR NEW.ai_expiration_date > compliance_license_expiration);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function: Update Proposal Acceptance
CREATE OR REPLACE FUNCTION update_proposal_acceptance(
  p_proposal_id UUID, 
  p_new_status TEXT, 
  p_accepted_by_name TEXT, 
  p_accepted_by_email TEXT DEFAULT NULL, 
  p_acceptance_notes TEXT DEFAULT NULL, 
  p_client_signature TEXT DEFAULT NULL, 
  p_acceptance_ip TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  SELECT acceptance_status INTO v_current_status FROM proposals WHERE id = p_proposal_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Proposal not found');
  END IF;
  
  IF v_current_status IN ('accepted', 'rejected') AND v_current_status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Proposal already has a final response', 
                            'current_status', v_current_status);
  END IF;
  
  UPDATE proposals SET 
    acceptance_status = p_new_status,
    acceptance_date = now(),
    accepted_by_name = p_accepted_by_name,
    accepted_by_email = p_accepted_by_email,
    acceptance_notes = p_acceptance_notes,
    client_signature = p_client_signature,
    acceptance_ip = p_acceptance_ip,
    updated_at = now()
  WHERE id = p_proposal_id;
  
  RETURN jsonb_build_object('success', true, 'previous_status', v_current_status, 'new_status', p_new_status);
END;
$$;

-- Function: Update Updated At Column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ============================================================================
-- END OF SCHEMA DUMP
-- ============================================================================
