-- Create documents table for AI-powered document management
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  document_type TEXT CHECK (document_type IN ('plans', 'receipts', 'invoices', 'contracts', 'submittals', 'permits', 'photos', 'proposals', 'other')),
  cost_code_id UUID REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  auto_classified BOOLEAN DEFAULT false,
  extracted_text TEXT,
  tags TEXT[],
  vendor_name TEXT,
  amount NUMERIC,
  document_date DATE,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create material_receipts table
CREATE TABLE IF NOT EXISTS public.material_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  vendor TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  cost_code_id UUID REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  linked_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  auto_classified BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sub_contracts table
CREATE TABLE IF NOT EXISTS public.sub_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sub_id UUID NOT NULL REFERENCES public.subs(id) ON DELETE CASCADE,
  contract_value NUMERIC NOT NULL DEFAULT 0,
  retention_percentage NUMERIC DEFAULT 0,
  retention_held NUMERIC DEFAULT 0,
  amount_billed NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  payment_terms TEXT,
  start_date DATE,
  end_date DATE,
  linked_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sub_invoices table
CREATE TABLE IF NOT EXISTS public.sub_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sub_id UUID NOT NULL REFERENCES public.subs(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.sub_contracts(id) ON DELETE SET NULL,
  invoice_number TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  retention_amount NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  linked_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  auto_classified BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for documents
CREATE POLICY "Anyone can view documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Anyone can insert documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update documents" ON public.documents FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete documents" ON public.documents FOR DELETE USING (true);

-- Create policies for material_receipts
CREATE POLICY "Anyone can view material receipts" ON public.material_receipts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert material receipts" ON public.material_receipts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update material receipts" ON public.material_receipts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete material receipts" ON public.material_receipts FOR DELETE USING (true);

-- Create policies for sub_contracts
CREATE POLICY "Anyone can view sub contracts" ON public.sub_contracts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sub contracts" ON public.sub_contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sub contracts" ON public.sub_contracts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sub contracts" ON public.sub_contracts FOR DELETE USING (true);

-- Create policies for sub_invoices
CREATE POLICY "Anyone can view sub invoices" ON public.sub_invoices FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sub invoices" ON public.sub_invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sub invoices" ON public.sub_invoices FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sub invoices" ON public.sub_invoices FOR DELETE USING (true);

-- Create indexes for performance
CREATE INDEX idx_documents_project ON public.documents(project_id);
CREATE INDEX idx_documents_type ON public.documents(document_type);
CREATE INDEX idx_documents_cost_code ON public.documents(cost_code_id);
CREATE INDEX idx_material_receipts_project ON public.material_receipts(project_id);
CREATE INDEX idx_material_receipts_cost_code ON public.material_receipts(cost_code_id);
CREATE INDEX idx_sub_contracts_project ON public.sub_contracts(project_id);
CREATE INDEX idx_sub_contracts_sub ON public.sub_contracts(sub_id);
CREATE INDEX idx_sub_invoices_project ON public.sub_invoices(project_id);
CREATE INDEX idx_sub_invoices_sub ON public.sub_invoices(sub_id);

-- Create updated_at triggers
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_receipts_updated_at
  BEFORE UPDATE ON public.material_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sub_contracts_updated_at
  BEFORE UPDATE ON public.sub_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sub_invoices_updated_at
  BEFORE UPDATE ON public.sub_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();