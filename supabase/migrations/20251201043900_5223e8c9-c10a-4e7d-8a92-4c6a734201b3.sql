-- Remove duplicate trigger that causes double-firing on pay run status update
DROP TRIGGER IF EXISTS trigger_pay_run_mark_logs_paid ON public.labor_pay_runs;