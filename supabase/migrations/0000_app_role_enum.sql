-- Bootstrap enum required by baseline table definitions (must run before 0001_clean_schema.sql)
-- Moved from 20251223090010_postbaseline_roles_and_grants.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role'
      AND n.nspname = 'public'
  ) THEN
CREATE TYPE public.app_role AS ENUM (
    'admin',
    'field_user'
);
  END IF;
END
$$;


