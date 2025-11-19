-- Fix infinite recursion in split_schedule_for_multi_project function
-- by disabling triggers during the split operation

DROP FUNCTION IF EXISTS public.split_schedule_for_multi_project(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.split_schedule_for_multi_project(
  p_original_schedule_id UUID,
  p_time_log_entries JSONB -- Array of {project_id, hours, trade_id, notes}
)
RETURNS TABLE (
  schedule_id UUID,
  time_log_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_original_schedule RECORD;
  v_entry JSONB;
  v_new_schedule_id UUID;
  v_new_timelog_id UUID;
  v_first_iteration BOOLEAN := true;
BEGIN
  -- Get the original schedule details
  SELECT * INTO v_original_schedule
  FROM scheduled_shifts
  WHERE id = p_original_schedule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original schedule not found';
  END IF;

  -- Disable triggers to prevent infinite recursion
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
        updated_at = now(),
        last_synced_at = now()
      WHERE id = p_original_schedule_id
      RETURNING id INTO v_new_schedule_id;

      -- Create corresponding time log if it doesn't exist
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
      ON CONFLICT (schedule_id) DO UPDATE
      SET
        project_id = EXCLUDED.project_id,
        hours_worked = EXCLUDED.hours_worked,
        trade_id = EXCLUDED.trade_id,
        notes = EXCLUDED.notes,
        last_synced_at = now()
      RETURNING id INTO v_new_timelog_id;

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

      -- Create corresponding time log
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

-- Update sync triggers to check for split operation
CREATE OR REPLACE FUNCTION public.sync_schedule_to_timelog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_timelog_to_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;