-- =============================================================================
-- SECURITY HELPER FUNCTIONS (REQUIRED FOR RLS)
-- =============================================================================

-- Get current authenticated user ID
CREATE OR REPLACE FUNCTION public.auth_uid()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;


-- Get current company ID from JWT claim or GUC
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
  
  -- Fallback to GUC setting
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


-- Check if user is a member of company
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


-- Check if user has specific role in company
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


-- Check if user is admin in company
CREATE OR REPLACE FUNCTION public.is_admin(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_company_role(p_company_id, ARRAY['owner', 'admin']);
$$;


-- Prevent company_id changes
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


-- Standard updated_at trigger function
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



-- =============================================================================
-- STRICT RLS POLICIES FOR ALL TENANT TABLES
-- =============================================================================

-- RLS for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_select_policy ON public.projects;

CREATE POLICY projects_select_policy ON public.projects
  FOR SELECT
  USING (public.is_company_member(company_id));


-- RLS for day_cards
ALTER TABLE public.day_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_cards FORCE ROW LEVEL SECURITY;


-- RLS for scheduled_shifts
ALTER TABLE public.scheduled_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_shifts FORCE ROW LEVEL SECURITY;


-- RLS for daily_logs
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs FORCE ROW LEVEL SECURITY;


-- RLS for documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;


-- RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;


-- RLS for material_receipts
ALTER TABLE public.material_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_receipts FORCE ROW LEVEL SECURITY;


-- RLS for sub_logs
ALTER TABLE public.sub_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_logs FORCE ROW LEVEL SECURITY;


-- RLS for subs
ALTER TABLE public.subs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subs FORCE ROW LEVEL SECURITY;


-- RLS for workers
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers FORCE ROW LEVEL SECURITY;


-- RLS for cost_codes
ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_codes FORCE ROW LEVEL SECURITY;


-- RLS for trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades FORCE ROW LEVEL SECURITY;


-- RLS for project_budget_lines
ALTER TABLE public.project_budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budget_lines FORCE ROW LEVEL SECURITY;


-- RLS for estimates
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates FORCE ROW LEVEL SECURITY;


-- RLS for estimate_items
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_items FORCE ROW LEVEL SECURITY;


-- RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;


-- RLS for invoice_items
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items FORCE ROW LEVEL SECURITY;


-- RLS for bid_packages
ALTER TABLE public.bid_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_packages FORCE ROW LEVEL SECURITY;


-- RLS for bid_invitations
ALTER TABLE public.bid_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_invitations FORCE ROW LEVEL SECURITY;


-- RLS for project_budgets
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budgets FORCE ROW LEVEL SECURITY;


-- RLS for project_todos
ALTER TABLE public.project_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_todos FORCE ROW LEVEL SECURITY;


-- RLS for proposals
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals FORCE ROW LEVEL SECURITY;


-- RLS for proposal_sections
ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_sections FORCE ROW LEVEL SECURITY;


-- RLS for proposal_section_items
ALTER TABLE public.proposal_section_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_section_items FORCE ROW LEVEL SECURITY;


-- RLS for sub_contracts
ALTER TABLE public.sub_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_contracts FORCE ROW LEVEL SECURITY;


-- RLS for sub_invoices
ALTER TABLE public.sub_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_invoices FORCE ROW LEVEL SECURITY;


-- RLS for sub_bids
ALTER TABLE public.sub_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_bids FORCE ROW LEVEL SECURITY;


-- RLS for time_log_allocations
ALTER TABLE public.time_log_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_log_allocations FORCE ROW LEVEL SECURITY;


-- RLS for day_card_jobs
ALTER TABLE public.day_card_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_card_jobs FORCE ROW LEVEL SECURITY;


-- RLS for archived_daily_logs
ALTER TABLE public.archived_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_daily_logs FORCE ROW LEVEL SECURITY;


-- RLS for schedule_modifications
ALTER TABLE public.schedule_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_modifications FORCE ROW LEVEL SECURITY;


-- RLS for sub_scheduled_shifts
ALTER TABLE public.sub_scheduled_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_scheduled_shifts FORCE ROW LEVEL SECURITY;


-- RLS for sub_payments
ALTER TABLE public.sub_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_payments FORCE ROW LEVEL SECURITY;


-- RLS for sub_compliance_documents
ALTER TABLE public.sub_compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_compliance_documents FORCE ROW LEVEL SECURITY;


-- RLS for material_receipts
ALTER TABLE public.material_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_receipts FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- MOVED FROM PG_DUMP MIGRATIONS: 20251122185403_remix_migration_from_pg_dump.sql — RLS/policies
-- ============================================================================



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

-- ============================================================================
-- MOVED FROM PG_DUMP MIGRATIONS: 20251122185806_10ede57c-86cd-4c6b-8d01-6fa38f2e5bbb.sql — RLS/policies
-- ============================================================================


-- 6. Enable RLS
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE labor_pay_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_pay_run_items ENABLE ROW LEVEL SECURITY;


-- 7. RLS Policies for work_schedules
CREATE POLICY "Anyone can view work schedules"
  ON work_schedules FOR SELECT USING (true);

CREATE POLICY "Anyone can insert work schedules"
  ON work_schedules FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update work schedules"
  ON work_schedules FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete work schedules"
  ON work_schedules FOR DELETE USING (true);


-- 8. RLS Policies for time_logs
CREATE POLICY "Anyone can view time logs"
  ON time_logs FOR SELECT USING (true);

CREATE POLICY "Anyone can insert time logs"
  ON time_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update time logs"
  ON time_logs FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete time logs"
  ON time_logs FOR DELETE USING (true);


-- 9. RLS Policies for labor_pay_runs
CREATE POLICY "Anyone can view labor pay runs"
  ON labor_pay_runs FOR SELECT USING (true);

CREATE POLICY "Anyone can insert labor pay runs"
  ON labor_pay_runs FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update labor pay runs"
  ON labor_pay_runs FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete labor pay runs"
  ON labor_pay_runs FOR DELETE USING (true);


-- 10. RLS Policies for labor_pay_run_items
CREATE POLICY "Anyone can view labor pay run items"
  ON labor_pay_run_items FOR SELECT USING (true);

CREATE POLICY "Anyone can insert labor pay run items"
  ON labor_pay_run_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update labor pay run items"
  ON labor_pay_run_items FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete labor pay run items"
  ON labor_pay_run_items FOR DELETE USING (true);
