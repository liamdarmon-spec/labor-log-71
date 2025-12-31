-- Prereq: add missing columns required by later migrations (columns only; fully guarded)

DO $$
BEGIN
  IF to_regclass('public.labor_pay_run_items') IS NOT NULL THEN
    ALTER TABLE public.labor_pay_run_items
      ADD COLUMN IF NOT EXISTS time_log_id uuid;
  END IF;

  IF to_regclass('public.work_schedules') IS NOT NULL THEN
    ALTER TABLE public.work_schedules
      ADD COLUMN IF NOT EXISTS status text;
  END IF;

  IF to_regclass('public.labor_pay_runs') IS NOT NULL THEN
    ALTER TABLE public.labor_pay_runs
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

    ALTER TABLE public.labor_pay_runs
      ADD COLUMN IF NOT EXISTS status text;

    ALTER TABLE public.labor_pay_runs
      ADD COLUMN IF NOT EXISTS payer_company_id uuid;
  END IF;
END
$$;



