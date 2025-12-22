-- ---------------------------------
-- VIEW: Project-level REVENUE summary
-- ---------------------------------
-- One row per project with total billed amount
-- (matches what useJobCosting is currently doing in JS)
DROP VIEW IF EXISTS public.project_revenue_summary_view CASCADE;
CREATE VIEW public.project_revenue_summary_view AS
SELECT
  i.project_id,
  COALESCE(
    SUM(
      CASE 
        WHEN i.status <> 'void' THEN i.total_amount 
        ELSE 0 
      END
    ),
    0
  ) AS billed_amount
FROM public.invoices i
GROUP BY i.project_id;


-- ---------------------------------
-- INDEX: for invoices by project + status
-- ---------------------------------
CREATE INDEX IF NOT EXISTS idx_invoices_project_status
  ON public.invoices(project_id, status);