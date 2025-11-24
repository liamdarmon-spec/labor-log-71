-- =========================================================
-- PART 1: Trade model – canonical per schedule / time_log
-- =========================================================

-- Clean up any previous versions of these helpers
DROP FUNCTION IF EXISTS auto_set_time_log_trade_and_cost_code() CASCADE;
DROP FUNCTION IF EXISTS auto_set_schedule_trade() CASCADE;

-- ---------------------------------------------------------
-- 1A. time_logs: auto-assign trade_id + cost_code_id
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_set_time_log_trade_and_cost_code()
RETURNS TRIGGER AS $$
DECLARE
  v_worker_trade_id   uuid;
  v_schedule_trade_id uuid;
  v_final_trade_id    uuid;
  v_cost_code_id      uuid;
BEGIN
  ----------------------------------------------------------------
  -- Step 1: Decide the canonical trade_id for this time log
  ----------------------------------------------------------------

  -- Priority 1: explicit value from the UI / API
  IF NEW.trade_id IS NOT NULL THEN
    v_final_trade_id := NEW.trade_id;

  -- Priority 2: trade from linked work_schedule (if present)
  ELSIF NEW.source_schedule_id IS NOT NULL THEN
    SELECT trade_id
    INTO v_schedule_trade_id
    FROM work_schedules
    WHERE id = NEW.source_schedule_id;

    v_final_trade_id := v_schedule_trade_id;
  END IF;

  -- Priority 3: fallback to worker's primary trade
  IF v_final_trade_id IS NULL THEN
    SELECT trade_id
    INTO v_worker_trade_id
    FROM workers
    WHERE id = NEW.worker_id;

    v_final_trade_id := v_worker_trade_id;
  END IF;

  -- Assign final trade (may still be NULL if worker has no trade)
  NEW.trade_id := v_final_trade_id;

  ----------------------------------------------------------------
  -- Step 2: Auto-assign cost_code_id based on trade (if missing)
  ----------------------------------------------------------------
  IF NEW.cost_code_id IS NULL AND v_final_trade_id IS NOT NULL THEN
    SELECT default_labor_cost_code_id
    INTO v_cost_code_id
    FROM trades
    WHERE id = v_final_trade_id;

    NEW.cost_code_id := v_cost_code_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------
-- 1B. work_schedules: default trade from worker if not set
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_set_schedule_trade()
RETURNS TRIGGER AS $$
DECLARE
  v_worker_trade_id uuid;
BEGIN
  -- If UI did not explicitly set a trade on the schedule,
  -- default to the worker's primary trade (if any).
  IF NEW.trade_id IS NULL THEN
    SELECT trade_id
    INTO v_worker_trade_id
    FROM workers
    WHERE id = NEW.worker_id;

    NEW.trade_id := v_worker_trade_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------
-- 1C. Attach / re-attach triggers
-- ---------------------------------------------------------

-- time_logs BEFORE trigger: always normalize trade + cost code
DROP TRIGGER IF EXISTS trigger_auto_set_time_log_trade_and_cost_code ON time_logs;
CREATE TRIGGER trigger_auto_set_time_log_trade_and_cost_code
  BEFORE INSERT OR UPDATE ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_time_log_trade_and_cost_code();

-- work_schedules BEFORE trigger: default trade from worker
DROP TRIGGER IF EXISTS trigger_auto_set_schedule_trade ON work_schedules;
CREATE TRIGGER trigger_auto_set_schedule_trade
  BEFORE INSERT ON work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_schedule_trade();

-- ---------------------------------------------------------
-- 1D. Documentation comments
-- ---------------------------------------------------------
COMMENT ON FUNCTION auto_set_time_log_trade_and_cost_code() IS
'Canonical trade & cost-code resolver for time_logs:
  Priority 1: NEW.trade_id (explicit)
  Priority 2: work_schedules.trade_id (via source_schedule_id)
  Priority 3: workers.trade_id (primary trade fallback)
Then assigns cost_code_id using trades.default_labor_cost_code_id if still NULL.';

COMMENT ON FUNCTION auto_set_schedule_trade() IS
'Defaults work_schedules.trade_id from workers.trade_id if the schedule did not specify a trade.';

COMMENT ON COLUMN time_logs.trade_id IS
'Canonical trade for this time entry (per project/day; worker can have different trades on different jobs).';

COMMENT ON COLUMN work_schedules.trade_id IS
'Canonical trade for this scheduled shift (per project); can differ from workers.trade_id.';

COMMENT ON COLUMN workers.trade_id IS
'Worker primary trade; used only as a default when schedules/time_logs do not explicitly set a trade.';


-- =========================================================
-- PART 2: Make sync_work_schedule_to_time_log NOT touch
--         trade_id or cost_code_id (delegate to trigger)
-- =========================================================

CREATE OR REPLACE FUNCTION sync_work_schedule_to_time_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only auto-sync if date has ALREADY PASSED (not today, must be in past)
  IF NEW.scheduled_date < CURRENT_DATE THEN

    -- Case 1: Updating an existing linked time_log
    IF EXISTS (
      SELECT 1 FROM time_logs
      WHERE source_schedule_id = NEW.id
    ) THEN
      UPDATE time_logs
      SET
        worker_id      = NEW.worker_id,
        project_id     = NEW.project_id,
        company_id     = NEW.company_id,
        hours_worked   = NEW.scheduled_hours,
        notes          = NEW.notes,
        date           = NEW.scheduled_date,
        last_synced_at = now()
      WHERE source_schedule_id = NEW.id
        AND (
          worker_id    IS DISTINCT FROM NEW.worker_id OR
          project_id   IS DISTINCT FROM NEW.project_id OR
          company_id   IS DISTINCT FROM NEW.company_id OR
          hours_worked IS DISTINCT FROM NEW.scheduled_hours OR
          notes        IS DISTINCT FROM NEW.notes OR
          date         IS DISTINCT FROM NEW.scheduled_date
        );

    -- Case 2: First time creating the linked time_log
    ELSE
      INSERT INTO time_logs (
        source_schedule_id,
        worker_id,
        project_id,
        company_id,
        hours_worked,
        notes,
        date,
        last_synced_at
      )
      VALUES (
        NEW.id,
        NEW.worker_id,
        NEW.project_id,
        NEW.company_id,
        NEW.scheduled_hours,
        NEW.notes,
        NEW.scheduled_date,
        now()
      );
      -- trade_id and cost_code_id will be set by
      -- trigger_auto_set_time_log_trade_and_cost_code
    END IF;

    NEW.status := 'synced';
    NEW.last_synced_at := now();
    NEW.converted_to_timelog := true;

  -- Manual conversion path: user flips converted_to_timelog = true
  ELSIF NEW.converted_to_timelog = true
        AND (OLD.converted_to_timelog IS NULL OR OLD.converted_to_timelog = false) THEN

    IF NOT EXISTS (
      SELECT 1 FROM time_logs
      WHERE source_schedule_id = NEW.id
    ) THEN
      INSERT INTO time_logs (
        source_schedule_id,
        worker_id,
        project_id,
        company_id,
        hours_worked,
        notes,
        date,
        last_synced_at
      )
      VALUES (
        NEW.id,
        NEW.worker_id,
        NEW.project_id,
        NEW.company_id,
        NEW.scheduled_hours,
        NEW.notes,
        NEW.scheduled_date,
        now()
      );
      -- Again: trade_id & cost_code_id filled by BEFORE trigger
    END IF;

    NEW.status := 'synced';
    NEW.last_synced_at := now();
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION sync_work_schedule_to_time_log() IS
'Keeps work_schedules and time_logs in sync for past dates.
Does NOT set trade_id or cost_code_id directly; those are resolved
by auto_set_time_log_trade_and_cost_code() so trade is canonical per time entry.';