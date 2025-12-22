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

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_schedules_worker_date ON work_schedules(worker_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_work_schedules_project ON work_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_company_date ON work_schedules(company_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_work_schedules_date ON work_schedules(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_time_logs_worker_date ON time_logs(worker_id, date);
CREATE INDEX IF NOT EXISTS idx_time_logs_project ON time_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_company_date ON time_logs(company_id, date);
CREATE INDEX IF NOT EXISTS idx_time_logs_payment_status ON time_logs(payment_status);
CREATE INDEX IF NOT EXISTS idx_time_logs_date ON time_logs(date);

CREATE INDEX IF NOT EXISTS idx_labor_pay_runs_status ON labor_pay_runs(status);
CREATE INDEX IF NOT EXISTS idx_labor_pay_runs_dates ON labor_pay_runs(date_range_start, date_range_end);

CREATE INDEX IF NOT EXISTS idx_labor_pay_run_items_pay_run ON labor_pay_run_items(pay_run_id);
CREATE INDEX IF NOT EXISTS idx_labor_pay_run_items_time_log ON labor_pay_run_items(time_log_id);

-- 6. Enable RLS
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_pay_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_pay_run_items ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for work_schedules
CREATE POLICY "Anyone can view work schedules"
  ON work_schedules FOR SELECT USING (true);
CREATE POLICY "Anyone can insert work schedules"
  ON work_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update work schedules"
  ON work_schedules FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete work schedules"
  ON work_schedules FOR DELETE USING (true);

-- 8. RLS Policies for time_logs
CREATE POLICY "Anyone can view time logs"
  ON time_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert time logs"
  ON time_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update time logs"
  ON time_logs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete time logs"
  ON time_logs FOR DELETE USING (true);

-- 9. RLS Policies for labor_pay_runs
CREATE POLICY "Anyone can view labor pay runs"
  ON labor_pay_runs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert labor pay runs"
  ON labor_pay_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update labor pay runs"
  ON labor_pay_runs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete labor pay runs"
  ON labor_pay_runs FOR DELETE USING (true);

-- 10. RLS Policies for labor_pay_run_items
CREATE POLICY "Anyone can view labor pay run items"
  ON labor_pay_run_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert labor pay run items"
  ON labor_pay_run_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update labor pay run items"
  ON labor_pay_run_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete labor pay run items"
  ON labor_pay_run_items FOR DELETE USING (true);

-- 11. Triggers for updated_at
DROP TRIGGER IF EXISTS update_work_schedules_updated_at ON work_schedules;
CREATE TRIGGER update_work_schedules_updated_at
  BEFORE UPDATE ON work_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_labor_pay_runs_updated_at ON labor_pay_runs;
CREATE TRIGGER update_labor_pay_runs_updated_at
  BEFORE UPDATE ON labor_pay_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 12. Add helpful comments
COMMENT ON TABLE work_schedules IS 'Forma OS: Planned work schedules for workers and subs';
COMMENT ON TABLE time_logs IS 'Forma OS: Actual logged work hours and labor costs';
COMMENT ON TABLE labor_pay_runs IS 'Forma OS: Grouped payment runs for labor costs by company';
COMMENT ON TABLE labor_pay_run_items IS 'Forma OS: Individual time log entries included in a pay run';