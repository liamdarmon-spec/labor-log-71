-- Add schedule_id to daily_logs for 2-way linking
ALTER TABLE public.daily_logs
ADD COLUMN IF NOT EXISTS schedule_id uuid REFERENCES public.scheduled_shifts(id) ON DELETE SET NULL;

-- Create unique index to enforce 1:1 relationship
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_logs_schedule_id 
ON public.daily_logs(schedule_id) 
WHERE schedule_id IS NOT NULL;

-- Add status tracking to scheduled_shifts
ALTER TABLE public.scheduled_shifts
ADD COLUMN IF NOT EXISTS status text DEFAULT 'planned' CHECK (status IN ('planned', 'converted', 'synced'));

-- Add last sync timestamp
ALTER TABLE public.scheduled_shifts
ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone;

ALTER TABLE public.daily_logs
ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone;

-- Function: Sync Schedule → Time Log (only for past dates)
CREATE OR REPLACE FUNCTION public.sync_schedule_to_timelog()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if the scheduled date has passed
  IF NEW.scheduled_date < CURRENT_DATE THEN
    -- Update corresponding time log if it exists
    UPDATE public.daily_logs
    SET
      worker_id = NEW.worker_id,
      project_id = NEW.project_id,
      trade_id = NEW.trade_id,
      hours_worked = NEW.scheduled_hours,
      notes = NEW.notes,
      last_synced_at = now()
    WHERE schedule_id = NEW.id
    AND (
      worker_id IS DISTINCT FROM NEW.worker_id OR
      project_id IS DISTINCT FROM NEW.project_id OR
      trade_id IS DISTINCT FROM NEW.trade_id OR
      hours_worked IS DISTINCT FROM NEW.scheduled_hours OR
      notes IS DISTINCT FROM NEW.notes
    );
    
    -- Update status if converted
    IF NEW.converted_to_timelog = true AND NEW.status = 'planned' THEN
      NEW.status := 'converted';
    ELSIF NEW.converted_to_timelog = true THEN
      NEW.status := 'synced';
    END IF;
    
    NEW.last_synced_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Sync Time Log → Schedule (only for past dates)
CREATE OR REPLACE FUNCTION public.sync_timelog_to_schedule()
RETURNS TRIGGER AS $$
DECLARE
  schedule_date date;
BEGIN
  -- Get the scheduled date
  SELECT scheduled_date INTO schedule_date
  FROM public.scheduled_shifts
  WHERE id = NEW.schedule_id;
  
  -- Only sync if the scheduled date has passed
  IF schedule_date IS NOT NULL AND schedule_date < CURRENT_DATE THEN
    -- Update corresponding schedule
    UPDATE public.scheduled_shifts
    SET
      worker_id = NEW.worker_id,
      project_id = NEW.project_id,
      trade_id = NEW.trade_id,
      scheduled_hours = NEW.hours_worked,
      notes = NEW.notes,
      status = 'synced',
      last_synced_at = now()
    WHERE id = NEW.schedule_id
    AND (
      worker_id IS DISTINCT FROM NEW.worker_id OR
      project_id IS DISTINCT FROM NEW.project_id OR
      trade_id IS DISTINCT FROM NEW.trade_id OR
      scheduled_hours IS DISTINCT FROM NEW.hours_worked OR
      notes IS DISTINCT FROM NEW.notes
    );
    
    NEW.last_synced_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: Schedule → Time Log sync (on update)
DROP TRIGGER IF EXISTS trigger_sync_schedule_to_timelog ON public.scheduled_shifts;
CREATE TRIGGER trigger_sync_schedule_to_timelog
  BEFORE UPDATE ON public.scheduled_shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_schedule_to_timelog();

-- Trigger: Time Log → Schedule sync (on update)
DROP TRIGGER IF EXISTS trigger_sync_timelog_to_schedule ON public.daily_logs;
CREATE TRIGGER trigger_sync_timelog_to_schedule
  BEFORE UPDATE ON public.daily_logs
  FOR EACH ROW
  WHEN (NEW.schedule_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_timelog_to_schedule();