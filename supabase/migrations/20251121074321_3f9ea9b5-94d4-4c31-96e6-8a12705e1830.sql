-- Phase 1 & 2: Add constraints and seed cost codes

-- Add unique constraint on cost_codes.code if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cost_codes_code_key'
  ) THEN
    ALTER TABLE public.cost_codes ADD CONSTRAINT cost_codes_code_key UNIQUE (code);
  END IF;
END $$;

-- Add unique constraint on (project_id, cost_code_id) for project_budget_lines
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_budget_lines_project_cost_code_unique'
  ) THEN
    ALTER TABLE public.project_budget_lines 
    ADD CONSTRAINT project_budget_lines_project_cost_code_unique 
    UNIQUE (project_id, cost_code_id);
  END IF;
END $$;

-- Seed starter cost codes (without description field)
INSERT INTO public.cost_codes (code, category, name) VALUES
  ('2100', 'materials', 'Cabinets - Materials'),
  ('2200', 'labor', 'Cabinet Install - Labor'),
  ('3000', 'subs', 'Electrical - Subcontractor'),
  ('3100', 'subs', 'Plumbing - Subcontractor'),
  ('3200', 'subs', 'HVAC - Subcontractor'),
  ('4000', 'materials', 'Framing Materials'),
  ('4100', 'labor', 'Framing Labor'),
  ('5000', 'materials', 'Drywall Materials'),
  ('5100', 'labor', 'Drywall Labor'),
  ('6000', 'materials', 'Flooring Materials'),
  ('6100', 'labor', 'Flooring Install - Labor'),
  ('7000', 'other', 'Project Management'),
  ('8000', 'other', 'Permits and Fees'),
  ('9000', 'other', 'Allowances')
ON CONFLICT (code) DO NOTHING;