-- ============================================================================
-- Security hardening: restrict EXECUTE on SECURITY DEFINER trigger functions
-- ============================================================================
-- Why:
-- - In Postgres, EXECUTE on functions is granted to PUBLIC by default.
-- - SECURITY DEFINER functions should generally not be directly callable by arbitrary roles.
-- - These functions are intended to be invoked by triggers, not by clients.
--
-- Strategy:
-- - Ensure owner is postgres (canonical on Supabase).
-- - Revoke EXECUTE from PUBLIC.
-- - Grant EXECUTE to postgres and service_role (defensive; triggers do not require client EXECUTE).
--
-- Idempotent + safe for db:reset.

DO $$
BEGIN
  -- public.tg_set_company_id_from_project()
  IF to_regprocedure('public.tg_set_company_id_from_project()') IS NOT NULL THEN
    ALTER FUNCTION public.tg_set_company_id_from_project() OWNER TO postgres;
    REVOKE ALL ON FUNCTION public.tg_set_company_id_from_project() FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.tg_set_company_id_from_project() TO postgres;
    GRANT EXECUTE ON FUNCTION public.tg_set_company_id_from_project() TO service_role;
  END IF;

  -- public.tg_set_company_id_from_invoice()
  IF to_regprocedure('public.tg_set_company_id_from_invoice()') IS NOT NULL THEN
    ALTER FUNCTION public.tg_set_company_id_from_invoice() OWNER TO postgres;
    REVOKE ALL ON FUNCTION public.tg_set_company_id_from_invoice() FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.tg_set_company_id_from_invoice() TO postgres;
    GRANT EXECUTE ON FUNCTION public.tg_set_company_id_from_invoice() TO service_role;
  END IF;

  -- public.tg_set_company_id_from_document()
  IF to_regprocedure('public.tg_set_company_id_from_document()') IS NOT NULL THEN
    ALTER FUNCTION public.tg_set_company_id_from_document() OWNER TO postgres;
    REVOKE ALL ON FUNCTION public.tg_set_company_id_from_document() FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.tg_set_company_id_from_document() TO postgres;
    GRANT EXECUTE ON FUNCTION public.tg_set_company_id_from_document() TO service_role;
  END IF;

  -- public.tg_set_company_id_from_time_log()
  IF to_regprocedure('public.tg_set_company_id_from_time_log()') IS NOT NULL THEN
    ALTER FUNCTION public.tg_set_company_id_from_time_log() OWNER TO postgres;
    REVOKE ALL ON FUNCTION public.tg_set_company_id_from_time_log() FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.tg_set_company_id_from_time_log() TO postgres;
    GRANT EXECUTE ON FUNCTION public.tg_set_company_id_from_time_log() TO service_role;
  END IF;
END
$$;


