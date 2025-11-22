-- Create sub_payments table for tracking payments to subs
CREATE TABLE IF NOT EXISTS public.sub_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_subcontract_id UUID REFERENCES public.sub_contracts(id) ON DELETE CASCADE,
  sub_invoice_id UUID REFERENCES public.sub_invoices(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  retention_released NUMERIC DEFAULT 0,
  payment_batch_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.sub_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view sub payments"
  ON public.sub_payments FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert sub payments"
  ON public.sub_payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update sub payments"
  ON public.sub_payments FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete sub payments"
  ON public.sub_payments FOR DELETE
  USING (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sub_payments_contract ON public.sub_payments(project_subcontract_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_invoice ON public.sub_payments(sub_invoice_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_date ON public.sub_payments(payment_date);

-- Add missing fields to subs table if needed
ALTER TABLE public.subs ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.subs ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add missing fields to sub_contracts if needed
ALTER TABLE public.sub_contracts ADD COLUMN IF NOT EXISTS description TEXT;

-- Create view for sub contract summaries
CREATE OR REPLACE VIEW public.sub_contract_summary AS
SELECT 
  sc.id as contract_id,
  sc.project_id,
  sc.sub_id,
  s.name as sub_name,
  s.company_name,
  s.trade,
  sc.contract_value,
  sc.retention_percentage,
  sc.status,
  COALESCE(SUM(si.total), 0) as total_billed,
  COALESCE(SUM(sp.amount_paid), 0) as total_paid,
  COALESCE(SUM(si.retention_amount), 0) as total_retention_held,
  COALESCE(SUM(sp.retention_released), 0) as total_retention_released,
  sc.contract_value - COALESCE(SUM(si.total), 0) as remaining_to_bill,
  COALESCE(SUM(si.total), 0) - COALESCE(SUM(sp.amount_paid), 0) as outstanding_balance
FROM public.sub_contracts sc
LEFT JOIN public.subs s ON s.id = sc.sub_id
LEFT JOIN public.sub_invoices si ON si.contract_id = sc.id AND si.payment_status != 'rejected'
LEFT JOIN public.sub_payments sp ON sp.project_subcontract_id = sc.id
GROUP BY sc.id, s.name, s.company_name, s.trade;

-- Grant access to the view
GRANT SELECT ON public.sub_contract_summary TO authenticated;
GRANT SELECT ON public.sub_contract_summary TO anon;