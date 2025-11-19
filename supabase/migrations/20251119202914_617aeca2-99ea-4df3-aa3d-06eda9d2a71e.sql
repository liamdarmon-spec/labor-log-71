-- Function to auto-create schedule when time log is inserted
CREATE OR REPLACE FUNCTION public.sync_timelog_to_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create or update corresponding schedule entry
  INSERT INTO public.scheduled_shifts (
    worker_id,
    project_id,
    trade_id,
    scheduled_date,
    scheduled_hours,
    notes,
    created_by
  )
  VALUES (
    NEW.worker_id,
    NEW.project_id,
    NEW.trade_id,
    NEW.date,
    NEW.hours_worked,
    NEW.notes,
    NEW.created_by
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to sync time logs to schedules
DROP TRIGGER IF EXISTS sync_timelog_to_schedule_trigger ON public.daily_logs;
CREATE TRIGGER sync_timelog_to_schedule_trigger
  AFTER INSERT ON public.daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_timelog_to_schedule();

-- Add a status column to track converted schedules
ALTER TABLE public.scheduled_shifts 
ADD COLUMN IF NOT EXISTS converted_to_timelog BOOLEAN DEFAULT FALSE;