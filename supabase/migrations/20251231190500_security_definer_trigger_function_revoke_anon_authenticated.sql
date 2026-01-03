-- ============================================================================
-- Security hardening (follow-up): revoke EXECUTE from anon/authenticated
-- ============================================================================
-- Context:
-- - These trigger functions are SECURITY DEFINER and run as `postgres`.
-- - In this schema, `anon`/`authenticated` had explicit EXECUTE grants, which
--   allows direct invocation (and potential abuse via triggers on temp tables).
--
-- Goal:
-- - Keep the functions usable as triggers, but prevent direct invocation by
--   client roles.
--
-- Notes:
-- - Trigger execution does not require client roles to have EXECUTE privileges
--   on the trigger function. (Privileges are checked when calling the function
--   directly, not when Postgres invokes it as a trigger.)
-- - Idempotent and safe on fresh DB + existing DB.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    IF to_regprocedure('public.tg_set_company_id_from_project()') IS NOT NULL THEN
      REVOKE ALL ON FUNCTION public.tg_set_company_id_from_project() FROM anon;
    END IF;
    IF to_regprocedure('public.tg_set_company_id_from_invoice()') IS NOT NULL THEN
      REVOKE ALL ON FUNCTION public.tg_set_company_id_from_invoice() FROM anon;
    END IF;
    IF to_regprocedure('public.tg_set_company_id_from_document()') IS NOT NULL THEN
      REVOKE ALL ON FUNCTION public.tg_set_company_id_from_document() FROM anon;
    END IF;
    IF to_regprocedure('public.tg_set_company_id_from_time_log()') IS NOT NULL THEN
      REVOKE ALL ON FUNCTION public.tg_set_company_id_from_time_log() FROM anon;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    IF to_regprocedure('public.tg_set_company_id_from_project()') IS NOT NULL THEN
      REVOKE ALL ON FUNCTION public.tg_set_company_id_from_project() FROM authenticated;
    END IF;
    IF to_regprocedure('public.tg_set_company_id_from_invoice()') IS NOT NULL THEN
      REVOKE ALL ON FUNCTION public.tg_set_company_id_from_invoice() FROM authenticated;
    END IF;
    IF to_regprocedure('public.tg_set_company_id_from_document()') IS NOT NULL THEN
      REVOKE ALL ON FUNCTION public.tg_set_company_id_from_document() FROM authenticated;
    END IF;
    IF to_regprocedure('public.tg_set_company_id_from_time_log()') IS NOT NULL THEN
      REVOKE ALL ON FUNCTION public.tg_set_company_id_from_time_log() FROM authenticated;
    END IF;
  END IF;
END
$$;


