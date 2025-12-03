-- Drop existing constraints if they exist
ALTER TABLE public.costs DROP CONSTRAINT IF EXISTS costs_category_check;
ALTER TABLE public.project_budget_lines DROP CONSTRAINT IF EXISTS project_budget_lines_category_check;
ALTER TABLE public.cost_codes DROP CONSTRAINT IF EXISTS cost_codes_category_check;

-- Costs: enforce only subs/materials/other
ALTER TABLE public.costs
ADD CONSTRAINT costs_category_check
CHECK (category IN ('subs', 'materials', 'other'));

-- Budget lines: enforce 4-way breakdown
ALTER TABLE public.project_budget_lines
ADD CONSTRAINT project_budget_lines_category_check
CHECK (category IN ('labor', 'subs', 'materials', 'other'));

-- Cost codes: keep them aligned with the same 4 categories
ALTER TABLE public.cost_codes
ADD CONSTRAINT cost_codes_category_check
CHECK (category IN ('labor', 'subs', 'materials', 'other'));