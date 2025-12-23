-- Drop and recreate workforce_activity_feed view with proper type casting
DROP VIEW IF EXISTS workforce_activity_feed CASCADE;

DROP VIEW IF EXISTS workforce_activity_feed CASCADE;
DO $$
BEGIN
  IF to_regclass('public.time_logs') IS NOT NULL
     AND to_regclass('public.payments') IS NOT NULL
     AND to_regclass('public.activity_log') IS NOT NULL
     AND to_regclass('public.work_schedules') IS NOT NULL
     AND to_regclass('public.workers') IS NOT NULL
     AND to_regclass('public.companies') IS NOT NULL
     AND to_regclass('public.projects') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='time_logs' AND column_name='payment_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='company_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='amount')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='start_date')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='end_date')
  THEN
     EXECUTE $view$CREATE OR REPLACE VIEW public.workforce_activity_feed AS
SELECT 
  al.id::text as id,
  al.action || '_' || al.entity_type as event_type,
  al.created_at as event_at,
  CASE 
    WHEN al.entity_type = 'work_schedule' THEN ws.worker_id
    WHEN al.entity_type = 'time_log' THEN tl.worker_id
    ELSE NULL
  END as worker_id,
  CASE 
    WHEN al.entity_type = 'work_schedule' THEN w1.name
    WHEN al.entity_type = 'time_log' THEN w2.name
    ELSE NULL
  END as worker_name,
  CASE 
    WHEN al.entity_type = 'work_schedule' THEN ws.company_id
    WHEN al.entity_type = 'time_log' THEN tl.company_id
    WHEN al.entity_type = 'payment' THEN p.company_id
    ELSE NULL
  END as company_id,
  CASE 
    WHEN al.entity_type = 'work_schedule' THEN c1.name
    WHEN al.entity_type = 'time_log' THEN c2.name
    WHEN al.entity_type = 'payment' THEN c3.name
    ELSE NULL
  END as company_name,
  CASE 
    WHEN al.entity_type = 'work_schedule' THEN ws.project_id
    WHEN al.entity_type = 'time_log' THEN tl.project_id
    ELSE NULL
  END as project_id,
  CASE 
    WHEN al.entity_type = 'work_schedule' THEN proj1.project_name
    WHEN al.entity_type = 'time_log' THEN proj2.project_name
    ELSE NULL
  END as project_name,
  CASE 
    WHEN al.entity_type = 'work_schedule' THEN ws.scheduled_hours
    WHEN al.entity_type = 'time_log' THEN tl.hours_worked
    ELSE NULL
  END as hours,
  CASE 
    WHEN al.entity_type = 'payment' THEN p.amount
    ELSE NULL
  END as amount,
  jsonb_build_object(
    'date', COALESCE(ws.scheduled_date::text, tl.date::text),
    'payment_id', p.id,
    'start_date', p.start_date::text,
    'end_date', p.end_date::text,
    'log_count', (SELECT COUNT(*) FROM time_logs WHERE payment_id = p.id)
  ) as meta
FROM activity_log al
LEFT JOIN work_schedules ws ON al.entity_id::text = ws.id::text AND al.entity_type = 'work_schedule'
LEFT JOIN time_logs tl ON al.entity_id::text = tl.id::text AND al.entity_type = 'time_log'
LEFT JOIN payments p ON al.entity_id::text = p.id::text AND al.entity_type = 'payment'
LEFT JOIN workers w1 ON ws.worker_id = w1.id
LEFT JOIN workers w2 ON tl.worker_id = w2.id
LEFT JOIN companies c1 ON ws.company_id = c1.id
LEFT JOIN companies c2 ON tl.company_id = c2.id
LEFT JOIN companies c3 ON p.company_id = c3.id
LEFT JOIN projects proj1 ON ws.project_id = proj1.id
LEFT JOIN projects proj2 ON tl.project_id = proj2.id
WHERE al.entity_type IN ('work_schedule', 'time_log', 'payment');
     $view$;
  END IF;
END $$;

-- Add triggers to log activity for work_schedules
DROP TRIGGER IF EXISTS log_work_schedule_activity ON work_schedules;
CREATE TRIGGER log_work_schedule_activity
AFTER INSERT OR UPDATE OR DELETE ON work_schedules
FOR EACH ROW
EXECUTE FUNCTION log_activity('work_schedule');

-- Add triggers to log activity for time_logs
DROP TRIGGER IF EXISTS log_time_log_activity ON time_logs;
CREATE TRIGGER log_time_log_activity
AFTER INSERT OR UPDATE OR DELETE ON time_logs
FOR EACH ROW
EXECUTE FUNCTION log_activity('time_log');

-- Add triggers to log activity for payments (if not exists)
DROP TRIGGER IF EXISTS log_payment_activity ON payments;
CREATE TRIGGER log_payment_activity
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION log_activity('payment');