-- ============================================================================
-- MONEY MODULE BACKEND FINALIZATION (SAFE VERSION V2)
-- Drop dependent views first, then alter tables, then recreate views
-- ============================================================================

-- ============================================================================
-- 1) DROP DEPENDENT VIEWS TEMPORARILY
-- ============================================================================

DROP VIEW IF EXISTS project_costs_view CASCADE;
DROP VIEW IF EXISTS project_labor_costs_view CASCADE;
DROP VIEW IF EXISTS project_budget_vs_actual_view CASCADE;
DROP VIEW IF EXISTS monthly_costs_view CASCADE;
DROP VIEW IF EXISTS monthly_labor_costs_view CASCADE;

-- ============================================================================
-- 2) ALTER COSTS TABLE (CANONICAL COST LEDGER)
-- ============================================================================

ALTER TABLE costs ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
ALTER TABLE costs ADD COLUMN IF NOT EXISTS vendor_type text;
ALTER TABLE costs ADD COLUMN IF NOT EXISTS vendor_id uuid;
ALTER TABLE costs ADD COLUMN IF NOT EXISTS quantity numeric(12,2);
ALTER TABLE costs ADD COLUMN IF NOT EXISTS unit_cost numeric(12,2);
ALTER TABLE costs ADD COLUMN IF NOT EXISTS paid_date date;
ALTER TABLE costs ADD COLUMN IF NOT EXISTS payment_id uuid;
ALTER TABLE costs ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE costs ADD COLUMN IF NOT EXISTS status text;
UPDATE costs SET status = 'unpaid' WHERE status IS NULL;
ALTER TABLE costs ALTER COLUMN status SET DEFAULT 'unpaid';

CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_costs_project_id       ON costs(project_id);
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_costs_vendor           ON costs(vendor_type, vendor_id);
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_costs_status           ON costs(status);
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_costs_date_incurred    ON costs(date_incurred);

-- ============================================================================
-- 3) VENDOR PAYMENTS TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  vendor_type text NOT NULL,
  vendor_id uuid NOT NULL,
  payment_date date NOT NULL,
  amount numeric(12,2) NOT NULL,
  method text,
  reference text,
  notes text,
  status text NOT NULL DEFAULT 'recorded',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendor_payment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES vendor_payments(id) ON DELETE CASCADE,
  cost_id uuid NOT NULL REFERENCES costs(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_vendor_payments_vendor
  ON vendor_payments(vendor_type, vendor_id);

CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_vendor_payments_date
  ON vendor_payments(payment_date);

CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_vendor_payments_status
  ON vendor_payments(status);

CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_vendor_payment_items_payment
  ON vendor_payment_items(payment_id);

CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_vendor_payment_items_cost
  ON vendor_payment_items(cost_id);

-- ============================================================================
-- 4) TRIGGER: mark_costs_paid_on_vendor_payment
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_costs_paid_on_vendor_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NEW.status = 'recorded' AND (OLD.status IS NULL OR OLD.status <> 'recorded') THEN
    UPDATE costs c
    SET
      status = 'paid',
      paid_date = NEW.payment_date,
      payment_id = NEW.id,
      updated_at = now()
    FROM vendor_payment_items i
    WHERE i.payment_id = NEW.id
      AND i.cost_id = c.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_costs_paid_on_vendor_payment ON vendor_payments;

CREATE TRIGGER trg_mark_costs_paid_on_vendor_payment
  AFTER INSERT OR UPDATE OF status ON vendor_payments
  FOR EACH ROW
  EXECUTE FUNCTION mark_costs_paid_on_vendor_payment();

-- ============================================================================
-- 5) RECREATE ALL REPORTING VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW project_costs_view AS
SELECT 
  p.id AS project_id,
  p.project_name,
  c.category,
  c.cost_code_id,
  cc.code AS cost_code,
  cc.name AS cost_code_name,
  SUM(c.amount) AS total_cost,
  SUM(CASE WHEN c.status = 'unpaid' THEN c.amount ELSE 0 END) AS unpaid_cost,
  SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END) AS paid_cost,
  COUNT(*) AS cost_entry_count,
  MIN(c.date_incurred) AS first_cost_date,
  MAX(c.date_incurred) AS last_cost_date
FROM projects p
JOIN costs c ON c.project_id = p.id
LEFT JOIN cost_codes cc ON cc.id = c.cost_code_id
GROUP BY p.id, p.project_name, c.category, c.cost_code_id, cc.code, cc.name;

CREATE OR REPLACE VIEW project_labor_costs_view AS
SELECT
  t.project_id,
  t.cost_code_id,
  cc.code AS cost_code,
  cc.name AS cost_code_name,
  SUM(t.hours_worked) AS total_hours,
  SUM(t.labor_cost) AS total_labor_cost,
  SUM(CASE WHEN t.payment_status = 'unpaid' THEN t.labor_cost ELSE 0 END) AS unpaid_labor_cost,
  SUM(CASE WHEN t.payment_status = 'paid' THEN t.labor_cost ELSE 0 END) AS paid_labor_cost,
  COUNT(DISTINCT t.worker_id) AS worker_count,
  MIN(t.date) AS first_log_date,
  MAX(t.date) AS last_log_date
FROM time_logs t
LEFT JOIN cost_codes cc ON cc.id = t.cost_code_id
GROUP BY t.project_id, t.cost_code_id, cc.code, cc.name;

CREATE OR REPLACE VIEW project_budget_vs_actual_view AS
SELECT
  p.id AS project_id,
  p.project_name,
  pb.labor_budget,
  pb.subs_budget,
  pb.materials_budget,
  pb.other_budget,
  (COALESCE(pb.labor_budget,0)+COALESCE(pb.subs_budget,0)+COALESCE(pb.materials_budget,0)+COALESCE(pb.other_budget,0)) AS total_budget,
  COALESCE(labor.total_labor_cost,0) AS actual_labor_cost,
  COALESCE(subs.total_cost,0) AS actual_subs_cost,
  COALESCE(materials.total_cost,0) AS actual_materials_cost,
  COALESCE(other.total_cost,0) AS actual_other_cost,
  (COALESCE(labor.total_labor_cost,0)+COALESCE(subs.total_cost,0)+COALESCE(materials.total_cost,0)+COALESCE(other.total_cost,0)) AS total_actual_cost,
  (COALESCE(pb.labor_budget,0)+COALESCE(pb.subs_budget,0)+COALESCE(pb.materials_budget,0)+COALESCE(pb.other_budget,0))
    - (COALESCE(labor.total_labor_cost,0)+COALESCE(subs.total_cost,0)+COALESCE(materials.total_cost,0)+COALESCE(other.total_cost,0))
    AS remaining_budget
FROM projects p
LEFT JOIN project_budgets pb ON pb.project_id = p.id
LEFT JOIN (
    SELECT project_id, SUM(labor_cost) AS total_labor_cost
    FROM time_logs GROUP BY project_id
) labor ON labor.project_id = p.id
LEFT JOIN (
    SELECT project_id, SUM(amount) AS total_cost
    FROM costs WHERE category='subs' GROUP BY project_id
) subs ON subs.project_id = p.id
LEFT JOIN (
    SELECT project_id, SUM(amount) AS total_cost
    FROM costs WHERE category='materials' GROUP BY project_id
) materials ON materials.project_id = p.id
LEFT JOIN (
    SELECT project_id, SUM(amount) AS total_cost
    FROM costs WHERE category='other' GROUP BY project_id
) other ON other.project_id = p.id;

CREATE OR REPLACE VIEW monthly_costs_view AS
SELECT
  date_trunc('month', c.date_incurred)::date AS month,
  c.category,
  SUM(c.amount) AS total_cost,
  SUM(CASE WHEN c.status='unpaid' THEN c.amount ELSE 0 END) AS unpaid_cost,
  SUM(CASE WHEN c.status='paid'   THEN c.amount ELSE 0 END) AS paid_cost,
  COUNT(*) AS cost_entry_count
FROM costs c
GROUP BY date_trunc('month', c.date_incurred), c.category;

CREATE OR REPLACE VIEW monthly_labor_costs_view AS
SELECT
  date_trunc('month', t.date)::date AS month,
  SUM(t.labor_cost) AS total_labor_cost,
  SUM(CASE WHEN t.payment_status='unpaid' THEN t.labor_cost ELSE 0 END) AS unpaid_labor_cost,
  SUM(CASE WHEN t.payment_status='paid'   THEN t.labor_cost ELSE 0 END) AS paid_labor_cost,
  SUM(t.hours_worked) AS total_hours,
  COUNT(DISTINCT t.worker_id) AS unique_workers,
  COUNT(*) AS log_count
FROM time_logs t
GROUP BY date_trunc('month', t.date);