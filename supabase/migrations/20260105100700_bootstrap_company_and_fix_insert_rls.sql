-- ============================================================================
-- Bootstrap onboarding + fix tenant INSERT RLS for core directory tables
-- - Fixes: "violates row-level security policy" when creating subs/workers/vendors
-- - Adds: security definer RPC to create first company + membership (owner)
-- - Standardizes: tenant_insert/tenant_select/tenant_update/tenant_delete policies
-- Assumes you already have:
--   public.authed_user_id()
--   public.authed_company_ids()
--   public.is_company_member(uuid)
-- ============================================================================

-- 0) Safety: make sure pgcrypto is available for gen_random_bytes usage elsewhere
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1) Bootstrap function: create a company + add current user as owner.
--    This avoids the chicken-and-egg: user has zero memberships -> RLS blocks everything.
CREATE OR REPLACE FUNCTION public.bootstrap_company(p_company_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
BEGIN
  v_user_id := public.authed_user_id();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_company_name IS NULL OR btrim(p_company_name) = '' THEN
    RAISE EXCEPTION 'Company name required';
  END IF;

  -- Create company
  INSERT INTO public.companies (name)
  VALUES (p_company_name)
  RETURNING id INTO v_company_id;

  -- Add membership as owner (adjust enum/value if your schema differs)
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (v_company_id, v_user_id, 'owner');

  RETURN v_company_id;
END;
$$;

COMMENT ON FUNCTION public.bootstrap_company(text)
IS 'Onboarding: creates a company and adds the current authed user as owner. SECURITY DEFINER to bypass bootstrap RLS deadlock.';

-- Lock it down: only authenticated users can call
REVOKE ALL ON FUNCTION public.bootstrap_company(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_company(text) TO authenticated;

-- 2) Helper snippet for canonical tenant policy conditions
--    NOTE: we use authed_company_ids() (initplan-safe) and company_id column.

-- 3) Apply canonical policies to key directory tables.
--    If your table names differ, Cursor should adapt based on actual schema.
DO $$
DECLARE
  t text;
BEGIN
  -- List tables that should be tenant-scoped CRUD
  FOREACH t IN ARRAY ARRAY['subs', 'vendors', 'workers'] LOOP
    -- Skip if table doesn't exist
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = t
        AND c.relkind = 'r'
    ) THEN
      CONTINUE;
    END IF;

    -- Enable RLS (idempotent)
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

    -- Drop any existing canonical policies (clean reset)
    EXECUTE format('DROP POLICY IF EXISTS tenant_select ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_insert ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_update ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_delete ON public.%I;', t);

    -- SELECT
    EXECUTE format($sql$
      CREATE POLICY tenant_select ON public.%I
      FOR SELECT
      TO authenticated
      USING (company_id = ANY (public.authed_company_ids()));
    $sql$, t);

    -- INSERT
    EXECUTE format($sql$
      CREATE POLICY tenant_insert ON public.%I
      FOR INSERT
      TO authenticated
      WITH CHECK (company_id = ANY (public.authed_company_ids()));
    $sql$, t);

    -- UPDATE
    EXECUTE format($sql$
      CREATE POLICY tenant_update ON public.%I
      FOR UPDATE
      TO authenticated
      USING (company_id = ANY (public.authed_company_ids()))
      WITH CHECK (company_id = ANY (public.authed_company_ids()));
    $sql$, t);

    -- DELETE
    EXECUTE format($sql$
      CREATE POLICY tenant_delete ON public.%I
      FOR DELETE
      TO authenticated
      USING (company_id = ANY (public.authed_company_ids()));
    $sql$, t);
  END LOOP;
END $$;

-- 4) Optional but recommended: if you *want* to allow creating the first company
--    even when companies table is locked down, ensure companies policies don’t
--    block bootstrap flow. Since bootstrap_company is SECURITY DEFINER, it bypasses
--    RLS anyway, so this is usually not required.