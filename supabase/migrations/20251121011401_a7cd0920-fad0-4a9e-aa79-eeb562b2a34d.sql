-- Create estimates table
CREATE TABLE public.estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  subtotal_amount numeric(12,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_estimate_status CHECK (status IN ('draft', 'sent', 'accepted', 'rejected'))
);

COMMENT ON TABLE public.estimates IS 'Project estimates with line items';

-- Create estimate_items table
CREATE TABLE public.estimate_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit text DEFAULT 'ea',
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.estimate_items IS 'Line items for estimates';

-- Create subs (subcontractors) table
CREATE TABLE public.subs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_name text,
  trade text,
  phone text,
  email text,
  default_rate numeric(12,2) DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.subs IS 'Subcontractors database';

-- Create sub_logs table
CREATE TABLE public.sub_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_id uuid NOT NULL REFERENCES public.subs(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

COMMENT ON TABLE public.sub_logs IS 'Subcontractor cost logs per project';

-- Create invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal_amount numeric(12,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_invoice_status CHECK (status IN ('draft', 'sent', 'paid', 'overdue'))
);

COMMENT ON TABLE public.invoices IS 'Client invoices per project';

-- Create invoice_items table
CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit text DEFAULT 'ea',
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.invoice_items IS 'Line items for invoices';

-- Enable RLS on all new tables
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for estimates
CREATE POLICY "Anyone can view estimates"
  ON public.estimates FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert estimates"
  ON public.estimates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update estimates"
  ON public.estimates FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete estimates"
  ON public.estimates FOR DELETE
  USING (true);

-- RLS policies for estimate_items
CREATE POLICY "Anyone can view estimate items"
  ON public.estimate_items FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert estimate items"
  ON public.estimate_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update estimate items"
  ON public.estimate_items FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete estimate items"
  ON public.estimate_items FOR DELETE
  USING (true);

-- RLS policies for subs
CREATE POLICY "Anyone can view subs"
  ON public.subs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert subs"
  ON public.subs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update subs"
  ON public.subs FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete subs"
  ON public.subs FOR DELETE
  USING (true);

-- RLS policies for sub_logs
CREATE POLICY "Anyone can view sub logs"
  ON public.sub_logs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert sub logs"
  ON public.sub_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update sub logs"
  ON public.sub_logs FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete sub logs"
  ON public.sub_logs FOR DELETE
  USING (true);

-- RLS policies for invoices
CREATE POLICY "Anyone can view invoices"
  ON public.invoices FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update invoices"
  ON public.invoices FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete invoices"
  ON public.invoices FOR DELETE
  USING (true);

-- RLS policies for invoice_items
CREATE POLICY "Anyone can view invoice items"
  ON public.invoice_items FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert invoice items"
  ON public.invoice_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update invoice items"
  ON public.invoice_items FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete invoice items"
  ON public.invoice_items FOR DELETE
  USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_estimates_updated_at
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subs_updated_at
  BEFORE UPDATE ON public.subs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_estimates_project_id ON public.estimates(project_id);
CREATE INDEX idx_estimates_status ON public.estimates(status);
CREATE INDEX idx_estimate_items_estimate_id ON public.estimate_items(estimate_id);
CREATE INDEX idx_sub_logs_project_id ON public.sub_logs(project_id);
CREATE INDEX idx_sub_logs_sub_id ON public.sub_logs(sub_id);
CREATE INDEX idx_sub_logs_date ON public.sub_logs(date);
CREATE INDEX idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);