-- =============================================================================
-- CORE LAW HARDENING (production-grade)
-- =============================================================================
-- Goals:
-- 1) Make tenant enforcement unambiguous for SECURITY DEFINER RPCs (row_security = on).
-- 2) Make outcomes immutability primary via RLS + FORCE RLS; keep triggers for better errors.
-- 3) Add canonical outcome_type registry to prevent junk outcome strings.
-- 4) Provide boring schema-cache UX via a cheap healthcheck RPC.
-- 5) Add indexes for scale and batch RPCs to avoid N+1 from the Tasks UI.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) FORCE RLS (defense-in-depth)
-- ---------------------------------------------------------------------------
ALTER TABLE public.outcomes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.state_rules FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 1) Index hardening (scale)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_outcomes_subject_created_at
  ON public.outcomes(subject_type, subject_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outcomes_company_created_at
  ON public.outcomes(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outcomes_outcome_type
  ON public.outcomes(outcome_type);

-- ---------------------------------------------------------------------------
-- 2) Canonical outcome type registry (guardrails)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outcome_type_registry (
  key text PRIMARY KEY,
  subject_type text NOT NULL,
  label text NOT NULL,
  description text,
  is_repeatable boolean NOT NULL DEFAULT true,
  is_terminal boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  company_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.outcome_type_registry IS 'Core Law: Canonical registry of allowed outcome types per subject type. Prevents junk outcomes.';
COMMENT ON COLUMN public.outcome_type_registry.company_id IS 'NULL means global. Non-NULL allows tenant-specific types (future).';

CREATE INDEX IF NOT EXISTS idx_outcome_type_registry_subject
  ON public.outcome_type_registry(subject_type, sort_order, key)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_outcome_type_registry_company
  ON public.outcome_type_registry(company_id)
  WHERE company_id IS NOT NULL;

ALTER TABLE public.outcome_type_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_type_registry FORCE ROW LEVEL SECURITY;

-- Read-only for authenticated users (global + their company rows)
DROP POLICY IF EXISTS outcome_type_registry_select ON public.outcome_type_registry;
CREATE POLICY outcome_type_registry_select ON public.outcome_type_registry
  FOR SELECT
  USING (
    is_active = true
    AND (
      company_id IS NULL
      OR company_id = ANY(public.authed_company_ids())
    )
  );

-- No writes from authenticated users (service role / migrations only)
DROP POLICY IF EXISTS outcome_type_registry_insert_deny ON public.outcome_type_registry;
CREATE POLICY outcome_type_registry_insert_deny ON public.outcome_type_registry
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS outcome_type_registry_update_deny ON public.outcome_type_registry;
CREATE POLICY outcome_type_registry_update_deny ON public.outcome_type_registry
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS outcome_type_registry_delete_deny ON public.outcome_type_registry;
CREATE POLICY outcome_type_registry_delete_deny ON public.outcome_type_registry
  FOR DELETE
  USING (false);

-- Seed minimal canonical types (do NOT rename existing keys)
INSERT INTO public.outcome_type_registry (key, subject_type, label, description, is_repeatable, is_terminal, sort_order, is_active, company_id)
VALUES
  -- Projects
  ('crew_scheduled', 'project', 'Crew Scheduled', 'Crew has been assigned and scheduled', true, false, 10, true, NULL),
  ('client_notified', 'project', 'Client Notified', 'Client has been notified about the schedule', true, false, 20, true, NULL),
  ('client_confirmed', 'project', 'Client Confirmed', 'Client confirmed the scheduled time', true, false, 30, true, NULL),
  ('crew_arrived', 'project', 'Crew Arrived', 'Crew arrived at the job site', true, false, 40, true, NULL),
  ('work_completed', 'project', 'Work Completed', 'All work has been completed', false, true, 50, true, NULL),
  ('final_payment_received', 'project', 'Final Payment Received', 'Final payment has been received', false, true, 60, true, NULL),

  -- Proposals
  ('sent_to_client', 'proposal', 'Sent to Client', 'Proposal was sent to the client', false, false, 10, true, NULL),
  ('client_viewed', 'proposal', 'Client Viewed', 'Client viewed the proposal', true, false, 20, true, NULL),
  ('client_accepted', 'proposal', 'Client Accepted', 'Client accepted the proposal', false, true, 30, true, NULL),
  ('client_declined', 'proposal', 'Client Declined', 'Client declined the proposal', false, true, 30, true, NULL),

  -- Schedule blocks (best-effort subject type; no dependence on schedule tables)
  ('scheduled', 'schedule_block', 'Scheduled', 'Block is scheduled', false, false, 10, true, NULL),
  ('client_notified', 'schedule_block', 'Client Notified', 'Client has been notified', true, false, 20, true, NULL),
  ('client_confirmed', 'schedule_block', 'Client Confirmed', 'Client confirmed schedule', true, false, 30, true, NULL),
  ('crew_arrived', 'schedule_block', 'Crew Arrived', 'Crew arrived', true, false, 40, true, NULL),
  ('work_completed', 'schedule_block', 'Completed', 'Work completed for this block', false, true, 50, true, NULL)
ON CONFLICT (key) DO UPDATE SET
  subject_type = EXCLUDED.subject_type,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  is_repeatable = EXCLUDED.is_repeatable,
  is_terminal = EXCLUDED.is_terminal,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 3) SECURITY DEFINER RPC hardening (row_security = on + guards)
-- ---------------------------------------------------------------------------

-- record_outcome: validate against registry + prevent duplicates for non-repeatables
CREATE OR REPLACE FUNCTION public.record_outcome(
  p_subject_type text,
  p_subject_id uuid,
  p_outcome_type text,
  p_company_id uuid DEFAULT NULL,
  p_occurred_at timestamptz DEFAULT now(),
  p_method text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS public.outcomes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = on
AS $$
DECLARE
  v_company_id uuid;
  v_reg public.outcome_type_registry%ROWTYPE;
  v_exists boolean;
  v_result public.outcomes;
BEGIN
  -- Determine company_id (passed or inferred from active company list)
  v_company_id := COALESCE(p_company_id, (public.authed_company_ids())[1]);

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Cannot record outcome: no company_id provided or active';
  END IF;

  -- Validate company access (no cross-tenant inference)
  IF NOT (v_company_id = ANY(public.authed_company_ids())) THEN
    RAISE EXCEPTION 'Access denied: not a member of company %', v_company_id;
  END IF;

  -- Validate outcome type against canonical registry (global + tenant rows)
  SELECT *
  INTO v_reg
  FROM public.outcome_type_registry r
  WHERE r.key = p_outcome_type
    AND r.subject_type = p_subject_type
    AND r.is_active = true
    AND (r.company_id IS NULL OR r.company_id = v_company_id)
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid outcome_type "%": not allowed for subject_type "%"', p_outcome_type, p_subject_type;
  END IF;

  -- Enforce non-repeatable types (no duplicate for subject/outcome)
  IF v_reg.is_repeatable = false THEN
    SELECT EXISTS(
      SELECT 1 FROM public.outcomes o
      WHERE o.company_id = v_company_id
        AND o.subject_type = p_subject_type
        AND o.subject_id = p_subject_id
        AND o.outcome_type = p_outcome_type
    ) INTO v_exists;

    IF v_exists THEN
      RAISE EXCEPTION 'Outcome "%/%/%" is not repeatable and already exists', p_subject_type, p_subject_id, p_outcome_type;
    END IF;
  END IF;

  INSERT INTO public.outcomes (
    company_id,
    subject_type,
    subject_id,
    outcome_type,
    occurred_at,
    recorded_by,
    method,
    metadata
  ) VALUES (
    v_company_id,
    p_subject_type,
    p_subject_id,
    p_outcome_type,
    p_occurred_at,
    auth.uid(),
    p_method,
    p_metadata
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.record_outcome IS 'Core Law: Record an immutable outcome fact (validated against registry).';

-- list_outcomes: ensure row_security applies even under SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.list_outcomes(
  p_subject_type text,
  p_subject_id uuid,
  p_limit int DEFAULT 50
)
RETURNS SETOF public.outcomes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = on
AS $$
  SELECT o.*
  FROM public.outcomes o
  WHERE o.subject_type = p_subject_type
    AND o.subject_id = p_subject_id
    AND o.company_id = ANY(public.authed_company_ids())
  ORDER BY o.occurred_at DESC
  LIMIT p_limit;
$$;

-- get_available_outcome_types: driven from registry (not state_rules), best-effort leads_to_state
CREATE OR REPLACE FUNCTION public.get_available_outcome_types(
  p_subject_type text
)
RETURNS TABLE (
  outcome_type text,
  label text,
  description text,
  is_repeatable boolean,
  is_terminal boolean,
  sort_order int,
  leads_to_state text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = on
AS $$
  SELECT
    r.key as outcome_type,
    r.label,
    r.description,
    r.is_repeatable,
    r.is_terminal,
    r.sort_order,
    (
      SELECT sr.state
      FROM public.state_rules sr
      WHERE sr.subject_type = p_subject_type
        AND sr.is_active = true
        AND r.key = ANY(sr.required_outcome_types)
      ORDER BY sr.precedence DESC
      LIMIT 1
    ) as leads_to_state
  FROM public.outcome_type_registry r
  WHERE r.subject_type = p_subject_type
    AND r.is_active = true
    AND (r.company_id IS NULL OR r.company_id = ANY(public.authed_company_ids()))
  ORDER BY r.sort_order ASC, r.key ASC;
$$;

-- get_subject_state: return a single derived state row with additional context.
-- NOTE: For subjects with no outcomes, this returns the best "empty requirements" rule,
-- but ONLY if we can safely infer tenant ownership for known subject types.
CREATE OR REPLACE FUNCTION public.get_subject_state(
  p_subject_type text,
  p_subject_id uuid
)
RETURNS TABLE (
  company_id uuid,
  subject_type text,
  subject_id uuid,
  state text,
  precedence int,
  description text,
  computed_at timestamptz,
  derived_from_outcome_types text[],
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = on
AS $$
DECLARE
  v_company_id uuid;
  v_outcome_types text[];
  v_updated_at timestamptz;
BEGIN
  -- Determine company_id only if we can safely infer it from a subject table.
  IF p_subject_type = 'project' THEN
    SELECT p.company_id INTO v_company_id
    FROM public.projects p
    WHERE p.id = p_subject_id
      AND p.company_id = ANY(public.authed_company_ids())
    LIMIT 1;
  ELSIF p_subject_type = 'proposal' THEN
    SELECT pr.company_id INTO v_company_id
    FROM public.proposals pr
    WHERE pr.id = p_subject_id
      AND pr.company_id = ANY(public.authed_company_ids())
    LIMIT 1;
  ELSE
    -- Unknown subject type: only return derived state if outcomes exist (prevents cross-tenant inference).
    SELECT o.company_id INTO v_company_id
    FROM public.outcomes o
    WHERE o.subject_type = p_subject_type
      AND o.subject_id = p_subject_id
      AND o.company_id = ANY(public.authed_company_ids())
    LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RETURN; -- no row (tenant-safe)
  END IF;

  SELECT
    array_agg(DISTINCT o.outcome_type),
    max(o.occurred_at)
  INTO v_outcome_types, v_updated_at
  FROM public.outcomes o
  WHERE o.company_id = v_company_id
    AND o.subject_type = p_subject_type
    AND o.subject_id = p_subject_id;

  -- Pick the highest precedence rule whose requirements are satisfied by v_outcome_types
  RETURN QUERY
  SELECT
    v_company_id as company_id,
    p_subject_type as subject_type,
    p_subject_id as subject_id,
    sr.state,
    sr.precedence,
    sr.description,
    now() as computed_at,
    COALESCE(v_outcome_types, '{}'::text[]) as derived_from_outcome_types,
    v_updated_at as updated_at
  FROM public.state_rules sr
  WHERE sr.subject_type = p_subject_type
    AND sr.is_active = true
    AND (
      sr.required_outcome_types = '{}'::text[]
      OR sr.required_outcome_types <@ COALESCE(v_outcome_types, '{}'::text[])
    )
  ORDER BY sr.precedence DESC
  LIMIT 1;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) Batch RPC: list subject states for a set of subjects (prevents N+1)
-- ---------------------------------------------------------------------------
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
  SELECT ss.company_id, ss.subject_type, ss.subject_id, ss.state, ss.precedence, ss.description, ss.computed_at
  FROM req
  JOIN public.subject_states ss
    ON ss.subject_type = req.subject_type
   AND ss.subject_id = req.subject_id
  WHERE ss.company_id = ANY(public.authed_company_ids());
$$;

COMMENT ON FUNCTION public.list_subject_states IS 'Core Law: Batch fetch derived states for a list of subjects (tenant-safe).';

-- ---------------------------------------------------------------------------
-- 5) Healthcheck RPC (boring schema cache)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.core_law_healthcheck()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = on
AS $$
DECLARE
  missing text[] := '{}'::text[];
  ok boolean := true;
BEGIN
  -- Tables
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='outcomes') THEN
    missing := array_append(missing, 'table:public.outcomes');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='state_rules') THEN
    missing := array_append(missing, 'table:public.state_rules');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='outcome_type_registry') THEN
    missing := array_append(missing, 'table:public.outcome_type_registry');
  END IF;

  -- View
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name='subject_states') THEN
    missing := array_append(missing, 'view:public.subject_states');
  END IF;

  -- Required columns on project_todos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='project_todos' AND column_name='subject_type'
  ) THEN
    missing := array_append(missing, 'column:public.project_todos.subject_type');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='project_todos' AND column_name='subject_id'
  ) THEN
    missing := array_append(missing, 'column:public.project_todos.subject_id');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='project_todos' AND column_name='is_blocking'
  ) THEN
    missing := array_append(missing, 'column:public.project_todos.is_blocking');
  END IF;

  -- RPC existence checks (best-effort)
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='record_outcome') THEN
    missing := array_append(missing, 'rpc:public.record_outcome');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_subject_state') THEN
    missing := array_append(missing, 'rpc:public.get_subject_state');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='list_outcomes') THEN
    missing := array_append(missing, 'rpc:public.list_outcomes');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_available_outcome_types') THEN
    missing := array_append(missing, 'rpc:public.get_available_outcome_types');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='list_subject_states') THEN
    missing := array_append(missing, 'rpc:public.list_subject_states');
  END IF;

  ok := (array_length(missing, 1) IS NULL);

  RETURN jsonb_build_object(
    'ok', ok,
    'missing', COALESCE(missing, '{}'::text[]),
    'version', '20260116_core_law_v2',
    'server_time', now()
  );
END;
$$;

COMMENT ON FUNCTION public.core_law_healthcheck IS 'Core Law: cheap schema/health check to reduce PostgREST schema-cache pain.';

-- Notify PostgREST to reload schema
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
END $$;


