drop trigger if exists "auto_populate_time_log_company" on "public"."time_logs";

drop trigger if exists "auto_populate_time_log_rate" on "public"."time_logs";

drop trigger if exists "log_time_log_activity" on "public"."time_logs";

drop trigger if exists "sync_log_to_schedule" on "public"."time_logs";

drop trigger if exists "trigger_auto_populate_company_id_time_logs" on "public"."time_logs";

drop trigger if exists "trigger_auto_populate_worker_rate_time_logs" on "public"."time_logs";

drop trigger if exists "trigger_prevent_paid_time_log_mutation" on "public"."time_logs";

drop trigger if exists "trigger_sync_time_log_to_work_schedule" on "public"."time_logs";

drop view if exists "public"."company_payroll_summary";

drop view if exists "public"."cost_code_actuals";

drop view if exists "public"."day_cards_with_details";

drop view if exists "public"."global_financial_summary_view";

drop view if exists "public"."invoice_payment_totals";

drop view if exists "public"."labor_actuals_by_cost_code";

drop view if exists "public"."material_actuals_by_project";

drop view if exists "public"."monthly_costs_view";

drop view if exists "public"."monthly_labor_costs_view";

drop view if exists "public"."payment_labor_summary";

drop view if exists "public"."project_activity_view";

drop view if exists "public"."project_billing_summary";

drop view if exists "public"."project_budget_ledger_view";

drop view if exists "public"."project_budget_vs_actual_view";

drop view if exists "public"."project_cost_summary_view";

drop view if exists "public"."project_costs_view";

drop view if exists "public"."project_dashboard_view";

drop view if exists "public"."project_labor_costs_view";

drop view if exists "public"."project_labor_summary";

drop view if exists "public"."project_labor_summary_view";

drop view if exists "public"."project_revenue_summary_view";

drop view if exists "public"."project_schedule_view";

drop view if exists "public"."sub_contract_summary";

drop view if exists "public"."time_logs_with_meta_view";

drop view if exists "public"."unpaid_labor_bills";

drop view if exists "public"."unpaid_time_logs_available_for_pay_run";

drop view if exists "public"."work_order_schedule_view";

drop view if exists "public"."work_schedule_grid_view";

drop view if exists "public"."worker_day_summary";

drop view if exists "public"."workers_public";

drop view if exists "public"."workforce_activity_feed";

drop index if exists "public"."idx_cost_codes_company_trade_id";

alter table "public"."company_trades" add column "default_labor_cost_code_id" uuid;

alter table "public"."company_trades" add column "default_material_cost_code_id" uuid;

alter table "public"."company_trades" add column "default_sub_cost_code_id" uuid;

alter table "public"."trades" alter column "company_id" set not null;

CREATE INDEX idx_company_trades_company_defaults ON public.company_trades USING btree (company_id, default_labor_cost_code_id, default_material_cost_code_id, default_sub_cost_code_id);

CREATE INDEX idx_cost_codes_company_company_trade ON public.cost_codes USING btree (company_id, company_trade_id);

CREATE INDEX idx_cost_codes_company_trade_id ON public.cost_codes USING btree (company_id, company_trade_id);

alter table "public"."company_trades" add constraint "company_trades_default_labor_cost_code_id_fkey" FOREIGN KEY (default_labor_cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL not valid;

alter table "public"."company_trades" validate constraint "company_trades_default_labor_cost_code_id_fkey";

alter table "public"."company_trades" add constraint "company_trades_default_material_cost_code_id_fkey" FOREIGN KEY (default_material_cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL not valid;

alter table "public"."company_trades" validate constraint "company_trades_default_material_cost_code_id_fkey";

alter table "public"."company_trades" add constraint "company_trades_default_sub_cost_code_id_fkey" FOREIGN KEY (default_sub_cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL not valid;

alter table "public"."company_trades" validate constraint "company_trades_default_sub_cost_code_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_cost_code_safe(p_company_id uuid, p_code text, p_name text, p_category text, p_company_trade_id uuid DEFAULT NULL::uuid, p_is_active boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_new_id uuid;
  v_final_code text;
  v_suffix int;
BEGIN
  -- Verify membership
  IF NOT public.is_company_member(p_company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Validate category (must match check constraint)
  IF p_category NOT IN ('labor', 'subs', 'materials', 'other') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid category. Must be: labor, subs, materials, or other');
  END IF;

  -- Collision-safe code generation
  v_final_code := UPPER(TRIM(p_code));
  v_suffix := 1;
  
  WHILE EXISTS (
    SELECT 1 FROM public.cost_codes 
    WHERE company_id = p_company_id AND code = v_final_code
  ) LOOP
    v_suffix := v_suffix + 1;
    v_final_code := UPPER(TRIM(p_code)) || '-' || v_suffix;
    
    IF v_suffix > 99 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unable to generate unique code');
    END IF;
  END LOOP;

  -- Insert
  INSERT INTO public.cost_codes (company_id, company_trade_id, code, name, category, is_active)
  VALUES (p_company_id, p_company_trade_id, v_final_code, p_name, p_category, p_is_active)
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_new_id,
    'code', v_final_code
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.list_company_trades(p_company_id uuid)
 RETURNS TABLE(id uuid, name text, description text, code_prefix text, is_active boolean, default_labor_cost_code_id uuid, default_material_cost_code_id uuid, default_sub_cost_code_id uuid, defaults_complete boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Verify membership
  IF NOT public.is_company_member(p_company_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    ct.id,
    ct.name,
    ct.description,
    ct.code_prefix,
    ct.is_active,
    ct.default_labor_cost_code_id,
    ct.default_material_cost_code_id,
    ct.default_sub_cost_code_id,
    (ct.default_labor_cost_code_id IS NOT NULL 
      AND ct.default_material_cost_code_id IS NOT NULL 
      AND ct.default_sub_cost_code_id IS NOT NULL) AS defaults_complete
  FROM public.company_trades ct
  WHERE ct.company_id = p_company_id
  ORDER BY ct.name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_company_trade_default_cost_code(p_company_trade_id uuid, p_default_kind text, p_cost_code_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_trade public.company_trades;
  v_cost_code public.cost_codes;
BEGIN
  -- Get trade
  SELECT * INTO v_trade FROM public.company_trades WHERE id = p_company_trade_id;
  IF v_trade IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trade not found');
  END IF;

  -- Verify membership
  IF NOT public.is_company_member(v_trade.company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Get cost code
  SELECT * INTO v_cost_code FROM public.cost_codes WHERE id = p_cost_code_id;
  IF v_cost_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cost code not found');
  END IF;

  -- Verify same company
  IF v_cost_code.company_id != v_trade.company_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cost code belongs to different company');
  END IF;

  -- Update the appropriate default
  CASE p_default_kind
    WHEN 'labor' THEN
      UPDATE public.company_trades SET default_labor_cost_code_id = p_cost_code_id WHERE id = p_company_trade_id;
    WHEN 'materials' THEN
      UPDATE public.company_trades SET default_material_cost_code_id = p_cost_code_id WHERE id = p_company_trade_id;
    WHEN 'subs' THEN
      UPDATE public.company_trades SET default_sub_cost_code_id = p_cost_code_id WHERE id = p_company_trade_id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid default_kind. Must be: labor, materials, or subs');
  END CASE;

  -- Also update the cost_code's company_trade_id if not set
  IF v_cost_code.company_trade_id IS NULL OR v_cost_code.company_trade_id != p_company_trade_id THEN
    UPDATE public.cost_codes SET company_trade_id = p_company_trade_id WHERE id = p_cost_code_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$
;

create or replace view "public"."company_payroll_summary" as  SELECT c.id AS company_id,
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


create or replace view "public"."cost_code_actuals" as  SELECT cc.id AS cost_code_id,
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


create or replace view "public"."day_cards_with_details" as  SELECT dc.id,
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


CREATE OR REPLACE FUNCTION public.generate_company_trade_defaults(p_company_trade_id uuid, p_mode text DEFAULT 'LMS'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_trade public.company_trades;
  v_created int := 0;
  v_labor_id uuid;
  v_material_id uuid;
  v_sub_id uuid;
BEGIN
  -- Get the trade
  SELECT * INTO v_trade FROM public.company_trades WHERE id = p_company_trade_id;
  IF v_trade IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trade not found');
  END IF;

  -- Ensure tenant member
  IF NOT public.is_company_member(v_trade.company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Create Labor cost code (category = 'labor')
  INSERT INTO public.cost_codes (company_id, company_trade_id, code, name, category, is_active)
  VALUES (
    v_trade.company_id,
    v_trade.id,
    v_trade.code_prefix || '-L',
    v_trade.name || ' (Labor)',
    'labor',  -- CANONICAL
    true
  )
  ON CONFLICT (company_id, code) DO NOTHING;
  IF FOUND THEN v_created := v_created + 1; END IF;
  
  SELECT id INTO v_labor_id
  FROM public.cost_codes
  WHERE company_id = v_trade.company_id AND company_trade_id = v_trade.id AND category = 'labor'
  LIMIT 1;

  -- Create Material cost code (category = 'material')
  INSERT INTO public.cost_codes (company_id, company_trade_id, code, name, category, is_active)
  VALUES (
    v_trade.company_id,
    v_trade.id,
    v_trade.code_prefix || '-M',
    v_trade.name || ' (Material)',
    'material',  -- CANONICAL (not 'materials')
    true
  )
  ON CONFLICT (company_id, code) DO NOTHING;
  IF FOUND THEN v_created := v_created + 1; END IF;
  
  SELECT id INTO v_material_id
  FROM public.cost_codes
  WHERE company_id = v_trade.company_id AND company_trade_id = v_trade.id AND category = 'material'
  LIMIT 1;

  -- Create Sub cost code (category = 'sub')
  INSERT INTO public.cost_codes (company_id, company_trade_id, code, name, category, is_active)
  VALUES (
    v_trade.company_id,
    v_trade.id,
    v_trade.code_prefix || '-S',
    v_trade.name || ' (Subcontractor)',
    'sub',  -- CANONICAL (not 'subs')
    true
  )
  ON CONFLICT (company_id, code) DO NOTHING;
  IF FOUND THEN v_created := v_created + 1; END IF;
  
  SELECT id INTO v_sub_id
  FROM public.cost_codes
  WHERE company_id = v_trade.company_id AND company_trade_id = v_trade.id AND category = 'sub'
  LIMIT 1;

  -- Update company_trades with default refs
  UPDATE public.company_trades
  SET
    default_labor_cost_code_id = COALESCE(default_labor_cost_code_id, v_labor_id),
    default_material_cost_code_id = COALESCE(default_material_cost_code_id, v_material_id),
    default_sub_cost_code_id = COALESCE(default_sub_cost_code_id, v_sub_id)
  WHERE id = v_trade.id;

  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_trade.id,
    'trade_name', v_trade.name,
    'codes_created', v_created,
    'labor_id', v_labor_id,
    'material_id', v_material_id,
    'sub_id', v_sub_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_company_trades_with_codes(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- Verify company membership
  IF NOT public.is_company_member(p_company_id) THEN
    RETURN '[]'::jsonb;
  END IF;
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ct.id,
      'name', ct.name,
      'description', ct.description,
      'code_prefix', ct.code_prefix,
      'is_active', ct.is_active,
      'cost_codes', COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'id', cc.id,
            'code', cc.code,
            'name', cc.name,
            'category', cc.category,
            'is_active', cc.is_active
          ) ORDER BY cc.code
        )
        FROM public.cost_codes cc
        WHERE cc.company_trade_id = ct.id
      ), '[]'::jsonb)
    ) ORDER BY ct.name
  )
  INTO v_result
  FROM public.company_trades ct
  WHERE ct.company_id = p_company_id;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_unassigned_cost_code_for_scope_block(p_scope_block_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_company_id uuid;
  v_cost_code_id uuid;
BEGIN
  SELECT sb.company_id
  INTO v_company_id
  FROM public.scope_blocks sb
  WHERE sb.id = p_scope_block_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'scope_block % has no company_id', p_scope_block_id;
  END IF;

  -- Explicit tenant check (SECURITY DEFINER bypasses RLS)
  IF NOT (v_company_id = ANY(public.authed_company_ids())) THEN
    RAISE EXCEPTION 'not authorized for scope_block %', p_scope_block_id;
  END IF;

  SELECT cc.id
  INTO v_cost_code_id
  FROM public.cost_codes cc
  WHERE cc.company_id = v_company_id
    AND cc.code = 'UNASSIGNED'
  LIMIT 1;

  IF v_cost_code_id IS NULL THEN
    RAISE EXCEPTION 'UNASSIGNED cost code not found for company %', v_company_id;
  END IF;

  RETURN v_cost_code_id;
END;
$function$
;

create or replace view "public"."global_financial_summary_view" as  WITH labor_summary AS (
         SELECT COALESCE(sum(time_logs.labor_cost), (0)::numeric) AS total_labor_cost,
            COALESCE(sum(
                CASE
                    WHEN (time_logs.payment_status = 'unpaid'::text) THEN time_logs.labor_cost
                    ELSE (0)::numeric
                END), (0)::numeric) AS unpaid_labor_cost
           FROM public.time_logs
        ), costs_summary AS (
         SELECT COALESCE(sum(
                CASE
                    WHEN (costs.category = 'subs'::text) THEN costs.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS subs_cost,
            COALESCE(sum(
                CASE
                    WHEN ((costs.category = 'subs'::text) AND (costs.status = 'unpaid'::text)) THEN costs.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS subs_unpaid,
            COALESCE(sum(
                CASE
                    WHEN (costs.category = 'materials'::text) THEN costs.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS materials_cost,
            COALESCE(sum(
                CASE
                    WHEN ((costs.category = 'materials'::text) AND (costs.status = 'unpaid'::text)) THEN costs.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS materials_unpaid,
            COALESCE(sum(
                CASE
                    WHEN ((lower(costs.category) = ANY (ARRAY['other'::text, 'misc'::text, 'equipment'::text])) OR (costs.category IS NULL)) THEN costs.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS other_cost,
            COALESCE(sum(
                CASE
                    WHEN (((lower(costs.category) = ANY (ARRAY['other'::text, 'misc'::text, 'equipment'::text])) OR (costs.category IS NULL)) AND (costs.status = 'unpaid'::text)) THEN costs.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS other_unpaid
           FROM public.costs
        ), revenue_summary AS (
         SELECT COALESCE(sum(estimates.total_amount), (0)::numeric) AS total_revenue
           FROM public.estimates
          WHERE (estimates.status = 'accepted'::text)
        ), retention_summary AS (
         SELECT COALESCE(sum(invoices.retention_amount), (0)::numeric) AS total_retention
           FROM public.invoices
          WHERE (invoices.status <> 'void'::text)
        )
 SELECT r.total_revenue AS revenue,
    l.total_labor_cost AS labor_actual,
    l.unpaid_labor_cost AS labor_unpaid,
    c.subs_cost AS subs_actual,
    c.subs_unpaid,
    c.materials_cost AS materials_actual,
    c.materials_unpaid,
    c.other_cost AS other_actual,
    c.other_unpaid,
    ret.total_retention AS retention_held,
    (((l.total_labor_cost + c.subs_cost) + c.materials_cost) + c.other_cost) AS total_costs,
    (r.total_revenue - (((l.total_labor_cost + c.subs_cost) + c.materials_cost) + c.other_cost)) AS profit,
    (((l.unpaid_labor_cost + c.subs_unpaid) + c.materials_unpaid) + c.other_unpaid) AS total_outstanding
   FROM labor_summary l,
    costs_summary c,
    revenue_summary r,
    retention_summary ret;


create or replace view "public"."invoice_payment_totals" as  SELECT i.id AS invoice_id,
    (COALESCE(sum(ip.amount), (0)::numeric) + COALESCE(sum(cp.amount), (0)::numeric)) AS total_paid
   FROM ((public.invoices i
     LEFT JOIN public.invoice_payments ip ON ((ip.invoice_id = i.id)))
     LEFT JOIN public.customer_payments cp ON ((cp.invoice_id = i.id)))
  GROUP BY i.id;


create or replace view "public"."labor_actuals_by_cost_code" as  SELECT dl.project_id,
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


create or replace view "public"."material_actuals_by_project" as  SELECT p.id AS project_id,
    p.project_name,
    p.company_id,
    COALESCE(sum(c.amount), (0)::numeric) AS material_actual,
    pb.materials_budget,
    (COALESCE(pb.materials_budget, (0)::numeric) - COALESCE(sum(c.amount), (0)::numeric)) AS material_variance,
    count(DISTINCT mr.id) AS receipt_count,
    count(DISTINCT c.vendor_id) AS vendor_count
   FROM (((public.projects p
     LEFT JOIN public.costs c ON (((c.project_id = p.id) AND (c.category = 'materials'::text) AND (c.status <> 'void'::text))))
     LEFT JOIN public.material_receipts mr ON ((mr.project_id = p.id)))
     LEFT JOIN public.project_budgets pb ON ((pb.project_id = p.id)))
  GROUP BY p.id, p.project_name, p.company_id, pb.materials_budget;


create or replace view "public"."monthly_costs_view" as  SELECT (date_trunc('month'::text, (date_incurred)::timestamp with time zone))::date AS month,
    category,
    sum(amount) AS total_cost,
    sum(
        CASE
            WHEN (status = 'unpaid'::text) THEN amount
            ELSE (0)::numeric
        END) AS unpaid_cost,
    sum(
        CASE
            WHEN (status = 'paid'::text) THEN amount
            ELSE (0)::numeric
        END) AS paid_cost,
    count(*) AS cost_entry_count
   FROM public.costs c
  GROUP BY (date_trunc('month'::text, (date_incurred)::timestamp with time zone)), category;


create or replace view "public"."monthly_labor_costs_view" as  SELECT (date_trunc('month'::text, (date)::timestamp with time zone))::date AS month,
    sum(labor_cost) AS total_labor_cost,
    sum(
        CASE
            WHEN (payment_status = 'unpaid'::text) THEN labor_cost
            ELSE (0)::numeric
        END) AS unpaid_labor_cost,
    sum(
        CASE
            WHEN (payment_status = 'paid'::text) THEN labor_cost
            ELSE (0)::numeric
        END) AS paid_labor_cost,
    sum(hours_worked) AS total_hours,
    count(DISTINCT worker_id) AS unique_workers,
    count(*) AS log_count
   FROM public.time_logs t
  GROUP BY (date_trunc('month'::text, (date)::timestamp with time zone));


create or replace view "public"."payment_labor_summary" as  SELECT p.id AS payment_id,
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


create or replace view "public"."project_activity_view" as  SELECT dl.id AS log_id,
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


create or replace view "public"."project_billing_summary" as  WITH approved_proposal AS (
         SELECT p.project_id,
            COALESCE(sum(p.total_amount), (0)::numeric) AS approved_proposal_total
           FROM public.proposals p
          WHERE (p.acceptance_status = 'accepted'::text)
          GROUP BY p.project_id
        ), approved_cos AS (
         SELECT co.project_id,
            COALESCE(sum(co.total_amount), (0)::numeric) AS approved_co_total
           FROM public.change_orders co
          WHERE (co.status = 'approved'::text)
          GROUP BY co.project_id
        ), invoiced AS (
         SELECT i.project_id,
            COALESCE(sum(i.total_amount), (0)::numeric) AS total_invoiced
           FROM public.invoices i
          WHERE (i.status <> 'void'::text)
          GROUP BY i.project_id
        ), paid AS (
         SELECT i.project_id,
            (COALESCE(sum(ip.amount), (0)::numeric) + COALESCE(sum(cp.amount), (0)::numeric)) AS total_paid
           FROM ((public.invoices i
             LEFT JOIN public.invoice_payments ip ON ((ip.invoice_id = i.id)))
             LEFT JOIN public.customer_payments cp ON ((cp.invoice_id = i.id)))
          WHERE (i.status <> 'void'::text)
          GROUP BY i.project_id
        )
 SELECT pr.id AS project_id,
    COALESCE(ap.approved_proposal_total, (0)::numeric) AS approved_proposal_total,
    COALESCE(ac.approved_co_total, (0)::numeric) AS approved_co_total,
    (COALESCE(ap.approved_proposal_total, (0)::numeric) + COALESCE(ac.approved_co_total, (0)::numeric)) AS contract_value,
    COALESCE(iv.total_invoiced, (0)::numeric) AS total_invoiced,
    COALESCE(pd.total_paid, (0)::numeric) AS total_paid,
    (COALESCE(iv.total_invoiced, (0)::numeric) - COALESCE(pd.total_paid, (0)::numeric)) AS outstanding_invoiced,
    ((COALESCE(ap.approved_proposal_total, (0)::numeric) + COALESCE(ac.approved_co_total, (0)::numeric)) - COALESCE(pd.total_paid, (0)::numeric)) AS balance_to_finish
   FROM ((((public.projects pr
     LEFT JOIN approved_proposal ap ON ((ap.project_id = pr.id)))
     LEFT JOIN approved_cos ac ON ((ac.project_id = pr.id)))
     LEFT JOIN invoiced iv ON ((iv.project_id = pr.id)))
     LEFT JOIN paid pd ON ((pd.project_id = pr.id)));


create or replace view "public"."project_budget_ledger_view" as  WITH budget AS (
         SELECT pbl.project_id,
            pbl.cost_code_id,
            pbl.category,
            sum(COALESCE(pbl.budget_amount, (0)::numeric)) AS budget_amount,
            sum(COALESCE(pbl.budget_hours, (0)::numeric)) AS budget_hours,
            bool_or(COALESCE(pbl.is_allowance, false)) AS is_allowance
           FROM public.project_budget_lines pbl
          GROUP BY pbl.project_id, pbl.cost_code_id, pbl.category
        ), labor_actuals AS (
         SELECT tl.project_id,
            tl.cost_code_id,
            COALESCE(sum(tl.labor_cost), (0)::numeric) AS labor_actual_amount,
            COALESCE(sum(COALESCE(tl.hours_worked, (0)::numeric)), (0)::numeric) AS labor_actual_hours
           FROM public.time_logs tl
          GROUP BY tl.project_id, tl.cost_code_id
        ), non_labor_actuals AS (
         SELECT c.project_id,
            c.cost_code_id,
            c.category,
            COALESCE(sum(c.amount), (0)::numeric) AS actual_amount,
            COALESCE(sum(
                CASE
                    WHEN (c.status = 'unpaid'::text) THEN c.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS unpaid_amount
           FROM public.costs c
          GROUP BY c.project_id, c.cost_code_id, c.category
        )
 SELECT b.project_id,
    b.cost_code_id,
    cc.code AS cost_code,
    COALESCE(cc.name, 'Unassigned / Misc'::text) AS cost_code_name,
    b.category,
    b.budget_amount,
    b.budget_hours,
    b.is_allowance,
        CASE
            WHEN (b.category = 'labor'::text) THEN COALESCE(la.labor_actual_amount, (0)::numeric)
            ELSE COALESCE(nla.actual_amount, (0)::numeric)
        END AS actual_amount,
        CASE
            WHEN (b.category = 'labor'::text) THEN COALESCE(la.labor_actual_hours, (0)::numeric)
            ELSE (0)::numeric
        END AS actual_hours,
        CASE
            WHEN (b.category = 'labor'::text) THEN COALESCE(la_unpaid.labor_unpaid_amount, (0)::numeric)
            ELSE COALESCE(nla.unpaid_amount, (0)::numeric)
        END AS unpaid_amount,
    (COALESCE(b.budget_amount, (0)::numeric) -
        CASE
            WHEN (b.category = 'labor'::text) THEN COALESCE(la.labor_actual_amount, (0)::numeric)
            ELSE COALESCE(nla.actual_amount, (0)::numeric)
        END) AS variance
   FROM ((((budget b
     LEFT JOIN public.cost_codes cc ON ((cc.id = b.cost_code_id)))
     LEFT JOIN labor_actuals la ON (((la.project_id = b.project_id) AND (la.cost_code_id = b.cost_code_id))))
     LEFT JOIN ( SELECT tl.project_id,
            tl.cost_code_id,
            COALESCE(sum(
                CASE
                    WHEN (tl.payment_status = 'unpaid'::text) THEN tl.labor_cost
                    ELSE (0)::numeric
                END), (0)::numeric) AS labor_unpaid_amount
           FROM public.time_logs tl
          GROUP BY tl.project_id, tl.cost_code_id) la_unpaid ON (((la_unpaid.project_id = b.project_id) AND (la_unpaid.cost_code_id = b.cost_code_id))))
     LEFT JOIN non_labor_actuals nla ON (((nla.project_id = b.project_id) AND (nla.cost_code_id = b.cost_code_id) AND (nla.category = b.category))));


create or replace view "public"."project_budget_vs_actual_view" as  WITH budget AS (
         SELECT pb.project_id,
            pb.id AS project_budget_id,
            pb.labor_budget,
            pb.subs_budget,
            pb.materials_budget,
            pb.other_budget,
            (((COALESCE(pb.labor_budget, (0)::numeric) + COALESCE(pb.subs_budget, (0)::numeric)) + COALESCE(pb.materials_budget, (0)::numeric)) + COALESCE(pb.other_budget, (0)::numeric)) AS total_budget
           FROM public.project_budgets pb
        ), labor_actuals AS (
         SELECT tl.project_id,
            COALESCE(sum(tl.labor_cost), (0)::numeric) AS labor_actual,
            COALESCE(sum(
                CASE
                    WHEN (tl.payment_status = 'unpaid'::text) THEN tl.labor_cost
                    ELSE (0)::numeric
                END), (0)::numeric) AS labor_unpaid
           FROM public.time_logs tl
          GROUP BY tl.project_id
        ), costs_actuals AS (
         SELECT c.project_id,
            c.category,
            COALESCE(sum(c.amount), (0)::numeric) AS actual_amount,
            COALESCE(sum(
                CASE
                    WHEN (c.status = 'unpaid'::text) THEN c.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS unpaid_amount
           FROM public.costs c
          GROUP BY c.project_id, c.category
        ), costs_pivot AS (
         SELECT ca.project_id,
            COALESCE(sum(
                CASE
                    WHEN (ca.category = 'subs'::text) THEN ca.actual_amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS subs_actual,
            COALESCE(sum(
                CASE
                    WHEN (ca.category = 'subs'::text) THEN ca.unpaid_amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS subs_unpaid,
            COALESCE(sum(
                CASE
                    WHEN (ca.category = 'materials'::text) THEN ca.actual_amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS materials_actual,
            COALESCE(sum(
                CASE
                    WHEN (ca.category = 'materials'::text) THEN ca.unpaid_amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS materials_unpaid,
            COALESCE(sum(
                CASE
                    WHEN (ca.category = 'other'::text) THEN ca.actual_amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS other_actual,
            COALESCE(sum(
                CASE
                    WHEN (ca.category = 'other'::text) THEN ca.unpaid_amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS other_unpaid
           FROM costs_actuals ca
          GROUP BY ca.project_id
        ), revenue AS (
         SELECT e.project_id,
            COALESCE(sum(e.total_amount), (0)::numeric) AS total_revenue
           FROM public.estimates e
          WHERE (e.status = 'accepted'::text)
          GROUP BY e.project_id
        ), retention AS (
         SELECT i.project_id,
            COALESCE(sum(i.retention_amount), (0)::numeric) AS retention_held
           FROM public.invoices i
          WHERE (i.status <> 'void'::text)
          GROUP BY i.project_id
        )
 SELECT p.id AS project_id,
    p.project_name,
    b.project_budget_id,
    COALESCE(b.labor_budget, (0)::numeric) AS labor_budget,
    COALESCE(b.subs_budget, (0)::numeric) AS subs_budget,
    COALESCE(b.materials_budget, (0)::numeric) AS materials_budget,
    COALESCE(b.other_budget, (0)::numeric) AS other_budget,
    COALESCE(b.total_budget, (0)::numeric) AS total_budget,
    COALESCE(la.labor_actual, (0)::numeric) AS labor_actual,
    COALESCE(cp.subs_actual, (0)::numeric) AS subs_actual,
    COALESCE(cp.materials_actual, (0)::numeric) AS materials_actual,
    COALESCE(cp.other_actual, (0)::numeric) AS other_actual,
    COALESCE(la.labor_unpaid, (0)::numeric) AS labor_unpaid,
    COALESCE(cp.subs_unpaid, (0)::numeric) AS subs_unpaid,
    COALESCE(cp.materials_unpaid, (0)::numeric) AS materials_unpaid,
    COALESCE(cp.other_unpaid, (0)::numeric) AS other_unpaid,
    COALESCE(r.total_revenue, (0)::numeric) AS total_revenue,
    COALESCE(ret.retention_held, (0)::numeric) AS retention_held,
    (((COALESCE(la.labor_actual, (0)::numeric) + COALESCE(cp.subs_actual, (0)::numeric)) + COALESCE(cp.materials_actual, (0)::numeric)) + COALESCE(cp.other_actual, (0)::numeric)) AS total_actual_costs,
    (COALESCE(r.total_revenue, (0)::numeric) - (((COALESCE(la.labor_actual, (0)::numeric) + COALESCE(cp.subs_actual, (0)::numeric)) + COALESCE(cp.materials_actual, (0)::numeric)) + COALESCE(cp.other_actual, (0)::numeric))) AS profit,
    (((COALESCE(la.labor_unpaid, (0)::numeric) + COALESCE(cp.subs_unpaid, (0)::numeric)) + COALESCE(cp.materials_unpaid, (0)::numeric)) + COALESCE(cp.other_unpaid, (0)::numeric)) AS total_outstanding
   FROM (((((public.projects p
     LEFT JOIN budget b ON ((b.project_id = p.id)))
     LEFT JOIN labor_actuals la ON ((la.project_id = p.id)))
     LEFT JOIN costs_pivot cp ON ((cp.project_id = p.id)))
     LEFT JOIN revenue r ON ((r.project_id = p.id)))
     LEFT JOIN retention ret ON ((ret.project_id = p.id)));


create or replace view "public"."project_cost_summary_view" as  SELECT c.project_id,
    p.company_id,
    p.project_name,
    sum(c.amount) AS total_cost,
    sum(
        CASE
            WHEN (c.status = 'paid'::text) THEN c.amount
            ELSE (0)::numeric
        END) AS paid_cost,
    sum(
        CASE
            WHEN (c.status = 'unpaid'::text) THEN c.amount
            ELSE (0)::numeric
        END) AS unpaid_cost,
    sum(
        CASE
            WHEN (c.category = 'subs'::text) THEN c.amount
            ELSE (0)::numeric
        END) AS subs_cost,
    sum(
        CASE
            WHEN (c.category = 'materials'::text) THEN c.amount
            ELSE (0)::numeric
        END) AS materials_cost,
    sum(
        CASE
            WHEN (c.category = 'misc'::text) THEN c.amount
            ELSE (0)::numeric
        END) AS misc_cost,
    sum(
        CASE
            WHEN ((c.category = 'subs'::text) AND (c.status = 'unpaid'::text)) THEN c.amount
            ELSE (0)::numeric
        END) AS subs_unpaid,
    sum(
        CASE
            WHEN ((c.category = 'materials'::text) AND (c.status = 'unpaid'::text)) THEN c.amount
            ELSE (0)::numeric
        END) AS materials_unpaid,
    sum(
        CASE
            WHEN ((c.category = 'misc'::text) AND (c.status = 'unpaid'::text)) THEN c.amount
            ELSE (0)::numeric
        END) AS misc_unpaid,
    count(c.id) AS cost_entry_count
   FROM (public.costs c
     JOIN public.projects p ON ((c.project_id = p.id)))
  GROUP BY c.project_id, p.company_id, p.project_name;


create or replace view "public"."project_costs_view" as  WITH labor_costs AS (
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


create or replace view "public"."project_dashboard_view" as  SELECT p.id AS project_id,
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


create or replace view "public"."project_labor_costs_view" as  SELECT t.project_id,
    t.cost_code_id,
    cc.code AS cost_code,
    cc.name AS cost_code_name,
    sum(t.hours_worked) AS total_hours,
    sum(t.labor_cost) AS total_labor_cost,
    sum(
        CASE
            WHEN (t.payment_status = 'unpaid'::text) THEN t.labor_cost
            ELSE (0)::numeric
        END) AS unpaid_labor_cost,
    sum(
        CASE
            WHEN (t.payment_status = 'paid'::text) THEN t.labor_cost
            ELSE (0)::numeric
        END) AS paid_labor_cost,
    count(DISTINCT t.worker_id) AS worker_count,
    min(t.date) AS first_log_date,
    max(t.date) AS last_log_date
   FROM (public.time_logs t
     LEFT JOIN public.cost_codes cc ON ((cc.id = t.cost_code_id)))
  GROUP BY t.project_id, t.cost_code_id, cc.code, cc.name;


create or replace view "public"."project_labor_summary" as  SELECT p.id AS project_id,
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


create or replace view "public"."project_labor_summary_view" as  SELECT tl.project_id,
    tl.company_id,
    p.project_name,
    sum(tl.hours_worked) AS total_hours,
    sum(tl.labor_cost) AS total_labor_cost,
    sum(
        CASE
            WHEN (tl.payment_status = 'paid'::text) THEN tl.labor_cost
            ELSE (0)::numeric
        END) AS paid_labor_cost,
    sum(
        CASE
            WHEN (tl.payment_status = 'unpaid'::text) THEN tl.labor_cost
            ELSE (0)::numeric
        END) AS unpaid_labor_cost,
    sum(
        CASE
            WHEN (tl.payment_status = 'paid'::text) THEN tl.hours_worked
            ELSE (0)::numeric
        END) AS paid_hours,
    sum(
        CASE
            WHEN (tl.payment_status = 'unpaid'::text) THEN tl.hours_worked
            ELSE (0)::numeric
        END) AS unpaid_hours,
    count(DISTINCT tl.worker_id) AS worker_count,
    count(tl.id) AS time_log_count
   FROM (public.time_logs tl
     LEFT JOIN public.projects p ON ((tl.project_id = p.id)))
  GROUP BY tl.project_id, tl.company_id, p.project_name;


create or replace view "public"."project_revenue_summary_view" as  SELECT project_id,
    COALESCE(sum(
        CASE
            WHEN (status <> 'void'::text) THEN total_amount
            ELSE (0)::numeric
        END), (0)::numeric) AS billed_amount
   FROM public.invoices i
  GROUP BY project_id;


create or replace view "public"."project_schedule_view" as  SELECT id,
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


create or replace view "public"."sub_contract_summary" as  SELECT sc.id AS contract_id,
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


CREATE OR REPLACE FUNCTION public.tg_set_cost_item_company_id_from_block()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

BEGIN

  IF NEW.company_id IS NULL THEN

    SELECT sb.company_id

    INTO NEW.company_id

    FROM public.scope_blocks sb

    WHERE sb.id = NEW.scope_block_id;

  END IF;

  RETURN NEW;

END;

$function$
;

create or replace view "public"."time_logs_with_meta_view" as  SELECT tl.id,
    tl.worker_id,
    w.name AS worker_name,
    w.trade_id AS worker_trade_id,
    t.name AS worker_trade_name,
    tl.project_id,
    p.project_name,
    p.company_id,
    c.name AS company_name,
    tl.company_id AS override_company_id,
    tl.trade_id,
    tl.cost_code_id,
    cc.code AS cost_code,
    cc.name AS cost_code_name,
    tl.date,
    tl.hours_worked,
    tl.hourly_rate,
    tl.labor_cost,
    tl.payment_status,
    tl.paid_amount,
    tl.source_schedule_id,
    tl.notes,
    tl.last_synced_at,
    tl.created_at
   FROM (((((public.time_logs tl
     LEFT JOIN public.workers w ON ((w.id = tl.worker_id)))
     LEFT JOIN public.trades t ON ((t.id = tl.trade_id)))
     LEFT JOIN public.projects p ON ((p.id = tl.project_id)))
     LEFT JOIN public.companies c ON ((c.id = p.company_id)))
     LEFT JOIN public.cost_codes cc ON ((cc.id = tl.cost_code_id)));


create or replace view "public"."unpaid_labor_bills" as  SELECT p.company_id,
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


create or replace view "public"."unpaid_time_logs_available_for_pay_run" as  SELECT id,
    worker_id,
    date,
    project_id,
    company_id,
    trade_id,
    cost_code_id,
    hours_worked,
    hourly_rate,
    labor_cost,
    notes,
    payment_status,
    payment_id,
    paid_amount,
    source_schedule_id,
    last_synced_at,
    created_by,
    created_at,
    updated_at
   FROM public.time_logs tl
  WHERE ((payment_status = 'unpaid'::text) AND (NOT (EXISTS ( SELECT 1
           FROM (public.labor_pay_run_items lpri
             JOIN public.labor_pay_runs pr ON ((pr.id = lpri.pay_run_id)))
          WHERE ((lpri.time_log_id = tl.id) AND (pr.status <> 'cancelled'::text))))));


create or replace view "public"."work_order_schedule_view" as  SELECT wo.id AS work_order_id,
    wo.project_id,
    wo.sub_company_id,
    wo.budget_item_id,
    wo.title,
    wo.status,
    wo.scheduled_start,
    wo.scheduled_end,
    wo.original_amount,
    COALESCE(wo.approved_amount, wo.original_amount) AS contract_amount,
    s.id AS sub_shift_id,
    s.scheduled_date,
    s.scheduled_hours,
    s.notes AS schedule_notes
   FROM (public.work_orders wo
     LEFT JOIN public.sub_scheduled_shifts s ON ((s.work_order_id = wo.id)));


create or replace view "public"."work_schedule_grid_view" as  SELECT ws.id,
    ws.worker_id,
    w.name AS worker_name,
    w.trade_id AS worker_trade_id,
    t.name AS worker_trade_name,
    ws.project_id,
    p.project_name,
    ws.company_id,
    c.name AS company_name,
    ws.trade_id,
    ws.cost_code_id,
    cc.code AS cost_code,
    cc.name AS cost_code_name,
    ws.scheduled_date,
    ws.scheduled_hours,
    ws.status,
    ws.notes,
    ws.converted_to_timelog,
    ws.last_synced_at,
    ws.created_at,
    ws.updated_at
   FROM (((((public.work_schedules ws
     LEFT JOIN public.workers w ON ((w.id = ws.worker_id)))
     LEFT JOIN public.trades t ON ((t.id = ws.trade_id)))
     LEFT JOIN public.projects p ON ((p.id = ws.project_id)))
     LEFT JOIN public.companies c ON ((c.id = ws.company_id)))
     LEFT JOIN public.cost_codes cc ON ((cc.id = ws.cost_code_id)));


create or replace view "public"."worker_day_summary" as  SELECT dc.id AS day_card_id,
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


create or replace view "public"."workers_public" as  SELECT id,
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


create or replace view "public"."workforce_activity_feed" as  SELECT ('schedule:'::text || (ss.id)::text) AS id,
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



