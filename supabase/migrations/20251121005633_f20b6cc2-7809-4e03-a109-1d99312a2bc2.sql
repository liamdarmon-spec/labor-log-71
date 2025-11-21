-- Create project_budgets table
CREATE TABLE public.project_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  labor_budget numeric(12,2) DEFAULT 0,
  subs_budget numeric(12,2) DEFAULT 0,
  materials_budget numeric(12,2) DEFAULT 0,
  other_budget numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id)
);

COMMENT ON TABLE public.project_budgets IS 'Budget tracking per project by category (labor, subs, materials, other)';

-- Enable RLS
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_budgets
CREATE POLICY "Anyone can view project budgets"
  ON public.project_budgets FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert project budgets"
  ON public.project_budgets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update project budgets"
  ON public.project_budgets FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete project budgets"
  ON public.project_budgets FOR DELETE
  USING (true);

-- Trigger to update updated_at
CREATE TRIGGER update_project_budgets_updated_at
  BEFORE UPDATE ON public.project_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create project_costs_view
CREATE OR REPLACE VIEW public.project_costs_view AS
WITH labor_costs AS (
  SELECT 
    dl.project_id,
    SUM(dl.hours_worked) AS total_hours,
    SUM(dl.hours_worked * w.hourly_rate) AS total_cost
  FROM public.daily_logs dl
  JOIN public.workers w ON dl.worker_id = w.id
  GROUP BY dl.project_id
),
paid_labor AS (
  SELECT 
    dl.project_id,
    SUM(dl.hours_worked) AS paid_hours,
    SUM(dl.hours_worked * w.hourly_rate) AS paid_cost,
    MAX(p.payment_date) AS last_paid_at
  FROM public.daily_logs dl
  JOIN public.workers w ON dl.worker_id = w.id
  JOIN public.payments p ON dl.date >= p.start_date AND dl.date <= p.end_date
  GROUP BY dl.project_id
),
unpaid_labor AS (
  SELECT 
    dl.project_id,
    SUM(dl.hours_worked) AS unpaid_hours,
    SUM(dl.hours_worked * w.hourly_rate) AS unpaid_cost
  FROM public.daily_logs dl
  JOIN public.workers w ON dl.worker_id = w.id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.payments p
    WHERE dl.date >= p.start_date AND dl.date <= p.end_date
  )
  GROUP BY dl.project_id
)
SELECT 
  p.id AS project_id,
  p.project_name,
  p.client_name,
  p.status,
  -- Labor actual costs
  COALESCE(lc.total_hours, 0) AS labor_total_hours,
  COALESCE(lc.total_cost, 0) AS labor_total_cost,
  COALESCE(pl.paid_hours, 0) AS labor_paid_hours,
  COALESCE(pl.paid_cost, 0) AS labor_paid_cost,
  COALESCE(ul.unpaid_hours, 0) AS labor_unpaid_hours,
  COALESCE(ul.unpaid_cost, 0) AS labor_unpaid_cost,
  pl.last_paid_at,
  -- Budget fields
  COALESCE(pb.labor_budget, 0) AS labor_budget,
  COALESCE(pb.subs_budget, 0) AS subs_budget,
  COALESCE(pb.materials_budget, 0) AS materials_budget,
  COALESCE(pb.other_budget, 0) AS other_budget,
  -- Derived fields for labor
  COALESCE(pb.labor_budget, 0) - COALESCE(lc.total_cost, 0) AS labor_budget_variance,
  GREATEST(COALESCE(pb.labor_budget, 0) - COALESCE(lc.total_cost, 0), 0) AS labor_budget_remaining
FROM public.projects p
LEFT JOIN labor_costs lc ON p.id = lc.project_id
LEFT JOIN paid_labor pl ON p.id = pl.project_id
LEFT JOIN unpaid_labor ul ON p.id = ul.project_id
LEFT JOIN public.project_budgets pb ON p.id = pb.project_id;