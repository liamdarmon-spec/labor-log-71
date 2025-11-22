-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS sync_schedule_to_timelog_trigger ON scheduled_shifts;
DROP TRIGGER IF EXISTS sync_timelog_to_schedule_trigger ON daily_logs;
DROP TRIGGER IF EXISTS auto_assign_labor_cost_code_trigger ON daily_logs;
DROP TRIGGER IF EXISTS auto_assign_sub_cost_code_trigger ON sub_logs;

-- Recreate sync_schedule_to_timelog function with stricter logic
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
$function$;

-- Create triggers
CREATE TRIGGER sync_schedule_to_timelog_trigger
  BEFORE UPDATE ON scheduled_shifts
  FOR EACH ROW
  EXECUTE FUNCTION sync_schedule_to_timelog();

CREATE TRIGGER sync_timelog_to_schedule_trigger
  AFTER UPDATE ON daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION sync_timelog_to_schedule();

CREATE TRIGGER auto_assign_labor_cost_code_trigger
  BEFORE INSERT ON daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_labor_cost_code();

CREATE TRIGGER auto_assign_sub_cost_code_trigger
  BEFORE INSERT ON sub_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_sub_cost_code();

-- Add helpful comment
COMMENT ON FUNCTION sync_schedule_to_timelog() IS 
'Auto-syncs scheduled shifts to time logs ONLY when the scheduled date has passed (< CURRENT_DATE). Manual conversion is possible via converted_to_timelog flag.';
