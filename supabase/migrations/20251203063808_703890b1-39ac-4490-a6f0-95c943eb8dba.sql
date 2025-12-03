-- PROJECT BUDGET COST-CODE LEDGER
-- --------------------------------
-- 1) View: project_budget_ledger_view       (all projects)
-- 2) Function: get_project_budget_ledger()  (single project, RPC-friendly)

-- Drop existing view if present (safe / idempotent)
DROP VIEW IF EXISTS public.project_budget_ledger_view;

CREATE VIEW public.project_budget_ledger_view AS
WITH budget AS (
    SELECT
        pbl.project_id,
        pbl.cost_code_id,
        pbl.category,                          -- 'labor' | 'subs' | 'materials' | 'other'
        SUM(COALESCE(pbl.budget_amount, 0))    AS budget_amount,
        SUM(COALESCE(pbl.budget_hours, 0))     AS budget_hours,
        BOOL_OR(COALESCE(pbl.is_allowance, FALSE)) AS is_allowance
    FROM public.project_budget_lines pbl
    GROUP BY
        pbl.project_id,
        pbl.cost_code_id,
        pbl.category
),

labor_actuals AS (
    -- Labor actuals come from time_logs (labor_cost + hours_worked)
    SELECT
        tl.project_id,
        tl.cost_code_id,
        COALESCE(SUM(tl.labor_cost), 0) AS labor_actual_amount,
        COALESCE(SUM(COALESCE(tl.hours_worked, 0)), 0) AS labor_actual_hours
    FROM public.time_logs tl
    GROUP BY
        tl.project_id,
        tl.cost_code_id
),

non_labor_actuals AS (
    -- Subs / materials / other actuals from costs table
    SELECT
        c.project_id,
        c.cost_code_id,
        c.category,                       -- 'subs' | 'materials' | 'other'
        COALESCE(SUM(c.amount), 0) AS actual_amount,
        COALESCE(SUM(
            CASE WHEN c.status = 'unpaid' THEN c.amount ELSE 0 END
        ), 0) AS unpaid_amount
    FROM public.costs c
    GROUP BY
        c.project_id,
        c.cost_code_id,
        c.category
)

SELECT
    b.project_id,
    b.cost_code_id,
    cc.code                               AS cost_code,
    COALESCE(cc.name, 'Unassigned / Misc') AS cost_code_name,
    b.category,

    -- Budget
    b.budget_amount,
    b.budget_hours,
    b.is_allowance,

    -- Actuals
    CASE
        WHEN b.category = 'labor'
            THEN COALESCE(la.labor_actual_amount, 0)
        ELSE
            COALESCE(nla.actual_amount, 0)
    END AS actual_amount,

    CASE
        WHEN b.category = 'labor'
            THEN COALESCE(la.labor_actual_hours, 0)
        ELSE
            0::numeric
    END AS actual_hours,

    -- Unpaid
    CASE
        WHEN b.category = 'labor'
            THEN COALESCE(la_unpaid.labor_unpaid_amount, 0)
        ELSE
            COALESCE(nla.unpaid_amount, 0)
    END AS unpaid_amount,

    -- Variance (budget – actual)
    (COALESCE(b.budget_amount, 0)
     - CASE
           WHEN b.category = 'labor'
                THEN COALESCE(la.labor_actual_amount, 0)
           ELSE
                COALESCE(nla.actual_amount, 0)
       END) AS variance

FROM budget b
LEFT JOIN public.cost_codes cc
       ON cc.id = b.cost_code_id

LEFT JOIN labor_actuals la
       ON la.project_id   = b.project_id
      AND la.cost_code_id = b.cost_code_id

-- Labor unpaid breakdown (using payment_status on time_logs)
LEFT JOIN (
    SELECT
        tl.project_id,
        tl.cost_code_id,
        COALESCE(SUM(
            CASE WHEN tl.payment_status = 'unpaid'
                 THEN tl.labor_cost ELSE 0 END
        ), 0) AS labor_unpaid_amount
    FROM public.time_logs tl
    GROUP BY
        tl.project_id,
        tl.cost_code_id
) la_unpaid
       ON la_unpaid.project_id   = b.project_id
      AND la_unpaid.cost_code_id = b.cost_code_id

LEFT JOIN non_labor_actuals nla
       ON nla.project_id   = b.project_id
      AND nla.cost_code_id = b.cost_code_id
      AND nla.category     = b.category;


-- RPC-style helper: single project ledger
CREATE OR REPLACE FUNCTION public.get_project_budget_ledger(p_project_id uuid)
RETURNS SETOF public.project_budget_ledger_view
LANGUAGE sql
STABLE
AS $func$
    SELECT *
    FROM public.project_budget_ledger_view
    WHERE project_id = p_project_id;
$func$;