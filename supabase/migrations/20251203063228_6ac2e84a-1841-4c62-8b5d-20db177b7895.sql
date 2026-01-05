-- PROJECT BUDGET VS ACTUAL BACKBONE
-- ---------------------------------
-- 1) Per-project budget vs actual view
-- 2) Helper function to fetch a single project's overview

-- Drop existing view if present (safe / idempotent)
DROP VIEW IF EXISTS public.project_budget_vs_actual_view;

DROP VIEW IF EXISTS public.project_budget_vs_actual_view CASCADE;
CREATE VIEW public.project_budget_vs_actual_view AS
WITH budget AS (
    SELECT
        pb.project_id,
        pb.id                         AS project_budget_id,
        pb.labor_budget,
        pb.subs_budget,
        pb.materials_budget,
        pb.other_budget,
        (COALESCE(pb.labor_budget, 0)
         + COALESCE(pb.subs_budget, 0)
         + COALESCE(pb.materials_budget, 0)
         + COALESCE(pb.other_budget, 0)) AS total_budget
    FROM public.project_budgets pb
),

labor_actuals AS (
    SELECT
        tl.project_id,
        COALESCE(SUM(tl.labor_cost), 0) AS labor_actual,
        COALESCE(SUM(CASE WHEN tl.payment_status = 'unpaid'
                          THEN tl.labor_cost ELSE 0 END), 0) AS labor_unpaid
    FROM public.time_logs tl
    GROUP BY tl.project_id
),

costs_actuals AS (
    SELECT
        c.project_id,
        c.category, -- 'subs' | 'materials' | 'other'
        COALESCE(SUM(c.amount), 0) AS actual_amount,
        COALESCE(SUM(CASE WHEN c.status = 'unpaid'
                          THEN c.amount ELSE 0 END), 0) AS unpaid_amount
    FROM public.costs c
    GROUP BY c.project_id, c.category
),

costs_pivot AS (
    SELECT
        ca.project_id,
        COALESCE(SUM(CASE WHEN ca.category = 'subs'
                          THEN ca.actual_amount ELSE 0 END), 0) AS subs_actual,
        COALESCE(SUM(CASE WHEN ca.category = 'subs'
                          THEN ca.unpaid_amount ELSE 0 END), 0) AS subs_unpaid,
        COALESCE(SUM(CASE WHEN ca.category = 'materials'
                          THEN ca.actual_amount ELSE 0 END), 0) AS materials_actual,
        COALESCE(SUM(CASE WHEN ca.category = 'materials'
                          THEN ca.unpaid_amount ELSE 0 END), 0) AS materials_unpaid,
        COALESCE(SUM(CASE WHEN ca.category = 'other'
                          THEN ca.actual_amount ELSE 0 END), 0) AS other_actual,
        COALESCE(SUM(CASE WHEN ca.category = 'other'
                          THEN ca.unpaid_amount ELSE 0 END), 0) AS other_unpaid
    FROM costs_actuals ca
    GROUP BY ca.project_id
),

revenue AS (
    SELECT
        e.project_id,
        COALESCE(SUM(e.total_amount), 0) AS total_revenue
    FROM public.estimates e
    WHERE e.status = 'accepted'
    GROUP BY e.project_id
),

retention AS (
    SELECT
        i.project_id,
        COALESCE(SUM(i.retention_amount), 0) AS retention_held
    FROM public.invoices i
    WHERE i.status <> 'void'
    GROUP BY i.project_id
)

SELECT
    p.id                         AS project_id,
    p.project_name               AS project_name,

    b.project_budget_id,

    -- Budget (4-way)
    COALESCE(b.labor_budget, 0)      AS labor_budget,
    COALESCE(b.subs_budget, 0)       AS subs_budget,
    COALESCE(b.materials_budget, 0)  AS materials_budget,
    COALESCE(b.other_budget, 0)      AS other_budget,
    COALESCE(b.total_budget, 0)      AS total_budget,

    -- Actuals (4-way)
    COALESCE(la.labor_actual, 0)         AS labor_actual,
    COALESCE(cp.subs_actual, 0)          AS subs_actual,
    COALESCE(cp.materials_actual, 0)     AS materials_actual,
    COALESCE(cp.other_actual, 0)         AS other_actual,

    -- Unpaid (4-way)
    COALESCE(la.labor_unpaid, 0)         AS labor_unpaid,
    COALESCE(cp.subs_unpaid, 0)          AS subs_unpaid,
    COALESCE(cp.materials_unpaid, 0)     AS materials_unpaid,
    COALESCE(cp.other_unpaid, 0)         AS other_unpaid,

    -- Revenue & retention
    COALESCE(r.total_revenue, 0)         AS total_revenue,
    COALESCE(ret.retention_held, 0)      AS retention_held,

    -- Totals & profit
    (COALESCE(la.labor_actual, 0)
     + COALESCE(cp.subs_actual, 0)
     + COALESCE(cp.materials_actual, 0)
     + COALESCE(cp.other_actual, 0))     AS total_actual_costs,

    (COALESCE(r.total_revenue, 0)
     - (COALESCE(la.labor_actual, 0)
        + COALESCE(cp.subs_actual, 0)
        + COALESCE(cp.materials_actual, 0)
        + COALESCE(cp.other_actual, 0))) AS profit,

    (COALESCE(la.labor_unpaid, 0)
     + COALESCE(cp.subs_unpaid, 0)
     + COALESCE(cp.materials_unpaid, 0)
     + COALESCE(cp.other_unpaid, 0))     AS total_outstanding

FROM public.projects p
LEFT JOIN budget        b   ON b.project_id = p.id
LEFT JOIN labor_actuals la  ON la.project_id = p.id
LEFT JOIN costs_pivot   cp  ON cp.project_id = p.id
LEFT JOIN revenue       r   ON r.project_id = p.id
LEFT JOIN retention     ret ON ret.project_id = p.id;

-- Helper: single-project RPC-style function
DROP FUNCTION IF EXISTS public.get_project_budget_overview(uuid);
CREATE FUNCTION public.get_project_budget_overview(p_project_id uuid)
RETURNS SETOF public.project_budget_vs_actual_view
LANGUAGE sql
STABLE
AS $func$
    SELECT *
    FROM public.project_budget_vs_actual_view
    WHERE project_id = p_project_id;
$func$;