-- Create optimized read-only views for Workforce & Pay Center

-- 1. work_schedule_grid_view – optimized for weekly worker × day grid
DROP VIEW IF EXISTS public.work_schedule_grid_view CASCADE;
CREATE VIEW public.work_schedule_grid_view AS
SELECT
  ws.id,
  ws.worker_id,
  w.name          AS worker_name,
  w.trade_id      AS worker_trade_id,
  t.name          AS worker_trade_name,
  ws.project_id,
  p.project_name,
  ws.company_id,
  c.name          AS company_name,
  ws.trade_id,
  ws.cost_code_id,
  cc.code         AS cost_code,
  cc.name         AS cost_code_name,
  ws.scheduled_date,
  ws.scheduled_hours,
  ws.status,
  ws.notes,
  ws.converted_to_timelog,
  ws.last_synced_at,
  ws.created_at,
  ws.updated_at
FROM public.work_schedules ws
LEFT JOIN public.workers    w  ON w.id  = ws.worker_id
LEFT JOIN public.trades     t  ON t.id  = ws.trade_id
LEFT JOIN public.projects   p  ON p.id  = ws.project_id
LEFT JOIN public.companies  c  ON c.id  = ws.company_id
LEFT JOIN public.cost_codes cc ON cc.id = ws.cost_code_id;

-- 2. time_logs_with_meta_view – optimized for time logs tab and pay center
DROP VIEW IF EXISTS public.time_logs_with_meta_view CASCADE;
CREATE VIEW public.time_logs_with_meta_view AS
SELECT
  tl.id,
  tl.worker_id,
  w.name           AS worker_name,
  w.trade_id       AS worker_trade_id,
  t.name           AS worker_trade_name,
  tl.project_id,
  p.project_name,
  p.company_id,
  c.name           AS company_name,
  tl.company_id    AS override_company_id,
  tl.trade_id,
  tl.cost_code_id,
  cc.code          AS cost_code,
  cc.name          AS cost_code_name,
  tl.date,
  tl.hours_worked,
  tl.hourly_rate,
  tl.labor_cost,
  tl.payment_status,
  tl.paid_amount,
  tl.source_schedule_id,
  tl.notes,
  tl.last_synced_at,
  tl.created_at
FROM public.time_logs tl
LEFT JOIN public.workers    w  ON w.id  = tl.worker_id
LEFT JOIN public.trades     t  ON t.id  = tl.trade_id
LEFT JOIN public.projects   p  ON p.id  = tl.project_id
LEFT JOIN public.companies  c  ON c.id  = p.company_id
LEFT JOIN public.cost_codes cc ON cc.id = tl.cost_code_id;