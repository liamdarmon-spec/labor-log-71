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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'field_user'
);


--
-- Name: delete_old_archived_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_old_archived_logs() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.archived_daily_logs
  WHERE archived_at < NOW() - INTERVAL '24 hours';
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'field_user');
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;


--
-- Name: split_schedule_for_multi_project(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.split_schedule_for_multi_project(p_original_schedule_id uuid, p_time_log_entries jsonb) RETURNS TABLE(schedule_id uuid, time_log_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_original_schedule RECORD;
  v_entry JSONB;
  v_new_schedule_id UUID;
  v_new_timelog_id UUID;
  v_first_iteration BOOLEAN := true;
  v_existing_timelog_id UUID;
BEGIN
  -- Get the original schedule details
  SELECT * INTO v_original_schedule
  FROM scheduled_shifts
  WHERE id = p_original_schedule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original schedule not found';
  END IF;

  -- Disable triggers to prevent infinite recursion during split
  PERFORM set_config('session.split_in_progress', 'true', true);

  -- Log the original schedule state
  INSERT INTO schedule_modifications (
    original_schedule_id,
    modification_type,
    metadata
  ) VALUES (
    p_original_schedule_id,
    'split',
    jsonb_build_object(
      'original_hours', v_original_schedule.scheduled_hours,
      'original_project_id', v_original_schedule.project_id,
      'split_count', jsonb_array_length(p_time_log_entries)
    )
  );

  -- Process each time log entry
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_time_log_entries)
  LOOP
    IF v_first_iteration THEN
      -- Update the original schedule with the first entry
      UPDATE scheduled_shifts
      SET
        project_id = (v_entry->>'project_id')::UUID,
        scheduled_hours = (v_entry->>'hours')::NUMERIC,
        trade_id = (v_entry->>'trade_id')::UUID,
        notes = COALESCE(v_entry->>'notes', notes),
        status = 'split_modified',
        converted_to_timelog = true,
        updated_at = now(),
        last_synced_at = now()
      WHERE id = p_original_schedule_id
      RETURNING id INTO v_new_schedule_id;

      -- Check if a time log already exists for this schedule
      SELECT id INTO v_existing_timelog_id
      FROM daily_logs
      WHERE daily_logs.schedule_id = v_new_schedule_id;

      IF v_existing_timelog_id IS NOT NULL THEN
        -- Update existing time log
        UPDATE daily_logs
        SET
          project_id = (v_entry->>'project_id')::UUID,
          hours_worked = (v_entry->>'hours')::NUMERIC,
          trade_id = (v_entry->>'trade_id')::UUID,
          notes = v_entry->>'notes',
          last_synced_at = now()
        WHERE id = v_existing_timelog_id
        RETURNING id INTO v_new_timelog_id;
      ELSE
        -- Create new time log
        INSERT INTO daily_logs (
          schedule_id,
          worker_id,
          project_id,
          trade_id,
          hours_worked,
          notes,
          date,
          last_synced_at
        ) VALUES (
          v_new_schedule_id,
          v_original_schedule.worker_id,
          (v_entry->>'project_id')::UUID,
          (v_entry->>'trade_id')::UUID,
          (v_entry->>'hours')::NUMERIC,
          v_entry->>'notes',
          v_original_schedule.scheduled_date,
          now()
        )
        RETURNING id INTO v_new_timelog_id;
      END IF;

      v_first_iteration := false;
    ELSE
      -- Create new schedule entries for additional projects
      INSERT INTO scheduled_shifts (
        worker_id,
        project_id,
        trade_id,
        scheduled_date,
        scheduled_hours,
        notes,
        status,
        created_by,
        converted_to_timelog,
        last_synced_at
      ) VALUES (
        v_original_schedule.worker_id,
        (v_entry->>'project_id')::UUID,
        (v_entry->>'trade_id')::UUID,
        v_original_schedule.scheduled_date,
        (v_entry->>'hours')::NUMERIC,
        v_entry->>'notes',
        'split_created',
        v_original_schedule.created_by,
        true,
        now()
      )
      RETURNING id INTO v_new_schedule_id;

      -- Create corresponding time log for new schedule
      INSERT INTO daily_logs (
        schedule_id,
        worker_id,
        project_id,
        trade_id,
        hours_worked,
        notes,
        date,
        last_synced_at
      ) VALUES (
        v_new_schedule_id,
        v_original_schedule.worker_id,
        (v_entry->>'project_id')::UUID,
        (v_entry->>'trade_id')::UUID,
        (v_entry->>'hours')::NUMERIC,
        v_entry->>'notes',
        v_original_schedule.scheduled_date,
        now()
      )
      RETURNING id INTO v_new_timelog_id;

      -- Log the new schedule creation
      INSERT INTO schedule_modifications (
        original_schedule_id,
        new_schedule_id,
        modification_type,
        metadata
      ) VALUES (
        p_original_schedule_id,
        v_new_schedule_id,
        'split',
        jsonb_build_object(
          'project_id', (v_entry->>'project_id')::UUID,
          'hours', (v_entry->>'hours')::NUMERIC
        )
      );
    END IF;

    RETURN QUERY SELECT v_new_schedule_id, v_new_timelog_id;
  END LOOP;

  -- Re-enable triggers
  PERFORM set_config('session.split_in_progress', 'false', true);
END;
$$;


--
-- Name: sync_schedule_to_timelog(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_schedule_to_timelog() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Skip if split operation is in progress
  IF coalesce(current_setting('session.split_in_progress', true), 'false') = 'true' THEN
    RETURN NEW;
  END IF;

  -- Only auto-sync if the scheduled date has already passed
  -- Manual conversion can happen anytime (converted_to_timelog flag)
  IF NEW.scheduled_date < CURRENT_DATE OR (NEW.converted_to_timelog = true AND OLD.converted_to_timelog = false) THEN
    -- Check if a time log already exists for this schedule
    IF EXISTS (SELECT 1 FROM public.daily_logs WHERE schedule_id = NEW.id) THEN
      -- Update existing time log with schedule changes
      UPDATE public.daily_logs
      SET
        worker_id = NEW.worker_id,
        project_id = NEW.project_id,
        trade_id = NEW.trade_id,
        hours_worked = NEW.scheduled_hours,
        notes = NEW.notes,
        date = NEW.scheduled_date,
        last_synced_at = now()
      WHERE schedule_id = NEW.id
      AND (
        worker_id IS DISTINCT FROM NEW.worker_id OR
        project_id IS DISTINCT FROM NEW.project_id OR
        trade_id IS DISTINCT FROM NEW.trade_id OR
        hours_worked IS DISTINCT FROM NEW.scheduled_hours OR
        notes IS DISTINCT FROM NEW.notes OR
        date IS DISTINCT FROM NEW.scheduled_date
      );
    ELSIF NEW.converted_to_timelog = true THEN
      -- Create new time log if marked as converted but doesn't exist
      INSERT INTO public.daily_logs (
        schedule_id,
        worker_id,
        project_id,
        trade_id,
        hours_worked,
        notes,
        date,
        last_synced_at
      ) VALUES (
        NEW.id,
        NEW.worker_id,
        NEW.project_id,
        NEW.trade_id,
        NEW.scheduled_hours,
        NEW.notes,
        NEW.scheduled_date,
        now()
      );
    END IF;
    
    -- Update schedule status
    IF NEW.converted_to_timelog = true AND NEW.status != 'converted' THEN
      NEW.status := 'converted';
    ELSIF NEW.converted_to_timelog = true THEN
      NEW.status := 'synced';
    END IF;
    
    NEW.last_synced_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: sync_timelog_to_schedule(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_timelog_to_schedule() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  schedule_date date;
BEGIN
  -- Skip if split operation is in progress
  IF coalesce(current_setting('session.split_in_progress', true), 'false') = 'true' THEN
    RETURN NEW;
  END IF;

  -- Only process if there's a linked schedule
  IF NEW.schedule_id IS NOT NULL THEN
    -- Get the scheduled date
    SELECT scheduled_date INTO schedule_date
    FROM public.scheduled_shifts
    WHERE id = NEW.schedule_id;
    
    -- Only sync if schedule exists and date has passed (prevents same-day auto-sync)
    IF schedule_date IS NOT NULL AND schedule_date < CURRENT_DATE THEN
      -- Update corresponding schedule with time log changes
      UPDATE public.scheduled_shifts
      SET
        worker_id = NEW.worker_id,
        project_id = NEW.project_id,
        trade_id = NEW.trade_id,
        scheduled_hours = NEW.hours_worked,
        notes = NEW.notes,
        scheduled_date = NEW.date,
        status = 'synced',
        last_synced_at = now()
      WHERE id = NEW.schedule_id
      AND (
        worker_id IS DISTINCT FROM NEW.worker_id OR
        project_id IS DISTINCT FROM NEW.project_id OR
        trade_id IS DISTINCT FROM NEW.trade_id OR
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


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: archived_daily_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archived_daily_logs (
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
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: daily_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_logs (
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
    CONSTRAINT daily_logs_hours_worked_check CHECK ((hours_worked > (0)::numeric))
);


--
-- Name: estimate_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estimate_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    estimate_id uuid NOT NULL,
    description text NOT NULL,
    quantity numeric(12,2) DEFAULT 1 NOT NULL,
    unit text DEFAULT 'ea'::text,
    unit_price numeric(12,2) DEFAULT 0 NOT NULL,
    line_total numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    category text
);


--
-- Name: estimates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estimates (
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

CREATE TABLE public.invitations (
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

CREATE TABLE public.invoice_items (
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

CREATE TABLE public.invoices (
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
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
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
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
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
-- Name: workers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workers (
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
-- Name: project_activity_view; Type: VIEW; Schema: public; Owner: -
--

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
-- Name: project_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    labor_budget numeric(12,2) DEFAULT 0,
    subs_budget numeric(12,2) DEFAULT 0,
    materials_budget numeric(12,2) DEFAULT 0,
    other_budget numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_costs_view; Type: VIEW; Schema: public; Owner: -
--

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
-- Name: scheduled_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_shifts (
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
    CONSTRAINT scheduled_shifts_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text, 'synced'::text, 'converted'::text, 'split_modified'::text, 'split_created'::text])))
);


--
-- Name: project_schedule_view; Type: VIEW; Schema: public; Owner: -
--

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
-- Name: project_todos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_todos (
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
-- Name: schedule_modifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_modifications (
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
-- Name: sub_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sub_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sub_id uuid NOT NULL,
    project_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: sub_scheduled_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sub_scheduled_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sub_id uuid NOT NULL,
    project_id uuid NOT NULL,
    scheduled_date date NOT NULL,
    scheduled_hours numeric(5,2) DEFAULT 8,
    notes text,
    status text DEFAULT 'planned'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: subs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    company_name text,
    trade text,
    phone text,
    email text,
    default_rate numeric(12,2) DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: trades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'field_user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: workers_public; Type: VIEW; Schema: public; Owner: -
--

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
-- Name: archived_daily_logs archived_daily_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_daily_logs
    ADD CONSTRAINT archived_daily_logs_pkey PRIMARY KEY (id);


--
-- Name: companies companies_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_name_key UNIQUE (name);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: daily_logs daily_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_pkey PRIMARY KEY (id);


--
-- Name: estimate_items estimate_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_items
    ADD CONSTRAINT estimate_items_pkey PRIMARY KEY (id);


--
-- Name: estimates estimates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimates
    ADD CONSTRAINT estimates_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_email_key UNIQUE (email);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: project_budgets project_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budgets
    ADD CONSTRAINT project_budgets_pkey PRIMARY KEY (id);


--
-- Name: project_budgets project_budgets_project_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budgets
    ADD CONSTRAINT project_budgets_project_id_key UNIQUE (project_id);


--
-- Name: project_todos project_todos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_todos
    ADD CONSTRAINT project_todos_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: schedule_modifications schedule_modifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_modifications
    ADD CONSTRAINT schedule_modifications_pkey PRIMARY KEY (id);


--
-- Name: scheduled_shifts scheduled_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_shifts
    ADD CONSTRAINT scheduled_shifts_pkey PRIMARY KEY (id);


--
-- Name: sub_logs sub_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_logs
    ADD CONSTRAINT sub_logs_pkey PRIMARY KEY (id);


--
-- Name: sub_scheduled_shifts sub_scheduled_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_scheduled_shifts
    ADD CONSTRAINT sub_scheduled_shifts_pkey PRIMARY KEY (id);


--
-- Name: subs subs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subs
    ADD CONSTRAINT subs_pkey PRIMARY KEY (id);


--
-- Name: trades trades_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_name_key UNIQUE (name);


--
-- Name: trades trades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: workers workers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workers
    ADD CONSTRAINT workers_pkey PRIMARY KEY (id);


--
-- Name: idx_daily_logs_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_logs_date ON public.daily_logs USING btree (date);


--
-- Name: idx_daily_logs_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_logs_project ON public.daily_logs USING btree (project_id);


--
-- Name: idx_daily_logs_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_daily_logs_schedule_id ON public.daily_logs USING btree (schedule_id) WHERE (schedule_id IS NOT NULL);


--
-- Name: idx_daily_logs_trade_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_logs_trade_id ON public.daily_logs USING btree (trade_id);


--
-- Name: idx_daily_logs_worker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_logs_worker ON public.daily_logs USING btree (worker_id);


--
-- Name: idx_estimate_items_estimate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimate_items_estimate_id ON public.estimate_items USING btree (estimate_id);


--
-- Name: idx_estimates_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimates_project_id ON public.estimates USING btree (project_id);


--
-- Name: idx_estimates_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimates_status ON public.estimates USING btree (status);


--
-- Name: idx_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_email ON public.invitations USING btree (email);


--
-- Name: idx_invitations_used; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_used ON public.invitations USING btree (used);


--
-- Name: idx_invoice_items_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id);


--
-- Name: idx_invoices_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_project_id ON public.invoices USING btree (project_id);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);


--
-- Name: idx_payments_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_company ON public.payments USING btree (company_id);


--
-- Name: idx_payments_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_dates ON public.payments USING btree (start_date, end_date);


--
-- Name: idx_project_todos_assigned_worker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_todos_assigned_worker_id ON public.project_todos USING btree (assigned_worker_id);


--
-- Name: idx_project_todos_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_todos_due_date ON public.project_todos USING btree (due_date);


--
-- Name: idx_project_todos_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_todos_project_id ON public.project_todos USING btree (project_id);


--
-- Name: idx_project_todos_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_todos_status ON public.project_todos USING btree (status);


--
-- Name: idx_project_todos_task_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_todos_task_type ON public.project_todos USING btree (task_type);


--
-- Name: idx_schedule_modifications_new; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_modifications_new ON public.schedule_modifications USING btree (new_schedule_id);


--
-- Name: idx_schedule_modifications_original; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_modifications_original ON public.schedule_modifications USING btree (original_schedule_id);


--
-- Name: idx_scheduled_shifts_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_shifts_date ON public.scheduled_shifts USING btree (scheduled_date);


--
-- Name: idx_scheduled_shifts_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_shifts_project ON public.scheduled_shifts USING btree (project_id);


--
-- Name: idx_scheduled_shifts_worker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_shifts_worker ON public.scheduled_shifts USING btree (worker_id);


--
-- Name: idx_sub_logs_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_logs_date ON public.sub_logs USING btree (date);


--
-- Name: idx_sub_logs_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_logs_project_id ON public.sub_logs USING btree (project_id);


--
-- Name: idx_sub_logs_sub_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_logs_sub_id ON public.sub_logs USING btree (sub_id);


--
-- Name: idx_sub_scheduled_shifts_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_scheduled_shifts_date ON public.sub_scheduled_shifts USING btree (scheduled_date);


--
-- Name: idx_sub_scheduled_shifts_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_scheduled_shifts_project_id ON public.sub_scheduled_shifts USING btree (project_id);


--
-- Name: idx_sub_scheduled_shifts_sub_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_scheduled_shifts_sub_id ON public.sub_scheduled_shifts USING btree (sub_id);


--
-- Name: idx_workers_trade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workers_trade ON public.workers USING btree (trade_id);


--
-- Name: scheduled_shifts sync_schedule_to_timelog_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_schedule_to_timelog_trigger BEFORE UPDATE ON public.scheduled_shifts FOR EACH ROW EXECUTE FUNCTION public.sync_schedule_to_timelog();


--
-- Name: daily_logs sync_timelog_to_schedule_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_timelog_to_schedule_trigger BEFORE UPDATE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.sync_timelog_to_schedule();


--
-- Name: scheduled_shifts trigger_sync_schedule_to_timelog; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_schedule_to_timelog BEFORE UPDATE ON public.scheduled_shifts FOR EACH ROW EXECUTE FUNCTION public.sync_schedule_to_timelog();


--
-- Name: daily_logs trigger_sync_timelog_to_schedule; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_timelog_to_schedule BEFORE UPDATE ON public.daily_logs FOR EACH ROW WHEN ((new.schedule_id IS NOT NULL)) EXECUTE FUNCTION public.sync_timelog_to_schedule();


--
-- Name: estimates update_estimates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON public.estimates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices update_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payments update_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_budgets update_project_budgets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_budgets_updated_at BEFORE UPDATE ON public.project_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_todos update_project_todos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_todos_updated_at BEFORE UPDATE ON public.project_todos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scheduled_shifts update_scheduled_shifts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scheduled_shifts_updated_at BEFORE UPDATE ON public.scheduled_shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sub_scheduled_shifts update_sub_scheduled_shifts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sub_scheduled_shifts_updated_at BEFORE UPDATE ON public.sub_scheduled_shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subs update_subs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subs_updated_at BEFORE UPDATE ON public.subs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workers update_workers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON public.workers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: daily_logs daily_logs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: daily_logs daily_logs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: daily_logs daily_logs_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.scheduled_shifts(id) ON DELETE SET NULL;


--
-- Name: daily_logs daily_logs_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id);


--
-- Name: daily_logs daily_logs_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.workers(id) ON DELETE CASCADE;


--
-- Name: estimate_items estimate_items_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_items
    ADD CONSTRAINT estimate_items_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES public.estimates(id) ON DELETE CASCADE;


--
-- Name: estimates estimates_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimates
    ADD CONSTRAINT estimates_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: payments payments_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: project_budgets project_budgets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budgets
    ADD CONSTRAINT project_budgets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_todos project_todos_assigned_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_todos
    ADD CONSTRAINT project_todos_assigned_worker_id_fkey FOREIGN KEY (assigned_worker_id) REFERENCES public.workers(id);


--
-- Name: project_todos project_todos_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_todos
    ADD CONSTRAINT project_todos_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: scheduled_shifts scheduled_shifts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_shifts
    ADD CONSTRAINT scheduled_shifts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: scheduled_shifts scheduled_shifts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_shifts
    ADD CONSTRAINT scheduled_shifts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: scheduled_shifts scheduled_shifts_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_shifts
    ADD CONSTRAINT scheduled_shifts_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id) ON DELETE SET NULL;


--
-- Name: scheduled_shifts scheduled_shifts_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_shifts
    ADD CONSTRAINT scheduled_shifts_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.workers(id) ON DELETE CASCADE;


--
-- Name: sub_logs sub_logs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_logs
    ADD CONSTRAINT sub_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: sub_logs sub_logs_sub_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_logs
    ADD CONSTRAINT sub_logs_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES public.subs(id) ON DELETE CASCADE;


--
-- Name: sub_scheduled_shifts sub_scheduled_shifts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_scheduled_shifts
    ADD CONSTRAINT sub_scheduled_shifts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: sub_scheduled_shifts sub_scheduled_shifts_sub_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_scheduled_shifts
    ADD CONSTRAINT sub_scheduled_shifts_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES public.subs(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: workers workers_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workers
    ADD CONSTRAINT workers_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id) ON DELETE SET NULL;


--
-- Name: estimate_items Anyone can delete estimate items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete estimate items" ON public.estimate_items FOR DELETE USING (true);


--
-- Name: estimates Anyone can delete estimates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete estimates" ON public.estimates FOR DELETE USING (true);


--
-- Name: invoice_items Anyone can delete invoice items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete invoice items" ON public.invoice_items FOR DELETE USING (true);


--
-- Name: invoices Anyone can delete invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete invoices" ON public.invoices FOR DELETE USING (true);


--
-- Name: project_budgets Anyone can delete project budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete project budgets" ON public.project_budgets FOR DELETE USING (true);


--
-- Name: sub_logs Anyone can delete sub logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete sub logs" ON public.sub_logs FOR DELETE USING (true);


--
-- Name: sub_scheduled_shifts Anyone can delete sub schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete sub schedules" ON public.sub_scheduled_shifts FOR DELETE USING (true);


--
-- Name: subs Anyone can delete subs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete subs" ON public.subs FOR DELETE USING (true);


--
-- Name: project_todos Anyone can delete todos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete todos" ON public.project_todos FOR DELETE USING (true);


--
-- Name: estimate_items Anyone can insert estimate items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert estimate items" ON public.estimate_items FOR INSERT WITH CHECK (true);


--
-- Name: estimates Anyone can insert estimates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert estimates" ON public.estimates FOR INSERT WITH CHECK (true);


--
-- Name: invoice_items Anyone can insert invoice items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert invoice items" ON public.invoice_items FOR INSERT WITH CHECK (true);


--
-- Name: invoices Anyone can insert invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert invoices" ON public.invoices FOR INSERT WITH CHECK (true);


--
-- Name: project_budgets Anyone can insert project budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert project budgets" ON public.project_budgets FOR INSERT WITH CHECK (true);


--
-- Name: sub_logs Anyone can insert sub logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert sub logs" ON public.sub_logs FOR INSERT WITH CHECK (true);


--
-- Name: sub_scheduled_shifts Anyone can insert sub schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert sub schedules" ON public.sub_scheduled_shifts FOR INSERT WITH CHECK (true);


--
-- Name: subs Anyone can insert subs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert subs" ON public.subs FOR INSERT WITH CHECK (true);


--
-- Name: project_todos Anyone can insert todos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert todos" ON public.project_todos FOR INSERT WITH CHECK (true);


--
-- Name: estimate_items Anyone can update estimate items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update estimate items" ON public.estimate_items FOR UPDATE USING (true);


--
-- Name: estimates Anyone can update estimates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update estimates" ON public.estimates FOR UPDATE USING (true);


--
-- Name: invoice_items Anyone can update invoice items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update invoice items" ON public.invoice_items FOR UPDATE USING (true);


--
-- Name: invoices Anyone can update invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update invoices" ON public.invoices FOR UPDATE USING (true);


--
-- Name: project_budgets Anyone can update project budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update project budgets" ON public.project_budgets FOR UPDATE USING (true);


--
-- Name: sub_logs Anyone can update sub logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update sub logs" ON public.sub_logs FOR UPDATE USING (true);


--
-- Name: sub_scheduled_shifts Anyone can update sub schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update sub schedules" ON public.sub_scheduled_shifts FOR UPDATE USING (true);


--
-- Name: subs Anyone can update subs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update subs" ON public.subs FOR UPDATE USING (true);


--
-- Name: project_todos Anyone can update todos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update todos" ON public.project_todos FOR UPDATE USING (true);


--
-- Name: estimate_items Anyone can view estimate items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view estimate items" ON public.estimate_items FOR SELECT USING (true);


--
-- Name: estimates Anyone can view estimates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view estimates" ON public.estimates FOR SELECT USING (true);


--
-- Name: invoice_items Anyone can view invoice items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view invoice items" ON public.invoice_items FOR SELECT USING (true);


--
-- Name: invoices Anyone can view invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view invoices" ON public.invoices FOR SELECT USING (true);


--
-- Name: project_budgets Anyone can view project budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view project budgets" ON public.project_budgets FOR SELECT USING (true);


--
-- Name: sub_logs Anyone can view sub logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view sub logs" ON public.sub_logs FOR SELECT USING (true);


--
-- Name: sub_scheduled_shifts Anyone can view sub schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view sub schedules" ON public.sub_scheduled_shifts FOR SELECT USING (true);


--
-- Name: subs Anyone can view subs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view subs" ON public.subs FOR SELECT USING (true);


--
-- Name: project_todos Anyone can view todos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view todos" ON public.project_todos FOR SELECT USING (true);


--
-- Name: estimate_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

--
-- Name: estimates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: project_budgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: project_todos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_todos ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sub_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_scheduled_shifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sub_scheduled_shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: subs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subs ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


