-- Fix: ensure scope_blocks.parent_id exists before idx_scope_blocks_parent
-- NOTE: This must run before 20251122202400_7f821132-501c-400e-90bf-626b623cdd52.sql

ALTER TABLE public.scope_blocks
  ADD COLUMN IF NOT EXISTS parent_id uuid;


