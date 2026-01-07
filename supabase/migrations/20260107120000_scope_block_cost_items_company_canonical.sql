-- Canonical company_id for scope_block_cost_items (already applied on remote).
-- Restored locally to match remote migration history.

-- 1) Backfill missing company_id on cost items
UPDATE public.scope_block_cost_items i
SET company_id = sb.company_id
FROM public.scope_blocks sb
WHERE i.company_id IS NULL
  AND i.scope_block_id = sb.id
  AND sb.company_id IS NOT NULL;

-- 2) Ensure company_id is always set from parent scope block
CREATE OR REPLACE FUNCTION public.tg_set_cost_item_company_id_from_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT sb.company_id
    INTO NEW.company_id
    FROM public.scope_blocks sb
    WHERE sb.id = NEW.scope_block_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_cost_item_company_id_from_block
ON public.scope_block_cost_items;

CREATE TRIGGER set_cost_item_company_id_from_block
  BEFORE INSERT OR UPDATE OF scope_block_id, company_id
  ON public.scope_block_cost_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_cost_item_company_id_from_block();

-- 3) Enforce invariant
ALTER TABLE public.scope_block_cost_items
  ALTER COLUMN company_id SET NOT NULL;

-- 4) Fix tenant SELECT policy to use parent join (not raw company_id)
DROP POLICY IF EXISTS tenant_select ON public.scope_block_cost_items;

CREATE POLICY tenant_select
ON public.scope_block_cost_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.scope_blocks sb
    WHERE sb.id = scope_block_id
      AND sb.company_id = ANY(public.authed_company_ids())
  )
);


