--
-- Name: company_payroll_summary; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.company_payroll_summary CASCADE;
CREATE VIEW public.company_payroll_summary AS
 SELECT c.id AS company_id,
    c.name AS company_name,
    count(DISTINCT dc.worker_id) AS worker_count,
    sum(dc.logged_hours) AS total_hours,
    sum(
        CASE
            WHEN ((dc.pay_status = 'unpaid'::text) AND (dc.logged_hours > (0)::numeric)) THEN (dc.logged_hours * dc.pay_rate)
            ELSE (0)::numeric
        END) AS total_unpaid,
    sum(
        CASE
            WHEN ((dc.pay_status = 'paid'::text) AND (dc.logged_hours > (0)::numeric)) THEN (dc.logged_hours * dc.pay_rate)
            ELSE (0)::numeric
        END) AS total_paid,
    max(dc.date) AS last_activity_date
   FROM (public.companies c
     LEFT JOIN public.day_cards dc ON ((dc.company_id = c.id)))
  WHERE (dc.logged_hours > (0)::numeric)
  GROUP BY c.id, c.name;



--
-- Name: cost_code_actuals; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.cost_code_actuals CASCADE;
CREATE VIEW public.cost_code_actuals AS
 SELECT cc.id AS cost_code_id,
    cc.code,
    cc.name AS cost_code_name,
    cc.category,
    tla.project_id,
    p.project_name,
    sum(tla.hours) AS actual_hours,
    sum((tla.hours * dc.pay_rate)) AS actual_cost,
    count(DISTINCT dc.worker_id) AS worker_count
   FROM (((public.cost_codes cc
     LEFT JOIN public.time_log_allocations tla ON ((tla.cost_code_id = cc.id)))
     LEFT JOIN public.day_cards dc ON ((dc.id = tla.day_card_id)))
     LEFT JOIN public.projects p ON ((p.id = tla.project_id)))
  WHERE (dc.logged_hours > (0)::numeric)
  GROUP BY cc.id, cc.code, cc.name, cc.category, tla.project_id, p.project_name;



--
-- Name: day_cards_with_details; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.day_cards_with_details CASCADE;
CREATE VIEW public.day_cards_with_details AS
SELECT
    NULL::uuid AS id,
    NULL::uuid AS worker_id,
    NULL::date AS date,
    NULL::numeric AS scheduled_hours,
    NULL::numeric AS logged_hours,
    NULL::text AS status,
    NULL::numeric AS pay_rate,
    NULL::text AS pay_status,
    NULL::uuid AS company_id,
    NULL::text AS notes,
    NULL::jsonb AS metadata,
    NULL::timestamp with time zone AS created_at,
    NULL::timestamp with time zone AS updated_at,
    NULL::uuid AS created_by,
    NULL::boolean AS locked,
    NULL::text AS worker_name,
    NULL::numeric(10,2) AS worker_default_rate,
    NULL::text AS trade_name,
    NULL::jsonb[] AS jobs;



--
-- Name: labor_actuals_by_cost_code; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.labor_actuals_by_cost_code CASCADE;
CREATE VIEW public.labor_actuals_by_cost_code AS
 SELECT dl.project_id,
    dl.cost_code_id,
    cc.code AS cost_code,
    cc.name AS cost_code_name,
    sum(dl.hours_worked) AS actual_hours,
    sum((dl.hours_worked * w.hourly_rate)) AS actual_cost,
    count(DISTINCT dl.worker_id) AS worker_count
   FROM ((public.daily_logs dl
     LEFT JOIN public.cost_codes cc ON ((dl.cost_code_id = cc.id)))
     LEFT JOIN public.workers w ON ((dl.worker_id = w.id)))
  GROUP BY dl.project_id, dl.cost_code_id, cc.code, cc.name;



--
-- Name: payment_labor_summary; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.payment_labor_summary CASCADE;
CREATE VIEW public.payment_labor_summary AS
 SELECT p.id AS payment_id,
    p.start_date,
    p.end_date,
    p.paid_by,
    p.payment_date,
    dl.worker_id,
    w.name AS worker_name,
    w.trade AS worker_trade,
    dl.project_id,
    proj.project_name,
    sum(dl.hours_worked) AS total_hours,
    sum((dl.hours_worked * w.hourly_rate)) AS labor_cost
   FROM (((public.payments p
     CROSS JOIN public.daily_logs dl)
     JOIN public.workers w ON ((w.id = dl.worker_id)))
     JOIN public.projects proj ON ((proj.id = dl.project_id)))
  WHERE ((dl.date >= p.start_date) AND (dl.date <= p.end_date))
  GROUP BY p.id, p.start_date, p.end_date, p.paid_by, p.payment_date, dl.worker_id, w.name, w.trade, dl.project_id, proj.project_name;



--
-- Name: project_activity_view; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.project_activity_view CASCADE;
CREATE VIEW public.project_activity_view AS
 SELECT dl.id AS log_id,
    dl.project_id,
    dl.worker_id,
    dl.trade_id,
    dl.date,
    dl.hours_worked,
    dl.schedule_id,
    dl.notes,
    dl.created_at,
    (dl.hours_worked * COALESCE(w.hourly_rate, (0)::numeric)) AS cost,
    w.name AS worker_name,
    w.trade AS worker_trade,
    p.project_name
   FROM ((public.daily_logs dl
     LEFT JOIN public.workers w ON ((dl.worker_id = w.id)))
     LEFT JOIN public.projects p ON ((dl.project_id = p.id)));



--
-- Name: project_costs_view; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.project_costs_view CASCADE;
CREATE VIEW public.project_costs_view AS
 WITH labor_costs AS (
         SELECT dl.project_id,
            sum(dl.hours_worked) AS total_hours,
            sum((dl.hours_worked * w.hourly_rate)) AS total_cost
           FROM (public.daily_logs dl
             JOIN public.workers w ON ((dl.worker_id = w.id)))
          GROUP BY dl.project_id
        ), paid_labor AS (
         SELECT dl.project_id,
            sum(dl.hours_worked) AS paid_hours,
            sum((dl.hours_worked * w.hourly_rate)) AS paid_cost,
            max(p_1.payment_date) AS last_paid_at
           FROM ((public.daily_logs dl
             JOIN public.workers w ON ((dl.worker_id = w.id)))
             JOIN public.payments p_1 ON (((dl.date >= p_1.start_date) AND (dl.date <= p_1.end_date))))
          GROUP BY dl.project_id
        ), unpaid_labor AS (
         SELECT dl.project_id,
            sum(dl.hours_worked) AS unpaid_hours,
            sum((dl.hours_worked * w.hourly_rate)) AS unpaid_cost
           FROM (public.daily_logs dl
             JOIN public.workers w ON ((dl.worker_id = w.id)))
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM public.payments p_1
                  WHERE ((dl.date >= p_1.start_date) AND (dl.date <= p_1.end_date)))))
          GROUP BY dl.project_id
        )
 SELECT p.id AS project_id,
    p.project_name,
    p.client_name,
    p.status,
    COALESCE(lc.total_hours, (0)::numeric) AS labor_total_hours,
    COALESCE(lc.total_cost, (0)::numeric) AS labor_total_cost,
    COALESCE(pl.paid_hours, (0)::numeric) AS labor_paid_hours,
    COALESCE(pl.paid_cost, (0)::numeric) AS labor_paid_cost,
    COALESCE(ul.unpaid_hours, (0)::numeric) AS labor_unpaid_hours,
    COALESCE(ul.unpaid_cost, (0)::numeric) AS labor_unpaid_cost,
    pl.last_paid_at,
    COALESCE(pb.labor_budget, (0)::numeric) AS labor_budget,
    COALESCE(pb.subs_budget, (0)::numeric) AS subs_budget,
    COALESCE(pb.materials_budget, (0)::numeric) AS materials_budget,
    COALESCE(pb.other_budget, (0)::numeric) AS other_budget,
    (COALESCE(pb.labor_budget, (0)::numeric) - COALESCE(lc.total_cost, (0)::numeric)) AS labor_budget_variance,
    GREATEST((COALESCE(pb.labor_budget, (0)::numeric) - COALESCE(lc.total_cost, (0)::numeric)), (0)::numeric) AS labor_budget_remaining
   FROM ((((public.projects p
     LEFT JOIN labor_costs lc ON ((p.id = lc.project_id)))
     LEFT JOIN paid_labor pl ON ((p.id = pl.project_id)))
     LEFT JOIN unpaid_labor ul ON ((p.id = ul.project_id)))
     LEFT JOIN public.project_budgets pb ON ((p.id = pb.project_id)));



--
-- Name: project_dashboard_view; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.project_dashboard_view CASCADE;
CREATE VIEW public.project_dashboard_view AS
 SELECT p.id AS project_id,
    p.project_name,
    p.client_name,
    p.company_id,
    p.status,
    p.address,
    p.project_manager,
    COALESCE(sum(dl.hours_worked), (0)::numeric) AS total_hours,
    COALESCE(sum((dl.hours_worked * w.hourly_rate)), (0)::numeric) AS total_cost,
    count(DISTINCT dl.worker_id) AS worker_count,
    max(dl.date) AS last_activity
   FROM ((public.projects p
     LEFT JOIN public.daily_logs dl ON ((p.id = dl.project_id)))
     LEFT JOIN public.workers w ON ((dl.worker_id = w.id)))
  GROUP BY p.id, p.project_name, p.client_name, p.company_id, p.status, p.address, p.project_manager;



--
-- Name: project_labor_summary; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.project_labor_summary CASCADE;
CREATE VIEW public.project_labor_summary AS
 SELECT p.id AS project_id,
    p.project_name,
    count(DISTINCT dc.worker_id) AS worker_count,
    sum(dc.logged_hours) AS total_hours_logged,
    sum(dc.scheduled_hours) AS total_hours_scheduled,
    sum(COALESCE((dc.logged_hours * dc.pay_rate), (0)::numeric)) AS total_labor_cost,
    sum(
        CASE
            WHEN ((dc.pay_status = 'unpaid'::text) AND (dc.logged_hours > (0)::numeric)) THEN (dc.logged_hours * dc.pay_rate)
            ELSE (0)::numeric
        END) AS unpaid_labor_cost,
    sum(
        CASE
            WHEN ((dc.pay_status = 'paid'::text) AND (dc.logged_hours > (0)::numeric)) THEN (dc.logged_hours * dc.pay_rate)
            ELSE (0)::numeric
        END) AS paid_labor_cost,
    max(dc.date) AS last_activity_date
   FROM ((public.projects p
     LEFT JOIN public.time_log_allocations tla ON ((tla.project_id = p.id)))
     LEFT JOIN public.day_cards dc ON ((dc.id = tla.day_card_id)))
  GROUP BY p.id, p.project_name;



--
-- Name: project_schedule_view; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.project_schedule_view CASCADE;
CREATE VIEW public.project_schedule_view AS
 SELECT id,
    project_id,
    worker_id,
    trade_id,
    scheduled_date,
    scheduled_hours,
    status,
    notes,
    converted_to_timelog,
    created_at,
    updated_at
   FROM public.scheduled_shifts;



--
-- Name: sub_contract_summary; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.sub_contract_summary CASCADE;
CREATE VIEW public.sub_contract_summary AS
SELECT
    NULL::uuid AS contract_id,
    NULL::uuid AS project_id,
    NULL::uuid AS sub_id,
    NULL::text AS sub_name,
    NULL::text AS company_name,
    NULL::text AS trade,
    NULL::numeric AS contract_value,
    NULL::numeric AS retention_percentage,
    NULL::text AS status,
    NULL::numeric AS total_billed,
    NULL::numeric AS total_paid,
    NULL::numeric AS total_retention_held,
    NULL::numeric AS total_retention_released,
    NULL::numeric AS remaining_to_bill,
    NULL::numeric AS outstanding_balance;



--
-- Name: unpaid_labor_bills; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.unpaid_labor_bills CASCADE;
CREATE VIEW public.unpaid_labor_bills AS
 SELECT p.company_id,
    c.name AS company_name,
    dl.project_id,
    proj.project_name,
    min(dl.date) AS period_start,
    max(dl.date) AS period_end,
    count(dl.id) AS log_count,
    sum(dl.hours_worked) AS total_hours,
    sum((dl.hours_worked * w.hourly_rate)) AS total_amount
   FROM ((((public.daily_logs dl
     JOIN public.projects p ON ((dl.project_id = p.id)))
     LEFT JOIN public.companies c ON ((p.company_id = c.id)))
     JOIN public.workers w ON ((dl.worker_id = w.id)))
     LEFT JOIN public.projects proj ON ((dl.project_id = proj.id)))
  WHERE (dl.payment_status = 'unpaid'::text)
  GROUP BY p.company_id, c.name, dl.project_id, proj.project_name
  ORDER BY (max(dl.date)) DESC;



--
-- Name: worker_day_summary; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.worker_day_summary CASCADE;
CREATE VIEW public.worker_day_summary AS
SELECT
    NULL::uuid AS day_card_id,
    NULL::uuid AS worker_id,
    NULL::text AS worker_name,
    NULL::numeric(10,2) AS worker_rate,
    NULL::text AS worker_trade,
    NULL::date AS date,
    NULL::numeric AS scheduled_hours,
    NULL::numeric AS logged_hours,
    NULL::numeric AS pay_rate,
    NULL::text AS lifecycle_status,
    NULL::text AS pay_status,
    NULL::boolean AS locked,
    NULL::uuid AS company_id,
    NULL::text AS company_name,
    NULL::numeric AS total_cost,
    NULL::numeric AS unpaid_amount,
    NULL::json AS allocations;



--
-- Name: workers_public; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.workers_public CASCADE;
CREATE VIEW public.workers_public AS
 SELECT id,
    name,
    trade_id,
    trade,
    hourly_rate,
    active,
    created_at,
    updated_at,
        CASE
            WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN phone
            ELSE NULL::text
        END AS phone
   FROM public.workers;



--
-- Name: workforce_activity_feed; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.workforce_activity_feed CASCADE;
CREATE VIEW public.workforce_activity_feed AS
 SELECT ('schedule:'::text || (ss.id)::text) AS id,
        CASE
            WHEN (ss.created_at = ss.updated_at) THEN 'schedule_created'::text
            ELSE 'schedule_updated'::text
        END AS event_type,
    ss.created_at AS event_at,
    ss.worker_id,
    w.name AS worker_name,
    p.company_id,
    c.name AS company_name,
    ss.project_id,
    p.project_name,
    ss.scheduled_hours AS hours,
    NULL::numeric AS amount,
    jsonb_build_object('schedule_id', ss.id, 'trade_id', ss.trade_id, 'status', ss.status, 'notes', ss.notes, 'date', ss.scheduled_date) AS meta
   FROM (((public.scheduled_shifts ss
     LEFT JOIN public.workers w ON ((w.id = ss.worker_id)))
     LEFT JOIN public.projects p ON ((p.id = ss.project_id)))
     LEFT JOIN public.companies c ON ((c.id = p.company_id)))
  WHERE (ss.created_at > (now() - '90 days'::interval))
UNION ALL
 SELECT ('timelog:'::text || (dl.id)::text) AS id,
        CASE
            WHEN ((dl.created_at)::date = dl.date) THEN 'time_log_created'::text
            ELSE 'time_log_updated'::text
        END AS event_type,
    dl.created_at AS event_at,
    dl.worker_id,
    w.name AS worker_name,
    p.company_id,
    c.name AS company_name,
    dl.project_id,
    p.project_name,
    dl.hours_worked AS hours,
    (dl.hours_worked * w.hourly_rate) AS amount,
    jsonb_build_object('log_id', dl.id, 'trade_id', dl.trade_id, 'payment_status', dl.payment_status, 'payment_id', dl.payment_id, 'notes', dl.notes, 'date', dl.date, 'hourly_rate', w.hourly_rate) AS meta
   FROM (((public.daily_logs dl
     LEFT JOIN public.workers w ON ((w.id = dl.worker_id)))
     LEFT JOIN public.projects p ON ((p.id = dl.project_id)))
     LEFT JOIN public.companies c ON ((c.id = p.company_id)))
  WHERE (dl.created_at > (now() - '90 days'::interval))
UNION ALL
 SELECT ('payment:'::text || (pay.id)::text) AS id,
        CASE
            WHEN (pay.created_at = pay.updated_at) THEN 'payment_created'::text
            ELSE 'payment_updated'::text
        END AS event_type,
    pay.created_at AS event_at,
    NULL::uuid AS worker_id,
    NULL::text AS worker_name,
    pay.company_id,
    c.name AS company_name,
    NULL::uuid AS project_id,
    NULL::text AS project_name,
    NULL::numeric AS hours,
    pay.amount,
    jsonb_build_object('payment_id', pay.id, 'start_date', pay.start_date, 'end_date', pay.end_date, 'payment_date', pay.payment_date, 'paid_by', pay.paid_by, 'paid_via', pay.paid_via, 'reimbursement_status', pay.reimbursement_status, 'notes', pay.notes, 'log_count', ( SELECT count(*) AS count
           FROM public.daily_logs
          WHERE (daily_logs.payment_id = pay.id))) AS meta
   FROM (public.payments pay
     LEFT JOIN public.companies c ON ((c.id = pay.company_id)))
  WHERE (pay.created_at > (now() - '90 days'::interval));

--

DROP VIEW IF EXISTS public.day_cards_with_details CASCADE;
CREATE VIEW public.day_cards_with_details AS
 SELECT dc.id,
    dc.worker_id,
    dc.date,
    dc.scheduled_hours,
    dc.logged_hours,
    dc.status,
    dc.pay_rate,
    dc.pay_status,
    dc.company_id,
    dc.notes,
    dc.metadata,
    dc.created_at,
    dc.updated_at,
    dc.created_by,
    dc.locked,
    w.name AS worker_name,
    w.hourly_rate AS worker_default_rate,
    t.name AS trade_name,
    array_agg(jsonb_build_object('id', dcj.id, 'project_id', dcj.project_id, 'project_name', p.project_name, 'trade_id', dcj.trade_id, 'cost_code_id', dcj.cost_code_id, 'hours', dcj.hours, 'notes', dcj.notes) ORDER BY dcj.created_at) FILTER (WHERE (dcj.id IS NOT NULL)) AS jobs
   FROM ((((public.day_cards dc
     LEFT JOIN public.workers w ON ((dc.worker_id = w.id)))
     LEFT JOIN public.trades t ON ((w.trade_id = t.id)))
     LEFT JOIN public.day_card_jobs dcj ON ((dc.id = dcj.day_card_id)))
     LEFT JOIN public.projects p ON ((dcj.project_id = p.id)))
  GROUP BY dc.id, w.name, w.hourly_rate, t.name;



--
-- Name: sub_contract_summary _RETURN; Type: RULE; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.sub_contract_summary CASCADE;
CREATE VIEW public.sub_contract_summary AS
 SELECT sc.id AS contract_id,
    sc.project_id,
    sc.sub_id,
    s.name AS sub_name,
    s.company_name,
    s.trade,
    sc.contract_value,
    sc.retention_percentage,
    sc.status,
    COALESCE(sum(si.total), (0)::numeric) AS total_billed,
    COALESCE(sum(sp.amount_paid), (0)::numeric) AS total_paid,
    COALESCE(sum(si.retention_amount), (0)::numeric) AS total_retention_held,
    COALESCE(sum(sp.retention_released), (0)::numeric) AS total_retention_released,
    (sc.contract_value - COALESCE(sum(si.total), (0)::numeric)) AS remaining_to_bill,
    (COALESCE(sum(si.total), (0)::numeric) - COALESCE(sum(sp.amount_paid), (0)::numeric)) AS outstanding_balance
   FROM (((public.sub_contracts sc
     LEFT JOIN public.subs s ON ((s.id = sc.sub_id)))
     LEFT JOIN public.sub_invoices si ON (((si.contract_id = sc.id) AND (si.payment_status <> 'rejected'::text))))
     LEFT JOIN public.sub_payments sp ON ((sp.project_subcontract_id = sc.id)))
  GROUP BY sc.id, s.name, s.company_name, s.trade;



--
-- Name: worker_day_summary _RETURN; Type: RULE; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.worker_day_summary CASCADE;
CREATE VIEW public.worker_day_summary AS
 SELECT dc.id AS day_card_id,
    dc.worker_id,
    w.name AS worker_name,
    w.hourly_rate AS worker_rate,
    t.name AS worker_trade,
    dc.date,
    dc.scheduled_hours,
    dc.logged_hours,
    dc.pay_rate,
    dc.lifecycle_status,
    dc.pay_status,
    dc.locked,
    dc.company_id,
    c.name AS company_name,
    COALESCE((dc.logged_hours * dc.pay_rate), (dc.scheduled_hours * COALESCE(dc.pay_rate, w.hourly_rate)), (0)::numeric) AS total_cost,
        CASE
            WHEN (dc.pay_status = 'unpaid'::text) THEN COALESCE((dc.logged_hours * dc.pay_rate), (dc.scheduled_hours * COALESCE(dc.pay_rate, w.hourly_rate)), (0)::numeric)
            ELSE (0)::numeric
        END AS unpaid_amount,
    json_agg(json_build_object('project_id', tla.project_id, 'project_name', p.project_name, 'hours', tla.hours, 'trade', tr.name, 'cost_code', cc.code)) FILTER (WHERE (tla.id IS NOT NULL)) AS allocations
   FROM (((((((public.day_cards dc
     JOIN public.workers w ON ((w.id = dc.worker_id)))
     LEFT JOIN public.trades t ON ((t.id = w.trade_id)))
     LEFT JOIN public.companies c ON ((c.id = dc.company_id)))
     LEFT JOIN public.time_log_allocations tla ON ((tla.day_card_id = dc.id)))
     LEFT JOIN public.projects p ON ((p.id = tla.project_id)))
     LEFT JOIN public.trades tr ON ((tr.id = tla.trade_id)))
     LEFT JOIN public.cost_codes cc ON ((cc.id = tla.cost_code_id)))
  GROUP BY dc.id, w.id, w.name, w.hourly_rate, t.name, c.name;

-- ============================================================================
-- MOVED FROM PG_DUMP MIGRATIONS: 20251122185403_remix_migration_from_pg_dump.sql — views
-- ============================================================================



--
-- Name: company_payroll_summary; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.company_payroll_summary CASCADE;
CREATE VIEW public.company_payroll_summary AS
 SELECT c.id AS company_id,
    c.name AS company_name,
    count(DISTINCT dc.worker_id) AS worker_count,
    sum(dc.logged_hours) AS total_hours,
    sum(
        CASE
            WHEN ((dc.pay_status = 'unpaid'::text) AND (dc.logged_hours > (0)::numeric)) THEN (dc.logged_hours * dc.pay_rate)
            ELSE (0)::numeric
        END) AS total_unpaid,
    sum(
        CASE
            WHEN ((dc.pay_status = 'paid'::text) AND (dc.logged_hours > (0)::numeric)) THEN (dc.logged_hours * dc.pay_rate)
            ELSE (0)::numeric
        END) AS total_paid,
    max(dc.date) AS last_activity_date
   FROM (public.companies c
     LEFT JOIN public.day_cards dc ON ((dc.company_id = c.id)))
  WHERE (dc.logged_hours > (0)::numeric)
  GROUP BY c.id, c.name;



--
-- Name: cost_code_actuals; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.cost_code_actuals CASCADE;
CREATE VIEW public.cost_code_actuals AS
 SELECT cc.id AS cost_code_id,
    cc.code,
    cc.name AS cost_code_name,
    cc.category,
    tla.project_id,
    p.project_name,
    sum(tla.hours) AS actual_hours,
    sum((tla.hours * dc.pay_rate)) AS actual_cost,
    count(DISTINCT dc.worker_id) AS worker_count
   FROM (((public.cost_codes cc
     LEFT JOIN public.time_log_allocations tla ON ((tla.cost_code_id = cc.id)))
     LEFT JOIN public.day_cards dc ON ((dc.id = tla.day_card_id)))
     LEFT JOIN public.projects p ON ((p.id = tla.project_id)))
  WHERE (dc.logged_hours > (0)::numeric)
  GROUP BY cc.id, cc.code, cc.name, cc.category, tla.project_id, p.project_name;



--
-- Name: day_cards_with_details; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.day_cards_with_details CASCADE;
CREATE VIEW public.day_cards_with_details AS
SELECT
    NULL::uuid AS id,
    NULL::uuid AS worker_id,
    NULL::date AS date,
    NULL::numeric AS scheduled_hours,
    NULL::numeric AS logged_hours,
    NULL::text AS status,
    NULL::numeric AS pay_rate,
    NULL::text AS pay_status,
    NULL::uuid AS company_id,
    NULL::text AS notes,
    NULL::jsonb AS metadata,
    NULL::timestamp with time zone AS created_at,
    NULL::timestamp with time zone AS updated_at,
    NULL::uuid AS created_by,
    NULL::boolean AS locked,
    NULL::text AS worker_name,
    NULL::numeric(10,2) AS worker_default_rate,
    NULL::text AS trade_name,
    NULL::jsonb[] AS jobs;



--
-- Name: labor_actuals_by_cost_code; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.labor_actuals_by_cost_code CASCADE;
CREATE VIEW public.labor_actuals_by_cost_code AS
 SELECT dl.project_id,
    dl.cost_code_id,
    cc.code AS cost_code,
    cc.name AS cost_code_name,
    sum(dl.hours_worked) AS actual_hours,
    sum((dl.hours_worked * w.hourly_rate)) AS actual_cost,
    count(DISTINCT dl.worker_id) AS worker_count
   FROM ((public.daily_logs dl
     LEFT JOIN public.cost_codes cc ON ((dl.cost_code_id = cc.id)))
     LEFT JOIN public.workers w ON ((dl.worker_id = w.id)))
  GROUP BY dl.project_id, dl.cost_code_id, cc.code, cc.name;



--
-- Name: payment_labor_summary; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.payment_labor_summary CASCADE;
CREATE VIEW public.payment_labor_summary AS
 SELECT p.id AS payment_id,
    p.start_date,
    p.end_date,
    p.paid_by,
    p.payment_date,
    dl.worker_id,
    w.name AS worker_name,
    w.trade AS worker_trade,
    dl.project_id,
    proj.project_name,
    sum(dl.hours_worked) AS total_hours,
    sum((dl.hours_worked * w.hourly_rate)) AS labor_cost
   FROM (((public.payments p
     CROSS JOIN public.daily_logs dl)
     JOIN public.workers w ON ((w.id = dl.worker_id)))
     JOIN public.projects proj ON ((proj.id = dl.project_id)))
  WHERE ((dl.date >= p.start_date) AND (dl.date <= p.end_date))
  GROUP BY p.id, p.start_date, p.end_date, p.paid_by, p.payment_date, dl.worker_id, w.name, w.trade, dl.project_id, proj.project_name;



--
-- Name: project_activity_view; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.project_activity_view CASCADE;
CREATE VIEW public.project_activity_view AS
 SELECT dl.id AS log_id,
    dl.project_id,
    dl.worker_id,
    dl.trade_id,
    dl.date,
    dl.hours_worked,
    dl.schedule_id,
    dl.notes,
    dl.created_at,
    (dl.hours_worked * COALESCE(w.hourly_rate, (0)::numeric)) AS cost,
    w.name AS worker_name,
    w.trade AS worker_trade,
    p.project_name
   FROM ((public.daily_logs dl
     LEFT JOIN public.workers w ON ((dl.worker_id = w.id)))
     LEFT JOIN public.projects p ON ((dl.project_id = p.id)));



--
-- Name: project_costs_view; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.project_costs_view CASCADE;
CREATE VIEW public.project_costs_view AS
 WITH labor_costs AS (
         SELECT dl.project_id,
            sum(dl.hours_worked) AS total_hours,
            sum((dl.hours_worked * w.hourly_rate)) AS total_cost
           FROM (public.daily_logs dl
             JOIN public.workers w ON ((dl.worker_id = w.id)))
          GROUP BY dl.project_id
        ), paid_labor AS (
         SELECT dl.project_id,
            sum(dl.hours_worked) AS paid_hours,
            sum((dl.hours_worked * w.hourly_rate)) AS paid_cost,
            max(p_1.payment_date) AS last_paid_at
           FROM ((public.daily_logs dl
             JOIN public.workers w ON ((dl.worker_id = w.id)))
             JOIN public.payments p_1 ON (((dl.date >= p_1.start_date) AND (dl.date <= p_1.end_date))))
          GROUP BY dl.project_id
        ), unpaid_labor AS (
         SELECT dl.project_id,
            sum(dl.hours_worked) AS unpaid_hours,
            sum((dl.hours_worked * w.hourly_rate)) AS unpaid_cost
           FROM (public.daily_logs dl
             JOIN public.workers w ON ((dl.worker_id = w.id)))
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM public.payments p_1
                  WHERE ((dl.date >= p_1.start_date) AND (dl.date <= p_1.end_date)))))
          GROUP BY dl.project_id
        )
 SELECT p.id AS project_id,
    p.project_name,
    p.client_name,
    p.status,
    COALESCE(lc.total_hours, (0)::numeric) AS labor_total_hours,
    COALESCE(lc.total_cost, (0)::numeric) AS labor_total_cost,
    COALESCE(pl.paid_hours, (0)::numeric) AS labor_paid_hours,
    COALESCE(pl.paid_cost, (0)::numeric) AS labor_paid_cost,
    COALESCE(ul.unpaid_hours, (0)::numeric) AS labor_unpaid_hours,
    COALESCE(ul.unpaid_cost, (0)::numeric) AS labor_unpaid_cost,
    pl.last_paid_at,
    COALESCE(pb.labor_budget, (0)::numeric) AS labor_budget,
    COALESCE(pb.subs_budget, (0)::numeric) AS subs_budget,
    COALESCE(pb.materials_budget, (0)::numeric) AS materials_budget,
    COALESCE(pb.other_budget, (0)::numeric) AS other_budget,
    (COALESCE(pb.labor_budget, (0)::numeric) - COALESCE(lc.total_cost, (0)::numeric)) AS labor_budget_variance,
    GREATEST((COALESCE(pb.labor_budget, (0)::numeric) - COALESCE(lc.total_cost, (0)::numeric)), (0)::numeric) AS labor_budget_remaining
   FROM ((((public.projects p
     LEFT JOIN labor_costs lc ON ((p.id = lc.project_id)))
     LEFT JOIN paid_labor pl ON ((p.id = pl.project_id)))
     LEFT JOIN unpaid_labor ul ON ((p.id = ul.project_id)))
     LEFT JOIN public.project_budgets pb ON ((p.id = pb.project_id)));



--
-- Name: project_dashboard_view; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.project_dashboard_view CASCADE;
CREATE VIEW public.project_dashboard_view AS
 SELECT p.id AS project_id,
    p.project_name,
    p.client_name,
    p.company_id,
    p.status,
    p.address,
    p.project_manager,
    COALESCE(sum(dl.hours_worked), (0)::numeric) AS total_hours,
    COALESCE(sum((dl.hours_worked * w.hourly_rate)), (0)::numeric) AS total_cost,
    count(DISTINCT dl.worker_id) AS worker_count,
    max(dl.date) AS last_activity
   FROM ((public.projects p
     LEFT JOIN public.daily_logs dl ON ((p.id = dl.project_id)))
     LEFT JOIN public.workers w ON ((dl.worker_id = w.id)))
  GROUP BY p.id, p.project_name, p.client_name, p.company_id, p.status, p.address, p.project_manager;



--
-- Name: project_labor_summary; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.project_labor_summary CASCADE;
CREATE VIEW public.project_labor_summary AS
 SELECT p.id AS project_id,
    p.project_name,
    count(DISTINCT dc.worker_id) AS worker_count,
    sum(dc.logged_hours) AS total_hours_logged,
    sum(dc.scheduled_hours) AS total_hours_scheduled,
    sum(COALESCE((dc.logged_hours * dc.pay_rate), (0)::numeric)) AS total_labor_cost,
    sum(
        CASE
            WHEN ((dc.pay_status = 'unpaid'::text) AND (dc.logged_hours > (0)::numeric)) THEN (dc.logged_hours * dc.pay_rate)
            ELSE (0)::numeric
        END) AS unpaid_labor_cost,
    sum(
        CASE
            WHEN ((dc.pay_status = 'paid'::text) AND (dc.logged_hours > (0)::numeric)) THEN (dc.logged_hours * dc.pay_rate)
            ELSE (0)::numeric
        END) AS paid_labor_cost,
    max(dc.date) AS last_activity_date
   FROM ((public.projects p
     LEFT JOIN public.time_log_allocations tla ON ((tla.project_id = p.id)))
     LEFT JOIN public.day_cards dc ON ((dc.id = tla.day_card_id)))
  GROUP BY p.id, p.project_name;



--
-- Name: project_schedule_view; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.project_schedule_view CASCADE;
CREATE VIEW public.project_schedule_view AS
 SELECT id,
    project_id,
    worker_id,
    trade_id,
    scheduled_date,
    scheduled_hours,
    status,
    notes,
    converted_to_timelog,
    created_at,
    updated_at
   FROM public.scheduled_shifts;



--
-- Name: sub_contract_summary; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.sub_contract_summary CASCADE;
CREATE VIEW public.sub_contract_summary AS
SELECT
    NULL::uuid AS contract_id,
    NULL::uuid AS project_id,
    NULL::uuid AS sub_id,
    NULL::text AS sub_name,
    NULL::text AS company_name,
    NULL::text AS trade,
    NULL::numeric AS contract_value,
    NULL::numeric AS retention_percentage,
    NULL::text AS status,
    NULL::numeric AS total_billed,
    NULL::numeric AS total_paid,
    NULL::numeric AS total_retention_held,
    NULL::numeric AS total_retention_released,
    NULL::numeric AS remaining_to_bill,
    NULL::numeric AS outstanding_balance;



--
-- Name: unpaid_labor_bills; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.unpaid_labor_bills CASCADE;
CREATE VIEW public.unpaid_labor_bills AS
 SELECT p.company_id,
    c.name AS company_name,
    dl.project_id,
    proj.project_name,
    min(dl.date) AS period_start,
    max(dl.date) AS period_end,
    count(dl.id) AS log_count,
    sum(dl.hours_worked) AS total_hours,
    sum((dl.hours_worked * w.hourly_rate)) AS total_amount
   FROM ((((public.daily_logs dl
     JOIN public.projects p ON ((dl.project_id = p.id)))
     LEFT JOIN public.companies c ON ((p.company_id = c.id)))
     JOIN public.workers w ON ((dl.worker_id = w.id)))
     LEFT JOIN public.projects proj ON ((dl.project_id = proj.id)))
  WHERE (dl.payment_status = 'unpaid'::text)
  GROUP BY p.company_id, c.name, dl.project_id, proj.project_name
  ORDER BY (max(dl.date)) DESC;



--
-- Name: worker_day_summary; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.worker_day_summary CASCADE;
CREATE VIEW public.worker_day_summary AS
SELECT
    NULL::uuid AS day_card_id,
    NULL::uuid AS worker_id,
    NULL::text AS worker_name,
    NULL::numeric(10,2) AS worker_rate,
    NULL::text AS worker_trade,
    NULL::date AS date,
    NULL::numeric AS scheduled_hours,
    NULL::numeric AS logged_hours,
    NULL::numeric AS pay_rate,
    NULL::text AS lifecycle_status,
    NULL::text AS pay_status,
    NULL::boolean AS locked,
    NULL::uuid AS company_id,
    NULL::text AS company_name,
    NULL::numeric AS total_cost,
    NULL::numeric AS unpaid_amount,
    NULL::json AS allocations;



--
-- Name: workers_public; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.workers_public CASCADE;
CREATE VIEW public.workers_public AS
 SELECT id,
    name,
    trade_id,
    trade,
    hourly_rate,
    active,
    created_at,
    updated_at,
        CASE
            WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN phone
            ELSE NULL::text
        END AS phone
   FROM public.workers;



--
-- Name: workforce_activity_feed; Type: VIEW; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.workforce_activity_feed CASCADE;
CREATE VIEW public.workforce_activity_feed AS
 SELECT ('schedule:'::text || (ss.id)::text) AS id,
        CASE
            WHEN (ss.created_at = ss.updated_at) THEN 'schedule_created'::text
            ELSE 'schedule_updated'::text
        END AS event_type,
    ss.created_at AS event_at,
    ss.worker_id,
    w.name AS worker_name,
    p.company_id,
    c.name AS company_name,
    ss.project_id,
    p.project_name,
    ss.scheduled_hours AS hours,
    NULL::numeric AS amount,
    jsonb_build_object('schedule_id', ss.id, 'trade_id', ss.trade_id, 'status', ss.status, 'notes', ss.notes, 'date', ss.scheduled_date) AS meta
   FROM (((public.scheduled_shifts ss
     LEFT JOIN public.workers w ON ((w.id = ss.worker_id)))
     LEFT JOIN public.projects p ON ((p.id = ss.project_id)))
     LEFT JOIN public.companies c ON ((c.id = p.company_id)))
  WHERE (ss.created_at > (now() - '90 days'::interval))
UNION ALL
 SELECT ('timelog:'::text || (dl.id)::text) AS id,
        CASE
            WHEN ((dl.created_at)::date = dl.date) THEN 'time_log_created'::text
            ELSE 'time_log_updated'::text
        END AS event_type,
    dl.created_at AS event_at,
    dl.worker_id,
    w.name AS worker_name,
    p.company_id,
    c.name AS company_name,
    dl.project_id,
    p.project_name,
    dl.hours_worked AS hours,
    (dl.hours_worked * w.hourly_rate) AS amount,
    jsonb_build_object('log_id', dl.id, 'trade_id', dl.trade_id, 'payment_status', dl.payment_status, 'payment_id', dl.payment_id, 'notes', dl.notes, 'date', dl.date, 'hourly_rate', w.hourly_rate) AS meta
   FROM (((public.daily_logs dl
     LEFT JOIN public.workers w ON ((w.id = dl.worker_id)))
     LEFT JOIN public.projects p ON ((p.id = dl.project_id)))
     LEFT JOIN public.companies c ON ((c.id = p.company_id)))
  WHERE (dl.created_at > (now() - '90 days'::interval))
UNION ALL
 SELECT ('payment:'::text || (pay.id)::text) AS id,
        CASE
            WHEN (pay.created_at = pay.updated_at) THEN 'payment_created'::text
            ELSE 'payment_updated'::text
        END AS event_type,
    pay.created_at AS event_at,
    NULL::uuid AS worker_id,
    NULL::text AS worker_name,
    pay.company_id,
    c.name AS company_name,
    NULL::uuid AS project_id,
    NULL::text AS project_name,
    NULL::numeric AS hours,
    pay.amount,
    jsonb_build_object('payment_id', pay.id, 'start_date', pay.start_date, 'end_date', pay.end_date, 'payment_date', pay.payment_date, 'paid_by', pay.paid_by, 'paid_via', pay.paid_via, 'reimbursement_status', pay.reimbursement_status, 'notes', pay.notes, 'log_count', ( SELECT count(*) AS count
           FROM public.daily_logs
          WHERE (daily_logs.payment_id = pay.id))) AS meta
   FROM (public.payments pay
     LEFT JOIN public.companies c ON ((c.id = pay.company_id)))
  WHERE (pay.created_at > (now() - '90 days'::interval));

--

DROP VIEW IF EXISTS public.day_cards_with_details CASCADE;
CREATE VIEW public.day_cards_with_details AS
 SELECT dc.id,
    dc.worker_id,
    dc.date,
    dc.scheduled_hours,
    dc.logged_hours,
    dc.status,
    dc.pay_rate,
    dc.pay_status,
    dc.company_id,
    dc.notes,
    dc.metadata,
    dc.created_at,
    dc.updated_at,
    dc.created_by,
    dc.locked,
    w.name AS worker_name,
    w.hourly_rate AS worker_default_rate,
    t.name AS trade_name,
    array_agg(jsonb_build_object('id', dcj.id, 'project_id', dcj.project_id, 'project_name', p.project_name, 'trade_id', dcj.trade_id, 'cost_code_id', dcj.cost_code_id, 'hours', dcj.hours, 'notes', dcj.notes) ORDER BY dcj.created_at) FILTER (WHERE (dcj.id IS NOT NULL)) AS jobs
   FROM ((((public.day_cards dc
     LEFT JOIN public.workers w ON ((dc.worker_id = w.id)))
     LEFT JOIN public.trades t ON ((w.trade_id = t.id)))
     LEFT JOIN public.day_card_jobs dcj ON ((dc.id = dcj.day_card_id)))
     LEFT JOIN public.projects p ON ((dcj.project_id = p.id)))
  GROUP BY dc.id, w.name, w.hourly_rate, t.name;



--
-- Name: sub_contract_summary _RETURN; Type: RULE; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.sub_contract_summary CASCADE;
CREATE VIEW public.sub_contract_summary AS
 SELECT sc.id AS contract_id,
    sc.project_id,
    sc.sub_id,
    s.name AS sub_name,
    s.company_name,
    s.trade,
    sc.contract_value,
    sc.retention_percentage,
    sc.status,
    COALESCE(sum(si.total), (0)::numeric) AS total_billed,
    COALESCE(sum(sp.amount_paid), (0)::numeric) AS total_paid,
    COALESCE(sum(si.retention_amount), (0)::numeric) AS total_retention_held,
    COALESCE(sum(sp.retention_released), (0)::numeric) AS total_retention_released,
    (sc.contract_value - COALESCE(sum(si.total), (0)::numeric)) AS remaining_to_bill,
    (COALESCE(sum(si.total), (0)::numeric) - COALESCE(sum(sp.amount_paid), (0)::numeric)) AS outstanding_balance
   FROM (((public.sub_contracts sc
     LEFT JOIN public.subs s ON ((s.id = sc.sub_id)))
     LEFT JOIN public.sub_invoices si ON (((si.contract_id = sc.id) AND (si.payment_status <> 'rejected'::text))))
     LEFT JOIN public.sub_payments sp ON ((sp.project_subcontract_id = sc.id)))
  GROUP BY sc.id, s.name, s.company_name, s.trade;



--
-- Name: worker_day_summary _RETURN; Type: RULE; Schema: public; Owner: -
--

DROP VIEW IF EXISTS public.worker_day_summary CASCADE;
CREATE VIEW public.worker_day_summary AS
 SELECT dc.id AS day_card_id,
    dc.worker_id,
    w.name AS worker_name,
    w.hourly_rate AS worker_rate,
    t.name AS worker_trade,
    dc.date,
    dc.scheduled_hours,
    dc.logged_hours,
    dc.pay_rate,
    dc.lifecycle_status,
    dc.pay_status,
    dc.locked,
    dc.company_id,
    c.name AS company_name,
    COALESCE((dc.logged_hours * dc.pay_rate), (dc.scheduled_hours * COALESCE(dc.pay_rate, w.hourly_rate)), (0)::numeric) AS total_cost,
        CASE
            WHEN (dc.pay_status = 'unpaid'::text) THEN COALESCE((dc.logged_hours * dc.pay_rate), (dc.scheduled_hours * COALESCE(dc.pay_rate, w.hourly_rate)), (0)::numeric)
            ELSE (0)::numeric
        END AS unpaid_amount,
    json_agg(json_build_object('project_id', tla.project_id, 'project_name', p.project_name, 'hours', tla.hours, 'trade', tr.name, 'cost_code', cc.code)) FILTER (WHERE (tla.id IS NOT NULL)) AS allocations
   FROM (((((((public.day_cards dc
     JOIN public.workers w ON ((w.id = dc.worker_id)))
     LEFT JOIN public.trades t ON ((t.id = w.trade_id)))
     LEFT JOIN public.companies c ON ((c.id = dc.company_id)))
     LEFT JOIN public.time_log_allocations tla ON ((tla.day_card_id = dc.id)))
     LEFT JOIN public.projects p ON ((p.id = tla.project_id)))
     LEFT JOIN public.trades tr ON ((tr.id = tla.trade_id)))
     LEFT JOIN public.cost_codes cc ON ((cc.id = tla.cost_code_id)))
  GROUP BY dc.id, w.id, w.name, w.hourly_rate, t.name, c.name;
