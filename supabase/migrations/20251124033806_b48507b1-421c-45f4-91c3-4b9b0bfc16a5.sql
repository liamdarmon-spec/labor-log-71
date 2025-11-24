
-- Fix: Change sync_work_schedule_to_time_log trigger from BEFORE to AFTER INSERT
-- This ensures the work_schedules row exists before time_logs tries to reference it

DROP TRIGGER IF EXISTS sync_schedule_to_log ON work_schedules;

CREATE TRIGGER sync_schedule_to_log
  AFTER INSERT ON work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION sync_work_schedule_to_time_log();

COMMENT ON TRIGGER sync_schedule_to_log ON work_schedules IS 
'Auto-creates time_logs for past schedules AFTER the schedule row exists (fixed FK constraint issue)';
