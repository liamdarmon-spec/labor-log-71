-- FORMA OS: Sync Functions for Work Schedules ↔ Time Logs

-- 1. Function: Auto-populate company_id from project when creating schedules/logs
CREATE OR REPLACE FUNCTION auto_populate_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If company_id is not set, get it from the project
  IF NEW.company_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM projects
    WHERE id = NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Function: Auto-populate hourly_rate from worker when creating time logs
CREATE OR REPLACE FUNCTION auto_populate_worker_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If hourly_rate is not set, get it from the worker
  IF NEW.hourly_rate IS NULL AND NEW.worker_id IS NOT NULL THEN
    SELECT hourly_rate INTO NEW.hourly_rate
    FROM workers
    WHERE id = NEW.worker_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Function: Schedule → Time Log Sync (for past dates)
CREATE OR REPLACE FUNCTION sync_work_schedule_to_time_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only auto-sync if date has ALREADY PASSED (not today, must be in past)
  IF NEW.scheduled_date < CURRENT_DATE THEN
    -- Check if time log already exists
    IF EXISTS (SELECT 1 FROM time_logs WHERE source_schedule_id = NEW.id) THEN
      -- Update existing time log
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
      -- Create new time log
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

-- 4. Function: Time Log → Schedule Sync (reverse sync for edits)
CREATE OR REPLACE FUNCTION sync_time_log_to_work_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  schedule_date DATE;
BEGIN
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
$$;

-- 5. Create triggers
CREATE TRIGGER auto_populate_work_schedule_company
  BEFORE INSERT OR UPDATE ON work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_company_id();

CREATE TRIGGER auto_populate_time_log_company
  BEFORE INSERT OR UPDATE ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_company_id();

CREATE TRIGGER auto_populate_time_log_rate
  BEFORE INSERT OR UPDATE ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_worker_rate();

CREATE TRIGGER sync_schedule_to_log
  BEFORE INSERT OR UPDATE ON work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION sync_work_schedule_to_time_log();

CREATE TRIGGER sync_log_to_schedule
  BEFORE INSERT OR UPDATE ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION sync_time_log_to_work_schedule();

-- 6. Function: Mark time logs as paid when pay run is approved
CREATE OR REPLACE FUNCTION mark_time_logs_paid_on_pay_run()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When pay run is marked as paid, update associated time logs
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    UPDATE time_logs
    SET 
      payment_status = 'paid',
      paid_amount = labor_cost
    FROM labor_pay_run_items
    WHERE labor_pay_run_items.time_log_id = time_logs.id
    AND labor_pay_run_items.pay_run_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER mark_logs_paid_trigger
  AFTER INSERT OR UPDATE ON labor_pay_runs
  FOR EACH ROW
  EXECUTE FUNCTION mark_time_logs_paid_on_pay_run();

-- 7. Add comments
COMMENT ON FUNCTION auto_populate_company_id() IS 'Forma OS: Auto-populate company_id from project';
COMMENT ON FUNCTION auto_populate_worker_rate() IS 'Forma OS: Auto-populate hourly_rate from worker';
COMMENT ON FUNCTION sync_work_schedule_to_time_log() IS 'Forma OS: Sync work schedule to time log for past dates';
COMMENT ON FUNCTION sync_time_log_to_work_schedule() IS 'Forma OS: Sync time log edits back to work schedule';
COMMENT ON FUNCTION mark_time_logs_paid_on_pay_run() IS 'Forma OS: Mark time logs as paid when pay run is approved';