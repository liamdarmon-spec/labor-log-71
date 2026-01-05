-- Prereq: add columns required by later functions/indexes
DO $$
BEGIN
  IF to_regclass('public.labor_pay_run_items') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.labor_pay_run_items ADD COLUMN IF NOT EXISTS pay_run_id uuid';
    EXECUTE 'ALTER TABLE public.labor_pay_run_items ADD COLUMN IF NOT EXISTS time_log_id uuid';
  END IF;

  IF to_regclass('public.labor_pay_runs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.labor_pay_runs ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()';
    EXECUTE 'ALTER TABLE public.labor_pay_runs ADD COLUMN IF NOT EXISTS status text';
    EXECUTE 'ALTER TABLE public.labor_pay_runs ADD COLUMN IF NOT EXISTS payer_company_id uuid';
  END IF;
END $$;
