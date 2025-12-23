CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";

CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    archived_by uuid
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
    notes text
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
    CONSTRAINT cost_codes_category_check CHECK ((category = ANY (ARRAY['labor'::text, 'subs'::text, 'materials'::text, 'other'::text])))
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
    company_id uuid
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
    CONSTRAINT time_log_allocations_hours_check CHECK ((hours >= (0)::numeric))
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
    CONSTRAINT daily_logs_payment_status_check CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'paid'::text])))
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
    updated_at timestamp with time zone DEFAULT now()
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
    CONSTRAINT documents_document_type_check CHECK ((document_type = ANY (ARRAY['plans'::text, 'receipts'::text, 'invoices'::text, 'contracts'::text, 'submittals'::text, 'permits'::text, 'photos'::text, 'proposals'::text, 'other'::text])))
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
    scope_group text
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
    CONSTRAINT valid_estimate_status CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'accepted'::text, 'rejected'::text])))
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
    created_at timestamp with time zone DEFAULT now()
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
    CONSTRAINT valid_invoice_status CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'paid'::text, 'overdue'::text])))
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
    trade_id uuid
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
    updated_at timestamp with time zone DEFAULT now()
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
    CONSTRAINT project_budget_lines_category_check CHECK ((category = ANY (ARRAY['labor'::text, 'subs'::text, 'materials'::text, 'other'::text])))
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
    baseline_estimate_id uuid
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
    CONSTRAINT scheduled_shifts_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text, 'synced'::text, 'converted'::text, 'split_modified'::text, 'split_created'::text])))
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
    CONSTRAINT project_todos_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'done'::text])))
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
    created_at timestamp with time zone DEFAULT now() NOT NULL
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
    CONSTRAINT proposal_sections_type_check CHECK ((type = ANY (ARRAY['intro'::text, 'scope'::text, 'line_items'::text, 'allowances'::text, 'exclusions'::text, 'payment_terms'::text, 'notes'::text, 'signature'::text])))
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
    CONSTRAINT proposals_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'viewed'::text, 'accepted'::text, 'rejected'::text, 'expired'::text])))
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
    metadata jsonb
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
    created_at timestamp with time zone DEFAULT now() NOT NULL
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
    CONSTRAINT sub_contracts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text])))
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
    CONSTRAINT sub_invoices_payment_status_check CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'partial'::text, 'paid'::text])))
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
    cost_code_id uuid
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
    created_by uuid
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
    cost_code_id uuid
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
    notes text
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
    default_sub_cost_code_id uuid
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
