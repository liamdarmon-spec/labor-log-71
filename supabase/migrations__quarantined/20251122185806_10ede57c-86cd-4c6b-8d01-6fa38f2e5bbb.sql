-- FORMA OS: Core Data Model from Scratch
-- Phase 1: Workforce OS Tables

-- 1. Work Schedules (replaces scheduled_shifts)
CREATE TABLE IF NOT EXISTS work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  trade_id UUID REFERENCES trades(id),
  cost_code_id UUID REFERENCES cost_codes(id),
  scheduled_date DATE NOT NULL,
  scheduled_hours NUMERIC NOT NULL DEFAULT 8,
  type TEXT DEFAULT 'labor' CHECK (type IN ('labor', 'sub', 'meeting')),
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'synced', 'cancelled')),
  notes TEXT,
  source_schedule_id UUID,
  converted_to_timelog BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- 2. Time Logs (replaces daily_logs)
CREATE TABLE IF NOT EXISTS time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  company_id UUID REFERENCES companies(id),
  trade_id UUID REFERENCES trades(id),
  cost_code_id UUID REFERENCES cost_codes(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours_worked NUMERIC NOT NULL,
  hourly_rate NUMERIC,
  labor_cost NUMERIC GENERATED ALWAYS AS (hours_worked * COALESCE(hourly_rate, 0)) STORED,
  source_schedule_id UUID REFERENCES work_schedules(id),
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'void')),
  payment_id UUID,
  paid_amount NUMERIC DEFAULT 0,
  notes TEXT,
  last_synced_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- 3. Labor Pay Runs
CREATE TABLE IF NOT EXISTS labor_pay_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_company_id UUID REFERENCES companies(id),
  payee_company_id UUID REFERENCES companies(id),
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'reimbursed')),
  payment_method TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- 4. Labor Pay Run Items (links pay runs to time logs)
CREATE TABLE IF NOT EXISTS labor_pay_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id UUID NOT NULL REFERENCES labor_pay_runs(id) ON DELETE CASCADE,
  time_log_id UUID NOT NULL REFERENCES time_logs(id),
  worker_id UUID REFERENCES workers(id),
  amount NUMERIC NOT NULL,
  hours NUMERIC,
  rate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
