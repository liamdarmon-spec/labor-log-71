-- ====================================================================
-- UNIFIED DOCUMENTS & SUBCONTRACTOR SYSTEM
-- ====================================================================

-- Step 1: Add all missing columns to documents table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS owner_type TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS doc_type TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS ai_status TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS ai_doc_type TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS ai_extracted_data JSONB;

-- Update existing data
UPDATE public.documents SET uploaded_at = created_at WHERE uploaded_at IS NULL;
UPDATE public.documents SET storage_path = file_url WHERE storage_path IS NULL AND file_url IS NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON public.documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON public.documents(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_documents_ai_status ON public.documents(ai_status);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Sub compliance documents
CREATE TABLE IF NOT EXISTS public.sub_compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_id UUID NOT NULL REFERENCES public.subs(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_url TEXT,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  effective_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'valid',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project subcontracts
CREATE TABLE IF NOT EXISTS public.project_subcontracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sub_id UUID NOT NULL REFERENCES public.subs(id) ON DELETE CASCADE,
  contract_amount NUMERIC NOT NULL DEFAULT 0,
  retention_percent NUMERIC DEFAULT 10,
  approved_cos_amount NUMERIC DEFAULT 0,
  net_contract_value NUMERIC GENERATED ALWAYS AS (contract_amount + approved_cos_amount) STORED,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, sub_id)
);

-- Bid packages
CREATE TABLE IF NOT EXISTS public.bid_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scope_summary TEXT,
  cost_code_ids UUID[],
  bid_due_date DATE,
  desired_start_date DATE,
  attachments JSONB,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bid invitations
CREATE TABLE IF NOT EXISTS public.bid_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_package_id UUID NOT NULL REFERENCES public.bid_packages(id) ON DELETE CASCADE,
  sub_id UUID NOT NULL REFERENCES public.subs(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'invited',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(bid_package_id, sub_id)
);

-- Sub bids
CREATE TABLE IF NOT EXISTS public.sub_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_package_id UUID NOT NULL REFERENCES public.bid_packages(id) ON DELETE CASCADE,
  sub_id UUID NOT NULL REFERENCES public.subs(id) ON DELETE CASCADE,
  bid_amount NUMERIC NOT NULL,
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attachments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bid_package_id, sub_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sub_compliance_sub_id ON public.sub_compliance_documents(sub_id);
CREATE INDEX IF NOT EXISTS idx_sub_compliance_expiry ON public.sub_compliance_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_project_subcontracts_project ON public.project_subcontracts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_subcontracts_sub ON public.project_subcontracts(sub_id);
CREATE INDEX IF NOT EXISTS idx_bid_packages_project ON public.bid_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_bid_invitations_package ON public.bid_invitations(bid_package_id);
CREATE INDEX IF NOT EXISTS idx_sub_bids_package ON public.sub_bids(bid_package_id);

-- Triggers
DROP TRIGGER IF EXISTS update_sub_compliance_documents_updated_at ON public.sub_compliance_documents;
CREATE TRIGGER update_sub_compliance_documents_updated_at BEFORE UPDATE ON public.sub_compliance_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_subcontracts_updated_at ON public.project_subcontracts;
CREATE TRIGGER update_project_subcontracts_updated_at BEFORE UPDATE ON public.project_subcontracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bid_packages_updated_at ON public.bid_packages;
CREATE TRIGGER update_bid_packages_updated_at BEFORE UPDATE ON public.bid_packages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.sub_compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_subcontracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_bids ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view sub compliance" ON public.sub_compliance_documents FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sub compliance" ON public.sub_compliance_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sub compliance" ON public.sub_compliance_documents FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sub compliance" ON public.sub_compliance_documents FOR DELETE USING (true);

CREATE POLICY "Anyone can view project subcontracts" ON public.project_subcontracts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert project subcontracts" ON public.project_subcontracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update project subcontracts" ON public.project_subcontracts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete project subcontracts" ON public.project_subcontracts FOR DELETE USING (true);

CREATE POLICY "Anyone can view bid packages" ON public.bid_packages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert bid packages" ON public.bid_packages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update bid packages" ON public.bid_packages FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete bid packages" ON public.bid_packages FOR DELETE USING (true);

CREATE POLICY "Anyone can view bid invitations" ON public.bid_invitations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert bid invitations" ON public.bid_invitations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update bid invitations" ON public.bid_invitations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete bid invitations" ON public.bid_invitations FOR DELETE USING (true);

CREATE POLICY "Anyone can view sub bids" ON public.sub_bids FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sub bids" ON public.sub_bids FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sub bids" ON public.sub_bids FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sub bids" ON public.sub_bids FOR DELETE USING (true);