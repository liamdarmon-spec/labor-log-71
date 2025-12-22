-- =========================================================
-- SAFE, ONE-WAY SYNC: work_schedules ➜ time_logs
--  - No infinite recursion
--  - Only fires for past dates or explicit conversions
--  - Does NOT try to create schedules from manual time_logs
-- =========================================================

-- Drop old triggers
DROP TRIGGER IF EXISTS sync_schedule_to_timelog_trigger ON work_schedules;
DROP TRIGGER IF EXISTS trigger_sync_schedule_to_timelog ON work_schedules;

-- Main sync function
CREATE OR REPLACE FUNCTION public.sync_work_schedule_to_time_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_timelog_id UUID;
  v_should_sync BOOLEAN := FALSE;
BEGIN
  -- Hard stop: if we're already inside this trigger, don't run again
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Only sync if:
  --  A) schedule date is in the past, OR
  --  B) converted_to_timelog just turned TRUE
  IF NEW.scheduled_date < CURRENT_DATE THEN
    v_should_sync := TRUE;
  ELSIF (NEW.converted_to_timelog = TRUE AND COALESCE(OLD.converted_to_timelog, FALSE) = FALSE) THEN
    v_should_sync := TRUE;
  END IF;

  IF NOT v_should_sync THEN
    RETURN NEW;
  END IF;

  -- Look for an existing time_log for this schedule
  SELECT id
  INTO v_existing_timelog_id
  FROM time_logs
  WHERE source_schedule_id = NEW.id
  LIMIT 1;

  -- UPDATE existing time_log
  IF v_existing_timelog_id IS NOT NULL THEN
    UPDATE time_logs
    SET
      worker_id     = NEW.worker_id,
      company_id    = NEW.company_id,
      project_id    = NEW.project_id,
      trade_id      = NEW.trade_id,
      cost_code_id  = NEW.cost_code_id,
      hours_worked  = NEW.scheduled_hours,
      notes         = NEW.notes,
      date          = NEW.scheduled_date,
      last_synced_at = now()
    WHERE id = v_existing_timelog_id;

  -- CREATE new time_log
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

  -- Mark schedule as synced (no recursion because this is AFTER trigger)
  IF NEW.status != 'synced' THEN
    UPDATE work_schedules
    SET
      status            = 'synced',
      converted_to_timelog = TRUE,
      last_synced_at    = now()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- AFTER trigger so work_schedules.id definitely exists
DROP TRIGGER IF EXISTS sync_schedule_to_timelog_trigger ON work_schedules;
CREATE TRIGGER sync_schedule_to_timelog_trigger
AFTER INSERT OR UPDATE ON work_schedules
FOR EACH ROW
EXECUTE FUNCTION public.sync_work_schedule_to_time_log();