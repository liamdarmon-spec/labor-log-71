-- Create proposal_templates table for reusable templates
CREATE TABLE IF NOT EXISTS public.proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create proposal_images table for gallery blocks
CREATE TABLE IF NOT EXISTS public.proposal_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.proposal_sections(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposal_images_proposal_id ON public.proposal_images(proposal_id);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='proposal_images'
      AND column_name='section_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_proposal_images_section_id ON public.proposal_images(section_id)';
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='proposal_templates'
      AND column_name='created_by'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_proposal_templates_created_by ON public.proposal_templates(created_by)';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proposal_templates
DROP POLICY IF EXISTS "Anyone can view proposal templates" ON public.proposal_templates;
CREATE POLICY "Anyone can view proposal templates" ON public.proposal_templates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert proposal templates" ON public.proposal_templates;
CREATE POLICY "Anyone can insert proposal templates" ON public.proposal_templates FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update proposal templates" ON public.proposal_templates;
CREATE POLICY "Anyone can update proposal templates" ON public.proposal_templates FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anyone can delete proposal templates" ON public.proposal_templates;
CREATE POLICY "Anyone can delete proposal templates" ON public.proposal_templates FOR DELETE USING (true);
-- RLS Policies for proposal_images
DROP POLICY IF EXISTS "Anyone can view proposal images" ON public.proposal_images;
CREATE POLICY "Anyone can view proposal images" ON public.proposal_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert proposal images" ON public.proposal_images;
CREATE POLICY "Anyone can insert proposal images" ON public.proposal_images FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update proposal images" ON public.proposal_images;
CREATE POLICY "Anyone can update proposal images" ON public.proposal_images FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anyone can delete proposal images" ON public.proposal_images;
CREATE POLICY "Anyone can delete proposal images" ON public.proposal_images FOR DELETE USING (true);
-- Trigger for updated_at on templates
DROP TRIGGER IF EXISTS update_proposal_templates_updated_at ON public.proposal_templates;
CREATE TRIGGER update_proposal_templates_updated_at
  BEFORE UPDATE ON public.proposal_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();