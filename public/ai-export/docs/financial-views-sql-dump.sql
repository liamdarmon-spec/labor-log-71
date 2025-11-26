-- =============================================================================
-- FORMA TRACKING - FINANCIAL VIEWS SQL DUMP
-- Generated: 2025-11-26
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. project_labor_summary_view
-- Purpose: Aggregates time_logs by project with labor cost, hours, and payment status breakdown
-- Source table: time_logs (canonical labor table)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.project_labor_summary_view AS
SELECT 
  tl.project_id,
  tl.company_id,
  p.project_name,
  sum(tl.hours_worked) AS total_hours,
  sum(tl.labor_cost) AS total_labor_cost,
  sum(
    CASE
      WHEN (tl.payment_status = 'paid'::text) THEN tl.labor_cost
      ELSE (0)::numeric
    END
  ) AS paid_labor_cost,
  sum(
    CASE
      WHEN (tl.payment_status = 'unpaid'::text) THEN tl.labor_cost
      ELSE (0)::numeric
    END
  ) AS unpaid_labor_cost,
  sum(
    CASE
      WHEN (tl.payment_status = 'paid'::text) THEN tl.hours_worked
      ELSE (0)::numeric
    END
  ) AS paid_hours,
  sum(
    CASE
      WHEN (tl.payment_status = 'unpaid'::text) THEN tl.hours_worked
      ELSE (0)::numeric
    END
  ) AS unpaid_hours,
  count(DISTINCT tl.worker_id) AS worker_count,
  count(tl.id) AS time_log_count
FROM time_logs tl
LEFT JOIN projects p ON (tl.project_id = p.id)
GROUP BY tl.project_id, tl.company_id, p.project_name;


-- -----------------------------------------------------------------------------
-- 2. project_labor_summary (LEGACY - uses day_cards)
-- Purpose: Legacy view using day_cards and time_log_allocations
-- Note: Consider migrating to project_labor_summary_view which uses canonical time_logs
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.project_labor_summary AS
SELECT 
  p.id AS project_id,
  p.project_name,
  count(DISTINCT dc.worker_id) AS worker_count,
  sum(dc.logged_hours) AS total_hours_logged,
  sum(dc.scheduled_hours) AS total_hours_scheduled,
  sum(COALESCE((dc.logged_hours * dc.pay_rate), (0)::numeric)) AS total_labor_cost,
  sum(
    CASE
      WHEN ((dc.pay_status = 'unpaid'::text) AND (dc.logged_hours > (0)::numeric)) 
      THEN (dc.logged_hours * dc.pay_rate)
      ELSE (0)::numeric
    END
  ) AS unpaid_labor_cost,
  sum(
    CASE
      WHEN ((dc.pay_status = 'paid'::text) AND (dc.logged_hours > (0)::numeric)) 
      THEN (dc.logged_hours * dc.pay_rate)
      ELSE (0)::numeric
    END
  ) AS paid_labor_cost,
  max(dc.date) AS last_activity_date
FROM projects p
LEFT JOIN time_log_allocations tla ON (tla.project_id = p.id)
LEFT JOIN day_cards dc ON (dc.id = tla.day_card_id)
GROUP BY p.id, p.project_name;


-- -----------------------------------------------------------------------------
-- 3. project_cost_summary_view
-- Purpose: Aggregates non-labor costs by project and category (subs, materials, misc)
-- Source table: costs (canonical non-labor costs table)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.project_cost_summary_view AS
SELECT 
  c.project_id,
  p.company_id,
  p.project_name,
  sum(c.amount) AS total_cost,
  sum(
    CASE
      WHEN (c.status = 'paid'::text) THEN c.amount
      ELSE (0)::numeric
    END
  ) AS paid_cost,
  sum(
    CASE
      WHEN (c.status = 'unpaid'::text) THEN c.amount
      ELSE (0)::numeric
    END
  ) AS unpaid_cost,
  sum(
    CASE
      WHEN (c.category = 'subs'::text) THEN c.amount
      ELSE (0)::numeric
    END
  ) AS subs_cost,
  sum(
    CASE
      WHEN (c.category = 'materials'::text) THEN c.amount
      ELSE (0)::numeric
    END
  ) AS materials_cost,
  sum(
    CASE
      WHEN (c.category = 'misc'::text) THEN c.amount
      ELSE (0)::numeric
    END
  ) AS misc_cost,
  sum(
    CASE
      WHEN ((c.category = 'subs'::text) AND (c.status = 'unpaid'::text)) THEN c.amount
      ELSE (0)::numeric
    END
  ) AS subs_unpaid,
  sum(
    CASE
      WHEN ((c.category = 'materials'::text) AND (c.status = 'unpaid'::text)) THEN c.amount
      ELSE (0)::numeric
    END
  ) AS materials_unpaid,
  sum(
    CASE
      WHEN ((c.category = 'misc'::text) AND (c.status = 'unpaid'::text)) THEN c.amount
      ELSE (0)::numeric
    END
  ) AS misc_unpaid,
  count(c.id) AS cost_entry_count
FROM costs c
JOIN projects p ON (c.project_id = p.id)
GROUP BY c.project_id, p.company_id, p.project_name;


-- -----------------------------------------------------------------------------
-- 4. project_revenue_summary_view
-- Purpose: Aggregates billed amounts from invoices by project (excludes voided invoices)
-- Source table: invoices
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.project_revenue_summary_view AS
SELECT 
  project_id,
  COALESCE(
    sum(
      CASE
        WHEN (status <> 'void'::text) THEN total_amount
        ELSE (0)::numeric
      END
    ), 
    (0)::numeric
  ) AS billed_amount
FROM invoices i
GROUP BY project_id;


-- -----------------------------------------------------------------------------
-- 5. global_financial_summary_view
-- Purpose: Company-wide financial rollup combining labor, costs, revenue, retention
-- Source tables: time_logs, costs, estimates, sub_invoices, sub_payments
-- Used by: useGlobalFinancials hook, FinancialsOverview dashboard
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.global_financial_summary_view AS
WITH labor_summary AS (
  SELECT 
    COALESCE(sum(time_logs.labor_cost), (0)::numeric) AS total_labor_cost,
    COALESCE(sum(
      CASE
        WHEN (time_logs.payment_status = 'unpaid'::text) THEN time_logs.labor_cost
        ELSE (0)::numeric
      END
    ), (0)::numeric) AS unpaid_labor_cost
  FROM time_logs
), 
costs_summary AS (
  SELECT 
    COALESCE(sum(
      CASE
        WHEN (costs.category = 'subs'::text) THEN costs.amount
        ELSE (0)::numeric
      END
    ), (0)::numeric) AS subs_cost,
    COALESCE(sum(
      CASE
        WHEN ((costs.category = 'subs'::text) AND (costs.status = 'unpaid'::text)) THEN costs.amount
        ELSE (0)::numeric
      END
    ), (0)::numeric) AS subs_unpaid,
    COALESCE(sum(
      CASE
        WHEN (costs.category = 'materials'::text) THEN costs.amount
        ELSE (0)::numeric
      END
    ), (0)::numeric) AS materials_cost,
    COALESCE(sum(
      CASE
        WHEN ((costs.category = 'materials'::text) AND (costs.status = 'unpaid'::text)) THEN costs.amount
        ELSE (0)::numeric
      END
    ), (0)::numeric) AS materials_unpaid,
    COALESCE(sum(
      CASE
        WHEN (costs.category = 'misc'::text) THEN costs.amount
        ELSE (0)::numeric
      END
    ), (0)::numeric) AS misc_cost,
    COALESCE(sum(
      CASE
        WHEN ((costs.category = 'misc'::text) AND (costs.status = 'unpaid'::text)) THEN costs.amount
        ELSE (0)::numeric
      END
    ), (0)::numeric) AS misc_unpaid
  FROM costs
), 
revenue_summary AS (
  SELECT COALESCE(sum(estimates.total_amount), (0)::numeric) AS total_revenue
  FROM estimates
  WHERE (estimates.status = 'accepted'::text)
), 
retention_held_summary AS (
  SELECT COALESCE(sum(sub_invoices.retention_amount), (0)::numeric) AS total_retention_held
  FROM sub_invoices
), 
retention_released_summary AS (
  SELECT COALESCE(sum(sub_payments.retention_released), (0)::numeric) AS total_retention_released
  FROM sub_payments
)
SELECT 
  revenue_summary.total_revenue AS revenue,
  labor_summary.total_labor_cost AS labor_actual,
  labor_summary.unpaid_labor_cost AS labor_unpaid,
  costs_summary.subs_cost AS subs_actual,
  costs_summary.subs_unpaid,
  costs_summary.materials_cost AS materials_actual,
  costs_summary.materials_unpaid,
  costs_summary.misc_cost AS misc_actual,
  costs_summary.misc_unpaid,
  (retention_held_summary.total_retention_held - retention_released_summary.total_retention_released) AS retention_held,
  (((labor_summary.total_labor_cost + costs_summary.subs_cost) + costs_summary.materials_cost) + costs_summary.misc_cost) AS total_costs,
  (revenue_summary.total_revenue - (((labor_summary.total_labor_cost + costs_summary.subs_cost) + costs_summary.materials_cost) + costs_summary.misc_cost)) AS profit,
  (((labor_summary.unpaid_labor_cost + costs_summary.subs_unpaid) + costs_summary.materials_unpaid) + costs_summary.misc_unpaid) AS total_outstanding
FROM labor_summary,
  costs_summary,
  revenue_summary,
  retention_held_summary,
  retention_released_summary;


-- =============================================================================
-- SUPPORTING INDEXES (for optimal view performance)
-- =============================================================================

-- Index for time_logs queries by project and payment status
CREATE INDEX IF NOT EXISTS idx_time_logs_project_payment 
ON time_logs (project_id, payment_status);

-- Index for costs queries by project, category, and status
CREATE INDEX IF NOT EXISTS idx_costs_project_category_status 
ON costs (project_id, category, status);

-- Index for invoices queries by project and status
CREATE INDEX IF NOT EXISTS idx_invoices_project_status 
ON invoices (project_id, status);


-- =============================================================================
-- VIEW DEPENDENCIES
-- =============================================================================
-- 
-- project_labor_summary_view:
--   - time_logs (canonical labor)
--   - projects
--
-- project_labor_summary (legacy):
--   - projects
--   - time_log_allocations
--   - day_cards (legacy)
--
-- project_cost_summary_view:
--   - costs (canonical non-labor costs)
--   - projects
--
-- project_revenue_summary_view:
--   - invoices
--
-- global_financial_summary_view:
--   - time_logs (labor)
--   - costs (subs, materials, misc)
--   - estimates (revenue from accepted estimates)
--   - sub_invoices (retention held)
--   - sub_payments (retention released)
--
-- =============================================================================
