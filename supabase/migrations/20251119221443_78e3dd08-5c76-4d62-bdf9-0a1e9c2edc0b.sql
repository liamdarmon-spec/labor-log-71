-- First, check and drop the existing constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'scheduled_shifts_status_check'
  ) THEN
    ALTER TABLE public.scheduled_shifts DROP CONSTRAINT scheduled_shifts_status_check;
  END IF;
END $$;

-- Add the updated constraint that includes the new status values
ALTER TABLE public.scheduled_shifts 
ADD CONSTRAINT scheduled_shifts_status_check 
CHECK (status IN ('planned', 'confirmed', 'completed', 'cancelled', 'synced', 'converted', 'split_modified', 'split_created'));

-- Update the split_schedule_for_multi_project function to use valid status values
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
$function$;