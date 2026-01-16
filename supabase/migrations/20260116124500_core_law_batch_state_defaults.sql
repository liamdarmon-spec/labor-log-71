-- =============================================================================
-- CORE LAW: Batch state defaults (avoid UI confusion)
-- =============================================================================
-- Fix: list_subject_states previously read directly from public.subject_states view.
-- That view only contains subjects with at least one outcome, so Tasks cards would
-- show no derived state until an outcome existed.
--
-- Canonical behavior: if state_rules include an empty-requirements rule (e.g. project:unscheduled),
-- then derived state should be available even with zero outcomes (still derived from rules).
--
-- This migration replaces list_subject_states to call get_subject_state per requested subject.
-- This avoids N+1 queries from the UI while still returning deterministic defaults.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.list_subject_states(
  p_subjects jsonb
)
RETURNS TABLE (
  company_id uuid,
  subject_type text,
  subject_id uuid,
  state text,
  precedence int,
  description text,
  computed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = on
AS $$
  WITH req AS (
    SELECT *
    FROM jsonb_to_recordset(p_subjects) AS x(subject_type text, subject_id uuid)
  )
  SELECT
    gs.company_id,
    gs.subject_type,
    gs.subject_id,
    gs.state,
    gs.precedence,
    gs.description,
    gs.computed_at
  FROM req
  CROSS JOIN LATERAL public.get_subject_state(req.subject_type, req.subject_id) AS gs;
$$;

COMMENT ON FUNCTION public.list_subject_states IS 'Core Law: Batch fetch derived states for a list of subjects (tenant-safe, includes default states).';

-- Notify PostgREST to reload schema
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
END $$;


