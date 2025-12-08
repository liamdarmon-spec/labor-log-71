-- =====================================================
-- FORMA WORKFORCE OS - COMPLETE DATABASE SCHEMA MIGRATION
-- Target: Fresh Supabase Postgres Instance
-- Generated: 2025-12-08
-- =====================================================
-- Run this script in order from top to bottom in a clean DB
-- =====================================================

-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CUSTOM TYPES
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'field_user');

-- =====================================================
-- TABLE DEFINITIONS (Dependency-Ordered)
-- =====================================================

-- Companies (no dependencies)
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trades (no dependencies)
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_labor_cost_code_id UUID,
  default_sub_cost_code_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cost Codes (depends on trades)
CREATE TABLE public.cost_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  default_trade_id UUID REFERENCES public.trades(id),
  trade_id UUID REFERENCES public.trades(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add FK from trades to cost_codes (circular reference)
ALTER TABLE public.trades ADD CONSTRAINT trades_default_labor_cost_code_id_fkey FOREIGN KEY (default_labor_cost_code_id) REFERENCES public.cost_codes(id);
ALTER TABLE public.trades ADD CONSTRAINT trades_default_sub_cost_code_id_fkey FOREIGN KEY (default_sub_cost_code_id) REFERENCES public.cost_codes(id);

-- Projects (depends on companies)
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  project_number TEXT,
  status TEXT DEFAULT 'active'::text,
  start_date DATE,
  end_date DATE,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  address TEXT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  description TEXT,
  notes TEXT,
  project_manager TEXT,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workers (depends on trades)
CREATE TABLE public.workers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  trade TEXT,
  hourly_rate NUMERIC,
  trade_id UUID REFERENCES public.trades(id),
  status TEXT DEFAULT 'active'::text,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Subs (depends on trades, cost_codes)
CREATE TABLE public.subs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  trade TEXT,
  trade_id UUID REFERENCES public.trades(id),
  default_cost_code_id UUID REFERENCES public.cost_codes(id),
  hourly_rate NUMERIC,
  status TEXT DEFAULT 'active'::text,
  notes TEXT,
  compliance_coi_expiration DATE,
  compliance_w9_received BOOLEAN DEFAULT false,
  compliance_license_expiration DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Material Vendors
CREATE TABLE public.material_vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  trade_id UUID REFERENCES public.trades(id),
  default_cost_code_id UUID REFERENCES public.cost_codes(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Measurement Units
CREATE TABLE public.measurement_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general'::text,
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Estimates (depends on projects)
CREATE TABLE public.estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'::text,
  project_type TEXT,
  subtotal_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  margin_percent NUMERIC DEFAULT 0,
  is_budget_source BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  parent_estimate_id UUID REFERENCES public.estimates(id),
  change_log JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Estimate Items
CREATE TABLE public.estimate_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'ea'::text,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  area_name TEXT,
  scope_group TEXT,
  group_label TEXT,
  planned_hours NUMERIC,
  is_allowance BOOLEAN DEFAULT false,
  cost_code_id UUID REFERENCES public.cost_codes(id),
  trade_id UUID REFERENCES public.trades(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Project Budgets
CREATE TABLE public.project_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) UNIQUE,
  name TEXT DEFAULT 'Main Budget'::text,
  status TEXT DEFAULT 'active'::text,
  labor_budget NUMERIC DEFAULT 0,
  subs_budget NUMERIC DEFAULT 0,
  materials_budget NUMERIC DEFAULT 0,
  other_budget NUMERIC DEFAULT 0,
  default_markup_pct NUMERIC,
  default_tax_pct NUMERIC,
  notes TEXT,
  baseline_estimate_id UUID REFERENCES public.estimates(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Project Budget Lines
CREATE TABLE public.project_budget_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  project_budget_id UUID REFERENCES public.project_budgets(id),
  group_id UUID,
  cost_code_id UUID REFERENCES public.cost_codes(id),
  scope_type TEXT DEFAULT 'base'::text,
  line_type TEXT,
  category TEXT NOT NULL,
  description_internal TEXT,
  description_client TEXT,
  qty NUMERIC,
  unit TEXT,
  unit_cost NUMERIC,
  budget_amount NUMERIC NOT NULL DEFAULT 0,
  budget_hours NUMERIC,
  markup_pct NUMERIC,
  tax_pct NUMERIC,
  allowance_cap NUMERIC,
  is_optional BOOLEAN DEFAULT false,
  is_allowance BOOLEAN DEFAULT false,
  client_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  internal_notes TEXT,
  change_order_id UUID,
  source_estimate_id UUID REFERENCES public.estimates(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, cost_code_id)
);

-- Budget Revisions
CREATE TABLE public.budget_revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  revision_number INTEGER NOT NULL,
  revision_type TEXT NOT NULL,
  description TEXT,
  previous_budget NUMERIC,
  revision_amount NUMERIC NOT NULL,
  new_budget NUMERIC NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending'::text,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Scope Blocks
CREATE TABLE public.scope_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL DEFAULT 'estimate'::text,
  entity_id UUID NOT NULL,
  section_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Scope Block Cost Items
CREATE TABLE public.scope_block_cost_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_block_id UUID NOT NULL REFERENCES public.scope_blocks(id) ON DELETE CASCADE,
  cost_code_id UUID NOT NULL REFERENCES public.cost_codes(id),
  description TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'ea'::text,
  unit_price NUMERIC DEFAULT 0,
  markup_percent NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  group_label TEXT,
  area_label TEXT,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Invoices
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'draft'::text,
  client_name TEXT,
  subtotal_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  retention_percent NUMERIC DEFAULT 10,
  retention_amount NUMERIC DEFAULT 0,
  previously_invoiced NUMERIC DEFAULT 0,
  balance_to_finish NUMERIC DEFAULT 0,
  sov_based BOOLEAN DEFAULT false,
  payment_terms TEXT DEFAULT 'Net 30'::text,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Invoice Items
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'ea'::text,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  cost_code_id UUID REFERENCES public.cost_codes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Customer Payments
CREATE TABLE public.customer_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  invoice_id UUID REFERENCES public.invoices(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  applied_to_retention NUMERIC DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Vendor Payments
CREATE TABLE public.vendor_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  vendor_type TEXT NOT NULL,
  vendor_id UUID NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  method TEXT,
  reference TEXT,
  notes TEXT,
  status TEXT DEFAULT 'recorded'::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Costs (depends on vendor_payments, projects, cost_codes)
CREATE TABLE public.costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  company_id UUID REFERENCES public.companies(id),
  vendor_type TEXT,
  vendor_id UUID,
  description TEXT NOT NULL,
  cost_code_id UUID REFERENCES public.cost_codes(id),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  date_incurred DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'unpaid'::text,
  payment_id UUID REFERENCES public.vendor_payments(id),
  paid_date DATE,
  notes TEXT,
  quantity NUMERIC,
  unit_cost NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Vendor Payment Items
CREATE TABLE public.vendor_payment_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.vendor_payments(id) ON DELETE CASCADE,
  cost_id UUID NOT NULL REFERENCES public.costs(id),
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cost Entries (Legacy)
CREATE TABLE public.cost_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  cost_code_id UUID REFERENCES public.cost_codes(id),
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Material Receipts
CREATE TABLE public.material_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  vendor TEXT NOT NULL,
  vendor_id UUID REFERENCES public.material_vendors(id),
  receipt_date DATE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  shipping NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  cost_code_id UUID REFERENCES public.cost_codes(id),
  notes TEXT,
  linked_cost_id UUID REFERENCES public.costs(id),
  linked_document_id UUID,
  receipt_document_id UUID,
  auto_classified BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Work Schedules (Canonical)
CREATE TABLE public.work_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES public.workers(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  company_id UUID REFERENCES public.companies(id),
  trade_id UUID REFERENCES public.trades(id),
  cost_code_id UUID REFERENCES public.cost_codes(id),
  scheduled_date DATE NOT NULL,
  scheduled_hours NUMERIC NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'planned'::text,
  converted_to_timelog BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Time Logs (Canonical)
CREATE TABLE public.time_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES public.workers(id),
  date DATE NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  company_id UUID REFERENCES public.companies(id),
  trade_id UUID REFERENCES public.trades(id),
  cost_code_id UUID REFERENCES public.cost_codes(id),
  hours_worked NUMERIC NOT NULL,
  hourly_rate NUMERIC,
  labor_cost NUMERIC GENERATED ALWAYS AS (hours_worked * COALESCE(hourly_rate, 0::numeric)) STORED,
  notes TEXT,
  payment_status TEXT DEFAULT 'unpaid'::text,
  payment_id UUID,
  paid_amount NUMERIC,
  source_schedule_id UUID REFERENCES public.work_schedules(id),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Labor Pay Runs (Canonical)
CREATE TABLE public.labor_pay_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  payer_company_id UUID REFERENCES public.companies(id),
  payee_company_id UUID REFERENCES public.companies(id),
  total_hours NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft'::text,
  payment_date DATE,
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Labor Pay Run Items
CREATE TABLE public.labor_pay_run_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pay_run_id UUID NOT NULL REFERENCES public.labor_pay_runs(id) ON DELETE CASCADE,
  time_log_id UUID NOT NULL REFERENCES public.time_logs(id) UNIQUE,
  worker_id UUID REFERENCES public.workers(id),
  hours NUMERIC,
  rate NUMERIC,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payments (Legacy)
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  paid_by TEXT NOT NULL,
  paid_via TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  reimbursement_status TEXT,
  reimbursement_date DATE,
  company_id UUID REFERENCES public.companies(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily Logs (Legacy)
CREATE TABLE public.daily_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  worker_id UUID NOT NULL REFERENCES public.workers(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  hours_worked NUMERIC NOT NULL,
  notes TEXT,
  trade_id UUID REFERENCES public.trades(id),
  cost_code_id UUID REFERENCES public.cost_codes(id),
  payment_status TEXT DEFAULT 'unpaid'::text,
  paid_amount NUMERIC DEFAULT 0,
  payment_id UUID REFERENCES public.payments(id),
  schedule_id UUID REFERENCES public.work_schedules(id),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Day Cards (Legacy)
CREATE TABLE public.day_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES public.workers(id),
  date DATE NOT NULL,
  scheduled_hours NUMERIC DEFAULT 0,
  logged_hours NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled'::text,
  pay_rate NUMERIC,
  pay_status TEXT DEFAULT 'unpaid'::text,
  company_id UUID REFERENCES public.companies(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  lifecycle_status TEXT DEFAULT 'scheduled'::text,
  locked BOOLEAN DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  paid_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(worker_id, date)
);

-- Day Card Jobs (Legacy)
CREATE TABLE public.day_card_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_card_id UUID NOT NULL REFERENCES public.day_cards(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  trade_id UUID REFERENCES public.trades(id),
  cost_code_id UUID REFERENCES public.cost_codes(id),
  hours NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Time Log Allocations (Legacy)
CREATE TABLE public.time_log_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_card_id UUID NOT NULL REFERENCES public.day_cards(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  trade_id UUID REFERENCES public.trades(id),
  cost_code_id UUID REFERENCES public.cost_codes(id),
  hours NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Archived Daily Logs
CREATE TABLE public.archived_daily_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id UUID NOT NULL,
  date DATE NOT NULL,
  worker_id UUID NOT NULL,
  project_id UUID NOT NULL,
  hours_worked NUMERIC NOT NULL,
  notes TEXT,
  trade_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  archived_by UUID
);

-- Scheduled Shifts (Legacy)
CREATE TABLE public.scheduled_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES public.workers(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  trade_id UUID REFERENCES public.trades(id),
  cost_code_id UUID REFERENCES public.cost_codes(id),
  scheduled_date DATE NOT NULL,
  scheduled_hours NUMERIC NOT NULL DEFAULT 8,
  notes TEXT,
  status TEXT DEFAULT 'planned'::text,
  converted_to_timelog BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sub Scheduled Shifts (Legacy)
CREATE TABLE public.sub_scheduled_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_id UUID NOT NULL REFERENCES public.subs(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  scheduled_date DATE NOT NULL,
  scheduled_hours NUMERIC NOT NULL DEFAULT 8,
  workers_count INTEGER DEFAULT 1,
  cost_code_id UUID REFERENCES public.cost_codes(id),
  notes TEXT,
  status TEXT DEFAULT 'planned'::text,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sub Logs (Legacy)
CREATE TABLE public.sub_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  sub_id UUID NOT NULL REFERENCES public.subs(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours_worked NUMERIC NOT NULL,
  workers_count INTEGER DEFAULT 1,
  cost_code_id UUID REFERENCES public.cost_codes(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sub Contracts
CREATE TABLE public.sub_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  sub_id UUID NOT NULL REFERENCES public.subs(id),
  contract_value NUMERIC NOT NULL DEFAULT 0,
  retention_percentage NUMERIC DEFAULT 10,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active'::text,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sub Invoices
CREATE TABLE public.sub_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  sub_id UUID NOT NULL REFERENCES public.subs(id),
  contract_id UUID REFERENCES public.sub_contracts(id),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  amount NUMERIC NOT NULL,
  total NUMERIC,
  retention_amount NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'pending'::text,
  status TEXT DEFAULT 'unpaid'::text,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sub Payments
CREATE TABLE public.sub_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_subcontract_id UUID REFERENCES public.sub_contracts(id),
  sub_invoice_id UUID REFERENCES public.sub_invoices(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_paid NUMERIC NOT NULL,
  retention_released NUMERIC DEFAULT 0,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sub Bids
CREATE TABLE public.sub_bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_package_id UUID,
  sub_id UUID NOT NULL REFERENCES public.subs(id),
  amount NUMERIC NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'submitted'::text,
  notes TEXT,
  attachments JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sub Compliance Documents
CREATE TABLE public.sub_compliance_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_id UUID NOT NULL REFERENCES public.subs(id),
  document_type TEXT NOT NULL,
  expiration_date DATE,
  file_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bid Packages
CREATE TABLE public.bid_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  title TEXT NOT NULL,
  scope_summary TEXT,
  cost_code_ids UUID[],
  bid_due_date DATE,
  desired_start_date DATE,
  attachments JSONB,
  status TEXT DEFAULT 'draft'::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bid Invitations
CREATE TABLE public.bid_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_package_id UUID NOT NULL REFERENCES public.bid_packages(id),
  sub_id UUID NOT NULL REFERENCES public.subs(id),
  status TEXT DEFAULT 'invited'::text,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  UNIQUE(bid_package_id, sub_id)
);

-- Project Subcontracts
CREATE TABLE public.project_subcontracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  sub_id UUID NOT NULL REFERENCES public.subs(id),
  contract_amount NUMERIC,
  scope_description TEXT,
  status TEXT DEFAULT 'active'::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Proposals
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  primary_estimate_id UUID REFERENCES public.estimates(id),
  title TEXT NOT NULL,
  proposal_number TEXT,
  status TEXT DEFAULT 'draft'::text,
  presentation_mode TEXT DEFAULT 'detailed'::text,
  valid_until DATE,
  validity_days INTEGER DEFAULT 30,
  subtotal NUMERIC DEFAULT 0,
  tax_percent NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  payment_terms TEXT,
  cover_content JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  acceptance_status TEXT DEFAULT 'pending'::text,
  acceptance_date TIMESTAMP WITH TIME ZONE,
  accepted_by_name TEXT,
  accepted_by_email TEXT,
  acceptance_notes TEXT,
  client_signature TEXT,
  acceptance_ip TEXT,
  public_token TEXT UNIQUE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  viewed_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Proposal Events
CREATE TABLE public.proposal_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_name TEXT,
  actor_email TEXT,
  actor_ip TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Proposal Sections
CREATE TABLE public.proposal_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  title TEXT,
  content JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Proposal Templates
CREATE TABLE public.proposal_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sections JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Proposal Images
CREATE TABLE public.proposal_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Proposal Line Groups
CREATE TABLE public.proposal_line_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Proposal Line Overrides
CREATE TABLE public.proposal_line_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  estimate_item_id UUID,
  display_description TEXT,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Proposal Section Items
CREATE TABLE public.proposal_section_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.proposal_sections(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  content JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Proposal Estimate Settings
CREATE TABLE public.proposal_estimate_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE UNIQUE,
  estimate_id UUID REFERENCES public.estimates(id),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Documents
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  size_bytes BIGINT,
  mime_type TEXT,
  storage_path TEXT,
  project_id UUID REFERENCES public.projects(id),
  owner_type TEXT,
  owner_id UUID,
  cost_code_id UUID REFERENCES public.cost_codes(id),
  related_cost_id UUID REFERENCES public.costs(id),
  related_invoice_id UUID REFERENCES public.invoices(id),
  title TEXT,
  description TEXT,
  doc_type TEXT,
  document_type TEXT,
  document_date DATE,
  amount NUMERIC,
  vendor_name TEXT,
  tags TEXT[],
  status TEXT,
  source TEXT,
  source_context TEXT,
  notes TEXT,
  auto_classified BOOLEAN DEFAULT false,
  extracted_text TEXT,
  ai_status TEXT,
  ai_doc_type TEXT,
  ai_title TEXT,
  ai_summary TEXT,
  ai_counterparty_name TEXT,
  ai_total_amount NUMERIC,
  ai_currency TEXT DEFAULT 'USD'::text,
  ai_effective_date DATE,
  ai_expiration_date DATE,
  ai_tags TEXT[],
  ai_extracted_data JSONB,
  ai_last_run_at TIMESTAMP WITH TIME ZONE,
  ai_last_run_status TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_private BOOLEAN NOT NULL DEFAULT false,
  version_number INTEGER NOT NULL DEFAULT 1,
  version_group_id UUID,
  uploaded_by UUID,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Document Tags
CREATE TABLE public.document_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project Todos (Tasks)
CREATE TABLE public.project_todos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open'::text,
  priority TEXT DEFAULT 'medium'::text,
  due_date DATE,
  assignee_id UUID,
  assignee_name TEXT,
  cost_code_id UUID REFERENCES public.cost_codes(id),
  checklist_item_id UUID,
  task_type TEXT DEFAULT 'task'::text,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Project Checklists
CREATE TABLE public.project_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  template_id UUID,
  name TEXT NOT NULL,
  phase TEXT,
  status TEXT DEFAULT 'active'::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Project Checklist Items
CREATE TABLE public.project_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES public.project_checklists(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Checklist Templates
CREATE TABLE public.checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  phase TEXT NOT NULL,
  project_type TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}'::text[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Checklist Template Items
CREATE TABLE public.checklist_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  required BOOLEAN DEFAULT true,
  default_assignee_role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Checklist Questions
CREATE TABLE public.checklist_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  input_type TEXT NOT NULL,
  project_type TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  help_text TEXT,
  options JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_type, code)
);

-- Checklist Question Answers
CREATE TABLE public.checklist_question_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.checklist_questions(id),
  value_text TEXT,
  value_boolean BOOLEAN,
  value_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(estimate_id, question_id)
);

-- Schedule of Values
CREATE TABLE public.schedule_of_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  cost_code_id UUID REFERENCES public.cost_codes(id),
  description TEXT NOT NULL,
  scheduled_value NUMERIC NOT NULL DEFAULT 0,
  previous_billed NUMERIC DEFAULT 0,
  current_billed NUMERIC DEFAULT 0,
  total_billed NUMERIC DEFAULT 0,
  percent_complete NUMERIC DEFAULT 0,
  retention_percent NUMERIC DEFAULT 10,
  retention_amount NUMERIC DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Project Financials Snapshot (Legacy/Cache)
CREATE TABLE public.project_financials_snapshot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) UNIQUE,
  labor_budget NUMERIC DEFAULT 0,
  labor_actual NUMERIC DEFAULT 0,
  subs_budget NUMERIC DEFAULT 0,
  subs_actual NUMERIC DEFAULT 0,
  materials_budget NUMERIC DEFAULT 0,
  materials_actual NUMERIC DEFAULT 0,
  other_budget NUMERIC DEFAULT 0,
  other_actual NUMERIC DEFAULT 0,
  total_budget NUMERIC DEFAULT 0,
  total_actual NUMERIC DEFAULT 0,
  total_invoiced NUMERIC DEFAULT 0,
  total_paid NUMERIC DEFAULT 0,
  retention_held NUMERIC DEFAULT 0,
  last_refreshed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Activity Log
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Entity Change Log
CREATE TABLE public.entity_change_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  version INTEGER NOT NULL,
  change_type TEXT NOT NULL,
  change_summary TEXT,
  changes JSONB DEFAULT '{}'::jsonb,
  changed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'field_user'::public.app_role,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Invitations
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'field_user'::public.app_role,
  invited_by UUID,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Activity Log
CREATE INDEX idx_activity_log_entity ON public.activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created ON public.activity_log(created_at DESC);

-- Bid Invitations
CREATE INDEX idx_bid_invitations_package ON public.bid_invitations(bid_package_id);

-- Bid Packages
CREATE INDEX idx_bid_packages_project ON public.bid_packages(project_id);

-- Budget Revisions
CREATE INDEX idx_budget_revisions_project ON public.budget_revisions(project_id);

-- Checklist Question Answers
CREATE INDEX idx_checklist_question_answers_estimate ON public.checklist_question_answers(estimate_id);

-- Checklist Questions
CREATE INDEX idx_checklist_questions_project_type ON public.checklist_questions(project_type);

-- Checklist Template Items
CREATE INDEX idx_checklist_template_items_template ON public.checklist_template_items(checklist_template_id);

-- Checklist Templates
CREATE INDEX idx_checklist_templates_project_type ON public.checklist_templates(project_type);
CREATE INDEX idx_checklist_templates_phase ON public.checklist_templates(phase);

-- Cost Codes
CREATE INDEX idx_cost_codes_trade_id ON public.cost_codes(trade_id);
CREATE UNIQUE INDEX idx_cost_codes_trade_category_unique ON public.cost_codes(trade_id, category) WHERE is_active = true AND trade_id IS NOT NULL;

-- Cost Entries
CREATE INDEX idx_cost_entries_project ON public.cost_entries(project_id);
CREATE INDEX idx_cost_entries_code ON public.cost_entries(cost_code_id);
CREATE INDEX idx_cost_entries_date ON public.cost_entries(entry_date);
CREATE INDEX idx_cost_entries_type ON public.cost_entries(entry_type);

-- Costs
CREATE INDEX idx_costs_project ON public.costs(project_id);
CREATE INDEX idx_costs_status ON public.costs(status);
CREATE INDEX idx_costs_category ON public.costs(category);
CREATE INDEX idx_costs_date_incurred ON public.costs(date_incurred);
CREATE INDEX idx_costs_company_id ON public.costs(company_id);
CREATE INDEX idx_costs_cost_code_project ON public.costs(project_id, cost_code_id);
CREATE INDEX idx_costs_project_category ON public.costs(project_id, category);
CREATE INDEX idx_costs_category_subs ON public.costs(category, project_id) WHERE category = 'subs';
CREATE INDEX idx_costs_linked_receipt ON public.costs(vendor_type) WHERE vendor_type = 'material_vendor';

-- Customer Payments
CREATE INDEX idx_customer_payments_project ON public.customer_payments(project_id);
CREATE INDEX idx_customer_payments_invoice ON public.customer_payments(invoice_id);

-- Daily Logs
CREATE INDEX idx_daily_logs_date ON public.daily_logs(date);
CREATE INDEX idx_daily_logs_worker ON public.daily_logs(worker_id);
CREATE INDEX idx_daily_logs_project ON public.daily_logs(project_id);
CREATE INDEX idx_daily_logs_status ON public.daily_logs(payment_status);

-- Day Card Jobs
CREATE INDEX idx_day_card_jobs_day_card ON public.day_card_jobs(day_card_id);
CREATE INDEX idx_day_card_jobs_project ON public.day_card_jobs(project_id);

-- Day Cards
CREATE INDEX idx_day_cards_worker ON public.day_cards(worker_id);
CREATE INDEX idx_day_cards_date ON public.day_cards(date);
CREATE INDEX idx_day_cards_company ON public.day_cards(company_id);
CREATE INDEX idx_day_cards_pay_status ON public.day_cards(pay_status);

-- Documents
CREATE INDEX idx_documents_project ON public.documents(project_id);
CREATE INDEX idx_documents_owner ON public.documents(owner_type, owner_id);
CREATE INDEX idx_documents_uploaded_at ON public.documents(uploaded_at DESC);
CREATE INDEX idx_documents_doc_type ON public.documents(doc_type);

-- Document Tags
CREATE INDEX idx_document_tags_document ON public.document_tags(document_id);
CREATE INDEX idx_document_tags_tag ON public.document_tags(tag);

-- Estimate Items
CREATE INDEX idx_estimate_items_estimate ON public.estimate_items(estimate_id);
CREATE INDEX idx_estimate_items_cost_code ON public.estimate_items(cost_code_id);

-- Estimates
CREATE INDEX idx_estimates_project ON public.estimates(project_id);
CREATE INDEX idx_estimates_status ON public.estimates(status);

-- Invoice Items
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_cost_code ON public.invoice_items(cost_code_id);

-- Invoices
CREATE INDEX idx_invoices_project ON public.invoices(project_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_project_status ON public.invoices(project_id, status);

-- Labor Pay Run Items
CREATE INDEX idx_labor_pay_run_items_pay_run ON public.labor_pay_run_items(pay_run_id);
CREATE INDEX idx_labor_pay_run_items_time_log ON public.labor_pay_run_items(time_log_id);
CREATE INDEX idx_labor_pay_run_items_worker ON public.labor_pay_run_items(worker_id);

-- Labor Pay Runs
CREATE INDEX idx_labor_pay_runs_status ON public.labor_pay_runs(status);
CREATE INDEX idx_labor_pay_runs_created_at ON public.labor_pay_runs(created_at DESC);
CREATE INDEX idx_labor_pay_runs_payment_date_status ON public.labor_pay_runs(payment_date, status);
CREATE INDEX idx_labor_pay_runs_payer_company ON public.labor_pay_runs(payer_company_id);

-- Material Receipts
CREATE INDEX idx_material_receipts_project ON public.material_receipts(project_id);
CREATE INDEX idx_material_receipts_vendor ON public.material_receipts(vendor_id);
CREATE INDEX idx_material_receipts_date ON public.material_receipts(receipt_date);
CREATE INDEX idx_material_receipts_cost_code ON public.material_receipts(cost_code_id);

-- Material Vendors
CREATE INDEX idx_material_vendors_trade ON public.material_vendors(trade_id);

-- Payments
CREATE INDEX idx_payments_company ON public.payments(company_id);
CREATE INDEX idx_payments_date ON public.payments(payment_date);

-- Project Budget Lines
CREATE INDEX idx_project_budget_lines_project ON public.project_budget_lines(project_id);
CREATE INDEX idx_project_budget_lines_cost_code ON public.project_budget_lines(cost_code_id);
CREATE INDEX idx_project_budget_lines_budget ON public.project_budget_lines(project_budget_id);
CREATE INDEX idx_project_budget_lines_category ON public.project_budget_lines(category);

-- Project Checklists
CREATE INDEX idx_project_checklists_project ON public.project_checklists(project_id);

-- Project Checklist Items
CREATE INDEX idx_project_checklist_items_checklist ON public.project_checklist_items(checklist_id);

-- Project Todos
CREATE INDEX idx_project_todos_project ON public.project_todos(project_id);
CREATE INDEX idx_project_todos_status ON public.project_todos(status);
CREATE INDEX idx_project_todos_due_date ON public.project_todos(due_date);
CREATE INDEX idx_project_todos_assignee ON public.project_todos(assignee_id);

-- Projects
CREATE INDEX idx_projects_company ON public.projects(company_id);
CREATE INDEX idx_projects_status ON public.projects(status);

-- Proposal Events
CREATE INDEX idx_proposal_events_proposal ON public.proposal_events(proposal_id);
CREATE INDEX idx_proposal_events_type ON public.proposal_events(event_type);

-- Proposal Sections
CREATE INDEX idx_proposal_sections_proposal ON public.proposal_sections(proposal_id);

-- Proposals
CREATE INDEX idx_proposals_project ON public.proposals(project_id);
CREATE INDEX idx_proposals_status ON public.proposals(status);
CREATE INDEX idx_proposals_public_token ON public.proposals(public_token);

-- Scope Block Cost Items
CREATE INDEX idx_scope_block_cost_items_block ON public.scope_block_cost_items(scope_block_id);
CREATE INDEX idx_scope_block_cost_items_cost_code ON public.scope_block_cost_items(cost_code_id);

-- Scope Blocks
CREATE INDEX idx_scope_blocks_entity ON public.scope_blocks(entity_type, entity_id);

-- Sub Contracts
CREATE INDEX idx_sub_contracts_project ON public.sub_contracts(project_id);
CREATE INDEX idx_sub_contracts_sub ON public.sub_contracts(sub_id);

-- Sub Invoices
CREATE INDEX idx_sub_invoices_project ON public.sub_invoices(project_id);
CREATE INDEX idx_sub_invoices_sub ON public.sub_invoices(sub_id);
CREATE INDEX idx_sub_invoices_contract ON public.sub_invoices(contract_id);

-- Sub Logs
CREATE INDEX idx_sub_logs_project ON public.sub_logs(project_id);
CREATE INDEX idx_sub_logs_sub ON public.sub_logs(sub_id);

-- Sub Payments
CREATE INDEX idx_sub_payments_contract ON public.sub_payments(project_subcontract_id);
CREATE INDEX idx_sub_payments_invoice ON public.sub_payments(sub_invoice_id);

-- Sub Scheduled Shifts
CREATE INDEX idx_sub_scheduled_shifts_project ON public.sub_scheduled_shifts(project_id);
CREATE INDEX idx_sub_scheduled_shifts_sub ON public.sub_scheduled_shifts(sub_id);

-- Subs
CREATE INDEX idx_subs_trade ON public.subs(trade_id);
CREATE INDEX idx_subs_status ON public.subs(status);

-- Time Log Allocations
CREATE INDEX idx_time_log_allocations_day_card ON public.time_log_allocations(day_card_id);
CREATE INDEX idx_time_log_allocations_project ON public.time_log_allocations(project_id);

-- Time Logs
CREATE INDEX idx_time_logs_worker_date ON public.time_logs(worker_id, date);
CREATE INDEX idx_time_logs_project_date ON public.time_logs(project_id, date);
CREATE INDEX idx_time_logs_date ON public.time_logs(date);
CREATE INDEX idx_time_logs_payment_status ON public.time_logs(payment_status);
CREATE INDEX idx_time_logs_payment_status_date ON public.time_logs(payment_status, date);
CREATE INDEX idx_time_logs_source_schedule ON public.time_logs(source_schedule_id);
CREATE INDEX idx_time_logs_unpaid_company ON public.time_logs(company_id) WHERE payment_status = 'unpaid';
CREATE INDEX idx_time_logs_cost_code_project ON public.time_logs(project_id, cost_code_id);

-- Vendor Payment Items
CREATE INDEX idx_vendor_payment_items_payment ON public.vendor_payment_items(payment_id);
CREATE INDEX idx_vendor_payment_items_cost ON public.vendor_payment_items(cost_id);

-- Vendor Payments
CREATE INDEX idx_vendor_payments_vendor ON public.vendor_payments(vendor_type, vendor_id);
CREATE INDEX idx_vendor_payments_status ON public.vendor_payments(status);

-- Work Schedules
CREATE INDEX idx_work_schedules_worker_date ON public.work_schedules(worker_id, scheduled_date);
CREATE INDEX idx_work_schedules_scheduled_date ON public.work_schedules(scheduled_date);
CREATE INDEX idx_work_schedules_project ON public.work_schedules(project_id);
CREATE INDEX idx_work_schedules_status ON public.work_schedules(status);
CREATE INDEX idx_work_schedules_worker_status ON public.work_schedules(worker_id, status);
CREATE INDEX idx_work_schedules_status_date ON public.work_schedules(status, scheduled_date);

-- Workers
CREATE INDEX idx_workers_trade ON public.workers(trade_id);
CREATE INDEX idx_workers_status ON public.workers(status);

-- =====================================================
-- FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        jsonb_build_object(
          'new', to_jsonb(NEW),
          'old', to_jsonb(OLD)
        )
      WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW)
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE '{}'::jsonb
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'field_user');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_populate_worker_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.hourly_rate IS NULL AND NEW.worker_id IS NOT NULL THEN
    SELECT hourly_rate INTO NEW.hourly_rate
    FROM workers
    WHERE id = NEW.worker_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_populate_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.company_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM projects
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_set_schedule_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  v_worker_trade_id uuid;
BEGIN
  IF NEW.trade_id IS NULL THEN
    SELECT trade_id
    INTO v_worker_trade_id
    FROM workers
    WHERE id = NEW.worker_id;
    NEW.trade_id := v_worker_trade_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_set_time_log_trade_and_cost_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  v_worker_trade_id   uuid;
  v_schedule_trade_id uuid;
  v_final_trade_id    uuid;
  v_cost_code_id      uuid;
BEGIN
  IF NEW.trade_id IS NOT NULL THEN
    v_final_trade_id := NEW.trade_id;
  ELSIF NEW.source_schedule_id IS NOT NULL THEN
    SELECT trade_id
    INTO v_schedule_trade_id
    FROM work_schedules
    WHERE id = NEW.source_schedule_id;
    v_final_trade_id := v_schedule_trade_id;
  END IF;

  IF v_final_trade_id IS NULL THEN
    SELECT trade_id
    INTO v_worker_trade_id
    FROM workers
    WHERE id = NEW.worker_id;
    v_final_trade_id := v_worker_trade_id;
  END IF;

  NEW.trade_id := v_final_trade_id;

  IF NEW.cost_code_id IS NULL AND v_final_trade_id IS NOT NULL THEN
    SELECT default_labor_cost_code_id
    INTO v_cost_code_id
    FROM trades
    WHERE id = v_final_trade_id;
    NEW.cost_code_id := v_cost_code_id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_assign_labor_cost_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_trade_id UUID;
  v_labor_cost_code_id UUID;
BEGIN
  IF NEW.cost_code_id IS NULL THEN
    SELECT trade_id INTO v_trade_id
    FROM workers
    WHERE id = NEW.worker_id;
    
    IF v_trade_id IS NOT NULL THEN
      SELECT default_labor_cost_code_id INTO v_labor_cost_code_id
      FROM trades
      WHERE id = v_trade_id;
      
      IF v_labor_cost_code_id IS NOT NULL THEN
        NEW.cost_code_id := v_labor_cost_code_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_assign_sub_cost_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_trade_id UUID;
  v_sub_cost_code_id UUID;
BEGIN
  IF NEW.cost_code_id IS NULL THEN
    SELECT trade_id INTO v_trade_id
    FROM subs
    WHERE id = NEW.sub_id;
    
    IF v_trade_id IS NOT NULL THEN
      SELECT default_sub_cost_code_id INTO v_sub_cost_code_id
      FROM trades
      WHERE id = v_trade_id;
      
      IF v_sub_cost_code_id IS NOT NULL THEN
        NEW.cost_code_id := v_sub_cost_code_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_paid_time_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.payment_status = 'paid' THEN
    IF NEW.hours_worked IS DISTINCT FROM OLD.hours_worked
       OR NEW.labor_cost IS DISTINCT FROM OLD.labor_cost THEN
      RAISE EXCEPTION 
        'Cannot change hours or labor_cost on a paid time log. Adjust allocations instead.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_time_logs_paid_on_pay_run()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.mark_costs_paid_on_vendor_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_work_schedule_to_time_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_time_log_to_work_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  schedule_date DATE;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.sync_material_receipt_to_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_vendor_name TEXT;
  v_description TEXT;
BEGIN
  IF NEW.vendor_id IS NOT NULL THEN
    SELECT name INTO v_vendor_name
    FROM material_vendors
    WHERE id = NEW.vendor_id;
  END IF;
  
  IF v_vendor_name IS NULL THEN
    v_vendor_name := COALESCE(NEW.vendor, 'Unknown Vendor');
  END IF;

  v_description := 'Material Receipt - ' || v_vendor_name;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO costs (
      project_id,
      vendor_id,
      vendor_type,
      cost_code_id,
      category,
      amount,
      date_incurred,
      description,
      notes,
      status
    ) VALUES (
      NEW.project_id,
      NEW.vendor_id,
      'material_vendor',
      NEW.cost_code_id,
      'materials',
      NEW.total,
      NEW.receipt_date,
      v_description,
      NEW.notes,
      'unpaid'
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
        project_id,
        vendor_id,
        vendor_type,
        cost_code_id,
        category,
        amount,
        date_incurred,
        description,
        notes,
        status
      ) VALUES (
        NEW.project_id,
        NEW.vendor_id,
        'material_vendor',
        NEW.cost_code_id,
        'materials',
        NEW.total,
        NEW.receipt_date,
        v_description,
        NEW.notes,
        'unpaid'
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
$function$;

CREATE OR REPLACE FUNCTION public.generate_proposal_public_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_token text;
  token_exists boolean;
BEGIN
  LOOP
    new_token := encode(gen_random_bytes(24), 'base64');
    new_token := replace(new_token, '/', '_');
    new_token := replace(new_token, '+', '-');
    new_token := replace(new_token, '=', '');
    
    SELECT EXISTS(
      SELECT 1 FROM proposals WHERE public_token = new_token
    ) INTO token_exists;
    
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN new_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_proposal_event(
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
AS $function$
DECLARE
  v_event_id uuid;
  v_last_viewed timestamp with time zone;
BEGIN
  IF p_event_type = 'viewed' THEN
    SELECT created_at INTO v_last_viewed
    FROM proposal_events
    WHERE proposal_id = p_proposal_id 
      AND event_type = 'viewed'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_last_viewed IS NOT NULL AND v_last_viewed > (now() - interval '5 minutes') THEN
      RETURN NULL;
    END IF;
  END IF;
  
  INSERT INTO proposal_events (
    proposal_id,
    event_type,
    actor_name,
    actor_email,
    actor_ip,
    metadata
  ) VALUES (
    p_proposal_id,
    p_event_type,
    p_actor_name,
    p_actor_email,
    p_actor_ip,
    p_metadata
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_proposal_acceptance(
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
AS $function$
DECLARE
  v_current_status text;
BEGIN
  SELECT acceptance_status INTO v_current_status
  FROM proposals
  WHERE id = p_proposal_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Proposal not found'
    );
  END IF;
  
  IF v_current_status IN ('accepted', 'rejected') AND v_current_status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Proposal already has a final response',
      'current_status', v_current_status
    );
  END IF;
  
  UPDATE proposals
  SET 
    acceptance_status = p_new_status,
    acceptance_date = now(),
    accepted_by_name = p_accepted_by_name,
    accepted_by_email = p_accepted_by_email,
    acceptance_notes = p_acceptance_notes,
    client_signature = p_client_signature,
    acceptance_ip = p_acceptance_ip,
    updated_at = now()
  WHERE id = p_proposal_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_log_proposal_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO proposal_events (
    proposal_id,
    event_type,
    metadata
  ) VALUES (
    NEW.id,
    'created',
    jsonb_build_object(
      'project_id', NEW.project_id,
      'title', NEW.title
    )
  );
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_estimate_to_budget(p_estimate_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_project_id uuid;
  v_budget_id uuid;
  v_scope_count bigint;
BEGIN
  SELECT project_id INTO v_project_id
  FROM public.estimates
  WHERE id = p_estimate_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Estimate % not found', p_estimate_id;
  END IF;

  SELECT id INTO v_budget_id
  FROM public.project_budgets
  WHERE project_id = v_project_id;

  IF v_budget_id IS NULL THEN
    INSERT INTO public.project_budgets (
      project_id,
      name,
      status,
      created_at,
      updated_at
    )
    VALUES (
      v_project_id,
      'Main Budget',
      'active',
      now(),
      now()
    )
    RETURNING id INTO v_budget_id;
  END IF;

  SELECT COUNT(*) INTO v_scope_count
  FROM public.scope_blocks sb
  JOIN public.scope_block_cost_items sbci ON sb.id = sbci.scope_block_id
  WHERE sb.entity_type = 'estimate'
    AND sb.entity_id = p_estimate_id;

  DELETE FROM public.project_budget_lines
  WHERE project_budget_id = v_budget_id
    AND source_estimate_id = p_estimate_id;

  IF v_scope_count > 0 THEN
    INSERT INTO public.project_budget_lines (
      project_id, project_budget_id, group_id, cost_code_id,
      scope_type, line_type, category,
      description_internal, description_client,
      qty, unit, unit_cost, budget_amount,
      budget_hours, markup_pct, tax_pct, allowance_cap,
      is_optional, is_allowance, client_visible, sort_order,
      internal_notes, change_order_id, source_estimate_id,
      created_at, updated_at
    )
    SELECT
      v_project_id, v_budget_id, NULL,
      sbci.cost_code_id,
      'base',
      CASE
        WHEN lower(sbci.category) LIKE 'lab%' THEN 'labor'
        WHEN lower(sbci.category) LIKE 'sub%' THEN 'subs'
        WHEN lower(sbci.category) LIKE 'mat%' THEN 'materials'
        ELSE 'other'
      END,
      CASE
        WHEN lower(sbci.category) LIKE 'lab%' THEN 'labor'
        WHEN lower(sbci.category) LIKE 'sub%' THEN 'subs'
        WHEN lower(sbci.category) LIKE 'mat%' THEN 'materials'
        ELSE 'other'
      END,
      sbci.description, sbci.description,
      COALESCE(sbci.quantity, 1), COALESCE(sbci.unit, 'ea'),
      COALESCE(sbci.unit_price, 0),
      COALESCE(
        sbci.line_total,
        COALESCE(sbci.quantity,1) * COALESCE(sbci.unit_price,0)
      ),
      NULL,
      sbci.markup_percent,
      NULL, NULL,
      FALSE, FALSE, TRUE,
      COALESCE(sbci.sort_order, 0),
      sbci.notes,
      NULL,
      p_estimate_id,
      now(), now()
    FROM public.scope_blocks sb
    JOIN public.scope_block_cost_items sbci ON sb.id = sbci.scope_block_id
    WHERE sb.entity_type = 'estimate'
      AND sb.entity_id = p_estimate_id
      AND (sb.is_visible IS DISTINCT FROM FALSE)
    ON CONFLICT (project_id, cost_code_id) 
    DO UPDATE SET
      project_budget_id = EXCLUDED.project_budget_id,
      scope_type = EXCLUDED.scope_type,
      line_type = EXCLUDED.line_type,
      category = EXCLUDED.category,
      description_internal = EXCLUDED.description_internal,
      description_client = EXCLUDED.description_client,
      qty = EXCLUDED.qty,
      unit = EXCLUDED.unit,
      unit_cost = EXCLUDED.unit_cost,
      budget_amount = EXCLUDED.budget_amount,
      markup_pct = EXCLUDED.markup_pct,
      sort_order = EXCLUDED.sort_order,
      internal_notes = EXCLUDED.internal_notes,
      source_estimate_id = EXCLUDED.source_estimate_id,
      updated_at = now();

  ELSE
    INSERT INTO public.project_budget_lines (
      project_id, project_budget_id, group_id, cost_code_id,
      scope_type, line_type, category,
      description_internal, description_client,
      qty, unit, unit_cost, budget_amount,
      budget_hours, markup_pct, tax_pct, allowance_cap,
      is_optional, is_allowance, client_visible, sort_order,
      internal_notes, change_order_id, source_estimate_id,
      created_at, updated_at
    )
    SELECT
      v_project_id, v_budget_id, NULL,
      ei.cost_code_id,
      'base',
      CASE
        WHEN lower(ei.category) LIKE 'lab%' THEN 'labor'
        WHEN lower(ei.category) LIKE 'sub%' THEN 'subs'
        WHEN lower(ei.category) LIKE 'mat%' THEN 'materials'
        ELSE 'other'
      END,
      CASE
        WHEN lower(ei.category) LIKE 'lab%' THEN 'labor'
        WHEN lower(ei.category) LIKE 'sub%' THEN 'subs'
        WHEN lower(ei.category) LIKE 'mat%' THEN 'materials'
        ELSE 'other'
      END,
      string_agg(ei.description, ' | '),
      string_agg(ei.description, ' | '),
      SUM(COALESCE(ei.quantity, 1)),
      MAX(COALESCE(ei.unit, 'ea')),
      CASE WHEN SUM(COALESCE(ei.quantity,1)) > 0
           THEN SUM(
             COALESCE(ei.line_total,
               COALESCE(ei.quantity,1) * COALESCE(ei.unit_price,0)
             )
           ) / SUM(COALESCE(ei.quantity,1))
           ELSE 0 END,
      SUM(
        COALESCE(ei.line_total,
          COALESCE(ei.quantity,1) * COALESCE(ei.unit_price,0)
        )
      ),
      SUM(COALESCE(ei.planned_hours, 0)),
      NULL, NULL, NULL,
      FALSE,
      BOOL_OR(COALESCE(ei.is_allowance, FALSE)),
      TRUE, 0,
      NULL, NULL,
      p_estimate_id,
      now(), now()
    FROM public.estimate_items ei
    WHERE ei.estimate_id = p_estimate_id
    GROUP BY
      ei.cost_code_id,
      CASE
        WHEN lower(ei.category) LIKE 'lab%' THEN 'labor'
        WHEN lower(ei.category) LIKE 'sub%' THEN 'subs'
        WHEN lower(ei.category) LIKE 'mat%' THEN 'materials'
        ELSE 'other'
      END
    ON CONFLICT (project_id, cost_code_id) 
    DO UPDATE SET
      project_budget_id = EXCLUDED.project_budget_id,
      scope_type = EXCLUDED.scope_type,
      line_type = EXCLUDED.line_type,
      category = EXCLUDED.category,
      description_internal = EXCLUDED.description_internal,
      description_client = EXCLUDED.description_client,
      qty = EXCLUDED.qty,
      unit = EXCLUDED.unit,
      unit_cost = EXCLUDED.unit_cost,
      budget_amount = EXCLUDED.budget_amount,
      budget_hours = EXCLUDED.budget_hours,
      is_allowance = EXCLUDED.is_allowance,
      source_estimate_id = EXCLUDED.source_estimate_id,
      updated_at = now();
  END IF;

  UPDATE public.project_budgets pb
  SET
    labor_budget = COALESCE(sub.labor_total,0),
    subs_budget = COALESCE(sub.subs_total,0),
    materials_budget = COALESCE(sub.materials_total,0),
    other_budget = COALESCE(sub.other_total,0),
    baseline_estimate_id = p_estimate_id,
    updated_at = now()
  FROM (
    SELECT
      project_budget_id,
      SUM(CASE WHEN category = 'labor' THEN budget_amount ELSE 0 END) AS labor_total,
      SUM(CASE WHEN category = 'subs' THEN budget_amount ELSE 0 END) AS subs_total,
      SUM(CASE WHEN category = 'materials' THEN budget_amount ELSE 0 END) AS materials_total,
      SUM(CASE WHEN category NOT IN ('labor','subs','materials')
               THEN budget_amount ELSE 0 END) AS other_total
    FROM public.project_budget_lines
    WHERE project_budget_id = v_budget_id
    GROUP BY project_budget_id
  ) sub
  WHERE pb.id = v_budget_id;

  UPDATE public.estimates
  SET is_budget_source = FALSE
  WHERE project_id = v_project_id
    AND id <> p_estimate_id;

  UPDATE public.estimates
  SET
    is_budget_source = TRUE,
    status = 'accepted',
    approved_at = COALESCE(approved_at, now()),
    updated_at = now()
  WHERE id = p_estimate_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_sub_compliance_from_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.ai_doc_type = 'COI' AND NEW.owner_type = 'sub' AND NEW.owner_id IS NOT NULL THEN
    UPDATE subs
    SET compliance_coi_expiration = NEW.ai_expiration_date
    WHERE id = NEW.owner_id::uuid
      AND (compliance_coi_expiration IS NULL OR NEW.ai_expiration_date > compliance_coi_expiration);
  END IF;

  IF NEW.ai_doc_type = 'W9' AND NEW.owner_type = 'sub' AND NEW.owner_id IS NOT NULL THEN
    UPDATE subs
    SET compliance_w9_received = true
    WHERE id = NEW.owner_id::uuid;
  END IF;

  IF NEW.ai_doc_type = 'license' AND NEW.owner_type = 'sub' AND NEW.owner_id IS NOT NULL THEN
    UPDATE subs
    SET compliance_license_expiration = NEW.ai_expiration_date
    WHERE id = NEW.owner_id::uuid
      AND (compliance_license_expiration IS NULL OR NEW.ai_expiration_date > compliance_license_expiration);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_project_budget_overview(p_project_id UUID)
RETURNS TABLE(
  project_id uuid,
  project_name text,
  project_budget_id uuid,
  labor_budget numeric,
  subs_budget numeric,
  materials_budget numeric,
  other_budget numeric,
  total_budget numeric,
  labor_actual numeric,
  subs_actual numeric,
  materials_actual numeric,
  other_actual numeric,
  labor_unpaid numeric,
  subs_unpaid numeric,
  materials_unpaid numeric,
  other_unpaid numeric,
  total_revenue numeric,
  retention_held numeric,
  total_actual_costs numeric,
  profit numeric,
  total_outstanding numeric
)
LANGUAGE sql
STABLE
AS $function$
    SELECT *
    FROM public.project_budget_vs_actual_view
    WHERE project_id = p_project_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_material_actuals_by_project(p_project_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(amount), 0)
  FROM costs
  WHERE project_id = p_project_id
    AND category = 'materials'
    AND status != 'void';
$function$;

CREATE OR REPLACE FUNCTION public.get_material_actuals_by_cost_code(p_project_id UUID, p_cost_code_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(amount), 0)
  FROM costs
  WHERE project_id = p_project_id
    AND category = 'materials'
    AND cost_code_id = p_cost_code_id
    AND status != 'void';
$function$;

CREATE OR REPLACE FUNCTION public.split_schedule_for_multi_project(p_original_schedule_id UUID, p_time_log_entries JSONB)
RETURNS TABLE(schedule_id UUID, time_log_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
          v_new_schedule_id, v_original_schedule.worker_id, (v_entry->>'project_id')::UUID,
          (v_entry->>'trade_id')::UUID, v_cost_code_id, (v_entry->>'hours')::NUMERIC,
          v_entry->>'notes', v_original_schedule.scheduled_date, v_original_schedule.company_id, now()
        )
        RETURNING id INTO v_new_timelog_id;
      END IF;

      v_first_iteration := false;
    ELSE
      INSERT INTO work_schedules (
        worker_id, project_id, trade_id, cost_code_id, scheduled_date, scheduled_hours,
        notes, status, created_by, company_id, converted_to_timelog, last_synced_at
      ) VALUES (
        v_original_schedule.worker_id, (v_entry->>'project_id')::UUID, (v_entry->>'trade_id')::UUID,
        v_cost_code_id, v_original_schedule.scheduled_date, (v_entry->>'hours')::NUMERIC,
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
        v_new_schedule_id, v_original_schedule.worker_id, (v_entry->>'project_id')::UUID,
        (v_entry->>'trade_id')::UUID, v_cost_code_id, (v_entry->>'hours')::NUMERIC,
        v_entry->>'notes', v_original_schedule.scheduled_date, v_original_schedule.company_id, now()
      )
      RETURNING id INTO v_new_timelog_id;
    END IF;

    RETURN QUERY SELECT v_new_schedule_id, v_new_timelog_id;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.split_time_log_for_multi_project(p_original_time_log_id UUID, p_entries JSONB)
RETURNS TABLE(time_log_id UUID, source_schedule_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        (v_entry->>'project_id')::UUID, (v_entry->>'trade_id')::UUID, v_cost_code_id,
        (v_entry->>'hours')::NUMERIC, v_entry->>'notes', v_original_log.date,
        v_original_log.company_id, now()
      )
      RETURNING id INTO v_new_timelog_id;
    END IF;

    RETURN QUERY SELECT v_new_timelog_id, v_original_log.source_schedule_id;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_old_archived_logs()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.archived_daily_logs
  WHERE archived_at < NOW() - INTERVAL '24 hours';
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_scope_block_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_scope_item_line_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.line_total = NEW.quantity * NEW.unit_price * (1 + COALESCE(NEW.markup_percent, 0) / 100);
  RETURN NEW;
END;
$function$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated At Triggers
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cost_codes_updated_at BEFORE UPDATE ON public.cost_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_day_cards_updated_at BEFORE UPDATE ON public.day_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_day_card_jobs_updated_at BEFORE UPDATE ON public.day_card_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_time_log_allocations_updated_at BEFORE UPDATE ON public.time_log_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bid_packages_updated_at BEFORE UPDATE ON public.bid_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_scope_blocks_updated_at BEFORE UPDATE ON public.scope_blocks FOR EACH ROW EXECUTE FUNCTION public.update_scope_block_updated_at();
CREATE TRIGGER update_scope_block_cost_items_updated_at BEFORE UPDATE ON public.scope_block_cost_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Activity Log Triggers
CREATE TRIGGER day_cards_activity_log AFTER INSERT OR DELETE OR UPDATE ON public.day_cards FOR EACH ROW EXECUTE FUNCTION public.log_activity('log');
CREATE TRIGGER time_logs_activity_log AFTER INSERT OR DELETE OR UPDATE ON public.time_logs FOR EACH ROW EXECUTE FUNCTION public.log_activity('time_log');
CREATE TRIGGER work_schedules_activity_log AFTER INSERT OR DELETE OR UPDATE ON public.work_schedules FOR EACH ROW EXECUTE FUNCTION public.log_activity('work_schedule');

-- Auto-populate Triggers
CREATE TRIGGER trigger_auto_populate_worker_rate_time_logs BEFORE INSERT ON public.time_logs FOR EACH ROW EXECUTE FUNCTION public.auto_populate_worker_rate();
CREATE TRIGGER trigger_auto_populate_company_id_time_logs BEFORE INSERT ON public.time_logs FOR EACH ROW EXECUTE FUNCTION public.auto_populate_company_id();
CREATE TRIGGER trigger_auto_set_time_log_trade_and_cost_code BEFORE INSERT ON public.time_logs FOR EACH ROW EXECUTE FUNCTION public.auto_set_time_log_trade_and_cost_code();
CREATE TRIGGER trigger_auto_set_schedule_trade BEFORE INSERT ON public.work_schedules FOR EACH ROW EXECUTE FUNCTION public.auto_set_schedule_trade();
CREATE TRIGGER trigger_auto_assign_labor_cost_code BEFORE INSERT ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.auto_assign_labor_cost_code();

-- Sync Triggers
CREATE TRIGGER trigger_sync_work_schedule_to_time_log AFTER INSERT OR UPDATE ON public.work_schedules FOR EACH ROW EXECUTE FUNCTION public.sync_work_schedule_to_time_log();
CREATE TRIGGER trigger_sync_time_log_to_work_schedule BEFORE UPDATE ON public.time_logs FOR EACH ROW WHEN (NEW.source_schedule_id IS NOT NULL) EXECUTE FUNCTION public.sync_time_log_to_work_schedule();
CREATE TRIGGER trigger_sync_material_receipt_to_cost BEFORE INSERT OR UPDATE OR DELETE ON public.material_receipts FOR EACH ROW EXECUTE FUNCTION public.sync_material_receipt_to_cost();

-- Payment Triggers
CREATE TRIGGER trigger_mark_time_logs_paid_on_pay_run AFTER UPDATE OF status ON public.labor_pay_runs FOR EACH ROW EXECUTE FUNCTION public.mark_time_logs_paid_on_pay_run();
CREATE TRIGGER trigger_mark_costs_paid_on_vendor_payment AFTER INSERT OR UPDATE OF status ON public.vendor_payments FOR EACH ROW EXECUTE FUNCTION public.mark_costs_paid_on_vendor_payment();

-- Protection Triggers
CREATE TRIGGER trigger_prevent_paid_time_log_mutation BEFORE UPDATE ON public.time_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_paid_time_log_mutation();

-- Document Triggers
CREATE TRIGGER trigger_document_update_sub_compliance AFTER INSERT OR UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_sub_compliance_from_document();

-- Proposal Triggers
CREATE TRIGGER trigger_log_proposal_created AFTER INSERT ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.trigger_log_proposal_created();

-- Scope Item Calculation Trigger
CREATE TRIGGER trigger_calculate_scope_item_line_total BEFORE INSERT OR UPDATE ON public.scope_block_cost_items FOR EACH ROW EXECUTE FUNCTION public.calculate_scope_item_line_total();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_card_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_pay_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_pay_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_financials_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_subcontracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_estimate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_line_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_line_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_section_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_of_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scope_block_cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scope_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_scheduled_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_log_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

-- Development Policies (Permissive - allow all)
CREATE POLICY "Anyone can insert activity log" ON public.activity_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view activity log" ON public.activity_log FOR SELECT USING (true);
CREATE POLICY "Anyone can delete bid invitations" ON public.bid_invitations FOR DELETE USING (true);
CREATE POLICY "Anyone can insert bid invitations" ON public.bid_invitations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update bid invitations" ON public.bid_invitations FOR UPDATE USING (true);
CREATE POLICY "Anyone can view bid invitations" ON public.bid_invitations FOR SELECT USING (true);
CREATE POLICY "Anyone can delete bid packages" ON public.bid_packages FOR DELETE USING (true);
CREATE POLICY "Anyone can insert bid packages" ON public.bid_packages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update bid packages" ON public.bid_packages FOR UPDATE USING (true);
CREATE POLICY "Anyone can view bid packages" ON public.bid_packages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert budget revisions" ON public.budget_revisions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update budget revisions" ON public.budget_revisions FOR UPDATE USING (true);
CREATE POLICY "Anyone can view budget revisions" ON public.budget_revisions FOR SELECT USING (true);
CREATE POLICY "Anyone can delete checklist_question_answers" ON public.checklist_question_answers FOR DELETE USING (true);
CREATE POLICY "Anyone can insert checklist_question_answers" ON public.checklist_question_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update checklist_question_answers" ON public.checklist_question_answers FOR UPDATE USING (true);
CREATE POLICY "Anyone can view checklist_question_answers" ON public.checklist_question_answers FOR SELECT USING (true);
CREATE POLICY "Anyone can delete checklist_questions" ON public.checklist_questions FOR DELETE USING (true);
CREATE POLICY "Anyone can insert checklist_questions" ON public.checklist_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update checklist_questions" ON public.checklist_questions FOR UPDATE USING (true);
CREATE POLICY "Anyone can view checklist_questions" ON public.checklist_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can delete checklist_template_items" ON public.checklist_template_items FOR DELETE USING (true);
CREATE POLICY "Anyone can insert checklist_template_items" ON public.checklist_template_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update checklist_template_items" ON public.checklist_template_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can view checklist_template_items" ON public.checklist_template_items FOR SELECT USING (true);
CREATE POLICY "Anyone can delete checklist_templates" ON public.checklist_templates FOR DELETE USING (true);
CREATE POLICY "Anyone can insert checklist_templates" ON public.checklist_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update checklist_templates" ON public.checklist_templates FOR UPDATE USING (true);
CREATE POLICY "Anyone can view checklist_templates" ON public.checklist_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can delete cost codes" ON public.cost_codes FOR DELETE USING (true);
CREATE POLICY "Anyone can insert cost codes" ON public.cost_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update cost codes" ON public.cost_codes FOR UPDATE USING (true);
CREATE POLICY "Anyone can view cost codes" ON public.cost_codes FOR SELECT USING (true);
CREATE POLICY "Anyone can delete cost entries" ON public.cost_entries FOR DELETE USING (true);
CREATE POLICY "Anyone can insert cost entries" ON public.cost_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update cost entries" ON public.cost_entries FOR UPDATE USING (true);
CREATE POLICY "Anyone can view cost entries" ON public.cost_entries FOR SELECT USING (true);
CREATE POLICY "Anyone can delete costs" ON public.costs FOR DELETE USING (true);
CREATE POLICY "Anyone can insert costs" ON public.costs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update costs" ON public.costs FOR UPDATE USING (true);
CREATE POLICY "Anyone can view costs" ON public.costs FOR SELECT USING (true);
CREATE POLICY "Anyone can delete customer payments" ON public.customer_payments FOR DELETE USING (true);
CREATE POLICY "Anyone can insert customer payments" ON public.customer_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update customer payments" ON public.customer_payments FOR UPDATE USING (true);
CREATE POLICY "Anyone can view customer payments" ON public.customer_payments FOR SELECT USING (true);
CREATE POLICY "Anyone can delete day card jobs" ON public.day_card_jobs FOR DELETE USING (true);
CREATE POLICY "Anyone can insert day card jobs" ON public.day_card_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update day card jobs" ON public.day_card_jobs FOR UPDATE USING (true);
CREATE POLICY "Anyone can view day card jobs" ON public.day_card_jobs FOR SELECT USING (true);
CREATE POLICY "Anyone can delete day cards" ON public.day_cards FOR DELETE USING (true);
CREATE POLICY "Anyone can insert day cards" ON public.day_cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update day cards" ON public.day_cards FOR UPDATE USING (true);
CREATE POLICY "Anyone can view day cards" ON public.day_cards FOR SELECT USING (true);
CREATE POLICY "Anyone can delete document tags" ON public.document_tags FOR DELETE USING (true);
CREATE POLICY "Anyone can insert document tags" ON public.document_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update document tags" ON public.document_tags FOR UPDATE USING (true);
CREATE POLICY "Anyone can view document tags" ON public.document_tags FOR SELECT USING (true);
CREATE POLICY "Anyone can delete documents" ON public.documents FOR DELETE USING (true);
CREATE POLICY "Anyone can insert documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update documents" ON public.documents FOR UPDATE USING (true);
CREATE POLICY "Anyone can view documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Anyone can insert change log" ON public.entity_change_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view change log" ON public.entity_change_log FOR SELECT USING (true);
CREATE POLICY "Anyone can delete estimate items" ON public.estimate_items FOR DELETE USING (true);
CREATE POLICY "Anyone can insert estimate items" ON public.estimate_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update estimate items" ON public.estimate_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can view estimate items" ON public.estimate_items FOR SELECT USING (true);
CREATE POLICY "Anyone can delete estimates" ON public.estimates FOR DELETE USING (true);
CREATE POLICY "Anyone can insert estimates" ON public.estimates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update estimates" ON public.estimates FOR UPDATE USING (true);
CREATE POLICY "Anyone can view estimates" ON public.estimates FOR SELECT USING (true);
CREATE POLICY "Anyone can delete invoice items" ON public.invoice_items FOR DELETE USING (true);
CREATE POLICY "Anyone can insert invoice items" ON public.invoice_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update invoice items" ON public.invoice_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can view invoice items" ON public.invoice_items FOR SELECT USING (true);
CREATE POLICY "Anyone can delete invoices" ON public.invoices FOR DELETE USING (true);
CREATE POLICY "Anyone can insert invoices" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update invoices" ON public.invoices FOR UPDATE USING (true);
CREATE POLICY "Anyone can view invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Anyone can delete labor pay run items" ON public.labor_pay_run_items FOR DELETE USING (true);
CREATE POLICY "Anyone can insert labor pay run items" ON public.labor_pay_run_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update labor pay run items" ON public.labor_pay_run_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can view labor pay run items" ON public.labor_pay_run_items FOR SELECT USING (true);
CREATE POLICY "Anyone can delete labor pay runs" ON public.labor_pay_runs FOR DELETE USING (true);
CREATE POLICY "Anyone can insert labor pay runs" ON public.labor_pay_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update labor pay runs" ON public.labor_pay_runs FOR UPDATE USING (true);
CREATE POLICY "Anyone can view labor pay runs" ON public.labor_pay_runs FOR SELECT USING (true);
CREATE POLICY "Anyone can delete material receipts" ON public.material_receipts FOR DELETE USING (true);
CREATE POLICY "Anyone can insert material receipts" ON public.material_receipts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update material receipts" ON public.material_receipts FOR UPDATE USING (true);
CREATE POLICY "Anyone can view material receipts" ON public.material_receipts FOR SELECT USING (true);
CREATE POLICY "Anyone can delete material vendors" ON public.material_vendors FOR DELETE USING (true);
CREATE POLICY "Anyone can insert material vendors" ON public.material_vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update material vendors" ON public.material_vendors FOR UPDATE USING (true);
CREATE POLICY "Anyone can view material vendors" ON public.material_vendors FOR SELECT USING (true);
CREATE POLICY "Anyone can view measurement units" ON public.measurement_units FOR SELECT USING (true);
CREATE POLICY "Anyone can delete project budget lines" ON public.project_budget_lines FOR DELETE USING (true);
CREATE POLICY "Anyone can insert project budget lines" ON public.project_budget_lines FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update project budget lines" ON public.project_budget_lines FOR UPDATE USING (true);
CREATE POLICY "Anyone can view project budget lines" ON public.project_budget_lines FOR SELECT USING (true);
CREATE POLICY "Anyone can delete project budgets" ON public.project_budgets FOR DELETE USING (true);
CREATE POLICY "Anyone can insert project budgets" ON public.project_budgets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update project budgets" ON public.project_budgets FOR UPDATE USING (true);
CREATE POLICY "Anyone can view project budgets" ON public.project_budgets FOR SELECT USING (true);
CREATE POLICY "Anyone can delete project checklist items" ON public.project_checklist_items FOR DELETE USING (true);
CREATE POLICY "Anyone can insert project checklist items" ON public.project_checklist_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update project checklist items" ON public.project_checklist_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can view project checklist items" ON public.project_checklist_items FOR SELECT USING (true);
CREATE POLICY "Anyone can delete project checklists" ON public.project_checklists FOR DELETE USING (true);
CREATE POLICY "Anyone can insert project checklists" ON public.project_checklists FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update project checklists" ON public.project_checklists FOR UPDATE USING (true);
CREATE POLICY "Anyone can view project checklists" ON public.project_checklists FOR SELECT USING (true);
CREATE POLICY "Anyone can delete project financials snapshot" ON public.project_financials_snapshot FOR DELETE USING (true);
CREATE POLICY "Anyone can insert project financials snapshot" ON public.project_financials_snapshot FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update project financials snapshot" ON public.project_financials_snapshot FOR UPDATE USING (true);
CREATE POLICY "Anyone can view project financials snapshot" ON public.project_financials_snapshot FOR SELECT USING (true);
CREATE POLICY "Anyone can delete project subcontracts" ON public.project_subcontracts FOR DELETE USING (true);
CREATE POLICY "Anyone can insert project subcontracts" ON public.project_subcontracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update project subcontracts" ON public.project_subcontracts FOR UPDATE USING (true);
CREATE POLICY "Anyone can view project subcontracts" ON public.project_subcontracts FOR SELECT USING (true);
CREATE POLICY "Anyone can delete project todos" ON public.project_todos FOR DELETE USING (true);
CREATE POLICY "Anyone can insert project todos" ON public.project_todos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update project todos" ON public.project_todos FOR UPDATE USING (true);
CREATE POLICY "Anyone can view project todos" ON public.project_todos FOR SELECT USING (true);
CREATE POLICY "Anyone can delete proposal estimate settings" ON public.proposal_estimate_settings FOR DELETE USING (true);
CREATE POLICY "Anyone can insert proposal estimate settings" ON public.proposal_estimate_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update proposal estimate settings" ON public.proposal_estimate_settings FOR UPDATE USING (true);
CREATE POLICY "Anyone can view proposal estimate settings" ON public.proposal_estimate_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can delete proposal events" ON public.proposal_events FOR DELETE USING (true);
CREATE POLICY "Anyone can insert proposal events" ON public.proposal_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update proposal events" ON public.proposal_events FOR UPDATE USING (true);
CREATE POLICY "Anyone can view proposal events" ON public.proposal_events FOR SELECT USING (true);
CREATE POLICY "Anyone can delete proposal images" ON public.proposal_images FOR DELETE USING (true);
CREATE POLICY "Anyone can insert proposal images" ON public.proposal_images FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update proposal images" ON public.proposal_images FOR UPDATE USING (true);
CREATE POLICY "Anyone can view proposal images" ON public.proposal_images FOR SELECT USING (true);
CREATE POLICY "Anyone can delete proposal line groups" ON public.proposal_line_groups FOR DELETE USING (true);
CREATE POLICY "Anyone can insert proposal line groups" ON public.proposal_line_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update proposal line groups" ON public.proposal_line_groups FOR UPDATE USING (true);
CREATE POLICY "Anyone can view proposal line groups" ON public.proposal_line_groups FOR SELECT USING (true);
CREATE POLICY "Anyone can delete proposal line overrides" ON public.proposal_line_overrides FOR DELETE USING (true);
CREATE POLICY "Anyone can insert proposal line overrides" ON public.proposal_line_overrides FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update proposal line overrides" ON public.proposal_line_overrides FOR UPDATE USING (true);
CREATE POLICY "Anyone can view proposal line overrides" ON public.proposal_line_overrides FOR SELECT USING (true);
CREATE POLICY "Anyone can delete proposal section items" ON public.proposal_section_items FOR DELETE USING (true);
CREATE POLICY "Anyone can insert proposal section items" ON public.proposal_section_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update proposal section items" ON public.proposal_section_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can view proposal section items" ON public.proposal_section_items FOR SELECT USING (true);
CREATE POLICY "Anyone can delete proposal sections" ON public.proposal_sections FOR DELETE USING (true);
CREATE POLICY "Anyone can insert proposal sections" ON public.proposal_sections FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update proposal sections" ON public.proposal_sections FOR UPDATE USING (true);
CREATE POLICY "Anyone can view proposal sections" ON public.proposal_sections FOR SELECT USING (true);
CREATE POLICY "Anyone can delete proposal templates" ON public.proposal_templates FOR DELETE USING (true);
CREATE POLICY "Anyone can insert proposal templates" ON public.proposal_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update proposal templates" ON public.proposal_templates FOR UPDATE USING (true);
CREATE POLICY "Anyone can view proposal templates" ON public.proposal_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can delete proposals" ON public.proposals FOR DELETE USING (true);
CREATE POLICY "Anyone can insert proposals" ON public.proposals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update proposals" ON public.proposals FOR UPDATE USING (true);
CREATE POLICY "Anyone can view proposals" ON public.proposals FOR SELECT USING (true);
CREATE POLICY "Anyone can delete schedule of values" ON public.schedule_of_values FOR DELETE USING (true);
CREATE POLICY "Anyone can insert schedule of values" ON public.schedule_of_values FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update schedule of values" ON public.schedule_of_values FOR UPDATE USING (true);
CREATE POLICY "Anyone can view schedule of values" ON public.schedule_of_values FOR SELECT USING (true);
CREATE POLICY "Anyone can delete scope block cost items" ON public.scope_block_cost_items FOR DELETE USING (true);
CREATE POLICY "Anyone can insert scope block cost items" ON public.scope_block_cost_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update scope block cost items" ON public.scope_block_cost_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can view scope block cost items" ON public.scope_block_cost_items FOR SELECT USING (true);
CREATE POLICY "Anyone can delete scope blocks" ON public.scope_blocks FOR DELETE USING (true);
CREATE POLICY "Anyone can insert scope blocks" ON public.scope_blocks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update scope blocks" ON public.scope_blocks FOR UPDATE USING (true);
CREATE POLICY "Anyone can view scope blocks" ON public.scope_blocks FOR SELECT USING (true);
CREATE POLICY "Anyone can delete sub bids" ON public.sub_bids FOR DELETE USING (true);
CREATE POLICY "Anyone can insert sub bids" ON public.sub_bids FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sub bids" ON public.sub_bids FOR UPDATE USING (true);
CREATE POLICY "Anyone can view sub bids" ON public.sub_bids FOR SELECT USING (true);
CREATE POLICY "Anyone can delete sub compliance documents" ON public.sub_compliance_documents FOR DELETE USING (true);
CREATE POLICY "Anyone can insert sub compliance documents" ON public.sub_compliance_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sub compliance documents" ON public.sub_compliance_documents FOR UPDATE USING (true);
CREATE POLICY "Anyone can view sub compliance documents" ON public.sub_compliance_documents FOR SELECT USING (true);
CREATE POLICY "Anyone can delete sub contracts" ON public.sub_contracts FOR DELETE USING (true);
CREATE POLICY "Anyone can insert sub contracts" ON public.sub_contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sub contracts" ON public.sub_contracts FOR UPDATE USING (true);
CREATE POLICY "Anyone can view sub contracts" ON public.sub_contracts FOR SELECT USING (true);
CREATE POLICY "Anyone can delete sub invoices" ON public.sub_invoices FOR DELETE USING (true);
CREATE POLICY "Anyone can insert sub invoices" ON public.sub_invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sub invoices" ON public.sub_invoices FOR UPDATE USING (true);
CREATE POLICY "Anyone can view sub invoices" ON public.sub_invoices FOR SELECT USING (true);
CREATE POLICY "Anyone can delete sub logs" ON public.sub_logs FOR DELETE USING (true);
CREATE POLICY "Anyone can insert sub logs" ON public.sub_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sub logs" ON public.sub_logs FOR UPDATE USING (true);
CREATE POLICY "Anyone can view sub logs" ON public.sub_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can delete sub payments" ON public.sub_payments FOR DELETE USING (true);
CREATE POLICY "Anyone can insert sub payments" ON public.sub_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sub payments" ON public.sub_payments FOR UPDATE USING (true);
CREATE POLICY "Anyone can view sub payments" ON public.sub_payments FOR SELECT USING (true);
CREATE POLICY "Anyone can delete sub scheduled shifts" ON public.sub_scheduled_shifts FOR DELETE USING (true);
CREATE POLICY "Anyone can insert sub scheduled shifts" ON public.sub_scheduled_shifts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sub scheduled shifts" ON public.sub_scheduled_shifts FOR UPDATE USING (true);
CREATE POLICY "Anyone can view sub scheduled shifts" ON public.sub_scheduled_shifts FOR SELECT USING (true);
CREATE POLICY "Anyone can delete subs" ON public.subs FOR DELETE USING (true);
CREATE POLICY "Anyone can insert subs" ON public.subs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update subs" ON public.subs FOR UPDATE USING (true);
CREATE POLICY "Anyone can view subs" ON public.subs FOR SELECT USING (true);
CREATE POLICY "Anyone can delete time log allocations" ON public.time_log_allocations FOR DELETE USING (true);
CREATE POLICY "Anyone can insert time log allocations" ON public.time_log_allocations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update time log allocations" ON public.time_log_allocations FOR UPDATE USING (true);
CREATE POLICY "Anyone can view time log allocations" ON public.time_log_allocations FOR SELECT USING (true);
CREATE POLICY "Anyone can delete time logs" ON public.time_logs FOR DELETE USING (true);
CREATE POLICY "Anyone can insert time logs" ON public.time_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update time logs" ON public.time_logs FOR UPDATE USING (true);
CREATE POLICY "Anyone can view time logs" ON public.time_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can delete vendor payment items" ON public.vendor_payment_items FOR DELETE USING (true);
CREATE POLICY "Anyone can insert vendor payment items" ON public.vendor_payment_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update vendor payment items" ON public.vendor_payment_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can view vendor payment items" ON public.vendor_payment_items FOR SELECT USING (true);
CREATE POLICY "Anyone can delete vendor payments" ON public.vendor_payments FOR DELETE USING (true);
CREATE POLICY "Anyone can insert vendor payments" ON public.vendor_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update vendor payments" ON public.vendor_payments FOR UPDATE USING (true);
CREATE POLICY "Anyone can view vendor payments" ON public.vendor_payments FOR SELECT USING (true);
CREATE POLICY "Anyone can delete work schedules" ON public.work_schedules FOR DELETE USING (true);
CREATE POLICY "Anyone can insert work schedules" ON public.work_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update work schedules" ON public.work_schedules FOR UPDATE USING (true);
CREATE POLICY "Anyone can view work schedules" ON public.work_schedules FOR SELECT USING (true);

-- =====================================================
-- END OF SCHEMA MIGRATION
-- =====================================================
