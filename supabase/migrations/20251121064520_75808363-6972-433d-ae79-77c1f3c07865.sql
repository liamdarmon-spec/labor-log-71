-- Create payment labor summary view to link payments with time logs
-- This view helps show which workers were paid in which pay periods
CREATE OR REPLACE VIEW payment_labor_summary AS
SELECT
  p.id AS payment_id,
  p.start_date,
  p.end_date,
  p.paid_by,
  p.payment_date,
  dl.worker_id,
  w.name AS worker_name,
  w.trade AS worker_trade,
  dl.project_id,
  proj.project_name,
  SUM(dl.hours_worked) AS total_hours,
  SUM(dl.hours_worked * w.hourly_rate) AS labor_cost
FROM payments p
CROSS JOIN daily_logs dl
JOIN workers w ON w.id = dl.worker_id
JOIN projects proj ON proj.id = dl.project_id
WHERE dl.date BETWEEN p.start_date AND p.end_date
GROUP BY p.id, p.start_date, p.end_date, p.paid_by, p.payment_date, 
         dl.worker_id, w.name, w.trade, dl.project_id, proj.project_name;

-- Grant access to authenticated users
GRANT SELECT ON payment_labor_summary TO authenticated;