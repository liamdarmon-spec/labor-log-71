-- ============================================================================
-- db: scope blocks + cost items tenant RLS hardening (production-grade)
-- Goals:
-- - Ensure company_id is populated deterministically (server-side)
-- - Replace permissive "Anyone can *" RLS policies with tenant-scoped policies
-- - Keep multi-tenant isolation by company_id using public.authed_company_ids()
-- ============================================================================

-- 1) Ensure company_id columns exist
ALTER TABLE public.scope_blocks
  ADD COLUMN IF NOT EXISTS company_id uuid;

ALTER TABLE public.scope_block_cost_items
  ADD COLUMN IF NOT EXISTS company_id uuid;

-- 2) Backfill company_id where possible (idempotent)
-- scope_blocks.company_id from their owning entity
UPDATE public.scope_blocks sb
SET company_id = e.company_id
FROM public.estimates e
WHERE sb.company_id IS NULL
  AND sb.entity_type = 'estimate'
  AND sb.entity_id = e.id
  AND e.company_id IS NOT NULL;

UPDATE public.scope_blocks sb
SET company_id = p.company_id
FROM public.proposals p
WHERE sb.company_id IS NULL
  AND sb.entity_type = 'proposal'
  AND sb.entity_id = p.id
  AND p.company_id IS NOT NULL;

-- scope_block_cost_items.company_id from parent scope block
UPDATE public.scope_block_cost_items i
SET company_id = sb.company_id
FROM public.scope_blocks sb
WHERE i.company_id IS NULL
  AND i.scope_block_id = sb.id
  AND sb.company_id IS NOT NULL;

-- 3) Ensure company_id is set on new scope_blocks rows (trigger)
CREATE OR REPLACE FUNCTION public.tg_set_scope_block_company_id_from_entity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    IF NEW.entity_type = 'estimate' THEN
      SELECT e.company_id INTO NEW.company_id
      FROM public.estimates e
      WHERE e.id = NEW.entity_id;
    ELSIF NEW.entity_type = 'proposal' THEN
      SELECT p.company_id INTO NEW.company_id
      FROM public.proposals p
      WHERE p.id = NEW.entity_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_scope_block_company_id_from_entity ON public.scope_blocks;
CREATE TRIGGER set_scope_block_company_id_from_entity
  BEFORE INSERT OR UPDATE ON public.scope_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_scope_block_company_id_from_entity();

-- 4) Replace permissive policies with tenant-scoped policies
ALTER TABLE public.scope_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scope_block_cost_items ENABLE ROW LEVEL SECURITY;

-- Drop legacy permissive policies (created in early v2 migration)
DROP POLICY IF EXISTS "Anyone can view scope blocks" ON public.scope_blocks;
DROP POLICY IF EXISTS "Anyone can insert scope blocks" ON public.scope_blocks;
DROP POLICY IF EXISTS "Anyone can update scope blocks" ON public.scope_blocks;
DROP POLICY IF EXISTS "Anyone can delete scope blocks" ON public.scope_blocks;

DROP POLICY IF EXISTS "Anyone can view scope block cost items" ON public.scope_block_cost_items;
DROP POLICY IF EXISTS "Anyone can insert scope block cost items" ON public.scope_block_cost_items;
DROP POLICY IF EXISTS "Anyone can update scope block cost items" ON public.scope_block_cost_items;
DROP POLICY IF EXISTS "Anyone can delete scope block cost items" ON public.scope_block_cost_items;

-- Canonical tenant policies
DROP POLICY IF EXISTS tenant_select ON public.scope_blocks;
CREATE POLICY tenant_select
ON public.scope_blocks
FOR SELECT
TO authenticated
USING (company_id = ANY(public.authed_company_ids()));

DROP POLICY IF EXISTS tenant_insert ON public.scope_blocks;
CREATE POLICY tenant_insert
ON public.scope_blocks
FOR INSERT
TO authenticated
WITH CHECK (company_id = ANY(public.authed_company_ids()));

DROP POLICY IF EXISTS tenant_update ON public.scope_blocks;
CREATE POLICY tenant_update
ON public.scope_blocks
FOR UPDATE
TO authenticated
USING (company_id = ANY(public.authed_company_ids()))
WITH CHECK (company_id = ANY(public.authed_company_ids()));

DROP POLICY IF EXISTS tenant_delete ON public.scope_blocks;
CREATE POLICY tenant_delete
ON public.scope_blocks
FOR DELETE
TO authenticated
USING (company_id = ANY(public.authed_company_ids()));

DROP POLICY IF EXISTS tenant_select ON public.scope_block_cost_items;
CREATE POLICY tenant_select
ON public.scope_block_cost_items
FOR SELECT
TO authenticated
USING (company_id = ANY(public.authed_company_ids()));

DROP POLICY IF EXISTS tenant_insert ON public.scope_block_cost_items;
CREATE POLICY tenant_insert
ON public.scope_block_cost_items
FOR INSERT
TO authenticated
WITH CHECK (company_id = ANY(public.authed_company_ids()));

DROP POLICY IF EXISTS tenant_update ON public.scope_block_cost_items;
CREATE POLICY tenant_update
ON public.scope_block_cost_items
FOR UPDATE
TO authenticated
USING (company_id = ANY(public.authed_company_ids()))
WITH CHECK (company_id = ANY(public.authed_company_ids()));

DROP POLICY IF EXISTS tenant_delete ON public.scope_block_cost_items;
CREATE POLICY tenant_delete
ON public.scope_block_cost_items
FOR DELETE
TO authenticated
USING (company_id = ANY(public.authed_company_ids()));

-- 5) Refresh PostgREST schema cache (best-effort)
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
  -- noop
END $$;


