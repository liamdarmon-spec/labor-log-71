-- =========================================================
-- FIXED + SAFE VERSION OF sync_work_schedule_to_time_log()
-- =========================================================

-- Drop old triggers
DROP TRIGGER IF EXISTS sync_schedule_to_timelog_trigger ON work_schedules;
DROP TRIGGER IF EXISTS trigger_sync_schedule_to_timelog ON work_schedules;

-- =========================================================
-- Correct Function: NO infinite loops, always idempotent,
-- only syncs when we *intend* it to, preserves RPC behavior
-- =========================================================
CREATE OR REPLACE FUNCTION sync_work_schedule_to_time_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- =========================================================
-- AFTER TRIGGER (safe)
-- =========================================================
DROP TRIGGER IF EXISTS sync_schedule_to_timelog_trigger ON work_schedules;
CREATE TRIGGER sync_schedule_to_timelog_trigger
AFTER INSERT OR UPDATE ON work_schedules
FOR EACH ROW
EXECUTE FUNCTION sync_work_schedule_to_time_log();