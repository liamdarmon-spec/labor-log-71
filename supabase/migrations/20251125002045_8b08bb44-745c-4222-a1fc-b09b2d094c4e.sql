-- =========================================================
-- KILL THE OLD BEFORE TRIGGER CAUSING FK ERRORS
-- Drop from BOTH work_schedules AND legacy scheduled_shifts
-- =========================================================

-- 1) Drop triggers on work_schedules
DROP TRIGGER IF EXISTS sync_schedule_to_timelog ON work_schedules;
DROP TRIGGER IF EXISTS sync_schedule_to_timelog_trigger ON work_schedules;
DROP TRIGGER IF EXISTS trigger_sync_schedule_to_timelog ON work_schedules;

-- 2) Drop triggers on legacy scheduled_shifts table
DROP TRIGGER IF EXISTS sync_schedule_to_timelog ON scheduled_shifts;
DROP TRIGGER IF EXISTS sync_schedule_to_timelog_trigger ON scheduled_shifts;
DROP TRIGGER IF EXISTS trigger_sync_schedule_to_timelog ON scheduled_shifts;

-- 3) Now we can safely drop the old function with CASCADE
DROP FUNCTION IF EXISTS sync_schedule_to_timelog() CASCADE;

-- 4) Create the SAFE function (one-way, AFTER trigger)
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
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.scheduled_date < CURRENT_DATE THEN
    v_should_sync := TRUE;
  ELSIF (NEW.converted_to_timelog = TRUE AND COALESCE(OLD.converted_to_timelog, FALSE) = FALSE) THEN
    v_should_sync := TRUE;
  END IF;

  IF NOT v_should_sync THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing_timelog_id
  FROM time_logs
  WHERE source_schedule_id = NEW.id
  LIMIT 1;

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
  ELSE
    INSERT INTO time_logs (
      source_schedule_id, worker_id, company_id, project_id,
      trade_id, cost_code_id, hours_worked, notes, date, last_synced_at
    ) VALUES (
      NEW.id, NEW.worker_id, NEW.company_id, NEW.project_id,
      NEW.trade_id, NEW.cost_code_id, NEW.scheduled_hours, NEW.notes,
      NEW.scheduled_date, now()
    );
  END IF;

  IF NEW.status != 'synced' THEN
    UPDATE work_schedules
    SET status = 'synced', converted_to_timelog = TRUE, last_synced_at = now()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 5) Create clean AFTER trigger on work_schedules
DROP TRIGGER IF EXISTS sync_schedule_to_timelog_trigger ON work_schedules;
CREATE TRIGGER sync_schedule_to_timelog_trigger
AFTER INSERT OR UPDATE ON work_schedules
FOR EACH ROW
EXECUTE FUNCTION public.sync_work_schedule_to_time_log();