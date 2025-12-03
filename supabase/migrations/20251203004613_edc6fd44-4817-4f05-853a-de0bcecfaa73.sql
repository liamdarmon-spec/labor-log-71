-- Add group_label to scope_block_cost_items (used by EstimateBuilderV2)
ALTER TABLE public.scope_block_cost_items
ADD COLUMN IF NOT EXISTS group_label TEXT;

COMMENT ON COLUMN public.scope_block_cost_items.group_label IS 'Optional grouping label for organizing items within a section (UI-only, does not affect budget rollup)';

-- Add group_label to estimate_items (legacy system)
ALTER TABLE public.estimate_items
ADD COLUMN IF NOT EXISTS group_label TEXT;

COMMENT ON COLUMN public.estimate_items.group_label IS 'Optional grouping label for organizing items within a section (UI-only, does not affect budget rollup)';