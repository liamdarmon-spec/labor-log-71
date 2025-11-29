-- ============================
-- Workforce & Pay Center Performance Indexes
-- Optimized for 2,000+ time logs per day
-- ============================

-- ============================
-- 1) time_logs – core canonical table
-- ============================

-- By payment_status + date (used for unpaid/paid filters over date ranges)
CREATE INDEX IF NOT EXISTS idx_time_logs_payment_status_date
  ON public.time_logs (payment_status, date);

-- By worker + date (used when filtering by worker in Pay Center / Time Logs)
CREATE INDEX IF NOT EXISTS idx_time_logs_worker_date
  ON public.time_logs (worker_id, date);

-- By project + date (used when grouping / filtering by project)
CREATE INDEX IF NOT EXISTS idx_time_logs_project_date
  ON public.time_logs (project_id, date);

-- Simple date index as a general fallback
CREATE INDEX IF NOT EXISTS idx_time_logs_date
  ON public.time_logs (date);

-- ============================
-- 2) work_schedules – schedule tab & sync trigger
-- ============================

-- By scheduled_date (used for weekly grid + sync trigger scanning by date)
CREATE INDEX IF NOT EXISTS idx_work_schedules_scheduled_date
  ON public.work_schedules (scheduled_date);

-- By worker + scheduled_date (used in schedule views and conflict checks)
CREATE INDEX IF NOT EXISTS idx_work_schedules_worker_date
  ON public.work_schedules (worker_id, scheduled_date);

-- By status + scheduled_date (used by sync/cleanup processes)
CREATE INDEX IF NOT EXISTS idx_work_schedules_status_date
  ON public.work_schedules (status, scheduled_date);

-- ============================
-- 3) labor_pay_runs – pay run list & metrics
-- ============================

-- By created_at (recent pay runs in period)
CREATE INDEX IF NOT EXISTS idx_labor_pay_runs_created_at
  ON public.labor_pay_runs (created_at);

-- By payment_date + status (used when counting 'paid' runs in a period)
CREATE INDEX IF NOT EXISTS idx_labor_pay_runs_payment_date_status
  ON public.labor_pay_runs (payment_date, status);

-- By payer_company_id (filter by company in Pay Center)
CREATE INDEX IF NOT EXISTS idx_labor_pay_runs_payer_company
  ON public.labor_pay_runs (payer_company_id);

-- ============================
-- 4) labor_pay_run_items – join table between pay runs and time_logs
-- ============================

CREATE INDEX IF NOT EXISTS idx_labor_pay_run_items_pay_run_id
  ON public.labor_pay_run_items (pay_run_id);

CREATE INDEX IF NOT EXISTS idx_labor_pay_run_items_time_log_id
  ON public.labor_pay_run_items (time_log_id);