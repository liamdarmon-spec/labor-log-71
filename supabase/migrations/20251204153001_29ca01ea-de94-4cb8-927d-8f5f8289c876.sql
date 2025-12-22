-- Add missing columns to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS source_context text NULL,
ADD COLUMN IF NOT EXISTS related_cost_id uuid NULL REFERENCES public.costs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS related_invoice_id uuid NULL REFERENCES public.invoices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS version_group_id uuid NULL,
ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS notes text NULL;

-- Create secondary indexes for new columns
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_documents_source_context ON public.documents(source_context);
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_documents_related_cost_id ON public.documents(related_cost_id);
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_documents_related_invoice_id ON public.documents(related_invoice_id);
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_documents_is_archived ON public.documents(is_archived);
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_documents_version_group_id ON public.documents(version_group_id);

-- Create document_tags table
CREATE TABLE IF NOT EXISTS public.document_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id, tag)
);

-- Create indexes for document_tags
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_document_tags_document_id ON public.document_tags(document_id);
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_document_tags_tag ON public.document_tags(tag);

-- Enable RLS on document_tags
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_tags
CREATE POLICY "Anyone can view document tags" ON public.document_tags
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert document tags" ON public.document_tags
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update document tags" ON public.document_tags
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete document tags" ON public.document_tags
  FOR DELETE USING (true);

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('company-docs', 'company-docs', true, 52428800, NULL),
  ('project-docs', 'project-docs', true, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for company-docs bucket
CREATE POLICY "Anyone can view company docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-docs');

CREATE POLICY "Anyone can upload company docs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'company-docs');

CREATE POLICY "Anyone can update company docs" ON storage.objects
  FOR UPDATE USING (bucket_id = 'company-docs');

CREATE POLICY "Anyone can delete company docs" ON storage.objects
  FOR DELETE USING (bucket_id = 'company-docs');

-- Storage policies for project-docs bucket
CREATE POLICY "Anyone can view project docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-docs');

CREATE POLICY "Anyone can upload project docs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'project-docs');

CREATE POLICY "Anyone can update project docs" ON storage.objects
  FOR UPDATE USING (bucket_id = 'project-docs');

CREATE POLICY "Anyone can delete project docs" ON storage.objects
  FOR DELETE USING (bucket_id = 'project-docs');