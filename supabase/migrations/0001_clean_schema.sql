
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "citext";


CREATE TABLE IF NOT EXISTS public.companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.company_users (
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (company_id, user_id)
);


CREATE TABLE IF NOT EXISTS public.company_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    email citext NOT NULL,
    role text NOT NULL,
    token text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_by uuid,
    accepted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);


CREATE EXTENSION IF NOT EXISTS "pg_graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE EXTENSION IF NOT EXISTS "supabase_vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.activity_log(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    action text NOT NULL,
    actor_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.archived_daily_logs(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.bid_invitations(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    bid_package_id uuid NOT NULL,
    sub_id uuid NOT NULL,
    status text DEFAULT 'invited'::text,
    invited_at timestamp with time zone DEFAULT now() NOT NULL,
    responded_at timestamp with time zone,
    notes text,
    created_by uuid,
    company_id uuid
);


CREATE TABLE IF NOT EXISTS public.bid_packages(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.companies(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.day_cards(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
    archived_at timestamp with time zone
);


CREATE TABLE IF NOT EXISTS public.cost_codes(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    default_trade_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    trade_id uuid,
    created_by uuid,
    company_id uuid
);


CREATE TABLE IF NOT EXISTS public.projects(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.time_log_allocations(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    day_card_id uuid NOT NULL,
    project_id uuid NOT NULL,
    trade_id uuid,
    cost_code_id uuid,
    hours numeric NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    company_id uuid
);


CREATE TABLE IF NOT EXISTS public.daily_logs(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
    company_id uuid
);


CREATE TABLE IF NOT EXISTS public.day_card_jobs(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.documents(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
    created_by uuid,
    company_id uuid
);


CREATE TABLE IF NOT EXISTS public.estimate_items(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.estimates(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    subtotal_amount numeric(12,2) DEFAULT 0,
    tax_amount numeric(12,2) DEFAULT 0,
    total_amount numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_budget_source boolean DEFAULT false,
    company_id uuid
);


CREATE TABLE IF NOT EXISTS public.invitations(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    role public.app_role DEFAULT 'field_user'::public.app_role NOT NULL,
    invited_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    used boolean DEFAULT false,
    used_at timestamp with time zone
);


CREATE TABLE IF NOT EXISTS public.invoice_items(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    description text NOT NULL,
    quantity numeric(12,2) DEFAULT 1 NOT NULL,
    unit text DEFAULT 'ea'::text,
    unit_price numeric(12,2) DEFAULT 0 NOT NULL,
    line_total numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    company_id uuid
);


CREATE TABLE IF NOT EXISTS public.invoices(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
    company_id uuid
);


CREATE TABLE IF NOT EXISTS public.workers(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.material_receipts(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.payments(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
    reimbursement_date date
);


CREATE TABLE IF NOT EXISTS public.project_budget_lines(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
    company_id uuid
);


CREATE TABLE IF NOT EXISTS public.project_budgets(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.scheduled_shifts(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
    company_id uuid
);


CREATE TABLE IF NOT EXISTS public.project_subcontracts(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.project_todos(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
    company_id uuid
);


CREATE TABLE IF NOT EXISTS public.proposal_line_groups(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    proposal_id uuid NOT NULL,
    estimate_id uuid,
    estimate_group_id uuid,
    display_name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    show_line_items boolean DEFAULT true NOT NULL,
    show_group_total boolean DEFAULT true NOT NULL,
    markup_mode text DEFAULT 'from_estimate'::text NOT NULL,
    override_total_amount numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE IF NOT EXISTS public.proposal_line_overrides(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.proposal_section_items(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.proposal_sections(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    proposal_id uuid NOT NULL,
    title text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_lump_sum boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    type text,
    content_richtext text,
    config jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    company_id uuid
);


CREATE TABLE IF NOT EXISTS public.proposals(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
    created_by uuid,
    company_id uuid
);


CREATE TABLE IF NOT EXISTS public.schedule_modifications(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.sub_bids(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.sub_compliance_documents(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.sub_contracts(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
    company_id uuid
);


CREATE TABLE IF NOT EXISTS public.sub_invoices(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
    company_id uuid
);


CREATE TABLE IF NOT EXISTS public.sub_logs(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.sub_payments(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.sub_scheduled_shifts(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.subs(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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


CREATE TABLE IF NOT EXISTS public.trades(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    default_labor_cost_code_id uuid,
    default_material_cost_code_id uuid,
    default_sub_cost_code_id uuid,
    created_by uuid,
    company_id uuid
);


CREATE TABLE IF NOT EXISTS public.user_roles(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'field_user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


