-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  paid_by TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view payments" 
ON public.payments 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update payments" 
ON public.payments 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete payments" 
ON public.payments 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for date range queries
CREATE INDEX idx_payments_dates ON public.payments(start_date, end_date);
CREATE INDEX idx_payments_company ON public.payments(company_id);