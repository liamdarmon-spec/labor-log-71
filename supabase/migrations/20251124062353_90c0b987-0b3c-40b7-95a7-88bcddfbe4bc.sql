-- Drop existing triggers that conflict
DROP TRIGGER IF EXISTS sync_schedule_to_timelog ON work_schedules;
DROP TRIGGER IF EXISTS sync_schedule_to_log ON work_schedules;
DROP TRIGGER IF EXISTS trigger_work_schedule_sync_to_timelog ON work_schedules;

-- Drop and recreate the sync function with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS sync_work_schedule_to_time_log() CASCADE;

CREATE OR REPLACE FUNCTION sync_work_schedule_to_time_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip if split operation is in progress
  IF coalesce(current_setting('session.split_in_progress', true), 'false') = 'true' THEN
    RETURN NEW;
  END IF;

  -- Only auto-sync if date has ALREADY PASSED (not today, must be in past)
  IF NEW.scheduled_date < CURRENT_DATE THEN
    -- Check if time log already exists
    IF EXISTS (SELECT 1 FROM time_logs WHERE source_schedule_id = NEW.id) THEN
      -- Update existing time log INCLUDING cost_code_id
      UPDATE time_logs
      SET
        worker_id = NEW.worker_id,
        project_id = NEW.project_id,
        company_id = NEW.company_id,
        trade_id = NEW.trade_id,
        cost_code_id = NEW.cost_code_id,
        hours_worked = NEW.scheduled_hours,
        notes = NEW.notes,
        date = NEW.scheduled_date,
        last_synced_at = now()
      WHERE source_schedule_id = NEW.id
      AND (
        worker_id IS DISTINCT FROM NEW.worker_id OR
        project_id IS DISTINCT FROM NEW.project_id OR
        company_id IS DISTINCT FROM NEW.company_id OR
        trade_id IS DISTINCT FROM NEW.trade_id OR
        cost_code_id IS DISTINCT FROM NEW.cost_code_id OR
        hours_worked IS DISTINCT FROM NEW.scheduled_hours OR
        notes IS DISTINCT FROM NEW.notes OR
        date IS DISTINCT FROM NEW.scheduled_date
      );
    ELSE
      -- Create new time log INCLUDING cost_code_id
      INSERT INTO time_logs (
        source_schedule_id,
        worker_id,
        project_id,
        company_id,
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
        NEW.company_id,
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
    NEW.converted_to_timelog := true;
    
  ELSIF NEW.converted_to_timelog = true AND (OLD.converted_to_timelog IS NULL OR OLD.converted_to_timelog = false) THEN
    -- MANUAL CONVERSION: User explicitly converted this schedule
    IF NOT EXISTS (SELECT 1 FROM time_logs WHERE source_schedule_id = NEW.id) THEN
      INSERT INTO time_logs (
        source_schedule_id,
        worker_id,
        project_id,
        company_id,
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
        NEW.company_id,
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS sync_schedule_to_timelog ON work_schedules;
CREATE TRIGGER sync_schedule_to_timelog
  BEFORE INSERT OR UPDATE ON work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION sync_work_schedule_to_time_log();

-- Backfill: sync existing past schedules that don't have time logs yet
UPDATE work_schedules ws
SET 
  status = 'synced',
  last_synced_at = now(),
  converted_to_timelog = true
WHERE 
  ws.scheduled_date < CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM time_logs tl WHERE tl.source_schedule_id = ws.id
  );

-- Insert missing time logs for past schedules
INSERT INTO time_logs (
  source_schedule_id,
  worker_id,
  project_id,
  company_id,
  trade_id,
  cost_code_id,
  hours_worked,
  notes,
  date,
  last_synced_at
)
SELECT 
  ws.id,
  ws.worker_id,
  ws.project_id,
  ws.company_id,
  ws.trade_id,
  ws.cost_code_id,
  ws.scheduled_hours,
  ws.notes,
  ws.scheduled_date,
  now()
FROM work_schedules ws
WHERE 
  ws.scheduled_date < CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM time_logs tl WHERE tl.source_schedule_id = ws.id
  );

-- Update split_work_schedule_for_multi_project function to include cost_code_id
CREATE OR REPLACE FUNCTION split_work_schedule_for_multi_project(
  p_original_schedule_id UUID,
  p_time_log_entries JSONB
)
RETURNS TABLE(schedule_id UUID, time_log_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  FROM work_schedules
  WHERE id = p_original_schedule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original schedule not found';
  END IF;

  -- Disable triggers to prevent infinite recursion during split
  PERFORM set_config('session.split_in_progress', 'true', true);

  -- Process each time log entry
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_time_log_entries)
  LOOP
    -- Extract cost_code_id from entry or use original
    v_cost_code_id := COALESCE((v_entry->>'cost_code_id')::UUID, v_original_schedule.cost_code_id);

    IF v_first_iteration THEN
      -- Update the original schedule with the first entry INCLUDING cost_code_id
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
        -- Update existing time log INCLUDING cost_code_id
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
        -- Create new time log INCLUDING cost_code_id
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
      -- Create new schedule entries for additional projects INCLUDING cost_code_id
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

      -- Create corresponding time log for new schedule INCLUDING cost_code_id
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

  -- Re-enable triggers
  PERFORM set_config('session.split_in_progress', 'false', true);
END;
$$;