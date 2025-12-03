-- Add area_label and breakdown_notes columns to scope_block_cost_items
-- These are optional fields for estimate organization and internal notes

ALTER TABLE public.scope_block_cost_items
  ADD COLUMN IF NOT EXISTS area_label TEXT NULL,
  ADD COLUMN IF NOT EXISTS breakdown_notes TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.scope_block_cost_items.area_label IS 'Optional area/location label (e.g. Kitchen, Master Bath)';
COMMENT ON COLUMN public.scope_block_cost_items.breakdown_notes IS 'Optional internal breakdown/details notes for the line item';