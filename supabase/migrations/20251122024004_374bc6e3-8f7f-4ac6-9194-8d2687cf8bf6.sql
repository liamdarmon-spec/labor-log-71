-- Create workforce activity feed view
CREATE OR REPLACE VIEW workforce_activity_feed AS
-- Schedule created events
SELECT 
  'schedule:' || ss.id::text as id,
  CASE 
    WHEN ss.created_at = ss.updated_at THEN 'schedule_created'
    ELSE 'schedule_updated'
  END as event_type,
  ss.created_at as event_at,
  ss.worker_id,
  w.name as worker_name,
  p.company_id,
  c.name as company_name,
  ss.project_id,
  p.project_name,
  ss.scheduled_hours as hours,
  NULL::numeric as amount,
  jsonb_build_object(
    'schedule_id', ss.id,
    'trade_id', ss.trade_id,
    'status', ss.status,
    'notes', ss.notes,
    'date', ss.scheduled_date
  ) as meta
FROM scheduled_shifts ss
LEFT JOIN workers w ON w.id = ss.worker_id
LEFT JOIN projects p ON p.id = ss.project_id
LEFT JOIN companies c ON c.id = p.company_id
WHERE ss.created_at > now() - interval '90 days'

UNION ALL

-- Time log events
SELECT 
  'timelog:' || dl.id::text as id,
  CASE 
    WHEN dl.created_at::date = dl.date THEN 'time_log_created'
    ELSE 'time_log_updated'
  END as event_type,
  dl.created_at as event_at,
  dl.worker_id,
  w.name as worker_name,
  p.company_id,
  c.name as company_name,
  dl.project_id,
  p.project_name,
  dl.hours_worked as hours,
  (dl.hours_worked * w.hourly_rate) as amount,
  jsonb_build_object(
    'log_id', dl.id,
    'trade_id', dl.trade_id,
    'payment_status', dl.payment_status,
    'payment_id', dl.payment_id,
    'notes', dl.notes,
    'date', dl.date,
    'hourly_rate', w.hourly_rate
  ) as meta
FROM daily_logs dl
LEFT JOIN workers w ON w.id = dl.worker_id
LEFT JOIN projects p ON p.id = dl.project_id
LEFT JOIN companies c ON c.id = p.company_id
WHERE dl.created_at > now() - interval '90 days'

UNION ALL

-- Payment events
SELECT 
  'payment:' || pay.id::text as id,
  CASE 
    WHEN pay.created_at = pay.updated_at THEN 'payment_created'
    ELSE 'payment_updated'
  END as event_type,
  pay.created_at as event_at,
  NULL::uuid as worker_id,
  NULL::text as worker_name,
  pay.company_id,
  c.name as company_name,
  NULL::uuid as project_id,
  NULL::text as project_name,
  NULL::numeric as hours,
  pay.amount,
  jsonb_build_object(
    'payment_id', pay.id,
    'start_date', pay.start_date,
    'end_date', pay.end_date,
    'payment_date', pay.payment_date,
    'paid_by', pay.paid_by,
    'paid_via', pay.paid_via,
    'reimbursement_status', pay.reimbursement_status,
    'notes', pay.notes,
    'log_count', (
      SELECT COUNT(*) 
      FROM daily_logs 
      WHERE payment_id = pay.id
    )
  ) as meta
FROM payments pay
LEFT JOIN companies c ON c.id = pay.company_id
WHERE pay.created_at > now() - interval '90 days';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_created_at ON scheduled_shifts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_worker_id ON scheduled_shifts(worker_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_created_at ON daily_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_worker_id ON daily_logs(worker_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments(company_id);

COMMENT ON VIEW workforce_activity_feed IS 'Unified activity feed for workforce events: schedules, time logs, and payments';