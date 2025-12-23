-- Adds missing column required by idx_scope_blocks_parent index
ALTER TABLE public.scope_blocks
  ADD COLUMN IF NOT EXISTS parent_id uuid;
