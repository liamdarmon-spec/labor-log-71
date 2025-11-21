-- Add optional fields to estimate_items for better proposal grouping
ALTER TABLE public.estimate_items
ADD COLUMN IF NOT EXISTS area_name TEXT,
ADD COLUMN IF NOT EXISTS scope_group TEXT;

-- Create proposals table
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'archived')),
  version_label TEXT,
  notes_internal TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proposal_sections table
CREATE TABLE IF NOT EXISTS public.proposal_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_lump_sum BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proposal_section_items table
CREATE TABLE IF NOT EXISTS public.proposal_section_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_section_id UUID NOT NULL REFERENCES public.proposal_sections(id) ON DELETE CASCADE,
  estimate_item_id UUID NOT NULL REFERENCES public.estimate_items(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  display_description TEXT,
  display_quantity NUMERIC,
  display_unit TEXT,
  display_unit_price NUMERIC,
  show_line_item BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposals_project_id ON public.proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposal_sections_proposal_id ON public.proposal_sections(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_section_items_section_id ON public.proposal_section_items(proposal_section_id);
CREATE INDEX IF NOT EXISTS idx_proposal_section_items_estimate_item_id ON public.proposal_section_items(estimate_item_id);

-- Enable RLS on new tables
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_section_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for proposals
CREATE POLICY "Anyone can view proposals" ON public.proposals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert proposals" ON public.proposals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update proposals" ON public.proposals FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete proposals" ON public.proposals FOR DELETE USING (true);

-- Create RLS policies for proposal_sections
CREATE POLICY "Anyone can view proposal sections" ON public.proposal_sections FOR SELECT USING (true);
CREATE POLICY "Anyone can insert proposal sections" ON public.proposal_sections FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update proposal sections" ON public.proposal_sections FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete proposal sections" ON public.proposal_sections FOR DELETE USING (true);

-- Create RLS policies for proposal_section_items
CREATE POLICY "Anyone can view proposal section items" ON public.proposal_section_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert proposal section items" ON public.proposal_section_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update proposal section items" ON public.proposal_section_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete proposal section items" ON public.proposal_section_items FOR DELETE USING (true);

-- Add trigger to update updated_at on proposals
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();