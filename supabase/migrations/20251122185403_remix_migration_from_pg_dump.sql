CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role'
      AND n.nspname = 'public'
  ) THEN
    DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM (
        'admin',
        'field_user'
      );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
  END IF;
END
$$;


--
-- Name: auto_assign_labor_cost_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_assign_labor_cost_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trade_id UUID;
  v_labor_cost_code_id UUID;
BEGIN
  -- Only auto-assign if cost_code_id is null
  IF NEW.cost_code_id IS NULL THEN
    -- Get the worker's trade_id
    SELECT trade_id INTO v_trade_id
    FROM workers
    WHERE id = NEW.worker_id;

    IF v_trade_id IS NOT NULL THEN
      -- Find the Labor cost code for this trade
      SELECT default_labor_cost_code_id INTO v_labor_cost_code_id
      FROM trades
      WHERE id = v_trade_id;

      -- Assign it if found
      IF v_labor_cost_code_id IS NOT NULL THEN
        NEW.cost_code_id := v_labor_cost_code_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: auto_assign_sub_cost_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_assign_sub_cost_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trade_id UUID;
  v_sub_cost_code_id UUID;
BEGIN
  -- Only auto-assign if cost_code_id is null
  IF NEW.cost_code_id IS NULL THEN
    -- Get the sub's trade_id
    SELECT trade_id INTO v_trade_id
    FROM subs
    WHERE id = NEW.sub_id;

    IF v_trade_id IS NOT NULL THEN
      -- Find the Sub cost code for this trade
      SELECT default_sub_cost_code_id INTO v_sub_cost_code_id
      FROM trades
      WHERE id = v_trade_id;

      -- Assign it if found
      IF v_sub_cost_code_id IS NOT NULL THEN
        NEW.cost_code_id := v_sub_cost_code_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: auto_create_past_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_create_past_logs() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- For day_cards that are in the past and have scheduled_hours but no logged_hours
  UPDATE day_cards
  SET 
    logged_hours = scheduled_hours,
    lifecycle_status = 'logged'
  WHERE 
    date < CURRENT_DATE
    AND scheduled_hours > 0
    AND (logged_hours IS NULL OR logged_hours = 0)
    AND lifecycle_status = 'scheduled';
    
  -- Copy allocations from day_card_jobs to time_log_allocations for these
  INSERT INTO time_log_allocations (day_card_id, project_id, trade_id, cost_code_id, hours)
  SELECT 
    dcj.day_card_id,
    dcj.project_id,
    dcj.trade_id,
    dcj.cost_code_id,
    dcj.hours
  FROM day_card_jobs dcj
  JOIN day_cards dc ON dc.id = dcj.day_card_id
  WHERE 
    dc.date < CURRENT_DATE
    AND dc.lifecycle_status = 'logged'
    AND NOT EXISTS (
      SELECT 1 FROM time_log_allocations tla 
      WHERE tla.day_card_id = dcj.day_card_id
    );
END;
$$;


--
-- Name: delete_old_archived_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.delete_old_archived_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'field_user')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
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
-- Name: log_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.log_activity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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
    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by),
    CASE
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('changes', row_to_json(NEW) - row_to_json(OLD))
      ELSE '{}'::jsonb
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: migrate_to_day_cards(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.migrate_to_day_cards() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_worker_id UUID;
  v_date DATE;
  v_day_card_id UUID;
  v_scheduled_total NUMERIC;
  v_logged_total NUMERIC;
  v_worker_rate NUMERIC;
  v_status TEXT;
  v_pay_status TEXT;
BEGIN
  -- Get all unique worker+date combinations from both schedules and logs
  FOR v_worker_id, v_date IN 
    SELECT DISTINCT worker_id, scheduled_date as date
    FROM scheduled_shifts
    UNION
    SELECT DISTINCT worker_id, date
    FROM daily_logs
  LOOP
    -- Calculate scheduled hours for this worker+date
    SELECT COALESCE(SUM(scheduled_hours), 0)
    INTO v_scheduled_total
    FROM scheduled_shifts
    WHERE worker_id = v_worker_id AND scheduled_date = v_date;
    
    -- Calculate logged hours for this worker+date
    SELECT COALESCE(SUM(hours_worked), 0)
    INTO v_logged_total
    FROM daily_logs
    WHERE worker_id = v_worker_id AND date = v_date;
    
    -- Get worker's hourly rate
    SELECT hourly_rate
    INTO v_worker_rate
    FROM workers
    WHERE id = v_worker_id;
    
    -- Determine status based on date and logged hours
    IF v_logged_total > 0 THEN
      v_status := 'logged';
    ELSIF v_date < CURRENT_DATE THEN
      v_status := 'scheduled';
    ELSE
      v_status := 'scheduled';
    END IF;
    
    -- Determine pay status from daily_logs
    SELECT CASE 
      WHEN payment_status = 'paid' THEN 'paid'
      WHEN payment_status = 'pending' THEN 'pending'
      ELSE 'unpaid'
    END
    INTO v_pay_status
    FROM daily_logs
    WHERE worker_id = v_worker_id AND date = v_date
    LIMIT 1;
    
    IF v_pay_status IS NULL THEN
      v_pay_status := 'unpaid';
    END IF;
    
    -- Create or update the DayCard
    INSERT INTO day_cards (
      worker_id,
      date,
      scheduled_hours,
      logged_hours,
      status,
      pay_rate,
      pay_status
    ) VALUES (
      v_worker_id,
      v_date,
      v_scheduled_total,
      v_logged_total,
      v_status,
      v_worker_rate,
      v_pay_status
    )
    ON CONFLICT (worker_id, date) DO UPDATE
    SET
      scheduled_hours = EXCLUDED.scheduled_hours,
      logged_hours = EXCLUDED.logged_hours,
      status = EXCLUDED.status,
      pay_rate = EXCLUDED.pay_rate,
      pay_status = EXCLUDED.pay_status,
      updated_at = now()
    RETURNING id INTO v_day_card_id;
    
    -- Migrate job splits from scheduled_shifts
    INSERT INTO day_card_jobs (day_card_id, project_id, trade_id, cost_code_id, hours)
    SELECT 
      v_day_card_id,
      project_id,
      trade_id,
      cost_code_id,
      scheduled_hours
    FROM scheduled_shifts
    WHERE worker_id = v_worker_id AND scheduled_date = v_date
    ON CONFLICT DO NOTHING;
    
    -- Migrate job splits from daily_logs (if different from schedules)
    INSERT INTO day_card_jobs (day_card_id, project_id, trade_id, cost_code_id, hours, notes)
    SELECT 
      v_day_card_id,
      project_id,
      trade_id,
      cost_code_id,
      hours_worked,
      notes
    FROM daily_logs
    WHERE worker_id = v_worker_id AND date = v_date
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Migration complete. DayCards created from existing schedules and logs.';
END;
$$;


--
-- Name: split_schedule_for_multi_project(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.split_schedule_for_multi_project(p_original_schedule_id uuid, p_time_log_entries jsonb) RETURNS TABLE(schedule_id uuid, time_log_id uuid)
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
  v_cost_code_id UUID;
BEGIN
  -- Get the original schedule details INCLUDING cost_code_id
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
    -- Extract cost_code_id from entry or use original
    v_cost_code_id := COALESCE((v_entry->>'cost_code_id')::UUID, v_original_schedule.cost_code_id);

    IF v_first_iteration THEN
      -- Update the original schedule with the first entry
      UPDATE scheduled_shifts
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

      -- Check if a time log already exists for this schedule
      SELECT id INTO v_existing_timelog_id
      FROM daily_logs
      WHERE daily_logs.schedule_id = v_new_schedule_id;

      IF v_existing_timelog_id IS NOT NULL THEN
        -- Update existing time log INCLUDING cost_code_id
        UPDATE daily_logs
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
        -- Create new time log INCLUDING cost_code_id
        INSERT INTO daily_logs (
          schedule_id,
          worker_id,
          project_id,
          trade_id,
          cost_code_id,
          hours_worked,
          notes,
          date,
          last_synced_at
        ) VALUES (
          v_new_schedule_id,
          v_original_schedule.worker_id,
          (v_entry->>'project_id')::UUID,
          (v_entry->>'trade_id')::UUID,
          v_cost_code_id,
          (v_entry->>'hours')::NUMERIC,
          v_entry->>'notes',
          v_original_schedule.scheduled_date,
          now()
        )
        RETURNING id INTO v_new_timelog_id;
      END IF;

      v_first_iteration := false;
    ELSE
      -- Create new schedule entries for additional projects INCLUDING cost_code_id
      INSERT INTO scheduled_shifts (
        worker_id,
        project_id,
        trade_id,
        cost_code_id,
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
        v_cost_code_id,
        v_original_schedule.scheduled_date,
        (v_entry->>'hours')::NUMERIC,
        v_entry->>'notes',
        'split_created',
        v_original_schedule.created_by,
        true,
        now()
      )
      RETURNING id INTO v_new_schedule_id;

      -- Create corresponding time log for new schedule INCLUDING cost_code_id
      INSERT INTO daily_logs (
        schedule_id,
        worker_id,
        project_id,
        trade_id,
        cost_code_id,
        hours_worked,
        notes,
        date,
        last_synced_at
      ) VALUES (
        v_new_schedule_id,
        v_original_schedule.worker_id,
        (v_entry->>'project_id')::UUID,
        (v_entry->>'trade_id')::UUID,
        v_cost_code_id,
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
-- Name: sync_estimate_to_budget(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_estimate_to_budget(p_estimate_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_project_id UUID;
  v_labor_total NUMERIC := 0;
  v_subs_total NUMERIC := 0;
  v_materials_total NUMERIC := 0;
  v_other_total NUMERIC := 0;
BEGIN
  -- Get project_id from estimate
  SELECT project_id INTO v_project_id
  FROM estimates
  WHERE id = p_estimate_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Estimate not found';
  END IF;

  -- Clear is_budget_source from all other estimates for this project
  UPDATE estimates
  SET is_budget_source = false
  WHERE project_id = v_project_id
    AND id != p_estimate_id;

  -- Mark this estimate as budget source and accepted
  UPDATE estimates
  SET 
    is_budget_source = true,
    status = 'accepted',
    updated_at = now()
  WHERE id = p_estimate_id;

  -- Calculate category totals from estimate items
  SELECT 
    COALESCE(SUM(CASE WHEN category = 'Labor' THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category IN ('Subs', 'Subcontractors') THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'Materials' THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category IN ('Allowance', 'Other') THEN line_total ELSE 0 END), 0)
  INTO v_labor_total, v_subs_total, v_materials_total, v_other_total
  FROM estimate_items
  WHERE estimate_id = p_estimate_id;

  -- Update or insert project_budgets
  INSERT INTO project_budgets (
    project_id,
    labor_budget,
    subs_budget,
    materials_budget,
    other_budget,
    baseline_estimate_id
  ) VALUES (
    v_project_id,
    v_labor_total,
    v_subs_total,
    v_materials_total,
    v_other_total,
    p_estimate_id
  )
  ON CONFLICT (project_id) DO UPDATE SET
    labor_budget = EXCLUDED.labor_budget,
    subs_budget = EXCLUDED.subs_budget,
    materials_budget = EXCLUDED.materials_budget,
    other_budget = EXCLUDED.other_budget,
    baseline_estimate_id = EXCLUDED.baseline_estimate_id,
    updated_at = now();

  -- Delete old budget lines for this project
  DELETE FROM project_budget_lines
  WHERE project_id = v_project_id;

  -- Insert new budget lines aggregated by category + cost_code
  INSERT INTO project_budget_lines (
    project_id,
    cost_code_id,
    category,
    description,
    budget_amount,
    budget_hours,
    is_allowance,
    source_estimate_id
  )
  SELECT 
    v_project_id,
    cost_code_id,
    CASE 
      WHEN category = 'Labor' THEN 'labor'
      WHEN category IN ('Subs', 'Subcontractors') THEN 'subs'
      WHEN category = 'Materials' THEN 'materials'
      ELSE 'other'
    END as normalized_category,
    string_agg(DISTINCT description, ' | ') as description,
    SUM(line_total) as budget_amount,
    SUM(planned_hours) as budget_hours,
    bool_and(is_allowance) as is_allowance,
    p_estimate_id
  FROM estimate_items
  WHERE estimate_id = p_estimate_id
  GROUP BY cost_code_id, normalized_category;

END;
$$;


--
-- Name: sync_payment_to_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_payment_to_logs() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- When a payment is created, mark all related logs as paid
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


--
-- Name: sync_schedule_to_timelog(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_schedule_to_timelog() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Skip if split operation is in progress
  IF coalesce(current_setting('session.split_in_progress', true), 'false') = 'true' THEN
    RETURN NEW;
  END IF;

  -- CRITICAL: Only auto-sync if ALL these conditions are met:
  -- 1. The scheduled date has ALREADY PASSED (not today, must be in the past)
  -- 2. There's no existing time log for this schedule
  -- This prevents future schedules from auto-creating time logs
  IF NEW.scheduled_date < CURRENT_DATE THEN
    -- Check if a time log already exists for this schedule
    IF EXISTS (SELECT 1 FROM public.daily_logs WHERE schedule_id = NEW.id) THEN
      -- Update existing time log with schedule changes
      UPDATE public.daily_logs
      SET
        worker_id = NEW.worker_id,
        project_id = NEW.project_id,
        trade_id = NEW.trade_id,
        cost_code_id = NEW.cost_code_id,
        hours_worked = NEW.scheduled_hours,
        notes = NEW.notes,
        date = NEW.scheduled_date,
        last_synced_at = now()
      WHERE schedule_id = NEW.id
      AND (
        worker_id IS DISTINCT FROM NEW.worker_id OR
        project_id IS DISTINCT FROM NEW.project_id OR
        trade_id IS DISTINCT FROM NEW.trade_id OR
        cost_code_id IS DISTINCT FROM NEW.cost_code_id OR
        hours_worked IS DISTINCT FROM NEW.scheduled_hours OR
        notes IS DISTINCT FROM NEW.notes OR
        date IS DISTINCT FROM NEW.scheduled_date
      );
    ELSE
      -- Only create new time log if date has passed
      INSERT INTO public.daily_logs (
        schedule_id,
        worker_id,
        project_id,
        trade_id,
        cost_code_id,
        hours_worked,
        notes,
        date,
        last_synced_at
      ) VALUES (
        NEW.id,
        NEW.worker_id,
        NEW.project_id,
        NEW.trade_id,
        NEW.cost_code_id,
        NEW.scheduled_hours,
        NEW.notes,
        NEW.scheduled_date,
        now()
      );
    END IF;
    
    -- Update schedule status
    NEW.status := 'synced';
    NEW.last_synced_at := now();
  ELSIF NEW.converted_to_timelog = true AND OLD.converted_to_timelog = false THEN
    -- MANUAL CONVERSION: User explicitly converted this schedule to a time log
    -- This allows converting future schedules manually
    IF NOT EXISTS (SELECT 1 FROM public.daily_logs WHERE schedule_id = NEW.id) THEN
      INSERT INTO public.daily_logs (
        schedule_id,
        worker_id,
        project_id,
        trade_id,
        cost_code_id,
        hours_worked,
        notes,
        date,
        last_synced_at
      ) VALUES (
        NEW.id,
        NEW.worker_id,
        NEW.project_id,
        NEW.trade_id,
        NEW.cost_code_id,
        NEW.scheduled_hours,
        NEW.notes,
        NEW.scheduled_date,
        now()
      );
    END IF;
    
    NEW.status := 'converted';
    NEW.last_synced_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: sync_timelog_to_schedule(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_timelog_to_schedule() RETURNS trigger
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
      -- Update corresponding schedule with time log changes INCLUDING cost_code_id
      UPDATE public.scheduled_shifts
      SET
        worker_id = NEW.worker_id,
        project_id = NEW.project_id,
        trade_id = NEW.trade_id,
        cost_code_id = NEW.cost_code_id,
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


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
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
-- Name: company_payroll_summary; Type: VIEW; Schema: public; Owner: -
--

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
-- Name: cost_code_actuals; Type: VIEW; Schema: public; Owner: -
--

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
-- Name: day_cards_with_details; Type: VIEW; Schema: public; Owner: -
--

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
-- Name: labor_actuals_by_cost_code; Type: VIEW; Schema: public; Owner: -
--

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
-- Name: payment_labor_summary; Type: VIEW; Schema: public; Owner: -
--

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
-- Name: project_labor_summary; Type: VIEW; Schema: public; Owner: -
--

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
-- Name: sub_contract_summary; Type: VIEW; Schema: public; Owner: -
--

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
-- Name: unpaid_labor_bills; Type: VIEW; Schema: public; Owner: -
--

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
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_roles(
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'field_user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: worker_day_summary; Type: VIEW; Schema: public; Owner: -
--

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
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: archived_daily_logs archived_daily_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_daily_logs
    ADD CONSTRAINT archived_daily_logs_pkey PRIMARY KEY (id);


--
-- Name: bid_invitations bid_invitations_bid_package_id_sub_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bid_invitations
    ADD CONSTRAINT bid_invitations_bid_package_id_sub_id_key UNIQUE (bid_package_id, sub_id);


--
-- Name: bid_invitations bid_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bid_invitations
    ADD CONSTRAINT bid_invitations_pkey PRIMARY KEY (id);


--
-- Name: bid_packages bid_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bid_packages
    ADD CONSTRAINT bid_packages_pkey PRIMARY KEY (id);


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
-- Name: cost_codes cost_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_codes
    ADD CONSTRAINT cost_codes_code_key UNIQUE (code);


--
-- Name: cost_codes cost_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_codes
    ADD CONSTRAINT cost_codes_pkey PRIMARY KEY (id);


--
-- Name: daily_logs daily_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_pkey PRIMARY KEY (id);


--
-- Name: day_card_jobs day_card_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_card_jobs
    ADD CONSTRAINT day_card_jobs_pkey PRIMARY KEY (id);


--
-- Name: day_cards day_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_cards
    ADD CONSTRAINT day_cards_pkey PRIMARY KEY (id);


--
-- Name: day_cards day_cards_worker_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_cards
    ADD CONSTRAINT day_cards_worker_id_date_key UNIQUE (worker_id, date);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


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
-- Name: material_receipts material_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_receipts
    ADD CONSTRAINT material_receipts_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: project_budget_lines project_budget_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budget_lines
    ADD CONSTRAINT project_budget_lines_pkey PRIMARY KEY (id);


--
-- Name: project_budget_lines project_budget_lines_project_cost_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budget_lines
    ADD CONSTRAINT project_budget_lines_project_cost_code_unique UNIQUE (project_id, cost_code_id);


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
-- Name: project_subcontracts project_subcontracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_subcontracts
    ADD CONSTRAINT project_subcontracts_pkey PRIMARY KEY (id);


--
-- Name: project_subcontracts project_subcontracts_project_id_sub_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_subcontracts
    ADD CONSTRAINT project_subcontracts_project_id_sub_id_key UNIQUE (project_id, sub_id);


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
-- Name: proposal_line_groups proposal_line_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_line_groups
    ADD CONSTRAINT proposal_line_groups_pkey PRIMARY KEY (id);


--
-- Name: proposal_line_overrides proposal_line_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_line_overrides
    ADD CONSTRAINT proposal_line_overrides_pkey PRIMARY KEY (id);


--
-- Name: proposal_section_items proposal_section_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_section_items
    ADD CONSTRAINT proposal_section_items_pkey PRIMARY KEY (id);


--
-- Name: proposal_sections proposal_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_sections
    ADD CONSTRAINT proposal_sections_pkey PRIMARY KEY (id);


--
-- Name: proposals proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_pkey PRIMARY KEY (id);


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
-- Name: sub_bids sub_bids_bid_package_id_sub_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_bids
    ADD CONSTRAINT sub_bids_bid_package_id_sub_id_key UNIQUE (bid_package_id, sub_id);


--
-- Name: sub_bids sub_bids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_bids
    ADD CONSTRAINT sub_bids_pkey PRIMARY KEY (id);


--
-- Name: sub_compliance_documents sub_compliance_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_compliance_documents
    ADD CONSTRAINT sub_compliance_documents_pkey PRIMARY KEY (id);


--
-- Name: sub_contracts sub_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_contracts
    ADD CONSTRAINT sub_contracts_pkey PRIMARY KEY (id);


--
-- Name: sub_invoices sub_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_invoices
    ADD CONSTRAINT sub_invoices_pkey PRIMARY KEY (id);


--
-- Name: sub_logs sub_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_logs
    ADD CONSTRAINT sub_logs_pkey PRIMARY KEY (id);


--
-- Name: sub_payments sub_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_payments
    ADD CONSTRAINT sub_payments_pkey PRIMARY KEY (id);


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
-- Name: time_log_allocations time_log_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_log_allocations
    ADD CONSTRAINT time_log_allocations_pkey PRIMARY KEY (id);


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
-- Name: idx_activity_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_activity_log_created ON public.activity_log USING btree (created_at DESC);


--
-- Name: idx_activity_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON public.activity_log USING btree (entity_type, entity_id);


--
-- Name: idx_bid_invitations_package; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bid_invitations_package ON public.bid_invitations USING btree (bid_package_id);


--
-- Name: idx_bid_packages_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bid_packages_project ON public.bid_packages USING btree (project_id);


--
-- Name: idx_cost_codes_trade_category_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_cost_codes_trade_category_unique ON public.cost_codes USING btree (trade_id, category) WHERE ((is_active = true) AND (trade_id IS NOT NULL));


--
-- Name: idx_cost_codes_trade_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cost_codes_trade_id ON public.cost_codes USING btree (trade_id);


--
-- Name: idx_daily_logs_cost_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_logs_cost_code ON public.daily_logs USING btree (cost_code_id);


--
-- Name: idx_daily_logs_cost_code_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_logs_cost_code_id ON public.daily_logs USING btree (cost_code_id);


--
-- Name: idx_daily_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_logs_created_at ON public.daily_logs USING btree (created_at DESC);


--
-- Name: idx_daily_logs_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON public.daily_logs USING btree (date);


--
-- Name: idx_daily_logs_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_logs_payment_status ON public.daily_logs USING btree (project_id, payment_status) WHERE (payment_status = 'unpaid'::text);


--
-- Name: idx_daily_logs_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_logs_project ON public.daily_logs USING btree (project_id);


--
-- Name: idx_daily_logs_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_daily_logs_schedule_id ON public.daily_logs USING btree (schedule_id) WHERE (schedule_id IS NOT NULL);


--
-- Name: idx_daily_logs_trade_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_logs_trade_id ON public.daily_logs USING btree (trade_id);


--
-- Name: idx_daily_logs_worker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_logs_worker ON public.daily_logs USING btree (worker_id);


--
-- Name: idx_daily_logs_worker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_daily_logs_worker_id ON public.daily_logs USING btree (worker_id);


--
-- Name: idx_day_card_jobs_day_card; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_day_card_jobs_day_card ON public.day_card_jobs USING btree (day_card_id);


--
-- Name: idx_day_card_jobs_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_day_card_jobs_project ON public.day_card_jobs USING btree (project_id);


--
-- Name: idx_day_cards_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_day_cards_date ON public.day_cards USING btree (date);


--
-- Name: idx_day_cards_pay_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_day_cards_pay_status ON public.day_cards USING btree (pay_status);


--
-- Name: idx_day_cards_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_day_cards_status ON public.day_cards USING btree (status);


--
-- Name: idx_day_cards_worker_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_day_cards_worker_date ON public.day_cards USING btree (worker_id, date);


--
-- Name: idx_documents_ai_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_documents_ai_status ON public.documents USING btree (ai_status);


--
-- Name: idx_documents_cost_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_documents_cost_code ON public.documents USING btree (cost_code_id);


--
-- Name: idx_documents_doc_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON public.documents USING btree (doc_type);


--
-- Name: idx_documents_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents USING btree (owner_type, owner_id);


--
-- Name: idx_documents_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_documents_project ON public.documents USING btree (project_id);


--
-- Name: idx_documents_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents USING btree (document_type);


--
-- Name: idx_documents_uploaded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON public.documents USING btree (uploaded_at);


--
-- Name: idx_estimate_items_cost_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_estimate_items_cost_code ON public.estimate_items USING btree (cost_code_id);


--
-- Name: idx_estimate_items_estimate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id ON public.estimate_items USING btree (estimate_id);


--
-- Name: idx_estimate_items_trade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_estimate_items_trade ON public.estimate_items USING btree (trade_id);


--
-- Name: idx_estimates_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_estimates_project_id ON public.estimates USING btree (project_id);


--
-- Name: idx_estimates_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_estimates_status ON public.estimates USING btree (status);


--
-- Name: idx_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations USING btree (email);


--
-- Name: idx_invitations_used; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_invitations_used ON public.invitations USING btree (used);


--
-- Name: idx_invoice_items_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id);


--
-- Name: idx_invoices_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices USING btree (project_id);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices USING btree (status);


--
-- Name: idx_material_receipts_cost_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_material_receipts_cost_code ON public.material_receipts USING btree (cost_code_id);


--
-- Name: idx_material_receipts_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_material_receipts_project ON public.material_receipts USING btree (project_id);


--
-- Name: idx_payments_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_payments_company ON public.payments USING btree (company_id);


--
-- Name: idx_payments_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_payments_company_id ON public.payments USING btree (company_id);


--
-- Name: idx_payments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments USING btree (created_at DESC);


--
-- Name: idx_payments_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_payments_dates ON public.payments USING btree (start_date, end_date);


--
-- Name: idx_project_budget_lines_cost_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_project_budget_lines_cost_code ON public.project_budget_lines USING btree (cost_code_id);


--
-- Name: idx_project_budget_lines_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_project_budget_lines_project ON public.project_budget_lines USING btree (project_id);


--
-- Name: idx_project_subcontracts_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_project_subcontracts_project ON public.project_subcontracts USING btree (project_id);


--
-- Name: idx_project_subcontracts_sub; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_project_subcontracts_sub ON public.project_subcontracts USING btree (sub_id);


--
-- Name: idx_project_todos_assigned_worker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_project_todos_assigned_worker_id ON public.project_todos USING btree (assigned_worker_id);


--
-- Name: idx_project_todos_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_project_todos_due_date ON public.project_todos USING btree (due_date);


--
-- Name: idx_project_todos_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_project_todos_project_id ON public.project_todos USING btree (project_id);


--
-- Name: idx_project_todos_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_project_todos_status ON public.project_todos USING btree (status);


--
-- Name: idx_project_todos_task_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_project_todos_task_type ON public.project_todos USING btree (task_type);


--
-- Name: idx_proposal_line_groups_proposal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_proposal_line_groups_proposal_id ON public.proposal_line_groups USING btree (proposal_id);


--
-- Name: idx_proposal_line_overrides_proposal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_proposal_line_overrides_proposal_id ON public.proposal_line_overrides USING btree (proposal_id);


--
-- Name: idx_proposal_section_items_estimate_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_proposal_section_items_estimate_item_id ON public.proposal_section_items USING btree (estimate_item_id);


--
-- Name: idx_proposal_section_items_section_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_proposal_section_items_section_id ON public.proposal_section_items USING btree (proposal_section_id);


--
-- Name: idx_proposal_sections_proposal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_proposal_sections_proposal_id ON public.proposal_sections USING btree (proposal_id);


--
-- Name: idx_proposals_estimate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_proposals_estimate_id ON public.proposals USING btree (primary_estimate_id);


--
-- Name: idx_proposals_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_proposals_project_id ON public.proposals USING btree (project_id);


--
-- Name: idx_proposals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals USING btree (status);


--
-- Name: idx_schedule_modifications_new; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_schedule_modifications_new ON public.schedule_modifications USING btree (new_schedule_id);


--
-- Name: idx_schedule_modifications_original; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_schedule_modifications_original ON public.schedule_modifications USING btree (original_schedule_id);


--
-- Name: idx_scheduled_shifts_cost_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_cost_code ON public.scheduled_shifts USING btree (cost_code_id);


--
-- Name: idx_scheduled_shifts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_created_at ON public.scheduled_shifts USING btree (created_at DESC);


--
-- Name: idx_scheduled_shifts_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_date ON public.scheduled_shifts USING btree (scheduled_date);


--
-- Name: idx_scheduled_shifts_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_project ON public.scheduled_shifts USING btree (project_id);


--
-- Name: idx_scheduled_shifts_worker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_worker ON public.scheduled_shifts USING btree (worker_id);


--
-- Name: idx_scheduled_shifts_worker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_worker_id ON public.scheduled_shifts USING btree (worker_id);


--
-- Name: idx_sub_bids_package; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_bids_package ON public.sub_bids USING btree (bid_package_id);


--
-- Name: idx_sub_compliance_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_compliance_expiry ON public.sub_compliance_documents USING btree (expiry_date);


--
-- Name: idx_sub_compliance_sub_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_compliance_sub_id ON public.sub_compliance_documents USING btree (sub_id);


--
-- Name: idx_sub_contracts_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_contracts_project ON public.sub_contracts USING btree (project_id);


--
-- Name: idx_sub_contracts_sub; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_contracts_sub ON public.sub_contracts USING btree (sub_id);


--
-- Name: idx_sub_invoices_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_invoices_project ON public.sub_invoices USING btree (project_id);


--
-- Name: idx_sub_invoices_sub; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_invoices_sub ON public.sub_invoices USING btree (sub_id);


--
-- Name: idx_sub_logs_cost_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_logs_cost_code ON public.sub_logs USING btree (cost_code_id);


--
-- Name: idx_sub_logs_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_logs_date ON public.sub_logs USING btree (date);


--
-- Name: idx_sub_logs_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_logs_project_id ON public.sub_logs USING btree (project_id);


--
-- Name: idx_sub_logs_sub_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_logs_sub_id ON public.sub_logs USING btree (sub_id);


--
-- Name: idx_sub_payments_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_payments_contract ON public.sub_payments USING btree (project_subcontract_id);


--
-- Name: idx_sub_payments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_payments_date ON public.sub_payments USING btree (payment_date);


--
-- Name: idx_sub_payments_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_payments_invoice ON public.sub_payments USING btree (sub_invoice_id);


--
-- Name: idx_sub_scheduled_shifts_cost_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_scheduled_shifts_cost_code ON public.sub_scheduled_shifts USING btree (cost_code_id);


--
-- Name: idx_sub_scheduled_shifts_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_scheduled_shifts_date ON public.sub_scheduled_shifts USING btree (scheduled_date);


--
-- Name: idx_sub_scheduled_shifts_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_scheduled_shifts_project_id ON public.sub_scheduled_shifts USING btree (project_id);


--
-- Name: idx_sub_scheduled_shifts_sub_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sub_scheduled_shifts_sub_id ON public.sub_scheduled_shifts USING btree (sub_id);


--
-- Name: idx_time_log_allocations_cost_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_time_log_allocations_cost_code ON public.time_log_allocations USING btree (cost_code_id);


--
-- Name: idx_time_log_allocations_day_card; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_time_log_allocations_day_card ON public.time_log_allocations USING btree (day_card_id);


--
-- Name: idx_time_log_allocations_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_time_log_allocations_project ON public.time_log_allocations USING btree (project_id);


--
-- Name: idx_trades_default_labor_cost_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trades_default_labor_cost_code ON public.trades USING btree (default_labor_cost_code_id);


--
-- Name: idx_trades_default_material_cost_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_trades_default_material_cost_code ON public.trades USING btree (default_material_cost_code_id);


--
-- Name: idx_workers_trade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_workers_trade ON public.workers USING btree (trade_id);


--
-- Name: day_cards_with_details _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.day_cards_with_details AS
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

CREATE OR REPLACE VIEW public.sub_contract_summary AS
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

CREATE OR REPLACE VIEW public.worker_day_summary AS
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


--
-- Name: daily_logs auto_assign_labor_cost_code_trigger; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS auto_assign_labor_cost_code_trigger ON public.daily_logs;
CREATE TRIGGER auto_assign_labor_cost_code_trigger BEFORE INSERT ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.auto_assign_labor_cost_code();


--
-- Name: sub_logs auto_assign_sub_cost_code_trigger; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS auto_assign_sub_cost_code_trigger ON public.sub_logs;
CREATE TRIGGER auto_assign_sub_cost_code_trigger BEFORE INSERT ON public.sub_logs FOR EACH ROW EXECUTE FUNCTION public.auto_assign_sub_cost_code();


--
-- Name: day_cards day_cards_activity_log; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS day_cards_activity_log ON public.day_cards;
CREATE TRIGGER day_cards_activity_log AFTER INSERT OR DELETE OR UPDATE ON public.day_cards FOR EACH ROW EXECUTE FUNCTION public.log_activity('log');


--
-- Name: payments payments_activity_log; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS payments_activity_log ON public.payments;
CREATE TRIGGER payments_activity_log AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.log_activity('payment');


--
-- Name: payments sync_payment_to_logs_trigger; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS sync_payment_to_logs_trigger ON public.payments;
CREATE TRIGGER sync_payment_to_logs_trigger AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.sync_payment_to_logs();


--
-- Name: scheduled_shifts sync_schedule_to_timelog_trigger; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS sync_schedule_to_timelog_trigger ON public.scheduled_shifts;
CREATE TRIGGER sync_schedule_to_timelog_trigger BEFORE UPDATE ON public.scheduled_shifts FOR EACH ROW EXECUTE FUNCTION public.sync_schedule_to_timelog();


--
-- Name: daily_logs sync_timelog_to_schedule_trigger; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS sync_timelog_to_schedule_trigger ON public.daily_logs;
CREATE TRIGGER sync_timelog_to_schedule_trigger AFTER UPDATE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.sync_timelog_to_schedule();


--
-- Name: daily_logs trigger_auto_assign_labor_cost_code; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trigger_auto_assign_labor_cost_code ON public.daily_logs;
CREATE TRIGGER trigger_auto_assign_labor_cost_code BEFORE INSERT ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.auto_assign_labor_cost_code();


--
-- Name: sub_logs trigger_auto_assign_sub_cost_code; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trigger_auto_assign_sub_cost_code ON public.sub_logs;
CREATE TRIGGER trigger_auto_assign_sub_cost_code BEFORE INSERT ON public.sub_logs FOR EACH ROW EXECUTE FUNCTION public.auto_assign_sub_cost_code();


--
-- Name: scheduled_shifts trigger_sync_schedule_to_timelog; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trigger_sync_schedule_to_timelog ON public.scheduled_shifts;
CREATE TRIGGER trigger_sync_schedule_to_timelog BEFORE UPDATE ON public.scheduled_shifts FOR EACH ROW EXECUTE FUNCTION public.sync_schedule_to_timelog();


--
-- Name: daily_logs trigger_sync_timelog_to_schedule; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trigger_sync_timelog_to_schedule ON public.daily_logs;
CREATE TRIGGER trigger_sync_timelog_to_schedule BEFORE UPDATE ON public.daily_logs FOR EACH ROW WHEN ((new.schedule_id IS NOT NULL)) EXECUTE FUNCTION public.sync_timelog_to_schedule();


--
-- Name: bid_packages update_bid_packages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_bid_packages_updated_at ON public.bid_packages;
CREATE TRIGGER update_bid_packages_updated_at BEFORE UPDATE ON public.bid_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cost_codes update_cost_codes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_cost_codes_updated_at ON public.cost_codes;
CREATE TRIGGER update_cost_codes_updated_at BEFORE UPDATE ON public.cost_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: day_card_jobs update_day_card_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_day_card_jobs_updated_at ON public.day_card_jobs;
CREATE TRIGGER update_day_card_jobs_updated_at BEFORE UPDATE ON public.day_card_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: day_cards update_day_cards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_day_cards_updated_at ON public.day_cards;
CREATE TRIGGER update_day_cards_updated_at BEFORE UPDATE ON public.day_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: documents update_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: estimates update_estimates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_estimates_updated_at ON public.estimates;
CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON public.estimates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices update_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: material_receipts update_material_receipts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_material_receipts_updated_at ON public.material_receipts;
CREATE TRIGGER update_material_receipts_updated_at BEFORE UPDATE ON public.material_receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payments update_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_budget_lines update_project_budget_lines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_project_budget_lines_updated_at ON public.project_budget_lines;
CREATE TRIGGER update_project_budget_lines_updated_at BEFORE UPDATE ON public.project_budget_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_budgets update_project_budgets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_project_budgets_updated_at ON public.project_budgets;
CREATE TRIGGER update_project_budgets_updated_at BEFORE UPDATE ON public.project_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_subcontracts update_project_subcontracts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_project_subcontracts_updated_at ON public.project_subcontracts;
CREATE TRIGGER update_project_subcontracts_updated_at BEFORE UPDATE ON public.project_subcontracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_todos update_project_todos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_project_todos_updated_at ON public.project_todos;
CREATE TRIGGER update_project_todos_updated_at BEFORE UPDATE ON public.project_todos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: proposals update_proposals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_proposals_updated_at ON public.proposals;
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scheduled_shifts update_scheduled_shifts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_scheduled_shifts_updated_at ON public.scheduled_shifts;
CREATE TRIGGER update_scheduled_shifts_updated_at BEFORE UPDATE ON public.scheduled_shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sub_compliance_documents update_sub_compliance_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_sub_compliance_documents_updated_at ON public.sub_compliance_documents;
CREATE TRIGGER update_sub_compliance_documents_updated_at BEFORE UPDATE ON public.sub_compliance_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sub_contracts update_sub_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_sub_contracts_updated_at ON public.sub_contracts;
CREATE TRIGGER update_sub_contracts_updated_at BEFORE UPDATE ON public.sub_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sub_invoices update_sub_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_sub_invoices_updated_at ON public.sub_invoices;
CREATE TRIGGER update_sub_invoices_updated_at BEFORE UPDATE ON public.sub_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sub_scheduled_shifts update_sub_scheduled_shifts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_sub_scheduled_shifts_updated_at ON public.sub_scheduled_shifts;
CREATE TRIGGER update_sub_scheduled_shifts_updated_at BEFORE UPDATE ON public.sub_scheduled_shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subs update_subs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_subs_updated_at ON public.subs;
CREATE TRIGGER update_subs_updated_at BEFORE UPDATE ON public.subs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: time_log_allocations update_time_log_allocations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_time_log_allocations_updated_at ON public.time_log_allocations;
CREATE TRIGGER update_time_log_allocations_updated_at BEFORE UPDATE ON public.time_log_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workers update_workers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_workers_updated_at ON public.workers;
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON public.workers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_log activity_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id);


--
-- Name: bid_invitations bid_invitations_bid_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bid_invitations
    ADD CONSTRAINT bid_invitations_bid_package_id_fkey FOREIGN KEY (bid_package_id) REFERENCES public.bid_packages(id) ON DELETE CASCADE;


--
-- Name: bid_invitations bid_invitations_sub_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bid_invitations
    ADD CONSTRAINT bid_invitations_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES public.subs(id) ON DELETE CASCADE;


--
-- Name: bid_packages bid_packages_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bid_packages
    ADD CONSTRAINT bid_packages_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: cost_codes cost_codes_default_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_codes
    ADD CONSTRAINT cost_codes_default_trade_id_fkey FOREIGN KEY (default_trade_id) REFERENCES public.trades(id) ON DELETE SET NULL;


--
-- Name: cost_codes cost_codes_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_codes
    ADD CONSTRAINT cost_codes_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id) ON DELETE CASCADE;


--
-- Name: daily_logs daily_logs_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;


--
-- Name: daily_logs daily_logs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: daily_logs daily_logs_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;


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
-- Name: day_card_jobs day_card_jobs_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_card_jobs
    ADD CONSTRAINT day_card_jobs_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id);


--
-- Name: day_card_jobs day_card_jobs_day_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_card_jobs
    ADD CONSTRAINT day_card_jobs_day_card_id_fkey FOREIGN KEY (day_card_id) REFERENCES public.day_cards(id) ON DELETE CASCADE;


--
-- Name: day_card_jobs day_card_jobs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_card_jobs
    ADD CONSTRAINT day_card_jobs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: day_card_jobs day_card_jobs_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_card_jobs
    ADD CONSTRAINT day_card_jobs_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id);


--
-- Name: day_cards day_cards_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_cards
    ADD CONSTRAINT day_cards_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: day_cards day_cards_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_cards
    ADD CONSTRAINT day_cards_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: day_cards day_cards_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_cards
    ADD CONSTRAINT day_cards_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.workers(id) ON DELETE CASCADE;


--
-- Name: documents documents_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;


--
-- Name: documents documents_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: estimate_items estimate_items_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_items
    ADD CONSTRAINT estimate_items_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;


--
-- Name: estimate_items estimate_items_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_items
    ADD CONSTRAINT estimate_items_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES public.estimates(id) ON DELETE CASCADE;


--
-- Name: estimate_items estimate_items_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_items
    ADD CONSTRAINT estimate_items_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id) ON DELETE SET NULL;


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
-- Name: material_receipts material_receipts_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_receipts
    ADD CONSTRAINT material_receipts_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;


--
-- Name: material_receipts material_receipts_linked_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_receipts
    ADD CONSTRAINT material_receipts_linked_document_id_fkey FOREIGN KEY (linked_document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: material_receipts material_receipts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_receipts
    ADD CONSTRAINT material_receipts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: payments payments_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: project_budget_lines project_budget_lines_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budget_lines
    ADD CONSTRAINT project_budget_lines_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;


--
-- Name: project_budget_lines project_budget_lines_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budget_lines
    ADD CONSTRAINT project_budget_lines_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_budget_lines project_budget_lines_source_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budget_lines
    ADD CONSTRAINT project_budget_lines_source_estimate_id_fkey FOREIGN KEY (source_estimate_id) REFERENCES public.estimates(id) ON DELETE SET NULL;


--
-- Name: project_budgets project_budgets_baseline_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budgets
    ADD CONSTRAINT project_budgets_baseline_estimate_id_fkey FOREIGN KEY (baseline_estimate_id) REFERENCES public.estimates(id) ON DELETE SET NULL;


--
-- Name: project_budgets project_budgets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budgets
    ADD CONSTRAINT project_budgets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_subcontracts project_subcontracts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_subcontracts
    ADD CONSTRAINT project_subcontracts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_subcontracts project_subcontracts_sub_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_subcontracts
    ADD CONSTRAINT project_subcontracts_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES public.subs(id) ON DELETE CASCADE;


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
-- Name: proposal_line_groups proposal_line_groups_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_line_groups
    ADD CONSTRAINT proposal_line_groups_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES public.estimates(id) ON DELETE SET NULL;


--
-- Name: proposal_line_groups proposal_line_groups_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_line_groups
    ADD CONSTRAINT proposal_line_groups_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE;


--
-- Name: proposal_line_overrides proposal_line_overrides_estimate_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_line_overrides
    ADD CONSTRAINT proposal_line_overrides_estimate_line_id_fkey FOREIGN KEY (estimate_line_id) REFERENCES public.estimate_items(id) ON DELETE CASCADE;


--
-- Name: proposal_line_overrides proposal_line_overrides_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_line_overrides
    ADD CONSTRAINT proposal_line_overrides_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE;


--
-- Name: proposal_section_items proposal_section_items_estimate_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_section_items
    ADD CONSTRAINT proposal_section_items_estimate_item_id_fkey FOREIGN KEY (estimate_item_id) REFERENCES public.estimate_items(id) ON DELETE CASCADE;


--
-- Name: proposal_section_items proposal_section_items_proposal_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_section_items
    ADD CONSTRAINT proposal_section_items_proposal_section_id_fkey FOREIGN KEY (proposal_section_id) REFERENCES public.proposal_sections(id) ON DELETE CASCADE;


--
-- Name: proposal_sections proposal_sections_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_sections
    ADD CONSTRAINT proposal_sections_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE;


--
-- Name: proposals proposals_primary_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_primary_estimate_id_fkey FOREIGN KEY (primary_estimate_id) REFERENCES public.estimates(id) ON DELETE SET NULL;


--
-- Name: proposals proposals_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: scheduled_shifts scheduled_shifts_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_shifts
    ADD CONSTRAINT scheduled_shifts_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;


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
-- Name: sub_bids sub_bids_bid_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_bids
    ADD CONSTRAINT sub_bids_bid_package_id_fkey FOREIGN KEY (bid_package_id) REFERENCES public.bid_packages(id) ON DELETE CASCADE;


--
-- Name: sub_bids sub_bids_sub_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_bids
    ADD CONSTRAINT sub_bids_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES public.subs(id) ON DELETE CASCADE;


--
-- Name: sub_compliance_documents sub_compliance_documents_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_compliance_documents
    ADD CONSTRAINT sub_compliance_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: sub_compliance_documents sub_compliance_documents_sub_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_compliance_documents
    ADD CONSTRAINT sub_compliance_documents_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES public.subs(id) ON DELETE CASCADE;


--
-- Name: sub_contracts sub_contracts_linked_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_contracts
    ADD CONSTRAINT sub_contracts_linked_document_id_fkey FOREIGN KEY (linked_document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: sub_contracts sub_contracts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_contracts
    ADD CONSTRAINT sub_contracts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: sub_contracts sub_contracts_sub_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_contracts
    ADD CONSTRAINT sub_contracts_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES public.subs(id) ON DELETE CASCADE;


--
-- Name: sub_invoices sub_invoices_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_invoices
    ADD CONSTRAINT sub_invoices_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.sub_contracts(id) ON DELETE SET NULL;


--
-- Name: sub_invoices sub_invoices_linked_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_invoices
    ADD CONSTRAINT sub_invoices_linked_document_id_fkey FOREIGN KEY (linked_document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: sub_invoices sub_invoices_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_invoices
    ADD CONSTRAINT sub_invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: sub_invoices sub_invoices_sub_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_invoices
    ADD CONSTRAINT sub_invoices_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES public.subs(id) ON DELETE CASCADE;


--
-- Name: sub_logs sub_logs_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_logs
    ADD CONSTRAINT sub_logs_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;


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
-- Name: sub_payments sub_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_payments
    ADD CONSTRAINT sub_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: sub_payments sub_payments_payment_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_payments
    ADD CONSTRAINT sub_payments_payment_batch_id_fkey FOREIGN KEY (payment_batch_id) REFERENCES public.payments(id) ON DELETE SET NULL;


--
-- Name: sub_payments sub_payments_project_subcontract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_payments
    ADD CONSTRAINT sub_payments_project_subcontract_id_fkey FOREIGN KEY (project_subcontract_id) REFERENCES public.sub_contracts(id) ON DELETE CASCADE;


--
-- Name: sub_payments sub_payments_sub_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_payments
    ADD CONSTRAINT sub_payments_sub_invoice_id_fkey FOREIGN KEY (sub_invoice_id) REFERENCES public.sub_invoices(id) ON DELETE SET NULL;


--
-- Name: sub_scheduled_shifts sub_scheduled_shifts_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_scheduled_shifts
    ADD CONSTRAINT sub_scheduled_shifts_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;


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
-- Name: subs subs_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subs
    ADD CONSTRAINT subs_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id);


--
-- Name: time_log_allocations time_log_allocations_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_log_allocations
    ADD CONSTRAINT time_log_allocations_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL;


--
-- Name: time_log_allocations time_log_allocations_day_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_log_allocations
    ADD CONSTRAINT time_log_allocations_day_card_id_fkey FOREIGN KEY (day_card_id) REFERENCES public.day_cards(id) ON DELETE CASCADE;


--
-- Name: time_log_allocations time_log_allocations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_log_allocations
    ADD CONSTRAINT time_log_allocations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: time_log_allocations time_log_allocations_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_log_allocations
    ADD CONSTRAINT time_log_allocations_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id) ON DELETE SET NULL;


--
-- Name: trades trades_default_labor_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_default_labor_cost_code_id_fkey FOREIGN KEY (default_labor_cost_code_id) REFERENCES public.cost_codes(id);


--
-- Name: trades trades_default_material_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_default_material_cost_code_id_fkey FOREIGN KEY (default_material_cost_code_id) REFERENCES public.cost_codes(id);


--
-- Name: trades trades_default_sub_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_default_sub_cost_code_id_fkey FOREIGN KEY (default_sub_cost_code_id) REFERENCES public.cost_codes(id);


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
-- Name: bid_invitations Anyone can delete bid invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete bid invitations" ON public.bid_invitations FOR DELETE USING (true);


--
-- Name: bid_packages Anyone can delete bid packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete bid packages" ON public.bid_packages FOR DELETE USING (true);


--
-- Name: project_budget_lines Anyone can delete budget lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete budget lines" ON public.project_budget_lines FOR DELETE USING (true);


--
-- Name: cost_codes Anyone can delete cost codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete cost codes" ON public.cost_codes FOR DELETE USING (true);


--
-- Name: day_card_jobs Anyone can delete day card jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete day card jobs" ON public.day_card_jobs FOR DELETE USING (true);


--
-- Name: day_cards Anyone can delete day cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete day cards" ON public.day_cards FOR DELETE USING (true);


--
-- Name: documents Anyone can delete documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete documents" ON public.documents FOR DELETE USING (true);


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
-- Name: material_receipts Anyone can delete material receipts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete material receipts" ON public.material_receipts FOR DELETE USING (true);


--
-- Name: project_budgets Anyone can delete project budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete project budgets" ON public.project_budgets FOR DELETE USING (true);


--
-- Name: project_subcontracts Anyone can delete project subcontracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete project subcontracts" ON public.project_subcontracts FOR DELETE USING (true);


--
-- Name: proposal_line_groups Anyone can delete proposal line groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete proposal line groups" ON public.proposal_line_groups FOR DELETE USING (true);


--
-- Name: proposal_line_overrides Anyone can delete proposal line overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete proposal line overrides" ON public.proposal_line_overrides FOR DELETE USING (true);


--
-- Name: proposal_section_items Anyone can delete proposal section items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete proposal section items" ON public.proposal_section_items FOR DELETE USING (true);


--
-- Name: proposal_sections Anyone can delete proposal sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete proposal sections" ON public.proposal_sections FOR DELETE USING (true);


--
-- Name: proposals Anyone can delete proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete proposals" ON public.proposals FOR DELETE USING (true);


--
-- Name: sub_bids Anyone can delete sub bids; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete sub bids" ON public.sub_bids FOR DELETE USING (true);


--
-- Name: sub_compliance_documents Anyone can delete sub compliance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete sub compliance" ON public.sub_compliance_documents FOR DELETE USING (true);


--
-- Name: sub_contracts Anyone can delete sub contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete sub contracts" ON public.sub_contracts FOR DELETE USING (true);


--
-- Name: sub_invoices Anyone can delete sub invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete sub invoices" ON public.sub_invoices FOR DELETE USING (true);


--
-- Name: sub_logs Anyone can delete sub logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete sub logs" ON public.sub_logs FOR DELETE USING (true);


--
-- Name: sub_payments Anyone can delete sub payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete sub payments" ON public.sub_payments FOR DELETE USING (true);


--
-- Name: sub_scheduled_shifts Anyone can delete sub schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete sub schedules" ON public.sub_scheduled_shifts FOR DELETE USING (true);


--
-- Name: subs Anyone can delete subs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete subs" ON public.subs FOR DELETE USING (true);


--
-- Name: time_log_allocations Anyone can delete time log allocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete time log allocations" ON public.time_log_allocations FOR DELETE USING (true);


--
-- Name: project_todos Anyone can delete todos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete todos" ON public.project_todos FOR DELETE USING (true);


--
-- Name: activity_log Anyone can insert activity log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert activity log" ON public.activity_log FOR INSERT WITH CHECK (true);


--
-- Name: bid_invitations Anyone can insert bid invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert bid invitations" ON public.bid_invitations FOR INSERT WITH CHECK (true);


--
-- Name: bid_packages Anyone can insert bid packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert bid packages" ON public.bid_packages FOR INSERT WITH CHECK (true);


--
-- Name: project_budget_lines Anyone can insert budget lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert budget lines" ON public.project_budget_lines FOR INSERT WITH CHECK (true);


--
-- Name: cost_codes Anyone can insert cost codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert cost codes" ON public.cost_codes FOR INSERT WITH CHECK (true);


--
-- Name: day_card_jobs Anyone can insert day card jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert day card jobs" ON public.day_card_jobs FOR INSERT WITH CHECK (true);


--
-- Name: day_cards Anyone can insert day cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert day cards" ON public.day_cards FOR INSERT WITH CHECK (true);


--
-- Name: documents Anyone can insert documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert documents" ON public.documents FOR INSERT WITH CHECK (true);


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
-- Name: material_receipts Anyone can insert material receipts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert material receipts" ON public.material_receipts FOR INSERT WITH CHECK (true);


--
-- Name: project_budgets Anyone can insert project budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert project budgets" ON public.project_budgets FOR INSERT WITH CHECK (true);


--
-- Name: project_subcontracts Anyone can insert project subcontracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert project subcontracts" ON public.project_subcontracts FOR INSERT WITH CHECK (true);


--
-- Name: proposal_line_groups Anyone can insert proposal line groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert proposal line groups" ON public.proposal_line_groups FOR INSERT WITH CHECK (true);


--
-- Name: proposal_line_overrides Anyone can insert proposal line overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert proposal line overrides" ON public.proposal_line_overrides FOR INSERT WITH CHECK (true);


--
-- Name: proposal_section_items Anyone can insert proposal section items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert proposal section items" ON public.proposal_section_items FOR INSERT WITH CHECK (true);


--
-- Name: proposal_sections Anyone can insert proposal sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert proposal sections" ON public.proposal_sections FOR INSERT WITH CHECK (true);


--
-- Name: proposals Anyone can insert proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert proposals" ON public.proposals FOR INSERT WITH CHECK (true);


--
-- Name: sub_bids Anyone can insert sub bids; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert sub bids" ON public.sub_bids FOR INSERT WITH CHECK (true);


--
-- Name: sub_compliance_documents Anyone can insert sub compliance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert sub compliance" ON public.sub_compliance_documents FOR INSERT WITH CHECK (true);


--
-- Name: sub_contracts Anyone can insert sub contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert sub contracts" ON public.sub_contracts FOR INSERT WITH CHECK (true);


--
-- Name: sub_invoices Anyone can insert sub invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert sub invoices" ON public.sub_invoices FOR INSERT WITH CHECK (true);


--
-- Name: sub_logs Anyone can insert sub logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert sub logs" ON public.sub_logs FOR INSERT WITH CHECK (true);


--
-- Name: sub_payments Anyone can insert sub payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert sub payments" ON public.sub_payments FOR INSERT WITH CHECK (true);


--
-- Name: sub_scheduled_shifts Anyone can insert sub schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert sub schedules" ON public.sub_scheduled_shifts FOR INSERT WITH CHECK (true);


--
-- Name: subs Anyone can insert subs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert subs" ON public.subs FOR INSERT WITH CHECK (true);


--
-- Name: time_log_allocations Anyone can insert time log allocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert time log allocations" ON public.time_log_allocations FOR INSERT WITH CHECK (true);


--
-- Name: project_todos Anyone can insert todos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert todos" ON public.project_todos FOR INSERT WITH CHECK (true);


--
-- Name: bid_invitations Anyone can update bid invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update bid invitations" ON public.bid_invitations FOR UPDATE USING (true);


--
-- Name: bid_packages Anyone can update bid packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update bid packages" ON public.bid_packages FOR UPDATE USING (true);


--
-- Name: project_budget_lines Anyone can update budget lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update budget lines" ON public.project_budget_lines FOR UPDATE USING (true);


--
-- Name: cost_codes Anyone can update cost codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update cost codes" ON public.cost_codes FOR UPDATE USING (true);


--
-- Name: day_card_jobs Anyone can update day card jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update day card jobs" ON public.day_card_jobs FOR UPDATE USING (true);


--
-- Name: day_cards Anyone can update day cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update day cards" ON public.day_cards FOR UPDATE USING (true);


--
-- Name: documents Anyone can update documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update documents" ON public.documents FOR UPDATE USING (true);


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
-- Name: material_receipts Anyone can update material receipts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update material receipts" ON public.material_receipts FOR UPDATE USING (true);


--
-- Name: project_budgets Anyone can update project budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update project budgets" ON public.project_budgets FOR UPDATE USING (true);


--
-- Name: project_subcontracts Anyone can update project subcontracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update project subcontracts" ON public.project_subcontracts FOR UPDATE USING (true);


--
-- Name: proposal_line_groups Anyone can update proposal line groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update proposal line groups" ON public.proposal_line_groups FOR UPDATE USING (true);


--
-- Name: proposal_line_overrides Anyone can update proposal line overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update proposal line overrides" ON public.proposal_line_overrides FOR UPDATE USING (true);


--
-- Name: proposal_section_items Anyone can update proposal section items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update proposal section items" ON public.proposal_section_items FOR UPDATE USING (true);


--
-- Name: proposal_sections Anyone can update proposal sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update proposal sections" ON public.proposal_sections FOR UPDATE USING (true);


--
-- Name: proposals Anyone can update proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update proposals" ON public.proposals FOR UPDATE USING (true);


--
-- Name: sub_bids Anyone can update sub bids; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update sub bids" ON public.sub_bids FOR UPDATE USING (true);


--
-- Name: sub_compliance_documents Anyone can update sub compliance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update sub compliance" ON public.sub_compliance_documents FOR UPDATE USING (true);


--
-- Name: sub_contracts Anyone can update sub contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update sub contracts" ON public.sub_contracts FOR UPDATE USING (true);


--
-- Name: sub_invoices Anyone can update sub invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update sub invoices" ON public.sub_invoices FOR UPDATE USING (true);


--
-- Name: sub_logs Anyone can update sub logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update sub logs" ON public.sub_logs FOR UPDATE USING (true);


--
-- Name: sub_payments Anyone can update sub payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update sub payments" ON public.sub_payments FOR UPDATE USING (true);


--
-- Name: sub_scheduled_shifts Anyone can update sub schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update sub schedules" ON public.sub_scheduled_shifts FOR UPDATE USING (true);


--
-- Name: subs Anyone can update subs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update subs" ON public.subs FOR UPDATE USING (true);


--
-- Name: time_log_allocations Anyone can update time log allocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update time log allocations" ON public.time_log_allocations FOR UPDATE USING (true);


--
-- Name: project_todos Anyone can update todos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update todos" ON public.project_todos FOR UPDATE USING (true);


--
-- Name: activity_log Anyone can view activity log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view activity log" ON public.activity_log FOR SELECT USING (true);


--
-- Name: bid_invitations Anyone can view bid invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view bid invitations" ON public.bid_invitations FOR SELECT USING (true);


--
-- Name: bid_packages Anyone can view bid packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view bid packages" ON public.bid_packages FOR SELECT USING (true);


--
-- Name: project_budget_lines Anyone can view budget lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view budget lines" ON public.project_budget_lines FOR SELECT USING (true);


--
-- Name: cost_codes Anyone can view cost codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view cost codes" ON public.cost_codes FOR SELECT USING (true);


--
-- Name: day_card_jobs Anyone can view day card jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view day card jobs" ON public.day_card_jobs FOR SELECT USING (true);


--
-- Name: day_cards Anyone can view day cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view day cards" ON public.day_cards FOR SELECT USING (true);


--
-- Name: documents Anyone can view documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view documents" ON public.documents FOR SELECT USING (true);


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
-- Name: material_receipts Anyone can view material receipts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view material receipts" ON public.material_receipts FOR SELECT USING (true);


--
-- Name: project_budgets Anyone can view project budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view project budgets" ON public.project_budgets FOR SELECT USING (true);


--
-- Name: project_subcontracts Anyone can view project subcontracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view project subcontracts" ON public.project_subcontracts FOR SELECT USING (true);


--
-- Name: proposal_line_groups Anyone can view proposal line groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view proposal line groups" ON public.proposal_line_groups FOR SELECT USING (true);


--
-- Name: proposal_line_overrides Anyone can view proposal line overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view proposal line overrides" ON public.proposal_line_overrides FOR SELECT USING (true);


--
-- Name: proposal_section_items Anyone can view proposal section items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view proposal section items" ON public.proposal_section_items FOR SELECT USING (true);


--
-- Name: proposal_sections Anyone can view proposal sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view proposal sections" ON public.proposal_sections FOR SELECT USING (true);


--
-- Name: proposals Anyone can view proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view proposals" ON public.proposals FOR SELECT USING (true);


--
-- Name: sub_bids Anyone can view sub bids; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view sub bids" ON public.sub_bids FOR SELECT USING (true);


--
-- Name: sub_compliance_documents Anyone can view sub compliance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view sub compliance" ON public.sub_compliance_documents FOR SELECT USING (true);


--
-- Name: sub_contracts Anyone can view sub contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view sub contracts" ON public.sub_contracts FOR SELECT USING (true);


--
-- Name: sub_invoices Anyone can view sub invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view sub invoices" ON public.sub_invoices FOR SELECT USING (true);


--
-- Name: sub_logs Anyone can view sub logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view sub logs" ON public.sub_logs FOR SELECT USING (true);


--
-- Name: sub_payments Anyone can view sub payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view sub payments" ON public.sub_payments FOR SELECT USING (true);


--
-- Name: sub_scheduled_shifts Anyone can view sub schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view sub schedules" ON public.sub_scheduled_shifts FOR SELECT USING (true);


--
-- Name: subs Anyone can view subs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view subs" ON public.subs FOR SELECT USING (true);


--
-- Name: time_log_allocations Anyone can view time log allocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view time log allocations" ON public.time_log_allocations FOR SELECT USING (true);


--
-- Name: project_todos Anyone can view todos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view todos" ON public.project_todos FOR SELECT USING (true);


--
-- Name: activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: bid_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bid_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: bid_packages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bid_packages ENABLE ROW LEVEL SECURITY;

--
-- Name: cost_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: day_card_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.day_card_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: day_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.day_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

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
-- Name: material_receipts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.material_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: project_budget_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_budget_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: project_budgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: project_subcontracts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_subcontracts ENABLE ROW LEVEL SECURITY;

--
-- Name: project_todos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_todos ENABLE ROW LEVEL SECURITY;

--
-- Name: proposal_line_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proposal_line_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: proposal_line_overrides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proposal_line_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: proposal_section_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proposal_section_items ENABLE ROW LEVEL SECURITY;

--
-- Name: proposal_sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;

--
-- Name: proposals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_bids; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sub_bids ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_compliance_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sub_compliance_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_contracts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sub_contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sub_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sub_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sub_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_scheduled_shifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sub_scheduled_shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: subs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subs ENABLE ROW LEVEL SECURITY;

--
-- Name: time_log_allocations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.time_log_allocations ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


