-- prereq: ensure app_role + has_role() exist for views/policies

DO $$
BEGIN
  -- app_role enum (minimal)
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname='public' AND t.typname='app_role'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('admin','member');
  END IF;
END $$;

-- has_role(uid, role) stub (replace later with real logic if needed)
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
CREATE FUNCTION public.has_role(p_user_id uuid, p_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT false
$$;
