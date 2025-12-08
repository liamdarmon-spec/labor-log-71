# FORMA ERP - Complete Database & Backend Dump
> Generated: 2025-12-08
> This file contains the complete database schema, functions, triggers, views, indexes, RLS policies, and edge functions.

---

## Table of Contents
1. [Custom Types](#custom-types)
2. [Canonical Tables](#canonical-tables)
3. [Legacy Tables (Read-Only)](#legacy-tables)
4. [Views](#views)
5. [Database Functions](#database-functions)
6. [Triggers](#triggers)
7. [Indexes](#indexes)
8. [Foreign Keys](#foreign-keys)
9. [RLS Policies](#rls-policies)
10. [Edge Functions](#edge-functions)
11. [Storage Buckets](#storage-buckets)
12. [Architectural Constraints](#architectural-constraints)

---

## Custom Types

```sql
CREATE TYPE app_role AS ENUM ('admin', 'field_user');
```

---

## Canonical Tables

These are the primary tables where new data should be written.

### projects
The central entity for all operations.
```sql
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### time_logs (Canonical Labor)
Records actual hours worked. Has computed `labor_cost` column.
```sql
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
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### work_schedules (Canonical Planned Labor)
Records planned/scheduled work assignments.
```sql
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
  status text DEFAULT 'planned'::text,  -- planned, synced, split_modified, split_created
  converted_to_timelog boolean DEFAULT false,
  last_synced_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### costs (Canonical Non-Labor Expenses)
All subs, materials, and other costs.
```sql
CREATE TABLE public.costs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  company_id uuid REFERENCES companies(id),
  vendor_type text,  -- 'sub', 'supplier', 'material_vendor', 'other'
  vendor_id uuid,
  description text NOT NULL,
  cost_code_id uuid REFERENCES cost_codes(id),
  category text NOT NULL,  -- 'subs', 'materials', 'other'
  amount numeric NOT NULL DEFAULT 0,
  date_incurred date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'unpaid'::text,  -- 'unpaid', 'paid', 'void'
  payment_id uuid REFERENCES vendor_payments(id),
  paid_date date,
  notes text,
  quantity numeric,
  unit_cost numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### labor_pay_runs (Labor Payment Batches)
```sql
CREATE TABLE public.labor_pay_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  payer_company_id uuid REFERENCES companies(id),
  payee_company_id uuid REFERENCES companies(id),
  total_hours numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  status text DEFAULT 'draft'::text,  -- 'draft', 'pending', 'paid', 'void'
  payment_date date,
  payment_method text,
  payment_reference text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### labor_pay_run_items
Links time_logs to pay runs.
```sql
CREATE TABLE public.labor_pay_run_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pay_run_id uuid NOT NULL REFERENCES labor_pay_runs(id) ON DELETE CASCADE,
  time_log_id uuid NOT NULL REFERENCES time_logs(id),
  worker_id uuid REFERENCES workers(id),
  hours numeric,
  rate numeric,
  amount numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### vendor_payments (Non-Labor Payment Batches)
```sql
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
  status text DEFAULT 'recorded'::text,  -- 'recorded', 'void'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### vendor_payment_items
Links costs to vendor payments.
```sql
CREATE TABLE public.vendor_payment_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES vendor_payments(id) ON DELETE CASCADE,
  cost_id uuid NOT NULL REFERENCES costs(id),
  amount numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### workers
```sql
CREATE TABLE public.workers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  hourly_rate numeric,
  trade_id uuid REFERENCES trades(id),
  status text DEFAULT 'active'::text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### trades
```sql
CREATE TABLE public.trades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  default_labor_cost_code_id uuid REFERENCES cost_codes(id),
  default_sub_cost_code_id uuid REFERENCES cost_codes(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### cost_codes
```sql
CREATE TABLE public.cost_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,  -- 'labor', 'subs', 'materials', 'other'
  default_trade_id uuid REFERENCES trades(id),
  trade_id uuid REFERENCES trades(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### companies
```sql
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
```

### estimates
```sql
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
  project_type text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### estimate_items
```sql
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
  group_label text,
  planned_hours numeric,
  is_allowance boolean DEFAULT false,
  cost_code_id uuid REFERENCES cost_codes(id),
  trade_id uuid REFERENCES trades(id),
  created_at timestamptz DEFAULT now()
);
```

### scope_blocks
```sql
CREATE TABLE public.scope_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL,  -- 'estimate'
  entity_id uuid NOT NULL,
  scope_group text NOT NULL,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### scope_block_cost_items
```sql
CREATE TABLE public.scope_block_cost_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_block_id uuid NOT NULL REFERENCES scope_blocks(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'ea'::text,
  unit_price numeric NOT NULL DEFAULT 0,
  markup_percent numeric DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  category text,  -- 'Labor', 'Materials', 'Subs', etc.
  group_label text,
  area_label text,
  trade_id uuid REFERENCES trades(id),
  cost_code_id uuid REFERENCES cost_codes(id),
  is_allowance boolean DEFAULT false,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### project_budgets
```sql
CREATE TABLE public.project_budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) UNIQUE,
  name text DEFAULT 'Main Budget',
  status text DEFAULT 'active',
  labor_budget numeric DEFAULT 0,
  subs_budget numeric DEFAULT 0,
  materials_budget numeric DEFAULT 0,
  other_budget numeric DEFAULT 0,
  default_markup_pct numeric,
  default_tax_pct numeric,
  notes text,
  baseline_estimate_id uuid REFERENCES estimates(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### project_budget_groups
```sql
CREATE TABLE public.project_budget_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_budget_id uuid NOT NULL REFERENCES project_budgets(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  client_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### project_budget_lines
```sql
CREATE TABLE public.project_budget_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  project_budget_id uuid REFERENCES project_budgets(id),
  group_id uuid REFERENCES project_budget_groups(id),
  cost_code_id uuid REFERENCES cost_codes(id),
  scope_type text DEFAULT 'base',  -- 'base', 'change_order', 'allowance', 'option'
  line_type text,  -- 'labor', 'subs', 'materials', 'other'
  category text NOT NULL,
  description_internal text,
  description_client text,
  qty numeric DEFAULT 1,
  unit text DEFAULT 'ea',
  unit_cost numeric DEFAULT 0,
  budget_amount numeric NOT NULL DEFAULT 0,
  budget_hours numeric,
  markup_pct numeric,
  tax_pct numeric,
  allowance_cap numeric,
  is_optional boolean DEFAULT false,
  is_allowance boolean DEFAULT false,
  client_visible boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  internal_notes text,
  change_order_id uuid,
  source_estimate_id uuid REFERENCES estimates(id),
  actual_cost numeric DEFAULT 0,
  actual_hours numeric DEFAULT 0,
  variance numeric DEFAULT 0,
  percent_complete numeric DEFAULT 0,
  forecast_at_completion numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, cost_code_id)
);
```

### invoices
```sql
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### invoice_items
```sql
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
  created_at timestamptz DEFAULT now()
);
```

### customer_payments
```sql
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### subs (Subcontractors)
```sql
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### sub_contracts
```sql
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### sub_invoices
```sql
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### material_vendors
```sql
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### material_receipts
```sql
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### documents
```sql
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
  source_context text,
  auto_classified boolean DEFAULT false,
  extracted_text text,
  notes text,
  version_number integer DEFAULT 1,
  version_group_id uuid,
  is_archived boolean DEFAULT false,
  is_private boolean DEFAULT false,
  related_cost_id uuid REFERENCES costs(id),
  related_invoice_id uuid REFERENCES invoices(id),
  -- AI analysis fields
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
  ai_last_run_at timestamptz,
  ai_last_run_status text,
  uploaded_by uuid,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### document_tags
```sql
CREATE TABLE public.document_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### proposals
```sql
CREATE TABLE public.proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  primary_estimate_id uuid REFERENCES estimates(id),
  title text NOT NULL,
  proposal_number text,
  status text DEFAULT 'draft'::text,
  valid_until date,
  validity_days integer DEFAULT 30,
  subtotal numeric DEFAULT 0,
  tax_percent numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  payment_terms text,
  settings jsonb DEFAULT '{}'::jsonb,
  cover_content jsonb DEFAULT '{}'::jsonb,
  acceptance_status text DEFAULT 'pending'::text,
  acceptance_date timestamptz,
  accepted_by_name text,
  accepted_by_email text,
  acceptance_notes text,
  client_signature text,
  acceptance_ip text,
  public_token text UNIQUE,
  viewed_at timestamptz,
  viewed_count integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### proposal_sections (Legacy - Read Only)
```sql
CREATE TABLE public.proposal_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  section_type text NOT NULL,
  title text,
  content jsonb DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### proposal_events
```sql
CREATE TABLE public.proposal_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_name text,
  actor_email text,
  actor_ip text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

### proposal_settings
```sql
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### proposal_templates
```sql
CREATE TABLE public.proposal_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  sections jsonb DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### project_todos (Tasks)
```sql
CREATE TABLE public.project_todos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  title text NOT NULL,
  description text,
  status text DEFAULT 'open'::text,  -- 'open', 'in_progress', 'done'
  priority text DEFAULT 'medium'::text,
  task_type text,
  due_date date,
  assignee_id uuid,
  assignee_name text,
  cost_code_id uuid REFERENCES cost_codes(id),
  related_entity_type text,
  related_entity_id uuid,
  completed_at timestamptz,
  completed_by uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### activity_log
```sql
CREATE TABLE public.activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

### entity_change_log
```sql
CREATE TABLE public.entity_change_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  version integer NOT NULL,
  change_type text NOT NULL,
  change_summary text,
  changes jsonb DEFAULT '{}'::jsonb,
  changed_by uuid,
  created_at timestamptz DEFAULT now()
);
```

### user_roles
```sql
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'field_user'::app_role,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);
```

### invitations
```sql
CREATE TABLE public.invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'field_user'::app_role,
  invited_by uuid,
  used boolean DEFAULT false,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

### measurement_units
```sql
CREATE TABLE public.measurement_units (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### checklist_templates
```sql
CREATE TABLE public.checklist_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  project_type text NOT NULL,
  phase text NOT NULL,
  tags text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### checklist_template_items
```sql
CREATE TABLE public.checklist_template_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_template_id uuid NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  required boolean DEFAULT true,
  default_assignee_role text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### checklist_questions
```sql
CREATE TABLE public.checklist_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_type text NOT NULL,
  code text NOT NULL,
  label text NOT NULL,
  input_type text NOT NULL,
  options jsonb,
  help_text text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_type, code)
);
```

### checklist_question_answers
```sql
CREATE TABLE public.checklist_question_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id uuid NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES checklist_questions(id),
  value_text text,
  value_boolean boolean,
  value_json jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(estimate_id, question_id)
);
```

### bid_packages
```sql
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### bid_invitations
```sql
CREATE TABLE public.bid_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_package_id uuid NOT NULL REFERENCES bid_packages(id),
  sub_id uuid NOT NULL REFERENCES subs(id),
  status text DEFAULT 'invited'::text,
  invited_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  notes text,
  UNIQUE(bid_package_id, sub_id)
);
```

### budget_revisions
```sql
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
  approved_at timestamptz,
  status text DEFAULT 'pending'::text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
```

---

## Legacy Tables

These tables are READ-ONLY for historical data. Never write new data to them.

### daily_logs (Legacy)
```sql
CREATE TABLE public.daily_logs (
  id uuid PRIMARY KEY,
  date date NOT NULL,
  worker_id uuid NOT NULL,
  project_id uuid NOT NULL,
  hours_worked numeric NOT NULL,
  notes text,
  trade_id uuid,
  cost_code_id uuid,
  payment_status text DEFAULT 'unpaid',
  paid_amount numeric DEFAULT 0,
  payment_id uuid,
  schedule_id uuid,
  last_synced_at timestamptz,
  created_by uuid,
  created_at timestamptz
);
```

### day_cards (Legacy)
```sql
CREATE TABLE public.day_cards (
  id uuid PRIMARY KEY,
  worker_id uuid NOT NULL,
  date date NOT NULL,
  scheduled_hours numeric DEFAULT 0,
  logged_hours numeric DEFAULT 0,
  status text DEFAULT 'scheduled',
  pay_rate numeric,
  pay_status text DEFAULT 'unpaid',
  company_id uuid,
  notes text,
  metadata jsonb DEFAULT '{}',
  lifecycle_status text DEFAULT 'scheduled',
  locked boolean DEFAULT false,
  -- ... additional fields
  UNIQUE(worker_id, date)
);
```

### day_card_jobs (Legacy)
```sql
CREATE TABLE public.day_card_jobs (
  id uuid PRIMARY KEY,
  day_card_id uuid NOT NULL,
  project_id uuid NOT NULL,
  trade_id uuid,
  cost_code_id uuid,
  hours numeric DEFAULT 0,
  notes text,
  -- timestamps
);
```

### time_log_allocations (Legacy)
```sql
CREATE TABLE public.time_log_allocations (
  id uuid PRIMARY KEY,
  day_card_id uuid NOT NULL,
  project_id uuid NOT NULL,
  trade_id uuid,
  cost_code_id uuid,
  hours numeric NOT NULL,
  notes text,
  -- timestamps
);
```

### payments (Legacy)
```sql
CREATE TABLE public.payments (
  id uuid PRIMARY KEY,
  start_date date NOT NULL,
  end_date date NOT NULL,
  paid_by text NOT NULL,
  paid_via text,
  payment_date date DEFAULT CURRENT_DATE,
  amount numeric DEFAULT 0,
  notes text,
  reimbursement_status text,
  reimbursement_date date,
  company_id uuid,
  -- timestamps
);
```

### scheduled_shifts (Legacy - if exists)
### sub_scheduled_shifts (Legacy)
### sub_logs (Legacy)
### cost_entries (Legacy)

---

## Views

### project_labor_summary_view
Aggregates labor from time_logs by project and cost_code.
```sql
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
```

### project_cost_summary_view
Aggregates non-labor costs by project, category, and cost_code.
```sql
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
```

### project_revenue_summary_view
Aggregates revenue from invoices.
```sql
CREATE VIEW project_revenue_summary_view AS
SELECT
  i.project_id,
  SUM(i.total_amount) AS billed_amount
FROM invoices i
WHERE i.status != 'void'
GROUP BY i.project_id;
```

### global_financial_summary_view
Company-wide financial rollup.
```sql
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
    COALESCE(SUM(CASE WHEN LOWER(category) IN ('other', 'misc', 'equipment') OR category IS NULL THEN amount ELSE 0 END), 0) AS other_cost,
    COALESCE(SUM(CASE WHEN (LOWER(category) IN ('other', 'misc', 'equipment') OR category IS NULL) AND status = 'unpaid' THEN amount ELSE 0 END), 0) AS other_unpaid
  FROM costs WHERE status != 'void'
),
revenue_summary AS (
  SELECT COALESCE(SUM(total_amount), 0) AS total_revenue
  FROM estimates WHERE status = 'accepted'
)
SELECT
  r.total_revenue AS revenue,
  l.total_labor_cost AS labor_actual,
  l.unpaid_labor_cost AS labor_unpaid,
  c.subs_cost AS subs_actual,
  c.subs_unpaid,
  c.materials_cost AS materials_actual,
  c.materials_unpaid,
  c.other_cost AS other_actual,
  c.other_unpaid,
  (l.total_labor_cost + c.subs_cost + c.materials_cost + c.other_cost) AS total_costs,
  (r.total_revenue - (l.total_labor_cost + c.subs_cost + c.materials_cost + c.other_cost)) AS profit,
  (l.unpaid_labor_cost + c.subs_unpaid + c.materials_unpaid + c.other_unpaid) AS total_outstanding,
  0 AS retention_held
FROM labor_summary l, costs_summary c, revenue_summary r;
```

### work_schedule_grid_view
Denormalized view for schedule grids.
```sql
CREATE VIEW work_schedule_grid_view AS
SELECT
  ws.*,
  w.name AS worker_name,
  w.hourly_rate AS worker_rate,
  t.name AS trade_name,
  p.project_name,
  c.name AS company_name,
  cc.code AS cost_code,
  cc.name AS cost_code_name
FROM work_schedules ws
LEFT JOIN workers w ON ws.worker_id = w.id
LEFT JOIN trades t ON ws.trade_id = t.id
LEFT JOIN projects p ON ws.project_id = p.id
LEFT JOIN companies c ON ws.company_id = c.id
LEFT JOIN cost_codes cc ON ws.cost_code_id = cc.id;
```

### time_logs_with_meta_view
Denormalized view for time logs with metadata.
```sql
CREATE VIEW time_logs_with_meta_view AS
SELECT
  tl.*,
  w.name AS worker_name,
  w.hourly_rate AS worker_default_rate,
  t.name AS trade_name,
  p.project_name,
  c.name AS company_name,
  cc.code AS cost_code,
  cc.name AS cost_code_name,
  cc.category AS cost_code_category
FROM time_logs tl
LEFT JOIN workers w ON tl.worker_id = w.id
LEFT JOIN trades t ON tl.trade_id = t.id
LEFT JOIN projects p ON tl.project_id = p.id
LEFT JOIN companies c ON tl.company_id = c.id
LEFT JOIN cost_codes cc ON tl.cost_code_id = cc.id;
```

### workers_public
```sql
CREATE VIEW workers_public AS
SELECT id, name, email, phone, hourly_rate, trade_id, status FROM workers;
```

### day_cards_with_details (Legacy)
### company_payroll_summary (Legacy)
### cost_code_actuals (Legacy)
### labor_actuals_by_cost_code
### material_actuals_by_project

---

## Database Functions

### Auto-Population Functions

```sql
-- Auto-populate company_id from project
CREATE OR REPLACE FUNCTION auto_populate_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id FROM projects WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-populate worker hourly_rate
CREATE OR REPLACE FUNCTION auto_populate_worker_rate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.hourly_rate IS NULL AND NEW.worker_id IS NOT NULL THEN
    SELECT hourly_rate INTO NEW.hourly_rate FROM workers WHERE id = NEW.worker_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-set schedule trade from worker
CREATE OR REPLACE FUNCTION auto_set_schedule_trade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trade_id IS NULL THEN
    SELECT trade_id INTO NEW.trade_id FROM workers WHERE id = NEW.worker_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-set time_log trade and cost_code (priority: explicit > schedule > worker)
CREATE OR REPLACE FUNCTION auto_set_time_log_trade_and_cost_code()
RETURNS TRIGGER AS $$
DECLARE
  v_final_trade_id uuid;
  v_cost_code_id uuid;
BEGIN
  -- Priority 1: explicit value
  IF NEW.trade_id IS NOT NULL THEN
    v_final_trade_id := NEW.trade_id;
  -- Priority 2: from linked schedule
  ELSIF NEW.source_schedule_id IS NOT NULL THEN
    SELECT trade_id INTO v_final_trade_id FROM work_schedules WHERE id = NEW.source_schedule_id;
  END IF;
  -- Priority 3: from worker
  IF v_final_trade_id IS NULL THEN
    SELECT trade_id INTO v_final_trade_id FROM workers WHERE id = NEW.worker_id;
  END IF;
  NEW.trade_id := v_final_trade_id;
  
  -- Auto-assign cost code if missing
  IF NEW.cost_code_id IS NULL AND v_final_trade_id IS NOT NULL THEN
    SELECT default_labor_cost_code_id INTO v_cost_code_id FROM trades WHERE id = v_final_trade_id;
    NEW.cost_code_id := v_cost_code_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Sync Functions

```sql
-- Sync work_schedule to time_log (creates/updates time_logs when schedule is in past)
CREATE OR REPLACE FUNCTION sync_work_schedule_to_time_log()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_timelog_id UUID;
  v_should_sync BOOLEAN := FALSE;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  
  IF NEW.scheduled_date < CURRENT_DATE THEN
    v_should_sync := TRUE;
  ELSIF (NEW.converted_to_timelog = TRUE AND COALESCE(OLD.converted_to_timelog, FALSE) = FALSE) THEN
    v_should_sync := TRUE;
  END IF;

  IF NOT v_should_sync THEN RETURN NEW; END IF;

  SELECT id INTO v_existing_timelog_id FROM time_logs WHERE source_schedule_id = NEW.id LIMIT 1;

  IF v_existing_timelog_id IS NOT NULL THEN
    UPDATE time_logs SET
      worker_id = NEW.worker_id, company_id = NEW.company_id, project_id = NEW.project_id,
      trade_id = NEW.trade_id, cost_code_id = NEW.cost_code_id, hours_worked = NEW.scheduled_hours,
      notes = NEW.notes, date = NEW.scheduled_date, last_synced_at = now()
    WHERE id = v_existing_timelog_id;
  ELSE
    INSERT INTO time_logs (source_schedule_id, worker_id, company_id, project_id, trade_id, cost_code_id, hours_worked, notes, date, last_synced_at)
    VALUES (NEW.id, NEW.worker_id, NEW.company_id, NEW.project_id, NEW.trade_id, NEW.cost_code_id, NEW.scheduled_hours, NEW.notes, NEW.scheduled_date, now());
  END IF;

  IF NEW.status != 'synced' THEN
    UPDATE work_schedules SET status = 'synced', converted_to_timelog = TRUE, last_synced_at = now() WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sync time_log back to work_schedule
CREATE OR REPLACE FUNCTION sync_time_log_to_work_schedule()
RETURNS TRIGGER AS $$
DECLARE schedule_date DATE;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.source_schedule_id IS NOT NULL THEN
    SELECT scheduled_date INTO schedule_date FROM work_schedules WHERE id = NEW.source_schedule_id;
    IF schedule_date IS NOT NULL AND schedule_date < CURRENT_DATE THEN
      UPDATE work_schedules SET
        worker_id = NEW.worker_id, project_id = NEW.project_id, company_id = NEW.company_id,
        trade_id = NEW.trade_id, cost_code_id = NEW.cost_code_id, scheduled_hours = NEW.hours_worked,
        notes = NEW.notes, scheduled_date = NEW.date, status = 'synced', last_synced_at = now()
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Payment Functions

```sql
-- Mark time_logs paid when pay run is marked paid
CREATE OR REPLACE FUNCTION mark_time_logs_paid_on_pay_run()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    UPDATE time_logs SET payment_status = 'paid', paid_amount = labor_cost
    FROM labor_pay_run_items
    WHERE labor_pay_run_items.time_log_id = time_logs.id
    AND labor_pay_run_items.pay_run_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark costs paid when vendor payment is recorded
CREATE OR REPLACE FUNCTION mark_costs_paid_on_vendor_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'recorded' AND (OLD.status IS NULL OR OLD.status <> 'recorded') THEN
    UPDATE costs c SET status = 'paid', paid_date = NEW.payment_date, payment_id = NEW.id, updated_at = now()
    FROM vendor_payment_items i
    WHERE i.payment_id = NEW.id AND i.cost_id = c.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Split Functions

```sql
-- split_schedule_for_multi_project(p_original_schedule_id, p_time_log_entries)
-- Splits a work_schedule into multiple schedules+time_logs for multi-project days

-- split_time_log_for_multi_project(p_original_time_log_id, p_entries)
-- Splits a time_log into multiple time_logs (preserves source_schedule_id)
```

### Other Functions

```sql
-- sync_estimate_to_budget(p_estimate_id) - Syncs estimate items to project_budget_lines
-- sync_material_receipt_to_cost() - Auto-creates costs from material_receipts
-- update_updated_at_column() - Updates updated_at timestamp
-- log_activity() - Logs entity changes to activity_log
-- prevent_paid_time_log_mutation() - Prevents editing paid time_logs
-- generate_proposal_public_token() - Generates unique public token for proposals
-- update_proposal_acceptance() - Updates proposal acceptance status
-- log_proposal_event() - Logs proposal events
```

---

## Triggers

### Work Schedules Triggers
```sql
CREATE TRIGGER auto_populate_company_id_work_schedules BEFORE INSERT ON work_schedules FOR EACH ROW EXECUTE FUNCTION auto_populate_company_id();
CREATE TRIGGER auto_set_schedule_trade_trigger BEFORE INSERT ON work_schedules FOR EACH ROW EXECUTE FUNCTION auto_set_schedule_trade();
CREATE TRIGGER sync_work_schedule_to_time_log_trigger AFTER INSERT OR UPDATE ON work_schedules FOR EACH ROW EXECUTE FUNCTION sync_work_schedule_to_time_log();
CREATE TRIGGER update_updated_at_work_schedules BEFORE UPDATE ON work_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Time Logs Triggers
```sql
CREATE TRIGGER auto_populate_company_id_time_logs BEFORE INSERT ON time_logs FOR EACH ROW EXECUTE FUNCTION auto_populate_company_id();
CREATE TRIGGER auto_populate_worker_rate_time_logs BEFORE INSERT ON time_logs FOR EACH ROW EXECUTE FUNCTION auto_populate_worker_rate();
CREATE TRIGGER auto_set_time_log_trade_and_cost_code_trigger BEFORE INSERT ON time_logs FOR EACH ROW EXECUTE FUNCTION auto_set_time_log_trade_and_cost_code();
CREATE TRIGGER sync_time_log_to_work_schedule_trigger AFTER INSERT OR UPDATE ON time_logs FOR EACH ROW EXECUTE FUNCTION sync_time_log_to_work_schedule();
CREATE TRIGGER update_updated_at_time_logs BEFORE UPDATE ON time_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER prevent_paid_time_log_mutation_trigger BEFORE UPDATE ON time_logs FOR EACH ROW EXECUTE FUNCTION prevent_paid_time_log_mutation();
```

### Payment Triggers
```sql
CREATE TRIGGER mark_time_logs_paid_trigger AFTER UPDATE OF status ON labor_pay_runs FOR EACH ROW EXECUTE FUNCTION mark_time_logs_paid_on_pay_run();
CREATE TRIGGER mark_costs_paid_trigger AFTER INSERT OR UPDATE OF status ON vendor_payments FOR EACH ROW EXECUTE FUNCTION mark_costs_paid_on_vendor_payment();
```

### Material Receipt Trigger
```sql
CREATE TRIGGER sync_material_receipt_to_cost_trigger BEFORE INSERT OR UPDATE OR DELETE ON material_receipts FOR EACH ROW EXECUTE FUNCTION sync_material_receipt_to_cost();
```

### Costs Trigger
```sql
CREATE TRIGGER update_updated_at_costs BEFORE UPDATE ON costs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Indexes

### Performance Indexes
```sql
-- Time Logs
CREATE INDEX idx_time_logs_payment_status_date ON time_logs(payment_status, date);
CREATE INDEX idx_time_logs_worker_date ON time_logs(worker_id, date);
CREATE INDEX idx_time_logs_project_date ON time_logs(project_id, date);
CREATE INDEX idx_time_logs_date ON time_logs(date);
CREATE INDEX idx_time_logs_source_schedule ON time_logs(source_schedule_id);
CREATE INDEX idx_time_logs_cost_code_project ON time_logs(cost_code_id, project_id);

-- Work Schedules
CREATE INDEX idx_work_schedules_scheduled_date ON work_schedules(scheduled_date);
CREATE INDEX idx_work_schedules_worker_date ON work_schedules(worker_id, scheduled_date);
CREATE INDEX idx_work_schedules_status_date ON work_schedules(status, scheduled_date);

-- Labor Pay Runs
CREATE INDEX idx_labor_pay_runs_created_at ON labor_pay_runs(created_at DESC);
CREATE INDEX idx_labor_pay_runs_payment_date_status ON labor_pay_runs(payment_date, status);
CREATE INDEX idx_labor_pay_runs_payer_company ON labor_pay_runs(payer_company_id);

-- Labor Pay Run Items
CREATE INDEX idx_labor_pay_run_items_pay_run ON labor_pay_run_items(pay_run_id);
CREATE INDEX idx_labor_pay_run_items_time_log ON labor_pay_run_items(time_log_id);
CREATE UNIQUE INDEX idx_labor_pay_run_items_unique_time_log ON labor_pay_run_items(time_log_id);

-- Costs
CREATE INDEX idx_costs_project ON costs(project_id);
CREATE INDEX idx_costs_status ON costs(status);
CREATE INDEX idx_costs_category ON costs(category);
CREATE INDEX idx_costs_date_incurred ON costs(date_incurred);
CREATE INDEX idx_costs_cost_code_project ON costs(cost_code_id, project_id);

-- Documents
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_documents_owner ON documents(owner_type, owner_id);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at DESC);

-- Invoices
CREATE INDEX idx_invoices_project_status ON invoices(project_id, status);

-- Activity Log
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
```

---

## RLS Policies

All tables have RLS enabled. Current policies are permissive (for development):

```sql
-- Pattern for most tables:
CREATE POLICY "Anyone can view [table]" ON [table] FOR SELECT USING (true);
CREATE POLICY "Anyone can insert [table]" ON [table] FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update [table]" ON [table] FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete [table]" ON [table] FOR DELETE USING (true);
```

Tables with RLS enabled:
- activity_log, bid_invitations, bid_packages, budget_revisions
- checklist_*, cost_codes, cost_entries, costs, customer_payments
- day_card_jobs, day_cards, document_tags, documents
- entity_change_log, estimate_items, estimates
- invoice_items, invoices, labor_pay_run_items, labor_pay_runs
- material_receipts, material_vendors, measurement_units
- project_budget_groups, project_budget_lines, project_budgets, project_todos, projects
- proposal_events, proposal_sections, proposal_settings, proposal_templates, proposals
- schedule_of_values_items, scope_block_cost_items, scope_blocks, scope_items
- sub_contracts, sub_invoices, sub_logs, sub_scheduled_shifts, subs
- time_log_allocations, time_logs, trades, user_roles
- vendor_payment_items, vendor_payments, work_schedules, workers

---

## Edge Functions

### analyze-document
AI-powered document analysis using Lovable AI Gateway.
- Location: `supabase/functions/analyze-document/index.ts`
- Purpose: Extracts metadata from uploaded documents (COI, invoices, contracts, etc.)
- Uses: `google/gemini-2.5-flash` model
- Currently: Disabled for stability

### convert-past-schedules
Batch converts past schedules to time logs.
- Location: `supabase/functions/convert-past-schedules/index.ts`
- Purpose: Converts scheduled_shifts to daily_logs (legacy)

---

## Storage Buckets

| Bucket Name | Public | Purpose |
|-------------|--------|---------|
| company-docs | Yes | Organization-level documents |
| project-docs | Yes | Project-specific documents |

Path Strategy:
- Company docs: `company-docs/{org_id}/{document_type}/{yyyy}/{mm}/{filename}`
- Project docs: `project-docs/{org_id}/{project_id}/{document_type}/{yyyy}/{mm}/{filename}`

---

## Architectural Constraints

### Canonical vs Legacy Tables
**WRITE to these tables ONLY:**
- projects, time_logs, work_schedules, costs
- labor_pay_runs, labor_pay_run_items
- vendor_payments, vendor_payment_items
- workers, trades, cost_codes, companies
- estimates, estimate_items, scope_blocks, scope_block_cost_items
- project_budgets, project_budget_groups, project_budget_lines
- invoices, invoice_items, customer_payments
- proposals, proposal_events, proposal_settings
- subs, sub_contracts, sub_invoices
- material_vendors, material_receipts
- documents, document_tags
- project_todos, activity_log

**NEVER WRITE to these legacy tables:**
- daily_logs, day_cards, day_card_jobs
- time_log_allocations, payments, scheduled_shifts
- sub_scheduled_shifts, sub_logs, cost_entries

### Category Normalization
All cost categories must use exactly: `'labor'`, `'subs'`, `'materials'`, `'other'`

### Cost Code Enforcement
All financial records require a valid `cost_code_id`. Use 'UNASSIGNED' cost code as fallback.

### Payment Flow
- Labor: time_logs → labor_pay_run_items → labor_pay_runs (trigger marks time_logs paid)
- Non-labor: costs → vendor_payment_items → vendor_payments (trigger marks costs paid)

### Schedule/Time Log Sync
- work_schedules auto-sync to time_logs when `scheduled_date < CURRENT_DATE`
- Changes to time_logs sync back to linked work_schedules
- Split operations preserve `source_schedule_id` relationships

---

*End of Database Dump*
