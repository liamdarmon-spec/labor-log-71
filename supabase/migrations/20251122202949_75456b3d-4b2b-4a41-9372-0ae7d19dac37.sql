-- Financials v2: Job Costing Engine Extensions
-- Preserves all existing logic while adding billing, SOV, and enhanced tracking

-- 1. Add fields to invoices for proper billing tracking
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS retention_percent NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS retention_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS previously_invoiced NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_to_finish NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sov_based BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 30';

-- 2. Create schedule_of_values table (SOV line items)
CREATE TABLE IF NOT EXISTS schedule_of_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_number TEXT,
  description TEXT NOT NULL,
  scheduled_value NUMERIC NOT NULL DEFAULT 0,
  previously_completed NUMERIC DEFAULT 0,
  this_period_completed NUMERIC DEFAULT 0,
  materials_stored NUMERIC DEFAULT 0,
  total_completed NUMERIC DEFAULT 0,
  percent_complete NUMERIC DEFAULT 0,
  balance_to_finish NUMERIC DEFAULT 0,
  retention_percent NUMERIC DEFAULT 10,
  cost_code_id UUID REFERENCES cost_codes(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_sov_project ON schedule_of_values(project_id);

-- 3. Create customer_payments table
CREATE TABLE IF NOT EXISTS customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  applied_to_retention NUMERIC DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_customer_payments_project ON customer_payments(project_id);
CREATE INDEX idx_customer_payments_invoice ON customer_payments(invoice_id);

-- 4. Create project_financials_snapshot table for caching calculations
CREATE TABLE IF NOT EXISTS project_financials_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  contract_amount NUMERIC DEFAULT 0,
  baseline_budget NUMERIC DEFAULT 0,
  revised_budget NUMERIC DEFAULT 0,
  actual_cost_labor NUMERIC DEFAULT 0,
  actual_cost_subs NUMERIC DEFAULT 0,
  actual_cost_materials NUMERIC DEFAULT 0,
  actual_cost_other NUMERIC DEFAULT 0,
  actual_cost_total NUMERIC DEFAULT 0,
  billed_to_date NUMERIC DEFAULT 0,
  paid_to_date NUMERIC DEFAULT 0,
  retention_held NUMERIC DEFAULT 0,
  open_ar NUMERIC DEFAULT 0,
  open_ap_labor NUMERIC DEFAULT 0,
  open_ap_subs NUMERIC DEFAULT 0,
  profit_amount NUMERIC DEFAULT 0,
  profit_percent NUMERIC DEFAULT 0,
  forecast_at_completion NUMERIC DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Add fields to project_budget_lines for enhanced tracking
ALTER TABLE project_budget_lines
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC,
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC,
ADD COLUMN IF NOT EXISTS actual_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS variance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS percent_complete NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS forecast_at_completion NUMERIC DEFAULT 0;

-- 6. Create budget_revisions table for change order tracking
CREATE TABLE IF NOT EXISTS budget_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  revision_type TEXT NOT NULL CHECK (revision_type IN ('change_order', 'adjustment', 'correction', 'initial')),
  description TEXT,
  previous_budget NUMERIC,
  revision_amount NUMERIC NOT NULL,
  new_budget NUMERIC NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_budget_revisions_project ON budget_revisions(project_id);

-- 7. Create cost_entries table (unified cost tracking)
CREATE TABLE IF NOT EXISTS cost_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cost_code_id UUID REFERENCES cost_codes(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('labor', 'sub', 'material', 'other')),
  entry_date DATE NOT NULL,
  description TEXT,
  quantity NUMERIC,
  unit TEXT,
  unit_cost NUMERIC,
  total_cost NUMERIC NOT NULL,
  source_type TEXT CHECK (source_type IN ('daily_log', 'sub_invoice', 'material_receipt', 'manual')),
  source_id UUID,
  vendor_name TEXT,
  invoice_number TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_cost_entries_project ON cost_entries(project_id);
CREATE INDEX idx_cost_entries_code ON cost_entries(cost_code_id);
CREATE INDEX idx_cost_entries_type ON cost_entries(entry_type);
CREATE INDEX idx_cost_entries_date ON cost_entries(entry_date);

-- 8. RLS Policies for new tables
ALTER TABLE schedule_of_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_financials_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view SOV" ON schedule_of_values FOR SELECT USING (true);
CREATE POLICY "Anyone can insert SOV" ON schedule_of_values FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update SOV" ON schedule_of_values FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete SOV" ON schedule_of_values FOR DELETE USING (true);

CREATE POLICY "Anyone can view customer payments" ON customer_payments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert customer payments" ON customer_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update customer payments" ON customer_payments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete customer payments" ON customer_payments FOR DELETE USING (true);

CREATE POLICY "Anyone can view financials snapshot" ON project_financials_snapshot FOR SELECT USING (true);
CREATE POLICY "Anyone can insert financials snapshot" ON project_financials_snapshot FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update financials snapshot" ON project_financials_snapshot FOR UPDATE USING (true);

CREATE POLICY "Anyone can view budget revisions" ON budget_revisions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert budget revisions" ON budget_revisions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update budget revisions" ON budget_revisions FOR UPDATE USING (true);

CREATE POLICY "Anyone can view cost entries" ON cost_entries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert cost entries" ON cost_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update cost entries" ON cost_entries FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete cost entries" ON cost_entries FOR DELETE USING (true);

-- 9. Update triggers
CREATE TRIGGER schedule_of_values_updated_at
  BEFORE UPDATE ON schedule_of_values
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER customer_payments_updated_at
  BEFORE UPDATE ON customer_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER project_financials_snapshot_updated_at
  BEFORE UPDATE ON project_financials_snapshot
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER cost_entries_updated_at
  BEFORE UPDATE ON cost_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Function to auto-create cost_entries from daily_logs
CREATE OR REPLACE FUNCTION sync_daily_log_to_cost_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_worker_rate NUMERIC;
  v_total_cost NUMERIC;
BEGIN
  -- Get worker rate
  SELECT hourly_rate INTO v_worker_rate
  FROM workers
  WHERE id = NEW.worker_id;
  
  v_total_cost := NEW.hours_worked * COALESCE(v_worker_rate, 0);
  
  -- Insert or update cost_entry
  INSERT INTO cost_entries (
    project_id,
    cost_code_id,
    entry_type,
    entry_date,
    quantity,
    unit,
    unit_cost,
    total_cost,
    source_type,
    source_id,
    notes
  ) VALUES (
    NEW.project_id,
    NEW.cost_code_id,
    'labor',
    NEW.date,
    NEW.hours_worked,
    'hours',
    v_worker_rate,
    v_total_cost,
    'daily_log',
    NEW.id,
    NEW.notes
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_daily_log_cost_entry
  AFTER INSERT OR UPDATE ON daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION sync_daily_log_to_cost_entry();