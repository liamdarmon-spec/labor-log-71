-- =========================================================
-- Fix source_schedule_id FK errors
-- =========================================================

-- Drop old versions
DROP FUNCTION IF EXISTS split_schedule_for_multi_project(UUID, JSONB);
DROP FUNCTION IF EXISTS split_time_log_for_multi_project(UUID, JSONB);

-- ---------------------------------------------------------
-- 1. split_schedule_for_multi_project
-- Splits a work_schedule into multiple schedule+timelog pairs
-- Each split gets its own work_schedule row
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION split_schedule_for_multi_project(
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
$$;

-- ---------------------------------------------------------
-- 2. split_time_log_for_multi_project
-- Splits a time_log into multiple time_log rows
-- RULE: If orig has source_schedule_id, all splits share it
--       If orig has NULL, all splits are NULL
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION split_time_log_for_multi_project(
  p_original_time_log_id UUID,
  p_entries JSONB
)
RETURNS TABLE(time_log_id UUID, source_schedule_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

COMMENT ON FUNCTION split_schedule_for_multi_project IS
'Splits a work_schedule into multiple schedule+timelog pairs.
Each split creates its own work_schedule row with a linked time_log.
Used when a worker worked on multiple projects on a scheduled day.';

COMMENT ON FUNCTION split_time_log_for_multi_project IS
'Splits a time_log into multiple time_log rows.
CRITICAL: All splits share the same source_schedule_id as the original
(or NULL if the original was a manual entry).
Does NOT create new work_schedules.';
