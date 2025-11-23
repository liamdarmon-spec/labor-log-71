-- Create costs table (AP-like: all project costs)
CREATE TABLE IF NOT EXISTS public.costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  vendor_type TEXT CHECK (vendor_type IN ('sub', 'supplier', 'other')),
  vendor_id UUID REFERENCES public.subs(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  cost_code_id UUID REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('labor', 'subs', 'materials', 'misc')),
  amount NUMERIC NOT NULL DEFAULT 0,
  date_incurred DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid')),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Extend existing invoices table with missing columns
ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Update invoices status constraint to include new statuses
ALTER TABLE public.invoices 
  DROP CONSTRAINT IF EXISTS invoices_status_check;
  
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('draft', 'sent', 'partially_paid', 'paid', 'void'));

-- Extend existing invoice_items table
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS cost_code_id UUID REFERENCES public.cost_codes(id) ON DELETE SET NULL;

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('labor', 'subs', 'materials', 'misc'));

-- Add indexes for performance on costs table
CREATE INDEX IF NOT EXISTS idx_costs_project_id ON public.costs(project_id);
CREATE INDEX IF NOT EXISTS idx_costs_date_incurred ON public.costs(date_incurred);
CREATE INDEX IF NOT EXISTS idx_costs_category ON public.costs(category);
CREATE INDEX IF NOT EXISTS idx_costs_vendor_id ON public.costs(vendor_id);
CREATE INDEX IF NOT EXISTS idx_costs_status ON public.costs(status);
CREATE INDEX IF NOT EXISTS idx_costs_company_id ON public.costs(company_id);

-- Add index on invoice_items for new cost_code_id column
CREATE INDEX IF NOT EXISTS idx_invoice_items_cost_code_id ON public.invoice_items(cost_code_id);

-- Add RLS policies for costs
ALTER TABLE public.costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view costs"
  ON public.costs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert costs"
  ON public.costs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update costs"
  ON public.costs FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete costs"
  ON public.costs FOR DELETE
  USING (true);

-- Add updated_at trigger for costs
CREATE TRIGGER update_costs_updated_at
  BEFORE UPDATE ON public.costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();