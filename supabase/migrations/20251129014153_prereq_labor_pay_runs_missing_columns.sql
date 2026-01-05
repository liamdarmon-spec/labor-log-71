-- Prereq: ensure public.labor_pay_runs has required columns before 20251129014154_*.sql
DO $$
BEGIN
  IF to_regclass('public.labor_pay_runs') IS NOT NULL THEN
    ALTER TABLE public.labor_pay_runs
      ADD COLUMN IF NOT EXISTS status text;

    ALTER TABLE public.labor_pay_runs
      ADD COLUMN IF NOT EXISTS payer_company_id uuid;
  END IF;
END
$$;



