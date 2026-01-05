-- Tenant foundation: companies + membership + role helpers (additive, idempotent)

-- 0) Extensions (needed for gen_random_uuid in some setups)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) company_role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'company_role'
  ) THEN
    CREATE TYPE public.company_role AS ENUM ('owner','admin','manager','member','viewer');
  END IF;
END
$$;

-- 2) Core tables
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_members (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.company_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON public.company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON public.company_members(company_id);

-- 3) Helper functions
DROP FUNCTION IF EXISTS public.is_company_member(uuid);
CREATE FUNCTION public.is_company_member(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members m
    WHERE m.company_id = p_company_id
      AND m.user_id = auth.uid()
  );
$$;

DROP FUNCTION IF EXISTS public.has_company_role(uuid, public.company_role);
CREATE FUNCTION public.has_company_role(p_company_id uuid, p_role public.company_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH me AS (
    SELECT m.role
    FROM public.company_members m
    WHERE m.company_id = p_company_id
      AND m.user_id = auth.uid()
    LIMIT 1
  ),
  ranks AS (
    SELECT
      CASE (SELECT role FROM me)
        WHEN 'owner'::public.company_role THEN 5
        WHEN 'admin'::public.company_role THEN 4
        WHEN 'manager'::public.company_role THEN 3
        WHEN 'member'::public.company_role THEN 2
        WHEN 'viewer'::public.company_role THEN 1
        ELSE 0
      END AS my_rank,
      CASE p_role
        WHEN 'owner'::public.company_role THEN 5
        WHEN 'admin'::public.company_role THEN 4
        WHEN 'manager'::public.company_role THEN 3
        WHEN 'member'::public.company_role THEN 2
        WHEN 'viewer'::public.company_role THEN 1
        ELSE 0
      END AS req_rank
  )
  SELECT (SELECT my_rank FROM ranks) >= (SELECT req_rank FROM ranks);
$$;

-- 4) Bootstrap RPC: create company + add caller as owner
-- This avoids the "how do I insert first owner?" trap.
DROP FUNCTION IF EXISTS public.create_company_with_owner(text);
CREATE FUNCTION public.create_company_with_owner(p_name text)
RETURNS public.companies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_company public.companies;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.companies(name)
  VALUES (p_name)
  RETURNING * INTO v_company;

  INSERT INTO public.company_members(company_id, user_id, role)
  VALUES (v_company.id, auth.uid(), 'owner'::public.company_role)
  ON CONFLICT (company_id, user_id) DO NOTHING;

  RETURN v_company;
END;
$$;

-- 5) RLS + policies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- companies: members can SELECT; admin+ can UPDATE; owner can DELETE
DROP POLICY IF EXISTS company_companies_select ON public.companies;
CREATE POLICY company_companies_select
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(id));

-- allow authenticated to INSERT companies (bootstrap uses RPC, but this keeps it flexible)
DROP POLICY IF EXISTS company_companies_insert ON public.companies;
CREATE POLICY company_companies_insert
  ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS company_companies_update ON public.companies;
CREATE POLICY company_companies_update
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (public.has_company_role(id, 'admin'::public.company_role))
  WITH CHECK (public.has_company_role(id, 'admin'::public.company_role));

DROP POLICY IF EXISTS company_companies_delete ON public.companies;
CREATE POLICY company_companies_delete
  ON public.companies
  FOR DELETE
  TO authenticated
  USING (public.has_company_role(id, 'owner'::public.company_role));

-- company_members: member can SELECT within their company
DROP POLICY IF EXISTS company_company_members_select ON public.company_members;
CREATE POLICY company_company_members_select
  ON public.company_members
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

-- company_members: admin+ can manage membership
DROP POLICY IF EXISTS company_company_members_insert ON public.company_members;
CREATE POLICY company_company_members_insert
  ON public.company_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_company_role(company_id, 'admin'::public.company_role));

DROP POLICY IF EXISTS company_company_members_update ON public.company_members;
CREATE POLICY company_company_members_update
  ON public.company_members
  FOR UPDATE
  TO authenticated
  USING (public.has_company_role(company_id, 'admin'::public.company_role))
  WITH CHECK (public.has_company_role(company_id, 'admin'::public.company_role));

DROP POLICY IF EXISTS company_company_members_delete ON public.company_members;
CREATE POLICY company_company_members_delete
  ON public.company_members
  FOR DELETE
  TO authenticated
  USING (public.has_company_role(company_id, 'admin'::public.company_role));