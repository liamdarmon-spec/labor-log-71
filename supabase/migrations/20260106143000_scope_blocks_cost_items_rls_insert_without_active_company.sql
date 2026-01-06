-- ============================================================================
-- db: allow scope block + cost item inserts without relying on client activeCompanyId
-- Rationale:
-- - Frontend "active company" selection is UX state and may be NULL (multi-membership)
-- - Inserts must still be tenant-safe and deterministic
-- - Use parent/entity joins in WITH CHECK so DB remains canonical and RLS-safe
-- ============================================================================

-- scope_blocks: INSERT allowed if user is member of the owning entity's company
DROP POLICY IF EXISTS tenant_insert ON public.scope_blocks;
CREATE POLICY tenant_insert
ON public.scope_blocks
FOR INSERT
TO authenticated
WITH CHECK (
  (
    entity_type = 'estimate'
    AND EXISTS (
      SELECT 1
      FROM public.estimates e
      WHERE e.id = entity_id
        AND e.company_id = ANY(public.authed_company_ids())
    )
  )
  OR
  (
    entity_type = 'proposal'
    AND EXISTS (
      SELECT 1
      FROM public.proposals p
      WHERE p.id = entity_id
        AND p.company_id = ANY(public.authed_company_ids())
    )
  )
);

-- scope_block_cost_items: INSERT allowed if user is member of the parent scope block's company
DROP POLICY IF EXISTS tenant_insert ON public.scope_block_cost_items;
CREATE POLICY tenant_insert
ON public.scope_block_cost_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.scope_blocks sb
    WHERE sb.id = scope_block_id
      AND sb.company_id = ANY(public.authed_company_ids())
  )
);

-- Also harden UPDATE/DELETE to use the parent join (prevents mismatched company_id shenanigans)
DROP POLICY IF EXISTS tenant_update ON public.scope_block_cost_items;
CREATE POLICY tenant_update
ON public.scope_block_cost_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.scope_blocks sb
    WHERE sb.id = scope_block_id
      AND sb.company_id = ANY(public.authed_company_ids())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.scope_blocks sb
    WHERE sb.id = scope_block_id
      AND sb.company_id = ANY(public.authed_company_ids())
  )
);

DROP POLICY IF EXISTS tenant_delete ON public.scope_block_cost_items;
CREATE POLICY tenant_delete
ON public.scope_block_cost_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.scope_blocks sb
    WHERE sb.id = scope_block_id
      AND sb.company_id = ANY(public.authed_company_ids())
  )
);

-- Best-effort schema cache refresh
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
  -- noop
END $$;


