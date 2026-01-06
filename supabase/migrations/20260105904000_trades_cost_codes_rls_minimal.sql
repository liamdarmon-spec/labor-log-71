-- ============================================================================
-- db: trades/cost_codes RLS (minimal, tenant-safe)
-- ============================================================================
-- Ensures tenant members can insert/select/update/delete trades and cost_codes
-- using canonical helpers. Does NOT loosen to public access.
-- ============================================================================

BEGIN;

-- trades: enable RLS + canonical tenant policies (only if table exists)
DO $$
BEGIN
  IF to_regclass('public.trades') IS NOT NULL THEN
    ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS tenant_select ON public.trades;
    DROP POLICY IF EXISTS tenant_insert ON public.trades;
    DROP POLICY IF EXISTS tenant_update ON public.trades;
    DROP POLICY IF EXISTS tenant_delete ON public.trades;

    CREATE POLICY tenant_select ON public.trades
      FOR SELECT TO authenticated
      USING (company_id = ANY (public.authed_company_ids()));

    CREATE POLICY tenant_insert ON public.trades
      FOR INSERT TO authenticated
      WITH CHECK (company_id = ANY (public.authed_company_ids()));

    CREATE POLICY tenant_update ON public.trades
      FOR UPDATE TO authenticated
      USING (company_id = ANY (public.authed_company_ids()))
      WITH CHECK (company_id = ANY (public.authed_company_ids()));

    CREATE POLICY tenant_delete ON public.trades
      FOR DELETE TO authenticated
      USING (company_id = ANY (public.authed_company_ids()));
  END IF;
END $$;

-- cost_codes: assume already has tenant_* policies; ensure they exist and use tenant helper
DO $$
BEGIN
  IF to_regclass('public.cost_codes') IS NOT NULL THEN
    ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS tenant_select ON public.cost_codes;
    DROP POLICY IF EXISTS tenant_insert ON public.cost_codes;
    DROP POLICY IF EXISTS tenant_update ON public.cost_codes;
    DROP POLICY IF EXISTS tenant_delete ON public.cost_codes;

    CREATE POLICY tenant_select ON public.cost_codes
      FOR SELECT TO authenticated
      USING (company_id = ANY (public.authed_company_ids()));

    CREATE POLICY tenant_insert ON public.cost_codes
      FOR INSERT TO authenticated
      WITH CHECK (company_id = ANY (public.authed_company_ids()));

    CREATE POLICY tenant_update ON public.cost_codes
      FOR UPDATE TO authenticated
      USING (company_id = ANY (public.authed_company_ids()))
      WITH CHECK (company_id = ANY (public.authed_company_ids()));

    CREATE POLICY tenant_delete ON public.cost_codes
      FOR DELETE TO authenticated
      USING (company_id = ANY (public.authed_company_ids()));
  END IF;
END $$;

COMMIT;


