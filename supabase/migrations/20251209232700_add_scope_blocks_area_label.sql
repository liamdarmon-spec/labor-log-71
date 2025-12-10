-- Add area_label column to scope_blocks table
-- This allows tracking area/scope labels at the block level for better provenance
-- Backfill from title if title exists (title often represents the area name)

ALTER TABLE public.scope_blocks
  ADD COLUMN IF NOT EXISTS area_label text;

-- Backfill area_label from title for existing blocks where title is set
-- This provides a stable area label for existing data
UPDATE public.scope_blocks
SET area_label = title
WHERE area_label IS NULL
  AND title IS NOT NULL
  AND title != '';

-- Add comment explaining the column
COMMENT ON COLUMN public.scope_blocks.area_label IS 
  'Human-readable label for the area/scope this block represents (e.g., "Kitchen", "ADU"). Used for budget sync provenance and UI display.';
