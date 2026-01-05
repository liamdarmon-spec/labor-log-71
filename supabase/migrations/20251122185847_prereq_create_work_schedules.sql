-- Prereq: create work_schedules table before triggers/functions reference it
CREATE TABLE IF NOT EXISTS public.work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  worker_id uuid,
  project_id uuid,
  trade_id uuid,
  cost_code_id uuid,
  scheduled_date date,
  scheduled_hours numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
