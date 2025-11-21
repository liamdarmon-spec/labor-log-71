-- =============================================
-- PHASE 1: COST CODE SYSTEM
-- =============================================

-- Create cost_codes table
CREATE TABLE public.cost_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('labor', 'subs', 'materials', 'other')),
  default_trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on cost_codes
ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for cost_codes
CREATE POLICY "Anyone can view cost codes" ON public.cost_codes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert cost codes" ON public.cost_codes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update cost codes" ON public.cost_codes
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete cost codes" ON public.cost_codes
  FOR DELETE USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_cost_codes_updated_at
  BEFORE UPDATE ON public.cost_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed sample cost codes
INSERT INTO public.cost_codes (code, name, category, is_active) VALUES
  ('01-100', 'Demolition', 'labor', true),
  ('02-100', 'Site Preparation', 'labor', true),
  ('03-100', 'Concrete Foundation', 'labor', true),
  ('04-100', 'Masonry', 'labor', true),
  ('05-100', 'Structural Steel', 'labor', true),
  ('06-100', 'Rough Framing', 'labor', true),
  ('06-200', 'Finish Carpentry', 'labor', true),
  ('07-100', 'Roofing', 'labor', true),
  ('07-200', 'Insulation', 'labor', true),
  ('08-100', 'Windows & Doors', 'labor', true),
  ('09-100', 'Drywall', 'labor', true),
  ('09-200', 'Tile Installation', 'labor', true),
  ('09-300', 'Flooring', 'labor', true),
  ('09-400', 'Painting', 'labor', true),
  ('15-100', 'Plumbing Rough-In', 'subs', true),
  ('15-200', 'Plumbing Finish', 'subs', true),
  ('16-100', 'Electrical Rough-In', 'subs', true),
  ('16-200', 'Electrical Finish', 'subs', true),
  ('23-100', 'HVAC Install', 'subs', true),
  ('31-100', 'Lumber & Materials', 'materials', true),
  ('31-200', 'Hardware & Fasteners', 'materials', true),
  ('31-300', 'Paint & Finishes', 'materials', true),
  ('32-100', 'Fixtures & Appliances', 'materials', true),
  ('50-100', 'Permits & Fees', 'other', true),
  ('50-200', 'Contingency', 'other', true);

-- =============================================
-- PHASE 2: ENHANCE ESTIMATE_ITEMS
-- =============================================

-- Add new fields to estimate_items
ALTER TABLE public.estimate_items
  ADD COLUMN cost_code_id UUID REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  ADD COLUMN trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
  ADD COLUMN planned_hours NUMERIC,
  ADD COLUMN is_allowance BOOLEAN DEFAULT false;

-- =============================================
-- PHASE 3: ENHANCE PROJECT_BUDGETS
-- =============================================

-- Add new fields to project_budgets (subs_budget already exists)
ALTER TABLE public.project_budgets
  ADD COLUMN baseline_estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL;

-- =============================================
-- PHASE 4: CREATE PROJECT_BUDGET_LINES
-- =============================================

-- Create project_budget_lines table for detailed budgeting
CREATE TABLE public.project_budget_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  cost_code_id UUID REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('labor', 'subs', 'materials', 'other')),
  description TEXT,
  budget_amount NUMERIC NOT NULL DEFAULT 0,
  budget_hours NUMERIC,
  is_allowance BOOLEAN DEFAULT false,
  source_estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on project_budget_lines
ALTER TABLE public.project_budget_lines ENABLE ROW LEVEL SECURITY;

-- Create policies for project_budget_lines
CREATE POLICY "Anyone can view budget lines" ON public.project_budget_lines
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert budget lines" ON public.project_budget_lines
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update budget lines" ON public.project_budget_lines
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete budget lines" ON public.project_budget_lines
  FOR DELETE USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_project_budget_lines_updated_at
  BEFORE UPDATE ON public.project_budget_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PHASE 5: ADD COST_CODE TO SCHEDULES & LOGS
-- =============================================

-- Add cost_code_id to scheduled_shifts
ALTER TABLE public.scheduled_shifts
  ADD COLUMN cost_code_id UUID REFERENCES public.cost_codes(id) ON DELETE SET NULL;

-- Add cost_code_id to daily_logs
ALTER TABLE public.daily_logs
  ADD COLUMN cost_code_id UUID REFERENCES public.cost_codes(id) ON DELETE SET NULL;

-- Add cost_code_id to sub_scheduled_shifts
ALTER TABLE public.sub_scheduled_shifts
  ADD COLUMN cost_code_id UUID REFERENCES public.cost_codes(id) ON DELETE SET NULL;

-- Add cost_code_id to sub_logs
ALTER TABLE public.sub_logs
  ADD COLUMN cost_code_id UUID REFERENCES public.cost_codes(id) ON DELETE SET NULL;

-- =============================================
-- PHASE 6: CREATE BUDGET SYNC FUNCTION
-- =============================================

-- Function to sync estimate to budget
CREATE OR REPLACE FUNCTION public.sync_estimate_to_budget(p_estimate_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_labor_total NUMERIC := 0;
  v_subs_total NUMERIC := 0;
  v_materials_total NUMERIC := 0;
  v_other_total NUMERIC := 0;
BEGIN
  -- Get project_id from estimate
  SELECT project_id INTO v_project_id
  FROM estimates
  WHERE id = p_estimate_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Estimate not found';
  END IF;

  -- Clear is_budget_source from all other estimates for this project
  UPDATE estimates
  SET is_budget_source = false
  WHERE project_id = v_project_id
    AND id != p_estimate_id;

  -- Mark this estimate as budget source and accepted
  UPDATE estimates
  SET 
    is_budget_source = true,
    status = 'accepted',
    updated_at = now()
  WHERE id = p_estimate_id;

  -- Calculate category totals from estimate items
  SELECT 
    COALESCE(SUM(CASE WHEN category = 'Labor' THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category IN ('Subs', 'Subcontractors') THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'Materials' THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category IN ('Allowance', 'Other') THEN line_total ELSE 0 END), 0)
  INTO v_labor_total, v_subs_total, v_materials_total, v_other_total
  FROM estimate_items
  WHERE estimate_id = p_estimate_id;

  -- Update or insert project_budgets
  INSERT INTO project_budgets (
    project_id,
    labor_budget,
    subs_budget,
    materials_budget,
    other_budget,
    baseline_estimate_id
  ) VALUES (
    v_project_id,
    v_labor_total,
    v_subs_total,
    v_materials_total,
    v_other_total,
    p_estimate_id
  )
  ON CONFLICT (project_id) DO UPDATE SET
    labor_budget = EXCLUDED.labor_budget,
    subs_budget = EXCLUDED.subs_budget,
    materials_budget = EXCLUDED.materials_budget,
    other_budget = EXCLUDED.other_budget,
    baseline_estimate_id = EXCLUDED.baseline_estimate_id,
    updated_at = now();

  -- Delete old budget lines for this project
  DELETE FROM project_budget_lines
  WHERE project_id = v_project_id;

  -- Insert new budget lines aggregated by category + cost_code
  INSERT INTO project_budget_lines (
    project_id,
    cost_code_id,
    category,
    description,
    budget_amount,
    budget_hours,
    is_allowance,
    source_estimate_id
  )
  SELECT 
    v_project_id,
    cost_code_id,
    CASE 
      WHEN category = 'Labor' THEN 'labor'
      WHEN category IN ('Subs', 'Subcontractors') THEN 'subs'
      WHEN category = 'Materials' THEN 'materials'
      ELSE 'other'
    END as normalized_category,
    string_agg(DISTINCT description, ' | ') as description,
    SUM(line_total) as budget_amount,
    SUM(planned_hours) as budget_hours,
    bool_and(is_allowance) as is_allowance,
    p_estimate_id
  FROM estimate_items
  WHERE estimate_id = p_estimate_id
  GROUP BY cost_code_id, normalized_category;

END;
$$;

-- =============================================
-- PHASE 7: CREATE BUDGET ACTUALS VIEW
-- =============================================

-- Create view for labor actuals by cost code
CREATE OR REPLACE VIEW public.labor_actuals_by_cost_code AS
SELECT 
  dl.project_id,
  dl.cost_code_id,
  cc.code as cost_code,
  cc.name as cost_code_name,
  SUM(dl.hours_worked) as actual_hours,
  SUM(dl.hours_worked * w.hourly_rate) as actual_cost,
  COUNT(DISTINCT dl.worker_id) as worker_count
FROM daily_logs dl
LEFT JOIN cost_codes cc ON dl.cost_code_id = cc.id
LEFT JOIN workers w ON dl.worker_id = w.id
GROUP BY dl.project_id, dl.cost_code_id, cc.code, cc.name;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_estimate_items_cost_code ON estimate_items(cost_code_id);
CREATE INDEX idx_estimate_items_trade ON estimate_items(trade_id);
CREATE INDEX idx_project_budget_lines_project ON project_budget_lines(project_id);
CREATE INDEX idx_project_budget_lines_cost_code ON project_budget_lines(cost_code_id);
CREATE INDEX idx_scheduled_shifts_cost_code ON scheduled_shifts(cost_code_id);
CREATE INDEX idx_daily_logs_cost_code ON daily_logs(cost_code_id);
CREATE INDEX idx_sub_scheduled_shifts_cost_code ON sub_scheduled_shifts(cost_code_id);
CREATE INDEX idx_sub_logs_cost_code ON sub_logs(cost_code_id);