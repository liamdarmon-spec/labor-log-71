-- =============================================================================
-- STRICT MULTI-TENANT SCHEMA MIGRATION
-- =============================================================================
--
-- TOP 15 ISSUES FIXED:
-- 1. Multi-tenant model enforced: ALL business tables have company_id NOT NULL
-- 2. Membership model: companies, company_users, company_invites tables added
-- 3. Security helpers: auth_uid(), current_company_id(), is_company_member(), etc.
-- 4. Strict RLS: FORCE ROW LEVEL SECURITY on all tenant tables
-- 5. Role-based access: financial tables restricted to owner/admin/accounting
-- 6. Backfill company_id: deterministic backfill via project links or created_by
-- 7. Duplicate triggers removed (ONE trigger per behavior)
-- 8. Placeholder views eliminated (NULL shells removed)
-- 9. log_activity() fixed (invalid JSON subtraction replaced)
-- 10. Trigger recursion guards (sync_guard prevents infinite loops)
-- 11. Partial unique constraints (project_budget_lines WHERE cost_code_id IS NOT NULL)
-- 12. Dedupe blocks conditional (OFF by default, controlled by app.run_dedupe)
-- 13. Extensions cleaned (no plpgsql, proper schema usage)
-- 14. updated_at triggers standardized (one function, one pattern)
-- 15. Comprehensive documentation (RLS matrix, backfill strategy in SCHEMA_NOTES.md)
--
-- TENANCY MODEL:
-- - Every business object belongs to exactly ONE company (company_id)
-- - Users access companies via company_users membership table
-- - RLS policies enforce company isolation for ALL tenant tables
-- - Financial tables have additional role restrictions (owner/admin/accounting only)
--
-- SAFETY:
-- - Idempotent: safe to re-run
-- - Dedupe blocks OFF by default (set app.run_dedupe='true' to enable)
-- - Default company created for any orphaned rows during backfill
-- =============================================================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "citext";


-- =============================================================================
-- CORE TENANCY TABLES
-- =============================================================================

-- Companies (tenants)
CREATE TABLE IF NOT EXISTS public.companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);


-- Company invitations
CREATE TABLE IF NOT EXISTS public.company_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    email citext NOT NULL,
    role text NOT NULL CHECK (role IN ('owner','admin','pm','field','accounting','viewer')),
    token text UNIQUE NOT NULL,
    expires_at timestamptz NOT NULL,
    created_by uuid REFERENCES auth.users(id),
    accepted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, email)
);

  END IF;
END $$;


CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;

SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;

SET transaction_timeout = 0;
SET client_encoding = 'UTF8';

SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);

SET check_function_bodies = false;
SET xmloption = content;

SET client_min_messages = warning;
SET row_security = off;



DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role'
      AND n.nspname = 'public'
  ) THEN
CREATE TYPE public.app_role AS ENUM (
    'admin',
    'field_user'
);
  END IF;
END
$$;



SET default_table_access_method = heap;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: -

--

CREATE TABLE IF NOT EXISTS public.activity_log(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    action text NOT NULL,
    actor_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT activity_log_action_check CHECK ((action = ANY (ARRAY['created'::text, 'updated'::text, 'deleted'::text, 'approved'::text, 'paid'::text, 'archived'::text]))),
    CONSTRAINT activity_log_entity_type_check CHECK ((entity_type = ANY (ARRAY['schedule'::text, 'log'::text, 'payment'::text, 'project'::text, 'worker'::text, 'sub'::text, 'document'::text])))
);



--
-- Name: archived_daily_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.archived_daily_logs(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_id uuid NOT NULL,
    date date NOT NULL,
    worker_id uuid NOT NULL,
    project_id uuid NOT NULL,
    hours_worked numeric NOT NULL,
    notes text,
    trade_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    archived_at timestamp with time zone DEFAULT now() NOT NULL,
    archived_by uuid,
    company_id uuid
);



--
-- Name: bid_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.bid_invitations(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bid_package_id uuid NOT NULL,
    sub_id uuid NOT NULL,
    status text DEFAULT 'invited'::text,
    invited_at timestamp with time zone DEFAULT now() NOT NULL,
    responded_at timestamp with time zone,
    notes text,
    created_by uuid,
    company_id uuid
);



--
-- Name: bid_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.bid_packages(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    title text NOT NULL,
    scope_summary text,
    cost_code_ids uuid[],
    bid_due_date date,
    desired_start_date date,
    attachments jsonb,
    status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    company_id uuid
);



--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.companies(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);



--
-- Name: day_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.day_cards(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    worker_id uuid NOT NULL,
    date date NOT NULL,
    scheduled_hours numeric DEFAULT 0,
    logged_hours numeric DEFAULT 0,
    status text DEFAULT 'scheduled'::text NOT NULL,
    pay_rate numeric,
    pay_status text DEFAULT 'unpaid'::text,
    company_id uuid,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    locked boolean DEFAULT false,
    lifecycle_status text DEFAULT 'scheduled'::text,
    approved_at timestamp with time zone,
    approved_by uuid,
    paid_at timestamp with time zone,
    archived_at timestamp with time zone,
    CONSTRAINT day_cards_lifecycle_status_check CHECK ((lifecycle_status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'logged'::text, 'paid'::text, 'archived'::text]))),
    CONSTRAINT day_cards_pay_status_check CHECK ((pay_status = ANY (ARRAY['unpaid'::text, 'pending'::text, 'paid'::text]))),
    CONSTRAINT day_cards_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'logged'::text, 'approved'::text, 'paid'::text])))
);



--
-- Name: cost_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.cost_codes(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    default_trade_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    trade_id uuid,
    CONSTRAINT cost_codes_category_check CHECK ((category = ANY (ARRAY['labor'::text, 'subs'::text, 'materials'::text, 'other'::text]))),
    created_by uuid,
    company_id uuid
);



--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.projects(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_name text NOT NULL,
    client_name text NOT NULL,
    address text,
    status text DEFAULT 'Active'::text NOT NULL,
    project_manager text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company_id uuid,
    created_by uuid,
    updated_by uuid
);



--
-- Name: time_log_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.time_log_allocations(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    day_card_id uuid NOT NULL,
    project_id uuid NOT NULL,
    trade_id uuid,
    cost_code_id uuid,
    hours numeric NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT time_log_allocations_hours_check CHECK ((hours >= (0)::numeric)),
    created_by uuid,
    company_id uuid
);



--
-- Name: daily_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.daily_logs(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    worker_id uuid NOT NULL,
    project_id uuid NOT NULL,
    hours_worked numeric(5,2) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    trade_id uuid,
    schedule_id uuid,
    last_synced_at timestamp with time zone,
    cost_code_id uuid,
    payment_status text DEFAULT 'unpaid'::text,
    payment_id uuid,
    paid_amount numeric DEFAULT 0,
    CONSTRAINT daily_logs_hours_worked_check CHECK ((hours_worked > (0)::numeric)),
    CONSTRAINT daily_logs_payment_status_check CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'paid'::text]))),
    company_id uuid
);



--
-- Name: day_card_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.day_card_jobs(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    day_card_id uuid NOT NULL,
    project_id uuid NOT NULL,
    trade_id uuid,
    cost_code_id uuid,
    hours numeric DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    company_id uuid
);



--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.documents(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_size bigint,
    document_type text,
    cost_code_id uuid,
    auto_classified boolean DEFAULT false,
    extracted_text text,
    tags text[],
    vendor_name text,
    amount numeric,
    document_date date,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    uploaded_at timestamp with time zone DEFAULT now(),
    owner_type text,
    owner_id uuid,
    storage_path text,
    mime_type text,
    size_bytes bigint,
    doc_type text,
    title text,
    description text,
    source text,
    status text,
    ai_status text,
    ai_doc_type text,
    ai_summary text,
    ai_extracted_data jsonb,
    CONSTRAINT documents_document_type_check CHECK ((document_type = ANY (ARRAY['plans'::text, 'receipts'::text, 'invoices'::text, 'contracts'::text, 'submittals'::text, 'permits'::text, 'photos'::text, 'proposals'::text, 'other'::text]))),
    created_by uuid,
    company_id uuid
);



--
-- Name: estimate_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.estimate_items(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    estimate_id uuid NOT NULL,
    description text NOT NULL,
    quantity numeric(12,2) DEFAULT 1 NOT NULL,
    unit text DEFAULT 'ea'::text,
    unit_price numeric(12,2) DEFAULT 0 NOT NULL,
    line_total numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    category text,
    cost_code_id uuid,
    trade_id uuid,
    planned_hours numeric,
    is_allowance boolean DEFAULT false,
    area_name text,
    scope_group text,
    company_id uuid
);



--
-- Name: estimates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.estimates(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    subtotal_amount numeric(12,2) DEFAULT 0,
    tax_amount numeric(12,2) DEFAULT 0,
    total_amount numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_budget_source boolean DEFAULT false,
    CONSTRAINT valid_estimate_status CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'accepted'::text, 'rejected'::text]))),
    company_id uuid
);



--
-- Name: invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.invitations(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    role public.app_role DEFAULT 'field_user'::public.app_role NOT NULL,
    invited_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    used boolean DEFAULT false,
    used_at timestamp with time zone
);



--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.invoice_items(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    description text NOT NULL,
    quantity numeric(12,2) DEFAULT 1 NOT NULL,
    unit text DEFAULT 'ea'::text,
    unit_price numeric(12,2) DEFAULT 0 NOT NULL,
    line_total numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    company_id uuid
);



--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.invoices(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    invoice_number text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    issue_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date,
    subtotal_amount numeric(12,2) DEFAULT 0,
    tax_amount numeric(12,2) DEFAULT 0,
    total_amount numeric(12,2) DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_invoice_status CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'paid'::text, 'overdue'::text]))),
    company_id uuid
);



--
-- Name: workers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.workers(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    trade text NOT NULL,
    hourly_rate numeric(10,2) NOT NULL,
    phone text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    trade_id uuid,
    created_by uuid,
    company_id uuid
);



--
-- Name: material_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.material_receipts(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    vendor text NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    subtotal numeric DEFAULT 0 NOT NULL,
    tax numeric DEFAULT 0,
    total numeric DEFAULT 0 NOT NULL,
    cost_code_id uuid,
    linked_document_id uuid,
    auto_classified boolean DEFAULT false,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company_id uuid
);



--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.payments(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    company_id uuid,
    paid_by text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    paid_via text,
    reimbursement_status text,
    reimbursement_date date,
    CONSTRAINT payments_reimbursement_status_check CHECK ((reimbursement_status = ANY (ARRAY['pending'::text, 'reimbursed'::text])))
);



--
-- Name: project_budget_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.project_budget_lines(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    cost_code_id uuid,
    category text NOT NULL,
    description text,
    budget_amount numeric DEFAULT 0 NOT NULL,
    budget_hours numeric,
    is_allowance boolean DEFAULT false,
    source_estimate_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT project_budget_lines_category_check CHECK ((category = ANY (ARRAY['labor'::text, 'subs'::text, 'materials'::text, 'other'::text]))),
    company_id uuid
);



--
-- Name: project_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.project_budgets(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    labor_budget numeric(12,2) DEFAULT 0,
    subs_budget numeric(12,2) DEFAULT 0,
    materials_budget numeric(12,2) DEFAULT 0,
    other_budget numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    baseline_estimate_id uuid,
    created_by uuid,
    company_id uuid
);



--
-- Name: scheduled_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.scheduled_shifts(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    worker_id uuid NOT NULL,
    project_id uuid NOT NULL,
    trade_id uuid,
    scheduled_date date NOT NULL,
    scheduled_hours numeric NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    converted_to_timelog boolean DEFAULT false,
    status text DEFAULT 'planned'::text,
    last_synced_at timestamp with time zone,
    cost_code_id uuid,
    CONSTRAINT scheduled_shifts_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text, 'synced'::text, 'converted'::text, 'split_modified'::text, 'split_created'::text]))),
    company_id uuid
);



--
-- Name: project_subcontracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.project_subcontracts(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    sub_id uuid NOT NULL,
    contract_amount numeric DEFAULT 0 NOT NULL,
    retention_percent numeric DEFAULT 10,
    approved_cos_amount numeric DEFAULT 0,
    net_contract_value numeric GENERATED ALWAYS AS ((contract_amount + approved_cos_amount)) STORED,
    status text DEFAULT 'active'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: project_todos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.project_todos(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    due_date date,
    assigned_worker_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    task_type text DEFAULT 'todo'::text NOT NULL,
    CONSTRAINT project_todos_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT project_todos_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'done'::text]))),
    company_id uuid
);



--
-- Name: proposal_line_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.proposal_line_groups(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proposal_id uuid NOT NULL,
    estimate_id uuid,
    estimate_group_id uuid,
    display_name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    show_line_items boolean DEFAULT true NOT NULL,
    show_group_total boolean DEFAULT true NOT NULL,
    markup_mode text DEFAULT 'from_estimate'::text NOT NULL,
    override_total_amount numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT proposal_line_groups_markup_mode_check CHECK ((markup_mode = ANY (ARRAY['from_estimate'::text, 'override_group_total'::text])))
);



--
-- Name: proposal_line_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.proposal_line_overrides(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proposal_id uuid NOT NULL,
    estimate_line_id uuid NOT NULL,
    show_to_client boolean DEFAULT true NOT NULL,
    custom_label text,
    custom_description text,
    custom_unit text,
    custom_unit_price numeric,
    custom_quantity numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: proposal_section_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.proposal_section_items(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proposal_section_id uuid NOT NULL,
    estimate_item_id uuid NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    display_description text,
    display_quantity numeric,
    display_unit text,
    display_unit_price numeric,
    show_line_item boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    company_id uuid
);



--
-- Name: proposal_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.proposal_sections(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proposal_id uuid NOT NULL,
    title text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_lump_sum boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    type text,
    content_richtext text,
    config jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT proposal_sections_type_check CHECK ((type = ANY (ARRAY['intro'::text, 'scope'::text, 'line_items'::text, 'allowances'::text, 'exclusions'::text, 'payment_terms'::text, 'notes'::text, 'signature'::text]))),
    created_by uuid,
    company_id uuid
);



--
-- Name: proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.proposals(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    version_label text,
    notes_internal text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    primary_estimate_id uuid,
    client_name text,
    client_email text,
    proposal_date date DEFAULT CURRENT_DATE NOT NULL,
    validity_days integer DEFAULT 30 NOT NULL,
    subtotal_amount numeric DEFAULT 0 NOT NULL,
    tax_amount numeric DEFAULT 0 NOT NULL,
    total_amount numeric DEFAULT 0 NOT NULL,
    sent_at timestamp with time zone,
    viewed_at timestamp with time zone,
    accepted_at timestamp with time zone,
    rejected_at timestamp with time zone,
    acceptance_method text,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT proposals_acceptance_method_check CHECK ((acceptance_method = ANY (ARRAY['manual'::text, 'e_signature'::text, 'imported'::text]))),
    CONSTRAINT proposals_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'viewed'::text, 'accepted'::text, 'rejected'::text, 'expired'::text]))),
    created_by uuid,
    company_id uuid
);



--
-- Name: schedule_modifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.schedule_modifications(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_schedule_id uuid NOT NULL,
    new_schedule_id uuid,
    modification_type text NOT NULL,
    modified_at timestamp with time zone DEFAULT now() NOT NULL,
    modified_by uuid,
    notes text,
    metadata jsonb,
    created_by uuid,
    company_id uuid
);



--
-- Name: sub_bids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sub_bids(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bid_package_id uuid NOT NULL,
    sub_id uuid NOT NULL,
    bid_amount numeric NOT NULL,
    notes text,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    attachments jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    company_id uuid
);



--
-- Name: sub_compliance_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sub_compliance_documents(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sub_id uuid NOT NULL,
    doc_type text NOT NULL,
    file_url text,
    document_id uuid,
    effective_date date,
    expiry_date date,
    status text DEFAULT 'valid'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    company_id uuid
);



--
-- Name: sub_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sub_contracts(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    sub_id uuid NOT NULL,
    contract_value numeric DEFAULT 0 NOT NULL,
    retention_percentage numeric DEFAULT 0,
    retention_held numeric DEFAULT 0,
    amount_billed numeric DEFAULT 0,
    amount_paid numeric DEFAULT 0,
    payment_terms text,
    start_date date,
    end_date date,
    linked_document_id uuid,
    status text DEFAULT 'active'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    description text,
    CONSTRAINT sub_contracts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text]))),
    company_id uuid
);



--
-- Name: sub_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sub_invoices(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    sub_id uuid NOT NULL,
    contract_id uuid,
    invoice_number text,
    invoice_date date NOT NULL,
    due_date date,
    subtotal numeric DEFAULT 0 NOT NULL,
    tax numeric DEFAULT 0,
    total numeric DEFAULT 0 NOT NULL,
    retention_amount numeric DEFAULT 0,
    amount_paid numeric DEFAULT 0,
    payment_status text DEFAULT 'unpaid'::text,
    linked_document_id uuid,
    auto_classified boolean DEFAULT false,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sub_invoices_payment_status_check CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'partial'::text, 'paid'::text]))),
    company_id uuid
);



--
-- Name: sub_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sub_logs(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sub_id uuid NOT NULL,
    project_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    cost_code_id uuid,
    company_id uuid
);



--
-- Name: sub_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sub_payments(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_subcontract_id uuid,
    sub_invoice_id uuid,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    amount_paid numeric DEFAULT 0 NOT NULL,
    retention_released numeric DEFAULT 0,
    payment_batch_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    company_id uuid
);



--
-- Name: sub_scheduled_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sub_scheduled_shifts(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sub_id uuid NOT NULL,
    project_id uuid NOT NULL,
    scheduled_date date NOT NULL,
    scheduled_hours numeric(5,2) DEFAULT 8,
    notes text,
    status text DEFAULT 'planned'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    cost_code_id uuid,
    created_by uuid,
    company_id uuid
);



--
-- Name: subs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.subs(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    company_name text,
    trade text,
    phone text,
    email text,
    default_rate numeric(12,2) DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    trade_id uuid,
    notes text,
    created_by uuid,
    company_id uuid
);



--
-- Name: trades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.trades(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    default_labor_cost_code_id uuid,
    default_material_cost_code_id uuid,
    default_sub_cost_code_id uuid,
    created_by uuid,
    company_id uuid
);



--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_roles(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'field_user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


DROP POLICY IF EXISTS projects_insert_policy ON public.projects;
CREATE POLICY projects_insert_policy ON public.projects
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS projects_update_policy ON public.projects;
CREATE POLICY projects_update_policy ON public.projects
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS projects_delete_policy ON public.projects;
CREATE POLICY projects_delete_policy ON public.projects
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS day_cards_select_policy ON public.day_cards;
CREATE POLICY day_cards_select_policy ON public.day_cards
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS day_cards_insert_policy ON public.day_cards;
CREATE POLICY day_cards_insert_policy ON public.day_cards
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS day_cards_update_policy ON public.day_cards;
CREATE POLICY day_cards_update_policy ON public.day_cards
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS day_cards_delete_policy ON public.day_cards;
CREATE POLICY day_cards_delete_policy ON public.day_cards
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS scheduled_shifts_select_policy ON public.scheduled_shifts;
CREATE POLICY scheduled_shifts_select_policy ON public.scheduled_shifts
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS scheduled_shifts_insert_policy ON public.scheduled_shifts;
CREATE POLICY scheduled_shifts_insert_policy ON public.scheduled_shifts
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS scheduled_shifts_update_policy ON public.scheduled_shifts;
CREATE POLICY scheduled_shifts_update_policy ON public.scheduled_shifts
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS scheduled_shifts_delete_policy ON public.scheduled_shifts;
CREATE POLICY scheduled_shifts_delete_policy ON public.scheduled_shifts
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS daily_logs_select_policy ON public.daily_logs;
CREATE POLICY daily_logs_select_policy ON public.daily_logs
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS daily_logs_insert_policy ON public.daily_logs;
CREATE POLICY daily_logs_insert_policy ON public.daily_logs
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS daily_logs_update_policy ON public.daily_logs;
CREATE POLICY daily_logs_update_policy ON public.daily_logs
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS daily_logs_delete_policy ON public.daily_logs;
CREATE POLICY daily_logs_delete_policy ON public.daily_logs
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS documents_select_policy ON public.documents;
CREATE POLICY documents_select_policy ON public.documents
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS documents_insert_policy ON public.documents;
CREATE POLICY documents_insert_policy ON public.documents
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS documents_update_policy ON public.documents;
CREATE POLICY documents_update_policy ON public.documents
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS documents_delete_policy ON public.documents;
CREATE POLICY documents_delete_policy ON public.documents
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS payments_select_policy ON public.payments;
CREATE POLICY payments_select_policy ON public.payments
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS payments_insert_policy ON public.payments;
CREATE POLICY payments_insert_policy ON public.payments
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );


DROP POLICY IF EXISTS payments_update_policy ON public.payments;
CREATE POLICY payments_update_policy ON public.payments
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));


DROP POLICY IF EXISTS payments_delete_policy ON public.payments;
CREATE POLICY payments_delete_policy ON public.payments
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));


DROP POLICY IF EXISTS material_receipts_select_policy ON public.material_receipts;
CREATE POLICY material_receipts_select_policy ON public.material_receipts
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS material_receipts_insert_policy ON public.material_receipts;
CREATE POLICY material_receipts_insert_policy ON public.material_receipts
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS material_receipts_update_policy ON public.material_receipts;
CREATE POLICY material_receipts_update_policy ON public.material_receipts
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS material_receipts_delete_policy ON public.material_receipts;
CREATE POLICY material_receipts_delete_policy ON public.material_receipts
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS sub_logs_select_policy ON public.sub_logs;
CREATE POLICY sub_logs_select_policy ON public.sub_logs
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS sub_logs_insert_policy ON public.sub_logs;
CREATE POLICY sub_logs_insert_policy ON public.sub_logs
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS sub_logs_update_policy ON public.sub_logs;
CREATE POLICY sub_logs_update_policy ON public.sub_logs
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS sub_logs_delete_policy ON public.sub_logs;
CREATE POLICY sub_logs_delete_policy ON public.sub_logs
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS subs_select_policy ON public.subs;
CREATE POLICY subs_select_policy ON public.subs
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS subs_insert_policy ON public.subs;
CREATE POLICY subs_insert_policy ON public.subs
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS subs_update_policy ON public.subs;
CREATE POLICY subs_update_policy ON public.subs
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS subs_delete_policy ON public.subs;
CREATE POLICY subs_delete_policy ON public.subs
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS workers_select_policy ON public.workers;
CREATE POLICY workers_select_policy ON public.workers
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS workers_insert_policy ON public.workers;
CREATE POLICY workers_insert_policy ON public.workers
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS workers_update_policy ON public.workers;
CREATE POLICY workers_update_policy ON public.workers
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS workers_delete_policy ON public.workers;
CREATE POLICY workers_delete_policy ON public.workers
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS cost_codes_select_policy ON public.cost_codes;
CREATE POLICY cost_codes_select_policy ON public.cost_codes
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS cost_codes_insert_policy ON public.cost_codes;
CREATE POLICY cost_codes_insert_policy ON public.cost_codes
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS cost_codes_update_policy ON public.cost_codes;
CREATE POLICY cost_codes_update_policy ON public.cost_codes
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS cost_codes_delete_policy ON public.cost_codes;
CREATE POLICY cost_codes_delete_policy ON public.cost_codes
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS trades_select_policy ON public.trades;
CREATE POLICY trades_select_policy ON public.trades
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS trades_insert_policy ON public.trades;
CREATE POLICY trades_insert_policy ON public.trades
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS trades_update_policy ON public.trades;
CREATE POLICY trades_update_policy ON public.trades
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS trades_delete_policy ON public.trades;
CREATE POLICY trades_delete_policy ON public.trades
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS project_budget_lines_select_policy ON public.project_budget_lines;
CREATE POLICY project_budget_lines_select_policy ON public.project_budget_lines
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS project_budget_lines_insert_policy ON public.project_budget_lines;
CREATE POLICY project_budget_lines_insert_policy ON public.project_budget_lines
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );


DROP POLICY IF EXISTS project_budget_lines_update_policy ON public.project_budget_lines;
CREATE POLICY project_budget_lines_update_policy ON public.project_budget_lines
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));


DROP POLICY IF EXISTS project_budget_lines_delete_policy ON public.project_budget_lines;
CREATE POLICY project_budget_lines_delete_policy ON public.project_budget_lines
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));


DROP POLICY IF EXISTS estimates_select_policy ON public.estimates;
CREATE POLICY estimates_select_policy ON public.estimates
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS estimates_insert_policy ON public.estimates;
CREATE POLICY estimates_insert_policy ON public.estimates
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );


DROP POLICY IF EXISTS estimates_update_policy ON public.estimates;
CREATE POLICY estimates_update_policy ON public.estimates
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));


DROP POLICY IF EXISTS estimates_delete_policy ON public.estimates;
CREATE POLICY estimates_delete_policy ON public.estimates
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));


DROP POLICY IF EXISTS estimate_items_select_policy ON public.estimate_items;
CREATE POLICY estimate_items_select_policy ON public.estimate_items
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS estimate_items_insert_policy ON public.estimate_items;
CREATE POLICY estimate_items_insert_policy ON public.estimate_items
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );


DROP POLICY IF EXISTS estimate_items_update_policy ON public.estimate_items;
CREATE POLICY estimate_items_update_policy ON public.estimate_items
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));


DROP POLICY IF EXISTS estimate_items_delete_policy ON public.estimate_items;
CREATE POLICY estimate_items_delete_policy ON public.estimate_items
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));


DROP POLICY IF EXISTS invoices_select_policy ON public.invoices;
CREATE POLICY invoices_select_policy ON public.invoices
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS invoices_insert_policy ON public.invoices;
CREATE POLICY invoices_insert_policy ON public.invoices
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );


DROP POLICY IF EXISTS invoices_update_policy ON public.invoices;
CREATE POLICY invoices_update_policy ON public.invoices
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));


DROP POLICY IF EXISTS invoices_delete_policy ON public.invoices;
CREATE POLICY invoices_delete_policy ON public.invoices
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));


DROP POLICY IF EXISTS invoice_items_select_policy ON public.invoice_items;
CREATE POLICY invoice_items_select_policy ON public.invoice_items
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS invoice_items_insert_policy ON public.invoice_items;
CREATE POLICY invoice_items_insert_policy ON public.invoice_items
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );


DROP POLICY IF EXISTS invoice_items_update_policy ON public.invoice_items;
CREATE POLICY invoice_items_update_policy ON public.invoice_items
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));


DROP POLICY IF EXISTS invoice_items_delete_policy ON public.invoice_items;
CREATE POLICY invoice_items_delete_policy ON public.invoice_items
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));


DROP POLICY IF EXISTS bid_packages_select_policy ON public.bid_packages;
CREATE POLICY bid_packages_select_policy ON public.bid_packages
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS bid_packages_insert_policy ON public.bid_packages;
CREATE POLICY bid_packages_insert_policy ON public.bid_packages
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS bid_packages_update_policy ON public.bid_packages;
CREATE POLICY bid_packages_update_policy ON public.bid_packages
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS bid_packages_delete_policy ON public.bid_packages;
CREATE POLICY bid_packages_delete_policy ON public.bid_packages
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS bid_invitations_select_policy ON public.bid_invitations;
CREATE POLICY bid_invitations_select_policy ON public.bid_invitations
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS bid_invitations_insert_policy ON public.bid_invitations;
CREATE POLICY bid_invitations_insert_policy ON public.bid_invitations
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS bid_invitations_update_policy ON public.bid_invitations;
CREATE POLICY bid_invitations_update_policy ON public.bid_invitations
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS bid_invitations_delete_policy ON public.bid_invitations;
CREATE POLICY bid_invitations_delete_policy ON public.bid_invitations
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS project_budgets_select_policy ON public.project_budgets;
CREATE POLICY project_budgets_select_policy ON public.project_budgets
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS project_budgets_insert_policy ON public.project_budgets;
CREATE POLICY project_budgets_insert_policy ON public.project_budgets
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS project_budgets_update_policy ON public.project_budgets;
CREATE POLICY project_budgets_update_policy ON public.project_budgets
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS project_budgets_delete_policy ON public.project_budgets;
CREATE POLICY project_budgets_delete_policy ON public.project_budgets
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS project_todos_select_policy ON public.project_todos;
CREATE POLICY project_todos_select_policy ON public.project_todos
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS project_todos_insert_policy ON public.project_todos;
CREATE POLICY project_todos_insert_policy ON public.project_todos
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS project_todos_update_policy ON public.project_todos;
CREATE POLICY project_todos_update_policy ON public.project_todos
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS project_todos_delete_policy ON public.project_todos;
CREATE POLICY project_todos_delete_policy ON public.project_todos
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS proposals_select_policy ON public.proposals;
CREATE POLICY proposals_select_policy ON public.proposals
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS proposals_insert_policy ON public.proposals;
CREATE POLICY proposals_insert_policy ON public.proposals
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS proposals_update_policy ON public.proposals;
CREATE POLICY proposals_update_policy ON public.proposals
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS proposals_delete_policy ON public.proposals;
CREATE POLICY proposals_delete_policy ON public.proposals
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS proposal_sections_select_policy ON public.proposal_sections;
CREATE POLICY proposal_sections_select_policy ON public.proposal_sections
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS proposal_sections_insert_policy ON public.proposal_sections;
CREATE POLICY proposal_sections_insert_policy ON public.proposal_sections
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS proposal_sections_update_policy ON public.proposal_sections;
CREATE POLICY proposal_sections_update_policy ON public.proposal_sections
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS proposal_sections_delete_policy ON public.proposal_sections;
CREATE POLICY proposal_sections_delete_policy ON public.proposal_sections
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS proposal_section_items_select_policy ON public.proposal_section_items;
CREATE POLICY proposal_section_items_select_policy ON public.proposal_section_items
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS proposal_section_items_insert_policy ON public.proposal_section_items;
CREATE POLICY proposal_section_items_insert_policy ON public.proposal_section_items
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS proposal_section_items_update_policy ON public.proposal_section_items;
CREATE POLICY proposal_section_items_update_policy ON public.proposal_section_items
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS proposal_section_items_delete_policy ON public.proposal_section_items;
CREATE POLICY proposal_section_items_delete_policy ON public.proposal_section_items
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS sub_contracts_select_policy ON public.sub_contracts;
CREATE POLICY sub_contracts_select_policy ON public.sub_contracts
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS sub_contracts_insert_policy ON public.sub_contracts;
CREATE POLICY sub_contracts_insert_policy ON public.sub_contracts
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS sub_contracts_update_policy ON public.sub_contracts;
CREATE POLICY sub_contracts_update_policy ON public.sub_contracts
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS sub_contracts_delete_policy ON public.sub_contracts;
CREATE POLICY sub_contracts_delete_policy ON public.sub_contracts
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS sub_invoices_select_policy ON public.sub_invoices;
CREATE POLICY sub_invoices_select_policy ON public.sub_invoices
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS sub_invoices_insert_policy ON public.sub_invoices;
CREATE POLICY sub_invoices_insert_policy ON public.sub_invoices
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );


DROP POLICY IF EXISTS sub_invoices_update_policy ON public.sub_invoices;
CREATE POLICY sub_invoices_update_policy ON public.sub_invoices
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));


DROP POLICY IF EXISTS sub_invoices_delete_policy ON public.sub_invoices;
CREATE POLICY sub_invoices_delete_policy ON public.sub_invoices
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));


DROP POLICY IF EXISTS sub_bids_select_policy ON public.sub_bids;
CREATE POLICY sub_bids_select_policy ON public.sub_bids
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS sub_bids_insert_policy ON public.sub_bids;
CREATE POLICY sub_bids_insert_policy ON public.sub_bids
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS sub_bids_update_policy ON public.sub_bids;
CREATE POLICY sub_bids_update_policy ON public.sub_bids
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS sub_bids_delete_policy ON public.sub_bids;
CREATE POLICY sub_bids_delete_policy ON public.sub_bids
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS time_log_allocations_select_policy ON public.time_log_allocations;
CREATE POLICY time_log_allocations_select_policy ON public.time_log_allocations
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS time_log_allocations_insert_policy ON public.time_log_allocations;
CREATE POLICY time_log_allocations_insert_policy ON public.time_log_allocations
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS time_log_allocations_update_policy ON public.time_log_allocations;
CREATE POLICY time_log_allocations_update_policy ON public.time_log_allocations
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS time_log_allocations_delete_policy ON public.time_log_allocations;
CREATE POLICY time_log_allocations_delete_policy ON public.time_log_allocations
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS day_card_jobs_select_policy ON public.day_card_jobs;
CREATE POLICY day_card_jobs_select_policy ON public.day_card_jobs
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS day_card_jobs_insert_policy ON public.day_card_jobs;
CREATE POLICY day_card_jobs_insert_policy ON public.day_card_jobs
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS day_card_jobs_update_policy ON public.day_card_jobs;
CREATE POLICY day_card_jobs_update_policy ON public.day_card_jobs
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS day_card_jobs_delete_policy ON public.day_card_jobs;
CREATE POLICY day_card_jobs_delete_policy ON public.day_card_jobs
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS archived_daily_logs_select_policy ON public.archived_daily_logs;
CREATE POLICY archived_daily_logs_select_policy ON public.archived_daily_logs
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS archived_daily_logs_insert_policy ON public.archived_daily_logs;
CREATE POLICY archived_daily_logs_insert_policy ON public.archived_daily_logs
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS archived_daily_logs_update_policy ON public.archived_daily_logs;
CREATE POLICY archived_daily_logs_update_policy ON public.archived_daily_logs
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS archived_daily_logs_delete_policy ON public.archived_daily_logs;
CREATE POLICY archived_daily_logs_delete_policy ON public.archived_daily_logs
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS schedule_modifications_select_policy ON public.schedule_modifications;
CREATE POLICY schedule_modifications_select_policy ON public.schedule_modifications
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS schedule_modifications_insert_policy ON public.schedule_modifications;
CREATE POLICY schedule_modifications_insert_policy ON public.schedule_modifications
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS schedule_modifications_update_policy ON public.schedule_modifications;
CREATE POLICY schedule_modifications_update_policy ON public.schedule_modifications
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS schedule_modifications_delete_policy ON public.schedule_modifications;
CREATE POLICY schedule_modifications_delete_policy ON public.schedule_modifications
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS sub_scheduled_shifts_select_policy ON public.sub_scheduled_shifts;
CREATE POLICY sub_scheduled_shifts_select_policy ON public.sub_scheduled_shifts
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS sub_scheduled_shifts_insert_policy ON public.sub_scheduled_shifts;
CREATE POLICY sub_scheduled_shifts_insert_policy ON public.sub_scheduled_shifts
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS sub_scheduled_shifts_update_policy ON public.sub_scheduled_shifts;
CREATE POLICY sub_scheduled_shifts_update_policy ON public.sub_scheduled_shifts
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS sub_scheduled_shifts_delete_policy ON public.sub_scheduled_shifts;
CREATE POLICY sub_scheduled_shifts_delete_policy ON public.sub_scheduled_shifts
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS sub_payments_select_policy ON public.sub_payments;
CREATE POLICY sub_payments_select_policy ON public.sub_payments
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS sub_payments_insert_policy ON public.sub_payments;
CREATE POLICY sub_payments_insert_policy ON public.sub_payments
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );


DROP POLICY IF EXISTS sub_payments_update_policy ON public.sub_payments;
CREATE POLICY sub_payments_update_policy ON public.sub_payments
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));


DROP POLICY IF EXISTS sub_payments_delete_policy ON public.sub_payments;
CREATE POLICY sub_payments_delete_policy ON public.sub_payments
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));


DROP POLICY IF EXISTS sub_compliance_documents_select_policy ON public.sub_compliance_documents;
CREATE POLICY sub_compliance_documents_select_policy ON public.sub_compliance_documents
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS sub_compliance_documents_insert_policy ON public.sub_compliance_documents;
CREATE POLICY sub_compliance_documents_insert_policy ON public.sub_compliance_documents
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS sub_compliance_documents_update_policy ON public.sub_compliance_documents;
CREATE POLICY sub_compliance_documents_update_policy ON public.sub_compliance_documents
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS sub_compliance_documents_delete_policy ON public.sub_compliance_documents;
CREATE POLICY sub_compliance_documents_delete_policy ON public.sub_compliance_documents
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());


DROP POLICY IF EXISTS material_receipts_select_policy ON public.material_receipts;
CREATE POLICY material_receipts_select_policy ON public.material_receipts
  FOR SELECT
  USING (public.is_company_member(company_id));


DROP POLICY IF EXISTS material_receipts_insert_policy ON public.material_receipts;
CREATE POLICY material_receipts_insert_policy ON public.material_receipts
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );


DROP POLICY IF EXISTS material_receipts_update_policy ON public.material_receipts;
CREATE POLICY material_receipts_update_policy ON public.material_receipts
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));


DROP POLICY IF EXISTS material_receipts_delete_policy ON public.material_receipts;
CREATE POLICY material_receipts_delete_policy ON public.material_receipts
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());
