-- Add missing columns to proposals table
ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS primary_estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS client_email TEXT,
ADD COLUMN IF NOT EXISTS proposal_date DATE NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS validity_days INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS acceptance_method TEXT CHECK (acceptance_method IN ('manual', 'e_signature', 'imported')),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update status constraint to include all lifecycle states
ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_status_check;
ALTER TABLE public.proposals ADD CONSTRAINT proposals_status_check 
  CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'));

-- Create proposal_line_groups table
CREATE TABLE IF NOT EXISTS public.proposal_line_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
  estimate_group_id UUID,
  display_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  show_line_items BOOLEAN NOT NULL DEFAULT true,
  show_group_total BOOLEAN NOT NULL DEFAULT true,
  markup_mode TEXT NOT NULL DEFAULT 'from_estimate' CHECK (markup_mode IN ('from_estimate', 'override_group_total')),
  override_total_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proposal_line_overrides table  
CREATE TABLE IF NOT EXISTS public.proposal_line_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  estimate_line_id UUID NOT NULL REFERENCES public.estimate_items(id) ON DELETE CASCADE,
  show_to_client BOOLEAN NOT NULL DEFAULT true,
  custom_label TEXT,
  custom_description TEXT,
  custom_unit TEXT,
  custom_unit_price NUMERIC,
  custom_quantity NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update proposal_sections to include all required columns
ALTER TABLE public.proposal_sections
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('intro', 'scope', 'line_items', 'allowances', 'exclusions', 'payment_terms', 'notes', 'signature')),
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS content_richtext TEXT,
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_proposals_project_id ON public.proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_estimate_id ON public.proposals(primary_estimate_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposal_line_groups_proposal_id ON public.proposal_line_groups(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_line_overrides_proposal_id ON public.proposal_line_overrides(proposal_id);

-- Enable RLS on new tables
ALTER TABLE public.proposal_line_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_line_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view proposal line groups" ON public.proposal_line_groups FOR SELECT USING (true);
CREATE POLICY "Anyone can insert proposal line groups" ON public.proposal_line_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update proposal line groups" ON public.proposal_line_groups FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete proposal line groups" ON public.proposal_line_groups FOR DELETE USING (true);

CREATE POLICY "Anyone can view proposal line overrides" ON public.proposal_line_overrides FOR SELECT USING (true);
CREATE POLICY "Anyone can insert proposal line overrides" ON public.proposal_line_overrides FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update proposal line overrides" ON public.proposal_line_overrides FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete proposal line overrides" ON public.proposal_line_overrides FOR DELETE USING (true);