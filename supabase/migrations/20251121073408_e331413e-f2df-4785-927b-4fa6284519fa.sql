-- =============================================
-- UPDATE SYNC TRIGGERS TO HANDLE COST_CODE_ID
-- =============================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS sync_schedule_to_timelog_trigger ON public.scheduled_shifts;
DROP TRIGGER IF EXISTS sync_timelog_to_schedule_trigger ON public.daily_logs;

-- Update the sync_schedule_to_timelog function to include cost_code_id
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
      -- Update existing time log with schedule changes INCLUDING cost_code_id
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
    ELSIF NEW.converted_to_timelog = true THEN
      -- Create new time log if marked as converted but doesn't exist INCLUDING cost_code_id
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

-- Update the sync_timelog_to_schedule function to include cost_code_id
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
$function$;

-- Recreate the triggers
CREATE TRIGGER sync_schedule_to_timelog_trigger
  BEFORE UPDATE ON public.scheduled_shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_schedule_to_timelog();

CREATE TRIGGER sync_timelog_to_schedule_trigger
  BEFORE UPDATE ON public.daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_timelog_to_schedule();