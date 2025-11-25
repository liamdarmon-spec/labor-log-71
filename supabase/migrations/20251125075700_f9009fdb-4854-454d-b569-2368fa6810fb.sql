BEGIN;

-- =====================================================
-- FINANCIAL QUERY OPTIMIZATION (VIEWS + INDEXES ONLY)
-- Uses actual schema: time_logs, costs, estimates,
-- sub_invoices, sub_payments, projects.
-- No tables, no triggers, no data changes.
-- =====================================================

-- ---------------------------------
-- VIEW 1: Project-level COST summary
-- ---------------------------------
CREATE OR REPLACE VIEW public.project_cost_summary_view AS
SELECT
  c.project_id,
  p.company_id,
  p.project_name,
  SUM(c.amount) AS total_cost,
  SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END) AS paid_cost,
  SUM(CASE WHEN c.status = 'unpaid' THEN c.amount ELSE 0 END) AS unpaid_cost,
  SUM(CASE WHEN c.category = 'subs' THEN c.amount ELSE 0 END) AS subs_cost,
  SUM(CASE WHEN c.category = 'materials' THEN c.amount ELSE 0 END) AS materials_cost,
  SUM(CASE WHEN c.category = 'misc' THEN c.amount ELSE 0 END) AS misc_cost,
  SUM(CASE WHEN c.category = 'subs' AND c.status = 'unpaid' THEN c.amount ELSE 0 END) AS subs_unpaid,
  SUM(CASE WHEN c.category = 'materials' AND c.status = 'unpaid' THEN c.amount ELSE 0 END) AS materials_unpaid,
  SUM(CASE WHEN c.category = 'misc' AND c.status = 'unpaid' THEN c.amount ELSE 0 END) AS misc_unpaid,
  COUNT(c.id) AS cost_entry_count
FROM public.costs c
INNER JOIN public.projects p ON c.project_id = p.id
GROUP BY c.project_id, p.company_id, p.project_name;

-- ---------------------------------
-- VIEW 2: Project-level LABOR summary
-- ---------------------------------
CREATE OR REPLACE VIEW public.project_labor_summary_view AS
SELECT
  tl.project_id,
  tl.company_id,
  p.project_name,
  SUM(tl.hours_worked) AS total_hours,
  SUM(tl.labor_cost) AS total_labor_cost,
  SUM(CASE WHEN tl.payment_status = 'paid' THEN tl.labor_cost ELSE 0 END) AS paid_labor_cost,
  SUM(CASE WHEN tl.payment_status = 'unpaid' THEN tl.labor_cost ELSE 0 END) AS unpaid_labor_cost,
  SUM(CASE WHEN tl.payment_status = 'paid' THEN tl.hours_worked ELSE 0 END) AS paid_hours,
  SUM(CASE WHEN tl.payment_status = 'unpaid' THEN tl.hours_worked ELSE 0 END) AS unpaid_hours,
  COUNT(DISTINCT tl.worker_id) AS worker_count,
  COUNT(tl.id) AS time_log_count
FROM public.time_logs tl
LEFT JOIN public.projects p ON tl.project_id = p.id
GROUP BY tl.project_id, tl.company_id, p.project_name;

-- ---------------------------------
-- VIEW 3: GLOBAL financial summary
-- ---------------------------------
CREATE OR REPLACE VIEW public.global_financial_summary_view AS
WITH labor_summary AS (
  SELECT
    COALESCE(SUM(labor_cost), 0) AS total_labor_cost,
    COALESCE(SUM(CASE WHEN payment_status = 'unpaid' THEN labor_cost ELSE 0 END), 0) AS unpaid_labor_cost
  FROM public.time_logs
),
costs_summary AS (
  SELECT
    COALESCE(SUM(CASE WHEN category = 'subs' THEN amount ELSE 0 END), 0) AS subs_cost,
    COALESCE(SUM(CASE WHEN category = 'subs' AND status = 'unpaid' THEN amount ELSE 0 END), 0) AS subs_unpaid,
    COALESCE(SUM(CASE WHEN category = 'materials' THEN amount ELSE 0 END), 0) AS materials_cost,
    COALESCE(SUM(CASE WHEN category = 'materials' AND status = 'unpaid' THEN amount ELSE 0 END), 0) AS materials_unpaid,
    COALESCE(SUM(CASE WHEN category = 'misc' THEN amount ELSE 0 END), 0) AS misc_cost,
    COALESCE(SUM(CASE WHEN category = 'misc' AND status = 'unpaid' THEN amount ELSE 0 END), 0) AS misc_unpaid
  FROM public.costs
),
revenue_summary AS (
  SELECT
    COALESCE(SUM(total_amount), 0) AS total_revenue
  FROM public.estimates
  WHERE status = 'accepted'
),
retention_held_summary AS (
  SELECT
    COALESCE(SUM(retention_amount), 0) AS total_retention_held
  FROM public.sub_invoices
),
retention_released_summary AS (
  SELECT
    COALESCE(SUM(retention_released), 0) AS total_retention_released
  FROM public.sub_payments
)
SELECT
  revenue_summary.total_revenue AS revenue,
  labor_summary.total_labor_cost AS labor_actual,
  labor_summary.unpaid_labor_cost AS labor_unpaid,
  costs_summary.subs_cost AS subs_actual,
  costs_summary.subs_unpaid AS subs_unpaid,
  costs_summary.materials_cost AS materials_actual,
  costs_summary.materials_unpaid AS materials_unpaid,
  costs_summary.misc_cost AS misc_actual,
  costs_summary.misc_unpaid AS misc_unpaid,
  (retention_held_summary.total_retention_held - retention_released_summary.total_retention_released) AS retention_held,
  (labor_summary.total_labor_cost + costs_summary.subs_cost + costs_summary.materials_cost + costs_summary.misc_cost) AS total_costs,
  (revenue_summary.total_revenue - (labor_summary.total_labor_cost + costs_summary.subs_cost + costs_summary.materials_cost + costs_summary.misc_cost)) AS profit,
  (labor_summary.unpaid_labor_cost + costs_summary.subs_unpaid + costs_summary.materials_unpaid + costs_summary.misc_unpaid) AS total_outstanding
FROM labor_summary, costs_summary, revenue_summary, retention_held_summary, retention_released_summary;

-- ---------------------------------
-- INDEXES (READ PERFORMANCE ONLY)
-- ---------------------------------
CREATE INDEX IF NOT EXISTS idx_time_logs_project_payment
  ON public.time_logs(project_id, payment_status);

CREATE INDEX IF NOT EXISTS idx_costs_project_category_status
  ON public.costs(project_id, category, status);

COMMIT;