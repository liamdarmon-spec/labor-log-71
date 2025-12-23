-- Must run BEFORE the migration that creates idx_scope_blocks_parent
ALTER TABLE public.scope_blocks
  ADD COLUMN IF NOT EXISTS parent_id uuid;
