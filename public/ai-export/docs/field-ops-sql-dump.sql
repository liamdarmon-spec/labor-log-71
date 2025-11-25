-- ============================================
-- FIELD OPERATIONS SQL DUMP
-- All functions and triggers for Workforce OS
-- ============================================

-- ============================================
-- AUTO-POPULATION FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_populate_company_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If company_id is not set, get it from the project
  IF NEW.company_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM projects
    WHERE id = NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ============================================

CREATE OR REPLACE FUNCTION public.auto_populate_worker_rate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If hourly_rate is not set, get it from the worker
  IF NEW.hourly_rate IS NULL AND NEW.worker_id IS NOT NULL THEN
    SELECT hourly_rate INTO NEW.hourly_rate
    FROM workers
    WHERE id = NEW.worker_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ============================================

CREATE OR REPLACE FUNCTION public.auto_set_schedule_trade()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_worker_trade_id uuid;
BEGIN
  -- If UI did not explicitly set a trade on the schedule,
  -- default to the worker's primary trade (if any).
  IF NEW.trade_id IS NULL THEN
    SELECT trade_id
    INTO v_worker_trade_id
    FROM workers
    WHERE id = NEW.worker_id;

    NEW.trade_id := v_worker_trade_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================

CREATE OR REPLACE FUNCTION public.auto_set_time_log_trade_and_cost_code()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_worker_trade_id   uuid;
  v_schedule_trade_id uuid;
  v_final_trade_id    uuid;
  v_cost_code_id      uuid;
BEGIN
  ----------------------------------------------------------------
  -- Step 1: Decide the canonical trade_id for this time log
  ----------------------------------------------------------------

  -- Priority 1: explicit value from the UI / API
  IF NEW.trade_id IS NOT NULL THEN
    v_final_trade_id := NEW.trade_id;

  -- Priority 2: trade from linked work_schedule (if present)
  ELSIF NEW.source_schedule_id IS NOT NULL THEN
    SELECT trade_id
    INTO v_schedule_trade_id
    FROM work_schedules
    WHERE id = NEW.source_schedule_id;

    v_final_trade_id := v_schedule_trade_id;
  END IF;

  -- Priority 3: fallback to worker's primary trade
  IF v_final_trade_id IS NULL THEN
    SELECT trade_id
    INTO v_worker_trade_id
    FROM workers
    WHERE id = NEW.worker_id;

    v_final_trade_id := v_worker_trade_id;
  END IF;

  -- Assign final trade (may still be NULL if worker has no trade)
  NEW.trade_id := v_final_trade_id;

  ----------------------------------------------------------------
  -- Step 2: Auto-assign cost_code_id based on trade (if missing)
  ----------------------------------------------------------------
  IF NEW.cost_code_id IS NULL AND v_final_trade_id IS NOT NULL THEN
    SELECT default_labor_cost_code_id
    INTO v_cost_code_id
    FROM trades
    WHERE id = v_final_trade_id;

    NEW.cost_code_id := v_cost_code_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================
-- SYNC FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_work_schedule_to_time_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_timelog_id UUID;
  v_should_sync BOOLEAN := FALSE;
BEGIN
  -- -----------------------------------------------------
  -- RULE 1 — schedule must already have a real ID (AFTER)
  -- RULE 2 — only sync if:
  --   (A) scheduled date is in the past (strictly < today)
  --   (B) OR converted_to_timelog was *just* set to TRUE
  -- -----------------------------------------------------
  IF NEW.scheduled_date < CURRENT_DATE THEN
    v_should_sync := TRUE;
  ELSIF (NEW.converted_to_timelog = TRUE AND COALESCE(OLD.converted_to_timelog, FALSE) = FALSE) THEN
    v_should_sync := TRUE;
  END IF;

  IF NOT v_should_sync THEN
    RETURN NEW;
  END IF;

  -- -----------------------------------------------------
  -- Try to find existing log for this schedule
  -- -----------------------------------------------------
  SELECT id
  INTO v_existing_timelog_id
  FROM time_logs
  WHERE source_schedule_id = NEW.id
  LIMIT 1;

  -- -----------------------------------------------------
  -- UPDATE EXISTING
  -- -----------------------------------------------------
  IF v_existing_timelog_id IS NOT NULL THEN
    UPDATE time_logs
    SET
      worker_id = NEW.worker_id,
      company_id = NEW.company_id,
      project_id = NEW.project_id,
      trade_id = NEW.trade_id,
      cost_code_id = NEW.cost_code_id,
      hours_worked = NEW.scheduled_hours,
      notes = NEW.notes,
      date = NEW.scheduled_date,
      last_synced_at = now()
    WHERE id = v_existing_timelog_id;
  
  -- -----------------------------------------------------
  -- CREATE NEW
  -- -----------------------------------------------------
  ELSE
    INSERT INTO time_logs (
      source_schedule_id,
      worker_id,
      company_id,
      project_id,
      trade_id,
      cost_code_id,
      hours_worked,
      notes,
      date,
      last_synced_at
    )
    VALUES (
      NEW.id,
      NEW.worker_id,
      NEW.company_id,
      NEW.project_id,
      NEW.trade_id,
      NEW.cost_code_id,
      NEW.scheduled_hours,
      NEW.notes,
      NEW.scheduled_date,
      now()
    );
  END IF;

  -- -----------------------------------------------------
  -- Update schedule WITHOUT infinite recursion
  -- Only update if not already synced.
  -- -----------------------------------------------------
  IF NEW.status != 'synced' THEN
    UPDATE work_schedules
    SET
      status = 'synced',
      converted_to_timelog = TRUE,
      last_synced_at = now()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================

CREATE OR REPLACE FUNCTION public.sync_time_log_to_work_schedule()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  schedule_date DATE;
BEGIN
  -- Only process if there's a linked schedule
  IF NEW.source_schedule_id IS NOT NULL THEN
    -- Get the scheduled date
    SELECT scheduled_date INTO schedule_date
    FROM work_schedules
    WHERE id = NEW.source_schedule_id;
    
    -- Only sync if schedule exists and date has passed
    IF schedule_date IS NOT NULL AND schedule_date < CURRENT_DATE THEN
      UPDATE work_schedules
      SET
        worker_id = NEW.worker_id,
        project_id = NEW.project_id,
        company_id = NEW.company_id,
        trade_id = NEW.trade_id,
        cost_code_id = NEW.cost_code_id,
        scheduled_hours = NEW.hours_worked,
        notes = NEW.notes,
        scheduled_date = NEW.date,
        status = 'synced',
        last_synced_at = now()
      WHERE id = NEW.source_schedule_id
      AND (
        worker_id IS DISTINCT FROM NEW.worker_id OR
        project_id IS DISTINCT FROM NEW.project_id OR
        company_id IS DISTINCT FROM NEW.company_id OR
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
$function$;

-- ============================================
-- SPLIT FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.split_schedule_for_multi_project(p_original_schedule_id uuid, p_time_log_entries jsonb)
 RETURNS TABLE(schedule_id uuid, time_log_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_original_schedule RECORD;
  v_entry JSONB;
  v_new_schedule_id UUID;
  v_new_timelog_id UUID;
  v_first_iteration BOOLEAN := true;
  v_existing_timelog_id UUID;
  v_cost_code_id UUID;
BEGIN
  -- Get the original schedule details
  SELECT * INTO v_original_schedule
  FROM work_schedules
  WHERE id = p_original_schedule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original schedule not found: %', p_original_schedule_id;
  END IF;

  -- Process each time log entry
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_time_log_entries)
  LOOP
    v_cost_code_id := COALESCE((v_entry->>'cost_code_id')::UUID, v_original_schedule.cost_code_id);

    IF v_first_iteration THEN
      -- Update the original schedule with the first entry
      UPDATE work_schedules
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
      FROM time_logs
      WHERE source_schedule_id = v_new_schedule_id;

      IF v_existing_timelog_id IS NOT NULL THEN
        -- Update existing time log
        UPDATE time_logs
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
        -- Create new time log
        INSERT INTO time_logs (
          source_schedule_id,
          worker_id,
          project_id,
          trade_id,
          cost_code_id,
          hours_worked,
          notes,
          date,
          company_id,
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
          v_original_schedule.company_id,
          now()
        )
        RETURNING id INTO v_new_timelog_id;
      END IF;

      v_first_iteration := false;
    ELSE
      -- Create new schedule for additional projects
      -- IMPORTANT: Create schedule FIRST, then use its ID for time_log
      INSERT INTO work_schedules (
        worker_id,
        project_id,
        trade_id,
        cost_code_id,
        scheduled_date,
        scheduled_hours,
        notes,
        status,
        created_by,
        company_id,
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
        v_original_schedule.company_id,
        true,
        now()
      )
      RETURNING id INTO v_new_schedule_id;

      -- Verify the schedule was created
      IF v_new_schedule_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create new schedule for split';
      END IF;

      -- Now create time log with the valid schedule ID
      INSERT INTO time_logs (
        source_schedule_id,
        worker_id,
        project_id,
        trade_id,
        cost_code_id,
        hours_worked,
        notes,
        date,
        company_id,
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
        v_original_schedule.company_id,
        now()
      )
      RETURNING id INTO v_new_timelog_id;
    END IF;

    RETURN QUERY SELECT v_new_schedule_id, v_new_timelog_id;
  END LOOP;
END;
$function$;

-- ============================================

CREATE OR REPLACE FUNCTION public.split_time_log_for_multi_project(p_original_time_log_id uuid, p_entries jsonb)
 RETURNS TABLE(time_log_id uuid, source_schedule_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_original_log RECORD;
  v_entry JSONB;
  v_new_timelog_id UUID;
  v_first_iteration BOOLEAN := true;
  v_cost_code_id UUID;
BEGIN
  -- Get the original time log details
  SELECT * INTO v_original_log
  FROM time_logs
  WHERE id = p_original_time_log_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original time log not found: %', p_original_time_log_id;
  END IF;

  -- Process each entry
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    v_cost_code_id := COALESCE((v_entry->>'cost_code_id')::UUID, v_original_log.cost_code_id);

    IF v_first_iteration THEN
      -- Update the original time log with the first entry
      UPDATE time_logs
      SET
        project_id = (v_entry->>'project_id')::UUID,
        hours_worked = (v_entry->>'hours')::NUMERIC,
        trade_id = (v_entry->>'trade_id')::UUID,
        cost_code_id = v_cost_code_id,
        notes = v_entry->>'notes',
        last_synced_at = now()
      WHERE id = p_original_time_log_id
      RETURNING id INTO v_new_timelog_id;

      v_first_iteration := false;
    ELSE
      -- Create new time log entries for additional projects
      -- CRITICAL: Preserve source_schedule_id from original (could be NULL)
      INSERT INTO time_logs (
        source_schedule_id,
        worker_id,
        project_id,
        trade_id,
        cost_code_id,
        hours_worked,
        notes,
        date,
        company_id,
        last_synced_at
      ) VALUES (
        v_original_log.source_schedule_id,  -- Keep same (or NULL)
        v_original_log.worker_id,
        (v_entry->>'project_id')::UUID,
        (v_entry->>'trade_id')::UUID,
        v_cost_code_id,
        (v_entry->>'hours')::NUMERIC,
        v_entry->>'notes',
        v_original_log.date,
        v_original_log.company_id,
        now()
      )
      RETURNING id INTO v_new_timelog_id;
    END IF;

    RETURN QUERY SELECT v_new_timelog_id, v_original_log.source_schedule_id;
  END LOOP;
END;
$function$;

-- ============================================
-- PAYMENT FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.mark_time_logs_paid_on_pay_run()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- When pay run is marked as paid, update associated time logs
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    UPDATE time_logs
    SET 
      payment_status = 'paid',
      paid_amount = labor_cost
    FROM labor_pay_run_items
    WHERE labor_pay_run_items.time_log_id = time_logs.id
    AND labor_pay_run_items.pay_run_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ============================================
-- MATERIAL RECEIPT SYNC (Related to Field Ops)
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_material_receipt_to_cost()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_vendor_name TEXT;
  v_description TEXT;
BEGIN
  -- Get vendor name
  IF NEW.vendor_id IS NOT NULL THEN
    SELECT name INTO v_vendor_name
    FROM material_vendors
    WHERE id = NEW.vendor_id;
  END IF;
  
  -- Use legacy vendor field if vendor_id is null
  IF v_vendor_name IS NULL THEN
    v_vendor_name := COALESCE(NEW.vendor, 'Unknown Vendor');
  END IF;

  v_description := 'Material Receipt - ' || v_vendor_name;

  IF TG_OP = 'INSERT' THEN
    -- Create new cost entry
    INSERT INTO costs (
      project_id,
      vendor_id,
      vendor_type,
      cost_code_id,
      category,
      amount,
      date_incurred,
      description,
      notes,
      status
    ) VALUES (
      NEW.project_id,
      NEW.vendor_id,
      'material_vendor',
      NEW.cost_code_id,
      'materials',
      NEW.total,
      NEW.receipt_date,
      v_description,
      NEW.notes,
      'unpaid'
    )
    RETURNING id INTO NEW.linked_cost_id;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update existing cost entry
    IF NEW.linked_cost_id IS NOT NULL THEN
      UPDATE costs
      SET
        project_id = NEW.project_id,
        vendor_id = NEW.vendor_id,
        vendor_type = 'material_vendor',
        cost_code_id = NEW.cost_code_id,
        category = 'materials',
        amount = NEW.total,
        date_incurred = NEW.receipt_date,
        description = v_description,
        notes = NEW.notes,
        updated_at = now()
      WHERE id = NEW.linked_cost_id;
    ELSE
      -- Create cost entry if it doesn't exist (data recovery)
      INSERT INTO costs (
        project_id,
        vendor_id,
        vendor_type,
        cost_code_id,
        category,
        amount,
        date_incurred,
        description,
        notes,
        status
      ) VALUES (
        NEW.project_id,
        NEW.vendor_id,
        'material_vendor',
        NEW.cost_code_id,
        'materials',
        NEW.total,
        NEW.receipt_date,
        v_description,
        NEW.notes,
        'unpaid'
      )
      RETURNING id INTO NEW.linked_cost_id;
    END IF;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Delete linked cost entry
    IF OLD.linked_cost_id IS NOT NULL THEN
      DELETE FROM costs WHERE id = OLD.linked_cost_id;
    END IF;
    
    RETURN OLD;
  END IF;
END;
$function$;

-- ============================================
-- END OF FIELD OPERATIONS SQL DUMP
-- ============================================
