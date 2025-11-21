-- Add payment tracking to daily_logs
ALTER TABLE daily_logs 
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;

-- Create index for quick unpaid labor queries
CREATE INDEX IF NOT EXISTS idx_daily_logs_payment_status ON daily_logs(project_id, payment_status) WHERE payment_status = 'unpaid';

-- Create a view for unpaid labor bills grouped by company and project
CREATE OR REPLACE VIEW unpaid_labor_bills AS
SELECT 
  p.company_id,
  c.name as company_name,
  dl.project_id,
  proj.project_name,
  MIN(dl.date) as period_start,
  MAX(dl.date) as period_end,
  COUNT(dl.id) as log_count,
  SUM(dl.hours_worked) as total_hours,
  SUM(dl.hours_worked * w.hourly_rate) as total_amount
FROM daily_logs dl
JOIN projects p ON dl.project_id = p.id
LEFT JOIN companies c ON p.company_id = c.id
JOIN workers w ON dl.worker_id = w.id
LEFT JOIN projects proj ON dl.project_id = proj.id
WHERE dl.payment_status = 'unpaid'
GROUP BY p.company_id, c.name, dl.project_id, proj.project_name
ORDER BY period_end DESC;

COMMENT ON COLUMN daily_logs.payment_status IS 'Tracks whether labor has been paid: unpaid or paid';
COMMENT ON COLUMN daily_logs.payment_id IS 'Links to the payment record that paid for this labor';
COMMENT ON COLUMN daily_logs.paid_amount IS 'Amount actually paid for this log (usually hours * rate)';
COMMENT ON VIEW unpaid_labor_bills IS 'Shows unpaid labor grouped as bills by company and project';