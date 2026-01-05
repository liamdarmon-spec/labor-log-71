-- Update proposals tables for the refactored workflow

-- Add missing columns to proposals table
ALTER TABLE public.proposals 
  ADD COLUMN IF NOT EXISTS presentation_mode TEXT DEFAULT 'flat' CHECK (presentation_mode IN ('by_area', 'by_phase', 'by_trade', 'flat')),
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- Add missing columns to proposal_sections table
ALTER TABLE public.proposal_sections
  ADD COLUMN IF NOT EXISTS group_type TEXT CHECK (group_type IN ('area', 'phase', 'trade', 'custom')),
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_section_total BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Add missing columns to proposal_section_items table
ALTER TABLE public.proposal_section_items
  ADD COLUMN IF NOT EXISTS display_label TEXT,
  ADD COLUMN IF NOT EXISTS display_notes TEXT,
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS override_quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS override_unit_price NUMERIC,
  ADD COLUMN IF NOT EXISTS override_line_total NUMERIC,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Update triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_proposal_sections_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS update_proposal_sections_updated_at ON public.proposal_sections;
CREATE TRIGGER update_proposal_sections_updated_at
      BEFORE UPDATE ON public.proposal_sections
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_proposal_section_items_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS update_proposal_section_items_updated_at ON public.proposal_section_items;
CREATE TRIGGER update_proposal_section_items_updated_at
      BEFORE UPDATE ON public.proposal_section_items
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;