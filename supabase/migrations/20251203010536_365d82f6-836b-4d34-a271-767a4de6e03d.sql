DROP VIEW IF EXISTS public.global_financial_summary_view;

CREATE VIEW public.global_financial_summary_view AS
WITH labor_summary AS (
    SELECT 
        COALESCE(sum(time_logs.labor_cost), 0) AS total_labor_cost,
        COALESCE(sum(CASE WHEN payment_status = 'unpaid' THEN labor_cost ELSE 0 END), 0) AS unpaid_labor_cost
    FROM time_logs
),
costs_summary AS (
    SELECT 
        COALESCE(sum(CASE WHEN category = 'subs' THEN amount ELSE 0 END), 0) AS subs_cost,
        COALESCE(sum(CASE WHEN category = 'subs' AND status = 'unpaid' THEN amount ELSE 0 END), 0) AS subs_unpaid,
        COALESCE(sum(CASE WHEN category = 'materials' THEN amount ELSE 0 END), 0) AS materials_cost,
        COALESCE(sum(CASE WHEN category = 'materials' AND status = 'unpaid' THEN amount ELSE 0 END), 0) AS materials_unpaid,
        COALESCE(sum(CASE WHEN category = 'other' THEN amount ELSE 0 END), 0) AS other_cost,
        COALESCE(sum(CASE WHEN category = 'other' AND status = 'unpaid' THEN amount ELSE 0 END), 0) AS other_unpaid
    FROM costs
),
revenue_summary AS (
    SELECT COALESCE(sum(total_amount), 0) AS total_revenue
    FROM estimates 
    WHERE status = 'accepted'
),
retention_summary AS (
    SELECT COALESCE(sum(retention_amount), 0) AS total_retention
    FROM invoices 
    WHERE status <> 'void'
)
SELECT 
    r.total_revenue AS revenue,
    l.total_labor_cost AS labor_actual,
    l.unpaid_labor_cost AS labor_unpaid,
    c.subs_cost AS subs_actual,
    c.subs_unpaid,
    c.materials_cost AS materials_actual,
    c.materials_unpaid,
    c.other_cost AS other_actual,
    c.other_unpaid,
    ret.total_retention AS retention_held,
    (l.total_labor_cost + c.subs_cost + c.materials_cost + c.other_cost) AS total_costs,
    (r.total_revenue - (l.total_labor_cost + c.subs_cost + c.materials_cost + c.other_cost)) AS profit,
    (l.unpaid_labor_cost + c.subs_unpaid + c.materials_unpaid + c.other_unpaid) AS total_outstanding
FROM labor_summary l, costs_summary c, revenue_summary r, retention_summary ret;