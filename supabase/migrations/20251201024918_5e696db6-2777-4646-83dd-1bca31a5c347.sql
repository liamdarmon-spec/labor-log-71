-- Create optimized view for unpaid time logs available for pay runs
-- This view excludes time logs already in non-cancelled pay runs

DROP VIEW IF EXISTS public.unpaid_time_logs_available_for_pay_run CASCADE;
CREATE VIEW public.unpaid_time_logs_available_for_pay_run AS
SELECT tl.*
FROM public.time_logs tl
WHERE tl.payment_status = 'unpaid'
  AND NOT EXISTS (
    SELECT 1
    FROM public.labor_pay_run_items lpri
    JOIN public.labor_pay_runs pr
      ON pr.id = lpri.pay_run_id
    WHERE lpri.time_log_id = tl.id
      AND pr.status <> 'cancelled'
  );

COMMENT ON VIEW public.unpaid_time_logs_available_for_pay_run IS 
  'Returns unpaid time logs that are available for inclusion in new pay runs. Excludes logs already in active (non-cancelled) pay runs.';