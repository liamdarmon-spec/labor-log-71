-- Phase 1: Add recursion guard to sync_time_log_to_work_schedule
CREATE OR REPLACE FUNCTION public.sync_time_log_to_work_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  schedule_date DATE;
BEGIN
  -- Prevent infinite recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Only process if there's a linked schedule
  IF NEW.source_schedule_id IS NOT NULL THEN
    -- Get the scheduled date
    SELECT scheduled_date INTO schedule_date
    FROM work_schedules
    WHERE id = NEW.source_schedule_id;
    
    -- Only sync if schedule exists and date has passed
    IF schedule_date IS NOT NULL AND schedule_date < CURRENT_DATE THEN
      UPDATE work_schedules
      SET
        worker_id = NEW.worker_id,
        project_id = NEW.project_id,
        company_id = NEW.company_id,
        trade_id = NEW.trade_id,
        cost_code_id = NEW.cost_code_id,
        scheduled_hours = NEW.hours_worked,
        notes = NEW.notes,
        scheduled_date = NEW.date,
        status = 'synced',
        last_synced_at = now()
      WHERE id = NEW.source_schedule_id
      AND (
        worker_id IS DISTINCT FROM NEW.worker_id OR
        project_id IS DISTINCT FROM NEW.project_id OR
        company_id IS DISTINCT FROM NEW.company_id OR
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

-- Phase 2: Add performance indexes

-- For schedule-to-time-log sync lookups
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_time_logs_source_schedule 
ON public.time_logs(source_schedule_id)
WHERE source_schedule_id IS NOT NULL;

-- For unpaid labor queries (Pay Center)
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_time_logs_unpaid_company 
ON public.time_logs(company_id, date)
WHERE payment_status = 'unpaid';

-- For schedule conflict detection
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_work_schedules_worker_status 
ON public.work_schedules(worker_id, scheduled_date, status)
WHERE status NOT IN ('cancelled', 'deleted');

-- For cost code aggregations in budget views
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_time_logs_cost_code_project 
ON public.time_logs(project_id, cost_code_id);

CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_costs_cost_code_project 
ON public.costs(project_id, cost_code_id);