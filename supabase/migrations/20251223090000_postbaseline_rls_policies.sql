-- Extracted from 0001_clean_schema.sql (baseline surgery)
-- Category: other
-- Count: 328

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE name = 'Default Company') THEN
    INSERT INTO public.companies (name) VALUES ('Default Company');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.auth_uid()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();

$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_id_text text;

  company_uuid uuid;

BEGIN
  -- Try to get from JWT claims first
  BEGIN
    company_id_text := current_setting('request.jwt.claims', true)::json->>'company_id';

    IF company_id_text IS NOT NULL THEN
      RETURN company_id_text::uuid;

    END IF;

  EXCEPTION WHEN OTHERS THEN
    NULL;

  END;

  BEGIN
    company_id_text := current_setting('app.company_id', true);

    IF company_id_text IS NOT NULL AND company_id_text != '' THEN
      RETURN company_id_text::uuid;

    END IF;

  EXCEPTION WHEN OTHERS THEN
    NULL;

  END;

  RETURN NULL;

END;

$$;

CREATE OR REPLACE FUNCTION public.is_company_member(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE company_id = p_company_id
      AND user_id = auth.uid()
  );

$$;

CREATE OR REPLACE FUNCTION public.has_company_role(p_company_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE company_id = p_company_id
      AND user_id = auth.uid()
      AND role = ANY(p_roles)
  );

$$;

CREATE OR REPLACE FUNCTION public.is_admin(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_company_role(p_company_id, ARRAY['owner', 'admin']);

$$;

CREATE OR REPLACE FUNCTION public.prevent_company_id_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.company_id IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'company_id cannot be changed';

  END IF;

  RETURN NEW;

END;

$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();

  RETURN NEW;

END;

$$;

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
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from bid_invitations on (bid_package_id, sub_id), keep smallest id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY bid_package_id, sub_id
          ORDER BY id ASC
        ) AS rn
      FROM public.bid_invitations
      WHERE bid_package_id IS NOT NULL AND sub_id IS NOT NULL
    )
    DELETE FROM public.bid_invitations t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from companies on (name), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY name
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.companies
      WHERE name IS NOT NULL
    )
    DELETE FROM public.companies t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from cost_codes on (code), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY code
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.cost_codes
      WHERE code IS NOT NULL
    )
    DELETE FROM public.cost_codes t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from day_cards on (worker_id, date), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY worker_id, date
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.day_cards
      WHERE worker_id IS NOT NULL AND date IS NOT NULL
    )
    DELETE FROM public.day_cards t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from invitations on (email), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY email
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.invitations
      WHERE email IS NOT NULL
    )
    DELETE FROM public.invitations t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from project_budget_lines on (project_id, cost_code_id), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY project_id, cost_code_id
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.project_budget_lines
      WHERE project_id IS NOT NULL AND cost_code_id IS NOT NULL
    )
    DELETE FROM public.project_budget_lines t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from project_budgets on (project_id), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY project_id
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.project_budgets
      WHERE project_id IS NOT NULL
    )
    DELETE FROM public.project_budgets t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from project_subcontracts on (project_id, sub_id), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY project_id, sub_id
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.project_subcontracts
      WHERE project_id IS NOT NULL AND sub_id IS NOT NULL
    )
    DELETE FROM public.project_subcontracts t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from sub_bids on (bid_package_id, sub_id), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY bid_package_id, sub_id
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.sub_bids
      WHERE bid_package_id IS NOT NULL AND sub_id IS NOT NULL
    )
    DELETE FROM public.sub_bids t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from trades on (name), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY name
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.trades
      WHERE name IS NOT NULL
    )
    DELETE FROM public.trades t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from user_roles on (user_id, role), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY user_id, role
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.user_roles
      WHERE user_id IS NOT NULL AND role IS NOT NULL
    )
    DELETE FROM public.user_roles t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

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

      IF v_labor_cost_code_id IS NOT NULL THEN
        NEW.cost_code_id := v_labor_cost_code_id;

      END IF;

    END IF;

  END IF;

  RETURN NEW;

END;

$$;

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

      IF v_sub_cost_code_id IS NOT NULL THEN
        NEW.cost_code_id := v_sub_cost_code_id;

      END IF;

    END IF;

  END IF;

  RETURN NEW;

END;

$$;

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

END;

$$;

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

    SELECT COALESCE(SUM(hours_worked), 0)
    INTO v_logged_total
    FROM daily_logs
    WHERE worker_id = v_worker_id AND date = v_date;

    SELECT hourly_rate
    INTO v_worker_rate
    FROM workers
    WHERE id = v_worker_id;

    IF v_logged_total > 0 THEN
      v_status := 'logged';

    ELSIF v_date < CURRENT_DATE THEN
      v_status := 'scheduled';

    ELSE
      v_status := 'scheduled';

    END IF;

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

  END LOOP;

  RAISE NOTICE 'Migration complete. DayCards created from existing schedules and logs.';

END;

$$;

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

  PERFORM set_config('session.split_in_progress', 'true', true);

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

    END IF;

    RETURN QUERY SELECT v_new_schedule_id, v_new_timelog_id;

  END LOOP;

  PERFORM set_config('session.split_in_progress', 'false', true);

END;

$$;

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

  SELECT 
    COALESCE(SUM(CASE WHEN category = 'Labor' THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category IN ('Subs', 'Subcontractors') THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'Materials' THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category IN ('Allowance', 'Other') THEN line_total ELSE 0 END), 0)
  INTO v_labor_total, v_subs_total, v_materials_total, v_other_total
  FROM estimate_items
  WHERE estimate_id = p_estimate_id;

END;

$$;

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

CREATE OR REPLACE FUNCTION public.sync_schedule_to_timelog() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Skip if split operation is in progress
  IF coalesce(current_setting('session.split_in_progress', true), 'false') = 'true' THEN
    RETURN NEW;

  END IF;

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

  IF NEW.schedule_id IS NOT NULL THEN
    -- Get the scheduled date
    SELECT scheduled_date INTO schedule_date
    FROM public.scheduled_shifts
    WHERE id = NEW.schedule_id;

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

DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from cost_codes on (trade_id, category), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY trade_id, category
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.cost_codes
      WHERE is_active = true AND trade_id IS NOT NULL
    )
    DELETE FROM public.cost_codes t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from daily_logs on (schedule_id), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY schedule_id
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.daily_logs
      WHERE schedule_id IS NOT NULL
    )
    DELETE FROM public.daily_logs t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proposal_section_items'
      AND column_name = 'estimate_item_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_proposal_section_items_estimate_item_id ON public.proposal_section_items USING btree (estimate_item_id)';
  END IF;
END
$$;

DROP POLICY IF EXISTS projects_select_policy ON public.projects;

DROP POLICY IF EXISTS projects_insert_policy ON public.projects;

DROP POLICY IF EXISTS projects_update_policy ON public.projects;

DROP POLICY IF EXISTS projects_delete_policy ON public.projects;

DROP POLICY IF EXISTS day_cards_select_policy ON public.day_cards;

DROP POLICY IF EXISTS day_cards_insert_policy ON public.day_cards;

DROP POLICY IF EXISTS day_cards_update_policy ON public.day_cards;

DROP POLICY IF EXISTS day_cards_delete_policy ON public.day_cards;

DROP POLICY IF EXISTS scheduled_shifts_select_policy ON public.scheduled_shifts;

DROP POLICY IF EXISTS scheduled_shifts_insert_policy ON public.scheduled_shifts;

DROP POLICY IF EXISTS scheduled_shifts_update_policy ON public.scheduled_shifts;

DROP POLICY IF EXISTS scheduled_shifts_delete_policy ON public.scheduled_shifts;

DROP POLICY IF EXISTS daily_logs_select_policy ON public.daily_logs;

DROP POLICY IF EXISTS daily_logs_insert_policy ON public.daily_logs;

DROP POLICY IF EXISTS daily_logs_update_policy ON public.daily_logs;

DROP POLICY IF EXISTS daily_logs_delete_policy ON public.daily_logs;

DROP POLICY IF EXISTS documents_select_policy ON public.documents;

DROP POLICY IF EXISTS documents_insert_policy ON public.documents;

DROP POLICY IF EXISTS documents_update_policy ON public.documents;

DROP POLICY IF EXISTS documents_delete_policy ON public.documents;

DROP POLICY IF EXISTS payments_select_policy ON public.payments;

DROP POLICY IF EXISTS payments_insert_policy ON public.payments;

DROP POLICY IF EXISTS payments_update_policy ON public.payments;

DROP POLICY IF EXISTS payments_delete_policy ON public.payments;

DROP POLICY IF EXISTS material_receipts_select_policy ON public.material_receipts;

DROP POLICY IF EXISTS material_receipts_insert_policy ON public.material_receipts;

DROP POLICY IF EXISTS material_receipts_update_policy ON public.material_receipts;

DROP POLICY IF EXISTS material_receipts_delete_policy ON public.material_receipts;

DROP POLICY IF EXISTS sub_logs_select_policy ON public.sub_logs;

DROP POLICY IF EXISTS sub_logs_insert_policy ON public.sub_logs;

DROP POLICY IF EXISTS sub_logs_update_policy ON public.sub_logs;

DROP POLICY IF EXISTS sub_logs_delete_policy ON public.sub_logs;

DROP POLICY IF EXISTS subs_select_policy ON public.subs;

DROP POLICY IF EXISTS subs_insert_policy ON public.subs;

DROP POLICY IF EXISTS subs_update_policy ON public.subs;

DROP POLICY IF EXISTS subs_delete_policy ON public.subs;

DROP POLICY IF EXISTS workers_select_policy ON public.workers;

DROP POLICY IF EXISTS workers_insert_policy ON public.workers;

DROP POLICY IF EXISTS workers_update_policy ON public.workers;

DROP POLICY IF EXISTS workers_delete_policy ON public.workers;

DROP POLICY IF EXISTS cost_codes_select_policy ON public.cost_codes;

DROP POLICY IF EXISTS cost_codes_insert_policy ON public.cost_codes;

DROP POLICY IF EXISTS cost_codes_update_policy ON public.cost_codes;

DROP POLICY IF EXISTS cost_codes_delete_policy ON public.cost_codes;

DROP POLICY IF EXISTS trades_select_policy ON public.trades;

DROP POLICY IF EXISTS trades_insert_policy ON public.trades;

DROP POLICY IF EXISTS trades_update_policy ON public.trades;

DROP POLICY IF EXISTS trades_delete_policy ON public.trades;

DROP POLICY IF EXISTS project_budget_lines_select_policy ON public.project_budget_lines;

DROP POLICY IF EXISTS project_budget_lines_insert_policy ON public.project_budget_lines;

DROP POLICY IF EXISTS project_budget_lines_update_policy ON public.project_budget_lines;

DROP POLICY IF EXISTS project_budget_lines_delete_policy ON public.project_budget_lines;

DROP POLICY IF EXISTS estimates_select_policy ON public.estimates;

DROP POLICY IF EXISTS estimates_insert_policy ON public.estimates;

DROP POLICY IF EXISTS estimates_update_policy ON public.estimates;

DROP POLICY IF EXISTS estimates_delete_policy ON public.estimates;

DROP POLICY IF EXISTS estimate_items_select_policy ON public.estimate_items;

DROP POLICY IF EXISTS estimate_items_insert_policy ON public.estimate_items;

DROP POLICY IF EXISTS estimate_items_update_policy ON public.estimate_items;

DROP POLICY IF EXISTS estimate_items_delete_policy ON public.estimate_items;

DROP POLICY IF EXISTS invoices_select_policy ON public.invoices;

DROP POLICY IF EXISTS invoices_insert_policy ON public.invoices;

DROP POLICY IF EXISTS invoices_update_policy ON public.invoices;

DROP POLICY IF EXISTS invoices_delete_policy ON public.invoices;

DROP POLICY IF EXISTS invoice_items_select_policy ON public.invoice_items;

DROP POLICY IF EXISTS invoice_items_insert_policy ON public.invoice_items;

DROP POLICY IF EXISTS invoice_items_update_policy ON public.invoice_items;

DROP POLICY IF EXISTS invoice_items_delete_policy ON public.invoice_items;

DROP POLICY IF EXISTS bid_packages_select_policy ON public.bid_packages;

DROP POLICY IF EXISTS bid_packages_insert_policy ON public.bid_packages;

DROP POLICY IF EXISTS bid_packages_update_policy ON public.bid_packages;

DROP POLICY IF EXISTS bid_packages_delete_policy ON public.bid_packages;

DROP POLICY IF EXISTS bid_invitations_select_policy ON public.bid_invitations;

DROP POLICY IF EXISTS bid_invitations_insert_policy ON public.bid_invitations;

DROP POLICY IF EXISTS bid_invitations_update_policy ON public.bid_invitations;

DROP POLICY IF EXISTS bid_invitations_delete_policy ON public.bid_invitations;

DROP POLICY IF EXISTS project_budgets_select_policy ON public.project_budgets;

DROP POLICY IF EXISTS project_budgets_insert_policy ON public.project_budgets;

DROP POLICY IF EXISTS project_budgets_update_policy ON public.project_budgets;

DROP POLICY IF EXISTS project_budgets_delete_policy ON public.project_budgets;

DROP POLICY IF EXISTS project_todos_select_policy ON public.project_todos;

DROP POLICY IF EXISTS project_todos_insert_policy ON public.project_todos;

DROP POLICY IF EXISTS project_todos_update_policy ON public.project_todos;

DROP POLICY IF EXISTS project_todos_delete_policy ON public.project_todos;

DROP POLICY IF EXISTS proposals_select_policy ON public.proposals;

DROP POLICY IF EXISTS proposals_insert_policy ON public.proposals;

DROP POLICY IF EXISTS proposals_update_policy ON public.proposals;

DROP POLICY IF EXISTS proposals_delete_policy ON public.proposals;

DROP POLICY IF EXISTS proposal_sections_select_policy ON public.proposal_sections;

DROP POLICY IF EXISTS proposal_sections_insert_policy ON public.proposal_sections;

DROP POLICY IF EXISTS proposal_sections_update_policy ON public.proposal_sections;

DROP POLICY IF EXISTS proposal_sections_delete_policy ON public.proposal_sections;

DROP POLICY IF EXISTS proposal_section_items_select_policy ON public.proposal_section_items;

DROP POLICY IF EXISTS proposal_section_items_insert_policy ON public.proposal_section_items;

DROP POLICY IF EXISTS proposal_section_items_update_policy ON public.proposal_section_items;

DROP POLICY IF EXISTS proposal_section_items_delete_policy ON public.proposal_section_items;

DROP POLICY IF EXISTS sub_contracts_select_policy ON public.sub_contracts;

DROP POLICY IF EXISTS sub_contracts_insert_policy ON public.sub_contracts;

DROP POLICY IF EXISTS sub_contracts_update_policy ON public.sub_contracts;

DROP POLICY IF EXISTS sub_contracts_delete_policy ON public.sub_contracts;

DROP POLICY IF EXISTS sub_invoices_select_policy ON public.sub_invoices;

DROP POLICY IF EXISTS sub_invoices_insert_policy ON public.sub_invoices;

DROP POLICY IF EXISTS sub_invoices_update_policy ON public.sub_invoices;

DROP POLICY IF EXISTS sub_invoices_delete_policy ON public.sub_invoices;

DROP POLICY IF EXISTS sub_bids_select_policy ON public.sub_bids;

DROP POLICY IF EXISTS sub_bids_insert_policy ON public.sub_bids;

DROP POLICY IF EXISTS sub_bids_update_policy ON public.sub_bids;

DROP POLICY IF EXISTS sub_bids_delete_policy ON public.sub_bids;

DROP POLICY IF EXISTS time_log_allocations_select_policy ON public.time_log_allocations;

DROP POLICY IF EXISTS time_log_allocations_insert_policy ON public.time_log_allocations;

DROP POLICY IF EXISTS time_log_allocations_update_policy ON public.time_log_allocations;

DROP POLICY IF EXISTS time_log_allocations_delete_policy ON public.time_log_allocations;

DROP POLICY IF EXISTS day_card_jobs_select_policy ON public.day_card_jobs;

DROP POLICY IF EXISTS day_card_jobs_insert_policy ON public.day_card_jobs;

DROP POLICY IF EXISTS day_card_jobs_update_policy ON public.day_card_jobs;

DROP POLICY IF EXISTS day_card_jobs_delete_policy ON public.day_card_jobs;

DROP POLICY IF EXISTS archived_daily_logs_select_policy ON public.archived_daily_logs;

DROP POLICY IF EXISTS archived_daily_logs_insert_policy ON public.archived_daily_logs;

DROP POLICY IF EXISTS archived_daily_logs_update_policy ON public.archived_daily_logs;

DROP POLICY IF EXISTS archived_daily_logs_delete_policy ON public.archived_daily_logs;

DROP POLICY IF EXISTS schedule_modifications_select_policy ON public.schedule_modifications;

DROP POLICY IF EXISTS schedule_modifications_insert_policy ON public.schedule_modifications;

DROP POLICY IF EXISTS schedule_modifications_update_policy ON public.schedule_modifications;

DROP POLICY IF EXISTS schedule_modifications_delete_policy ON public.schedule_modifications;

DROP POLICY IF EXISTS sub_scheduled_shifts_select_policy ON public.sub_scheduled_shifts;

DROP POLICY IF EXISTS sub_scheduled_shifts_insert_policy ON public.sub_scheduled_shifts;

DROP POLICY IF EXISTS sub_scheduled_shifts_update_policy ON public.sub_scheduled_shifts;

DROP POLICY IF EXISTS sub_scheduled_shifts_delete_policy ON public.sub_scheduled_shifts;

DROP POLICY IF EXISTS sub_payments_select_policy ON public.sub_payments;

DROP POLICY IF EXISTS sub_payments_insert_policy ON public.sub_payments;

DROP POLICY IF EXISTS sub_payments_update_policy ON public.sub_payments;

DROP POLICY IF EXISTS sub_payments_delete_policy ON public.sub_payments;

DROP POLICY IF EXISTS sub_compliance_documents_select_policy ON public.sub_compliance_documents;

DROP POLICY IF EXISTS sub_compliance_documents_insert_policy ON public.sub_compliance_documents;

DROP POLICY IF EXISTS sub_compliance_documents_update_policy ON public.sub_compliance_documents;

DROP POLICY IF EXISTS sub_compliance_documents_delete_policy ON public.sub_compliance_documents;

DROP POLICY IF EXISTS material_receipts_select_policy ON public.material_receipts;

DROP POLICY IF EXISTS material_receipts_insert_policy ON public.material_receipts;

DROP POLICY IF EXISTS material_receipts_update_policy ON public.material_receipts;

DROP POLICY IF EXISTS material_receipts_delete_policy ON public.material_receipts;-- Extracted from 0001_clean_schema.sql (baseline surgery)
-- Category: rls
-- Count: 323

CREATE POLICY "Anyone can delete bid invitations" ON public.bid_invitations FOR DELETE USING (true);

CREATE POLICY "Anyone can delete bid packages" ON public.bid_packages FOR DELETE USING (true);

CREATE POLICY "Anyone can delete budget lines" ON public.project_budget_lines FOR DELETE USING (true);

CREATE POLICY "Anyone can delete cost codes" ON public.cost_codes FOR DELETE USING (true);

CREATE POLICY "Anyone can delete day card jobs" ON public.day_card_jobs FOR DELETE USING (true);

CREATE POLICY "Anyone can delete day cards" ON public.day_cards FOR DELETE USING (true);

CREATE POLICY "Anyone can delete documents" ON public.documents FOR DELETE USING (true);

CREATE POLICY "Anyone can delete estimate items" ON public.estimate_items FOR DELETE USING (true);

CREATE POLICY "Anyone can delete estimates" ON public.estimates FOR DELETE USING (true);

CREATE POLICY "Anyone can delete invoice items" ON public.invoice_items FOR DELETE USING (true);

CREATE POLICY "Anyone can delete invoices" ON public.invoices FOR DELETE USING (true);

CREATE POLICY "Anyone can delete material receipts" ON public.material_receipts FOR DELETE USING (true);

CREATE POLICY "Anyone can delete project budgets" ON public.project_budgets FOR DELETE USING (true);

CREATE POLICY "Anyone can delete project subcontracts" ON public.project_subcontracts FOR DELETE USING (true);

CREATE POLICY "Anyone can delete proposal line groups" ON public.proposal_line_groups FOR DELETE USING (true);

CREATE POLICY "Anyone can delete proposal line overrides" ON public.proposal_line_overrides FOR DELETE USING (true);

CREATE POLICY "Anyone can delete proposal section items" ON public.proposal_section_items FOR DELETE USING (true);

CREATE POLICY "Anyone can delete proposal sections" ON public.proposal_sections FOR DELETE USING (true);

CREATE POLICY "Anyone can delete proposals" ON public.proposals FOR DELETE USING (true);

CREATE POLICY "Anyone can delete sub bids" ON public.sub_bids FOR DELETE USING (true);

CREATE POLICY "Anyone can delete sub compliance" ON public.sub_compliance_documents FOR DELETE USING (true);

CREATE POLICY "Anyone can delete sub contracts" ON public.sub_contracts FOR DELETE USING (true);

CREATE POLICY "Anyone can delete sub invoices" ON public.sub_invoices FOR DELETE USING (true);

CREATE POLICY "Anyone can delete sub logs" ON public.sub_logs FOR DELETE USING (true);

CREATE POLICY "Anyone can delete sub payments" ON public.sub_payments FOR DELETE USING (true);

CREATE POLICY "Anyone can delete sub schedules" ON public.sub_scheduled_shifts FOR DELETE USING (true);

CREATE POLICY "Anyone can delete subs" ON public.subs FOR DELETE USING (true);

CREATE POLICY "Anyone can delete time log allocations" ON public.time_log_allocations FOR DELETE USING (true);

CREATE POLICY "Anyone can delete todos" ON public.project_todos FOR DELETE USING (true);

CREATE POLICY "Anyone can insert activity log" ON public.activity_log FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert bid invitations" ON public.bid_invitations FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert bid packages" ON public.bid_packages FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert budget lines" ON public.project_budget_lines FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert cost codes" ON public.cost_codes FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert day card jobs" ON public.day_card_jobs FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert day cards" ON public.day_cards FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert documents" ON public.documents FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert estimate items" ON public.estimate_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert estimates" ON public.estimates FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert invoice items" ON public.invoice_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert invoices" ON public.invoices FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert material receipts" ON public.material_receipts FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert project budgets" ON public.project_budgets FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert project subcontracts" ON public.project_subcontracts FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert proposal line groups" ON public.proposal_line_groups FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert proposal line overrides" ON public.proposal_line_overrides FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert proposal section items" ON public.proposal_section_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert proposal sections" ON public.proposal_sections FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert proposals" ON public.proposals FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert sub bids" ON public.sub_bids FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert sub compliance" ON public.sub_compliance_documents FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert sub contracts" ON public.sub_contracts FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert sub invoices" ON public.sub_invoices FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert sub logs" ON public.sub_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert sub payments" ON public.sub_payments FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert sub schedules" ON public.sub_scheduled_shifts FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert subs" ON public.subs FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert time log allocations" ON public.time_log_allocations FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert todos" ON public.project_todos FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update bid invitations" ON public.bid_invitations FOR UPDATE USING (true);

CREATE POLICY "Anyone can update bid packages" ON public.bid_packages FOR UPDATE USING (true);

CREATE POLICY "Anyone can update budget lines" ON public.project_budget_lines FOR UPDATE USING (true);

CREATE POLICY "Anyone can update cost codes" ON public.cost_codes FOR UPDATE USING (true);

CREATE POLICY "Anyone can update day card jobs" ON public.day_card_jobs FOR UPDATE USING (true);

CREATE POLICY "Anyone can update day cards" ON public.day_cards FOR UPDATE USING (true);

CREATE POLICY "Anyone can update documents" ON public.documents FOR UPDATE USING (true);

CREATE POLICY "Anyone can update estimate items" ON public.estimate_items FOR UPDATE USING (true);

CREATE POLICY "Anyone can update estimates" ON public.estimates FOR UPDATE USING (true);

CREATE POLICY "Anyone can update invoice items" ON public.invoice_items FOR UPDATE USING (true);

CREATE POLICY "Anyone can update invoices" ON public.invoices FOR UPDATE USING (true);

CREATE POLICY "Anyone can update material receipts" ON public.material_receipts FOR UPDATE USING (true);

CREATE POLICY "Anyone can update project budgets" ON public.project_budgets FOR UPDATE USING (true);

CREATE POLICY "Anyone can update project subcontracts" ON public.project_subcontracts FOR UPDATE USING (true);

CREATE POLICY "Anyone can update proposal line groups" ON public.proposal_line_groups FOR UPDATE USING (true);

CREATE POLICY "Anyone can update proposal line overrides" ON public.proposal_line_overrides FOR UPDATE USING (true);

CREATE POLICY "Anyone can update proposal section items" ON public.proposal_section_items FOR UPDATE USING (true);

CREATE POLICY "Anyone can update proposal sections" ON public.proposal_sections FOR UPDATE USING (true);

CREATE POLICY "Anyone can update proposals" ON public.proposals FOR UPDATE USING (true);

CREATE POLICY "Anyone can update sub bids" ON public.sub_bids FOR UPDATE USING (true);

CREATE POLICY "Anyone can update sub compliance" ON public.sub_compliance_documents FOR UPDATE USING (true);

CREATE POLICY "Anyone can update sub contracts" ON public.sub_contracts FOR UPDATE USING (true);

CREATE POLICY "Anyone can update sub invoices" ON public.sub_invoices FOR UPDATE USING (true);

CREATE POLICY "Anyone can update sub logs" ON public.sub_logs FOR UPDATE USING (true);

CREATE POLICY "Anyone can update sub payments" ON public.sub_payments FOR UPDATE USING (true);

CREATE POLICY "Anyone can update sub schedules" ON public.sub_scheduled_shifts FOR UPDATE USING (true);

CREATE POLICY "Anyone can update subs" ON public.subs FOR UPDATE USING (true);

CREATE POLICY "Anyone can update time log allocations" ON public.time_log_allocations FOR UPDATE USING (true);

CREATE POLICY "Anyone can update todos" ON public.project_todos FOR UPDATE USING (true);

CREATE POLICY "Anyone can view activity log" ON public.activity_log FOR SELECT USING (true);

CREATE POLICY "Anyone can view bid invitations" ON public.bid_invitations FOR SELECT USING (true);

CREATE POLICY "Anyone can view bid packages" ON public.bid_packages FOR SELECT USING (true);

CREATE POLICY "Anyone can view budget lines" ON public.project_budget_lines FOR SELECT USING (true);

CREATE POLICY "Anyone can view cost codes" ON public.cost_codes FOR SELECT USING (true);

CREATE POLICY "Anyone can view day card jobs" ON public.day_card_jobs FOR SELECT USING (true);

CREATE POLICY "Anyone can view day cards" ON public.day_cards FOR SELECT USING (true);

CREATE POLICY "Anyone can view documents" ON public.documents FOR SELECT USING (true);

CREATE POLICY "Anyone can view estimate items" ON public.estimate_items FOR SELECT USING (true);

CREATE POLICY "Anyone can view estimates" ON public.estimates FOR SELECT USING (true);

CREATE POLICY "Anyone can view invoice items" ON public.invoice_items FOR SELECT USING (true);

CREATE POLICY "Anyone can view invoices" ON public.invoices FOR SELECT USING (true);

CREATE POLICY "Anyone can view material receipts" ON public.material_receipts FOR SELECT USING (true);

CREATE POLICY "Anyone can view project budgets" ON public.project_budgets FOR SELECT USING (true);

CREATE POLICY "Anyone can view project subcontracts" ON public.project_subcontracts FOR SELECT USING (true);

CREATE POLICY "Anyone can view proposal line groups" ON public.proposal_line_groups FOR SELECT USING (true);

CREATE POLICY "Anyone can view proposal line overrides" ON public.proposal_line_overrides FOR SELECT USING (true);

CREATE POLICY "Anyone can view proposal section items" ON public.proposal_section_items FOR SELECT USING (true);

CREATE POLICY "Anyone can view proposal sections" ON public.proposal_sections FOR SELECT USING (true);

CREATE POLICY "Anyone can view proposals" ON public.proposals FOR SELECT USING (true);

CREATE POLICY "Anyone can view sub bids" ON public.sub_bids FOR SELECT USING (true);

CREATE POLICY "Anyone can view sub compliance" ON public.sub_compliance_documents FOR SELECT USING (true);

CREATE POLICY "Anyone can view sub contracts" ON public.sub_contracts FOR SELECT USING (true);

CREATE POLICY "Anyone can view sub invoices" ON public.sub_invoices FOR SELECT USING (true);

CREATE POLICY "Anyone can view sub logs" ON public.sub_logs FOR SELECT USING (true);

CREATE POLICY "Anyone can view sub payments" ON public.sub_payments FOR SELECT USING (true);

CREATE POLICY "Anyone can view sub schedules" ON public.sub_scheduled_shifts FOR SELECT USING (true);

CREATE POLICY "Anyone can view subs" ON public.subs FOR SELECT USING (true);

CREATE POLICY "Anyone can view time log allocations" ON public.time_log_allocations FOR SELECT USING (true);

CREATE POLICY "Anyone can view todos" ON public.project_todos FOR SELECT USING (true);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bid_invitations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bid_packages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.day_card_jobs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.day_cards ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.material_receipts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.project_budget_lines ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.project_subcontracts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.project_todos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.proposal_line_groups ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.proposal_line_overrides ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.proposal_section_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sub_bids ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sub_compliance_documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sub_contracts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sub_invoices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sub_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sub_payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sub_scheduled_shifts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.subs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.time_log_allocations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_select_policy ON public.projects
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY projects_insert_policy ON public.projects
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY projects_update_policy ON public.projects
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY projects_delete_policy ON public.projects
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.day_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY day_cards_select_policy ON public.day_cards
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY day_cards_insert_policy ON public.day_cards
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY day_cards_update_policy ON public.day_cards
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY day_cards_delete_policy ON public.day_cards
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.scheduled_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY scheduled_shifts_select_policy ON public.scheduled_shifts
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY scheduled_shifts_insert_policy ON public.scheduled_shifts
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY scheduled_shifts_update_policy ON public.scheduled_shifts
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY scheduled_shifts_delete_policy ON public.scheduled_shifts
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_logs_select_policy ON public.daily_logs
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY daily_logs_insert_policy ON public.daily_logs
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY daily_logs_update_policy ON public.daily_logs
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY daily_logs_delete_policy ON public.daily_logs
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_select_policy ON public.documents
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY documents_insert_policy ON public.documents
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY documents_update_policy ON public.documents
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY documents_delete_policy ON public.documents
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select_policy ON public.payments
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY payments_insert_policy ON public.payments
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );

CREATE POLICY payments_update_policy ON public.payments
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

CREATE POLICY payments_delete_policy ON public.payments
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

ALTER TABLE public.material_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY material_receipts_select_policy ON public.material_receipts
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY material_receipts_insert_policy ON public.material_receipts
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY material_receipts_update_policy ON public.material_receipts
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY material_receipts_delete_policy ON public.material_receipts
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.sub_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY sub_logs_select_policy ON public.sub_logs
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY sub_logs_insert_policy ON public.sub_logs
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY sub_logs_update_policy ON public.sub_logs
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY sub_logs_delete_policy ON public.sub_logs
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.subs ENABLE ROW LEVEL SECURITY;

CREATE POLICY subs_select_policy ON public.subs
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY subs_insert_policy ON public.subs
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY subs_update_policy ON public.subs
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY subs_delete_policy ON public.subs
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY workers_select_policy ON public.workers
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY workers_insert_policy ON public.workers
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY workers_update_policy ON public.workers
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY workers_delete_policy ON public.workers
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY cost_codes_select_policy ON public.cost_codes
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY cost_codes_insert_policy ON public.cost_codes
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY cost_codes_update_policy ON public.cost_codes
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY cost_codes_delete_policy ON public.cost_codes
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY trades_select_policy ON public.trades
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY trades_insert_policy ON public.trades
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY trades_update_policy ON public.trades
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY trades_delete_policy ON public.trades
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.project_budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_budget_lines_select_policy ON public.project_budget_lines
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY project_budget_lines_insert_policy ON public.project_budget_lines
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );

CREATE POLICY project_budget_lines_update_policy ON public.project_budget_lines
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

CREATE POLICY project_budget_lines_delete_policy ON public.project_budget_lines
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY estimates_select_policy ON public.estimates
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY estimates_insert_policy ON public.estimates
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );

CREATE POLICY estimates_update_policy ON public.estimates
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

CREATE POLICY estimates_delete_policy ON public.estimates
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY estimate_items_select_policy ON public.estimate_items
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY estimate_items_insert_policy ON public.estimate_items
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );

CREATE POLICY estimate_items_update_policy ON public.estimate_items
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

CREATE POLICY estimate_items_delete_policy ON public.estimate_items
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_select_policy ON public.invoices
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY invoices_insert_policy ON public.invoices
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );

CREATE POLICY invoices_update_policy ON public.invoices
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

CREATE POLICY invoices_delete_policy ON public.invoices
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_items_select_policy ON public.invoice_items
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY invoice_items_insert_policy ON public.invoice_items
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );

CREATE POLICY invoice_items_update_policy ON public.invoice_items
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

CREATE POLICY invoice_items_delete_policy ON public.invoice_items
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

ALTER TABLE public.bid_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY bid_packages_select_policy ON public.bid_packages
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY bid_packages_insert_policy ON public.bid_packages
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY bid_packages_update_policy ON public.bid_packages
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY bid_packages_delete_policy ON public.bid_packages
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.bid_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY bid_invitations_select_policy ON public.bid_invitations
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY bid_invitations_insert_policy ON public.bid_invitations
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY bid_invitations_update_policy ON public.bid_invitations
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY bid_invitations_delete_policy ON public.bid_invitations
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_budgets_select_policy ON public.project_budgets
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY project_budgets_insert_policy ON public.project_budgets
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY project_budgets_update_policy ON public.project_budgets
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY project_budgets_delete_policy ON public.project_budgets
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.project_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_todos_select_policy ON public.project_todos
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY project_todos_insert_policy ON public.project_todos
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY project_todos_update_policy ON public.project_todos
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY project_todos_delete_policy ON public.project_todos
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY proposals_select_policy ON public.proposals
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY proposals_insert_policy ON public.proposals
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY proposals_update_policy ON public.proposals
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY proposals_delete_policy ON public.proposals
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY proposal_sections_select_policy ON public.proposal_sections
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY proposal_sections_insert_policy ON public.proposal_sections
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY proposal_sections_update_policy ON public.proposal_sections
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY proposal_sections_delete_policy ON public.proposal_sections
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.proposal_section_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY proposal_section_items_select_policy ON public.proposal_section_items
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY proposal_section_items_insert_policy ON public.proposal_section_items
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY proposal_section_items_update_policy ON public.proposal_section_items
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY proposal_section_items_delete_policy ON public.proposal_section_items
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.sub_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY sub_contracts_select_policy ON public.sub_contracts
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY sub_contracts_insert_policy ON public.sub_contracts
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY sub_contracts_update_policy ON public.sub_contracts
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY sub_contracts_delete_policy ON public.sub_contracts
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.sub_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY sub_invoices_select_policy ON public.sub_invoices
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY sub_invoices_insert_policy ON public.sub_invoices
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );

CREATE POLICY sub_invoices_update_policy ON public.sub_invoices
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

CREATE POLICY sub_invoices_delete_policy ON public.sub_invoices
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

ALTER TABLE public.sub_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY sub_bids_select_policy ON public.sub_bids
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY sub_bids_insert_policy ON public.sub_bids
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY sub_bids_update_policy ON public.sub_bids
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY sub_bids_delete_policy ON public.sub_bids
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.time_log_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_log_allocations_select_policy ON public.time_log_allocations
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY time_log_allocations_insert_policy ON public.time_log_allocations
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY time_log_allocations_update_policy ON public.time_log_allocations
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY time_log_allocations_delete_policy ON public.time_log_allocations
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.day_card_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY day_card_jobs_select_policy ON public.day_card_jobs
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY day_card_jobs_insert_policy ON public.day_card_jobs
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY day_card_jobs_update_policy ON public.day_card_jobs
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY day_card_jobs_delete_policy ON public.day_card_jobs
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.archived_daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY archived_daily_logs_select_policy ON public.archived_daily_logs
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY archived_daily_logs_insert_policy ON public.archived_daily_logs
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY archived_daily_logs_update_policy ON public.archived_daily_logs
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY archived_daily_logs_delete_policy ON public.archived_daily_logs
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.schedule_modifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY schedule_modifications_select_policy ON public.schedule_modifications
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY schedule_modifications_insert_policy ON public.schedule_modifications
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY schedule_modifications_update_policy ON public.schedule_modifications
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY schedule_modifications_delete_policy ON public.schedule_modifications
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.sub_scheduled_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY sub_scheduled_shifts_select_policy ON public.sub_scheduled_shifts
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY sub_scheduled_shifts_insert_policy ON public.sub_scheduled_shifts
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY sub_scheduled_shifts_update_policy ON public.sub_scheduled_shifts
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY sub_scheduled_shifts_delete_policy ON public.sub_scheduled_shifts
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.sub_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY sub_payments_select_policy ON public.sub_payments
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY sub_payments_insert_policy ON public.sub_payments
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting'])
  );

CREATE POLICY sub_payments_update_policy ON public.sub_payments
  FOR UPDATE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

CREATE POLICY sub_payments_delete_policy ON public.sub_payments
  FOR DELETE
  USING (public.has_company_role(company_id, ARRAY['owner', 'admin', 'accounting']));

ALTER TABLE public.sub_compliance_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY sub_compliance_documents_select_policy ON public.sub_compliance_documents
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY sub_compliance_documents_insert_policy ON public.sub_compliance_documents
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY sub_compliance_documents_update_policy ON public.sub_compliance_documents
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY sub_compliance_documents_delete_policy ON public.sub_compliance_documents
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());

ALTER TABLE public.material_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY material_receipts_select_policy ON public.material_receipts
  FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY material_receipts_insert_policy ON public.material_receipts
  FOR INSERT
  WITH CHECK (
    company_id = public.current_company_id() AND
    public.is_company_member(company_id)
  );

CREATE POLICY material_receipts_update_policy ON public.material_receipts
  FOR UPDATE
  USING (public.is_company_member(company_id))
  WITH CHECK (public.is_company_member(company_id));

CREATE POLICY material_receipts_delete_policy ON public.material_receipts
  FOR DELETE
  USING (public.is_admin(company_id) OR created_by = public.auth_uid());