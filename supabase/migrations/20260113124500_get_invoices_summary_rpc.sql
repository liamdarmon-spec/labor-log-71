BEGIN;

DROP FUNCTION IF EXISTS public.get_invoices_summary(uuid, date, date, text);

CREATE OR REPLACE FUNCTION public.get_invoices_summary(
  p_company_id uuid DEFAULT NULL,
  p_start date DEFAULT NULL,
  p_end date DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS TABLE(
  total_invoiced numeric,
  outstanding numeric,
  drafts integer,
  overdue integer
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_companies uuid[];
BEGIN
  v_companies := public.authed_company_ids();

  RETURN QUERY
  WITH base AS (
    SELECT i.*
    FROM public.invoices i
    WHERE i.company_id = ANY(v_companies)
      AND (p_company_id IS NULL OR i.company_id = p_company_id)
      AND (p_start IS NULL OR i.issue_date >= p_start)
      AND (p_end IS NULL OR i.issue_date <= p_end)
      AND (p_status IS NULL OR i.status = p_status)
  )
  SELECT
    COALESCE(SUM(b.total_amount) FILTER (WHERE b.status <> 'void'), 0) AS total_invoiced,
    COALESCE(SUM(b.total_amount) FILTER (WHERE b.status IN ('sent','partially_paid')), 0) AS outstanding,
    COALESCE(COUNT(*) FILTER (WHERE b.status = 'draft'), 0)::int AS drafts,
    COALESCE(COUNT(*) FILTER (
      WHERE b.due_date IS NOT NULL
        AND b.due_date < CURRENT_DATE
        AND b.status NOT IN ('paid','void','draft')
    ), 0)::int AS overdue
  FROM base b;
END;
$$;

REVOKE ALL ON FUNCTION public.get_invoices_summary(uuid, date, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invoices_summary(uuid, date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invoices_summary(uuid, date, date, text) TO service_role;

-- Perf: support company/date filtering + ordering.
CREATE INDEX IF NOT EXISTS idx_invoices_company_issue_date ON public.invoices(company_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_company_due_date ON public.invoices(company_id, due_date);

DO $$
BEGIN
  PERFORM pg_notify('pgrst','reload schema');
EXCEPTION WHEN others THEN
  NULL;
END $$;

COMMIT;


