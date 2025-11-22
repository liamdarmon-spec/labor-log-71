-- =====================================================
-- SOURCE OF TRUTH ENGINE (STE) - UNIFIED WORKFORCE OS
-- =====================================================

-- 1. ENHANCE DAY_CARDS WITH LIFECYCLE STATES
ALTER TABLE day_cards 
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT DEFAULT 'scheduled' CHECK (lifecycle_status IN ('scheduled', 'in_progress', 'logged', 'paid', 'archived')),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Update existing statuses to lifecycle_status
UPDATE day_cards 
SET lifecycle_status = CASE
  WHEN status = 'paid' THEN 'paid'
  WHEN status = 'approved' THEN 'logged'
  WHEN status = 'logged' THEN 'logged'
  ELSE 'scheduled'
END
WHERE lifecycle_status = 'scheduled';

-- 2. CREATE TIME_LOG_ALLOCATIONS TABLE
-- Allows splitting one day card into multiple project/cost code allocations
CREATE TABLE IF NOT EXISTS time_log_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_card_id UUID NOT NULL REFERENCES day_cards(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  cost_code_id UUID REFERENCES cost_codes(id) ON DELETE SET NULL,
  hours NUMERIC NOT NULL CHECK (hours >= 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_time_log_allocations_day_card ON time_log_allocations(day_card_id);
CREATE INDEX idx_time_log_allocations_project ON time_log_allocations(project_id);
CREATE INDEX idx_time_log_allocations_cost_code ON time_log_allocations(cost_code_id);

-- 3. CREATE UNIFIED ACTIVITY_LOG TABLE
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('schedule', 'log', 'payment', 'project', 'worker', 'sub', 'document')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'approved', 'paid', 'archived')),
  actor_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- 4. CREATE WORKER_DAY_SUMMARY VIEW
CREATE OR REPLACE VIEW worker_day_summary AS
SELECT 
  dc.id as day_card_id,
  dc.worker_id,
  w.name as worker_name,
  w.hourly_rate as worker_rate,
  t.name as worker_trade,
  dc.date,
  dc.scheduled_hours,
  dc.logged_hours,
  dc.pay_rate,
  dc.lifecycle_status,
  dc.pay_status,
  dc.locked,
  dc.company_id,
  c.name as company_name,
  COALESCE(dc.logged_hours * dc.pay_rate, dc.scheduled_hours * COALESCE(dc.pay_rate, w.hourly_rate), 0) as total_cost,
  CASE 
    WHEN dc.pay_status = 'unpaid' THEN COALESCE(dc.logged_hours * dc.pay_rate, dc.scheduled_hours * COALESCE(dc.pay_rate, w.hourly_rate), 0)
    ELSE 0
  END as unpaid_amount,
  json_agg(
    json_build_object(
      'project_id', tla.project_id,
      'project_name', p.project_name,
      'hours', tla.hours,
      'trade', tr.name,
      'cost_code', cc.code
    )
  ) FILTER (WHERE tla.id IS NOT NULL) as allocations
FROM day_cards dc
JOIN workers w ON w.id = dc.worker_id
LEFT JOIN trades t ON t.id = w.trade_id
LEFT JOIN companies c ON c.id = dc.company_id
LEFT JOIN time_log_allocations tla ON tla.day_card_id = dc.id
LEFT JOIN projects p ON p.id = tla.project_id
LEFT JOIN trades tr ON tr.id = tla.trade_id
LEFT JOIN cost_codes cc ON cc.id = tla.cost_code_id
GROUP BY dc.id, w.id, w.name, w.hourly_rate, t.name, c.name;

-- 5. CREATE PROJECT_LABOR_SUMMARY VIEW
CREATE OR REPLACE VIEW project_labor_summary AS
SELECT
  p.id as project_id,
  p.project_name,
  COUNT(DISTINCT dc.worker_id) as worker_count,
  SUM(dc.logged_hours) as total_hours_logged,
  SUM(dc.scheduled_hours) as total_hours_scheduled,
  SUM(COALESCE(dc.logged_hours * dc.pay_rate, 0)) as total_labor_cost,
  SUM(
    CASE WHEN dc.pay_status = 'unpaid' AND dc.logged_hours > 0
    THEN dc.logged_hours * dc.pay_rate
    ELSE 0 END
  ) as unpaid_labor_cost,
  SUM(
    CASE WHEN dc.pay_status = 'paid' AND dc.logged_hours > 0
    THEN dc.logged_hours * dc.pay_rate
    ELSE 0 END
  ) as paid_labor_cost,
  MAX(dc.date) as last_activity_date
FROM projects p
LEFT JOIN time_log_allocations tla ON tla.project_id = p.id
LEFT JOIN day_cards dc ON dc.id = tla.day_card_id
GROUP BY p.id, p.project_name;

-- 6. CREATE COST_CODE_ACTUALS VIEW
CREATE OR REPLACE VIEW cost_code_actuals AS
SELECT
  cc.id as cost_code_id,
  cc.code,
  cc.name as cost_code_name,
  cc.category,
  tla.project_id,
  p.project_name,
  SUM(tla.hours) as actual_hours,
  SUM(tla.hours * dc.pay_rate) as actual_cost,
  COUNT(DISTINCT dc.worker_id) as worker_count
FROM cost_codes cc
LEFT JOIN time_log_allocations tla ON tla.cost_code_id = cc.id
LEFT JOIN day_cards dc ON dc.id = tla.day_card_id
LEFT JOIN projects p ON p.id = tla.project_id
WHERE dc.logged_hours > 0
GROUP BY cc.id, cc.code, cc.name, cc.category, tla.project_id, p.project_name;

-- 7. CREATE COMPANY_PAYROLL_SUMMARY VIEW
CREATE OR REPLACE VIEW company_payroll_summary AS
SELECT
  c.id as company_id,
  c.name as company_name,
  COUNT(DISTINCT dc.worker_id) as worker_count,
  SUM(dc.logged_hours) as total_hours,
  SUM(
    CASE WHEN dc.pay_status = 'unpaid' AND dc.logged_hours > 0
    THEN dc.logged_hours * dc.pay_rate
    ELSE 0 END
  ) as total_unpaid,
  SUM(
    CASE WHEN dc.pay_status = 'paid' AND dc.logged_hours > 0
    THEN dc.logged_hours * dc.pay_rate
    ELSE 0 END
  ) as total_paid,
  MAX(dc.date) as last_activity_date
FROM companies c
LEFT JOIN day_cards dc ON dc.company_id = c.id
WHERE dc.logged_hours > 0
GROUP BY c.id, c.name;

-- 8. CREATE FUNCTION TO AUTO-CREATE LOGS FOR PAST SCHEDULES
CREATE OR REPLACE FUNCTION auto_create_past_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For day_cards that are in the past and have scheduled_hours but no logged_hours
  UPDATE day_cards
  SET 
    logged_hours = scheduled_hours,
    lifecycle_status = 'logged'
  WHERE 
    date < CURRENT_DATE
    AND scheduled_hours > 0
    AND (logged_hours IS NULL OR logged_hours = 0)
    AND lifecycle_status = 'scheduled';
    
  -- Copy allocations from day_card_jobs to time_log_allocations for these
  INSERT INTO time_log_allocations (day_card_id, project_id, trade_id, cost_code_id, hours)
  SELECT 
    dcj.day_card_id,
    dcj.project_id,
    dcj.trade_id,
    dcj.cost_code_id,
    dcj.hours
  FROM day_card_jobs dcj
  JOIN day_cards dc ON dc.id = dcj.day_card_id
  WHERE 
    dc.date < CURRENT_DATE
    AND dc.lifecycle_status = 'logged'
    AND NOT EXISTS (
      SELECT 1 FROM time_log_allocations tla 
      WHERE tla.day_card_id = dcj.day_card_id
    );
END;
$$;

-- 9. CREATE TRIGGER FOR ACTIVITY LOGGING
CREATE OR REPLACE FUNCTION log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO activity_log (entity_type, entity_id, action, actor_id, metadata)
  VALUES (
    TG_ARGV[0]::TEXT,
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' THEN 'updated'
      WHEN TG_OP = 'DELETE' THEN 'deleted'
    END,
    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by),
    CASE
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('changes', row_to_json(NEW) - row_to_json(OLD))
      ELSE '{}'::jsonb
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply activity triggers
DROP TRIGGER IF EXISTS day_cards_activity_log ON day_cards;
CREATE TRIGGER day_cards_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON day_cards
  FOR EACH ROW EXECUTE FUNCTION log_activity('log');

DROP TRIGGER IF EXISTS payments_activity_log ON payments;
CREATE TRIGGER payments_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION log_activity('payment');

-- 10. CREATE FUNCTION TO SYNC PAYMENT TO LOGS
CREATE OR REPLACE FUNCTION sync_payment_to_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a payment is created, mark all related logs as paid
  UPDATE day_cards
  SET 
    pay_status = 'paid',
    lifecycle_status = 'paid',
    paid_at = NEW.payment_date,
    locked = true
  WHERE 
    company_id = NEW.company_id
    AND date BETWEEN NEW.start_date AND NEW.end_date
    AND pay_status = 'unpaid'
    AND logged_hours > 0;
    
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_payment_to_logs_trigger ON payments;
CREATE TRIGGER sync_payment_to_logs_trigger
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_payment_to_logs();

-- 11. UPDATE TRIGGERS FOR UPDATED_AT
CREATE TRIGGER update_time_log_allocations_updated_at
  BEFORE UPDATE ON time_log_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. RLS POLICIES FOR NEW TABLES
ALTER TABLE time_log_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view time log allocations"
  ON time_log_allocations FOR SELECT USING (true);

CREATE POLICY "Anyone can insert time log allocations"
  ON time_log_allocations FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update time log allocations"
  ON time_log_allocations FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete time log allocations"
  ON time_log_allocations FOR DELETE USING (true);

CREATE POLICY "Anyone can view activity log"
  ON activity_log FOR SELECT USING (true);

CREATE POLICY "Anyone can insert activity log"
  ON activity_log FOR INSERT WITH CHECK (true);

-- 13. MIGRATE EXISTING DAY_CARD_JOBS TO TIME_LOG_ALLOCATIONS
INSERT INTO time_log_allocations (day_card_id, project_id, trade_id, cost_code_id, hours, notes, created_at)
SELECT 
  day_card_id,
  project_id,
  trade_id,
  cost_code_id,
  hours,
  notes,
  created_at
FROM day_card_jobs
ON CONFLICT DO NOTHING;

-- 14. ADD HELPFUL COMMENTS
COMMENT ON TABLE day_cards IS 'Source of Truth: One record per worker per day. Contains scheduled and logged hours with lifecycle tracking.';
COMMENT ON TABLE time_log_allocations IS 'Allows splitting one day card across multiple projects/cost codes without creating duplicate logs.';
COMMENT ON TABLE activity_log IS 'Unified activity feed tracking all workforce events.';
COMMENT ON VIEW worker_day_summary IS 'Comprehensive worker day view with allocations and financial summary.';
COMMENT ON VIEW project_labor_summary IS 'Real-time project labor costs and hours rolled up from allocations.';
COMMENT ON VIEW cost_code_actuals IS 'Actual hours and costs per cost code from time log allocations.';
COMMENT ON VIEW company_payroll_summary IS 'Company-level payroll summary with paid/unpaid breakdowns.';