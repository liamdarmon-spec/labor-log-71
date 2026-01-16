-- =============================================================================
-- CORE LAW: Tasks → Outcomes → States
-- =============================================================================
-- Philosophy:
--   Tasks = intent (human instructions). Editable. No authority over reality.
--   Outcomes = facts (immutable events). Timestamped. Attributed.
--   States = reality gates (derived ONLY from outcomes). Never manually set.
--
-- Non-negotiable: Tasks cannot directly flip state. Only recording an outcome can.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend project_todos for Core Law linking (minimal additions)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- subject_type: what entity this task is linked to (project, proposal, invoice, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_todos' AND column_name = 'subject_type'
  ) THEN
    ALTER TABLE public.project_todos ADD COLUMN subject_type text;
    COMMENT ON COLUMN public.project_todos.subject_type IS 'Core Law: entity type this task relates to (project, proposal, invoice, schedule_block)';
  END IF;

  -- subject_id: the specific entity UUID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_todos' AND column_name = 'subject_id'
  ) THEN
    ALTER TABLE public.project_todos ADD COLUMN subject_id uuid;
    COMMENT ON COLUMN public.project_todos.subject_id IS 'Core Law: UUID of the linked subject entity';
  END IF;

  -- is_blocking: if true, this task blocks some workflow
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_todos' AND column_name = 'is_blocking'
  ) THEN
    ALTER TABLE public.project_todos ADD COLUMN is_blocking boolean DEFAULT false;
    COMMENT ON COLUMN public.project_todos.is_blocking IS 'Core Law: true if this task blocks workflow progression';
  END IF;
END $$;

-- Index for efficient subject lookups
CREATE INDEX IF NOT EXISTS idx_project_todos_subject
  ON public.project_todos(subject_type, subject_id)
  WHERE subject_type IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Create outcomes table (immutable facts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  outcome_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid NOT NULL,
  method text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Soft constraint: company_id should reference companies
  CONSTRAINT fk_outcomes_company FOREIGN KEY (company_id)
    REFERENCES public.companies(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.outcomes IS 'Core Law: Immutable facts. Once recorded, cannot be updated or deleted.';
COMMENT ON COLUMN public.outcomes.subject_type IS 'Entity type: project, proposal, invoice, schedule_block, etc.';
COMMENT ON COLUMN public.outcomes.subject_id IS 'UUID of the subject entity';
COMMENT ON COLUMN public.outcomes.outcome_type IS 'Type of outcome: crew_scheduled, client_notified, crew_arrived, work_completed, etc.';
COMMENT ON COLUMN public.outcomes.occurred_at IS 'When the outcome actually happened (may differ from created_at)';
COMMENT ON COLUMN public.outcomes.recorded_by IS 'User who recorded this outcome';
COMMENT ON COLUMN public.outcomes.method IS 'How outcome was achieved: sms, call, email, in_person, system';
COMMENT ON COLUMN public.outcomes.metadata IS 'Additional structured data (notes, references, etc.)';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_outcomes_company_subject
  ON public.outcomes(company_id, subject_type, subject_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_outcomes_company_type
  ON public.outcomes(company_id, outcome_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_outcomes_subject_lookup
  ON public.outcomes(subject_type, subject_id);

-- ---------------------------------------------------------------------------
-- 3. Create state_rules table (configurable state derivation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.state_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,
  state text NOT NULL,
  required_outcome_types text[] NOT NULL DEFAULT '{}',
  precedence int NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (subject_type, state)
);

COMMENT ON TABLE public.state_rules IS 'Core Law: Defines which outcomes are required to reach each state. Higher precedence wins.';
COMMENT ON COLUMN public.state_rules.required_outcome_types IS 'All listed outcome types must exist for this state to be derived';
COMMENT ON COLUMN public.state_rules.precedence IS 'Higher values take priority when multiple states match';

-- Index for rule lookups
CREATE INDEX IF NOT EXISTS idx_state_rules_subject
  ON public.state_rules(subject_type, precedence DESC)
  WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 4. Create subject_states view (derived, never stored)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.subject_states;

CREATE VIEW public.subject_states AS
WITH distinct_subjects AS (
  -- Get all subjects that have any outcomes
  SELECT DISTINCT company_id, subject_type, subject_id
  FROM public.outcomes
),
subject_outcome_types AS (
  -- Get all outcome types that exist for each subject
  SELECT company_id, subject_type, subject_id, array_agg(DISTINCT outcome_type) as outcome_types
  FROM public.outcomes
  GROUP BY company_id, subject_type, subject_id
),
matched_rules AS (
  -- Find all rules where ALL required outcomes are present
  SELECT
    ds.company_id,
    ds.subject_type,
    ds.subject_id,
    sr.state,
    sr.precedence,
    sr.description,
    -- Check if all required outcome types exist for this subject
    CASE
      WHEN sr.required_outcome_types = '{}' THEN true
      ELSE sr.required_outcome_types <@ COALESCE(sot.outcome_types, '{}')
    END as all_requirements_met
  FROM distinct_subjects ds
  JOIN public.state_rules sr ON sr.subject_type = ds.subject_type AND sr.is_active = true
  LEFT JOIN subject_outcome_types sot ON sot.company_id = ds.company_id
    AND sot.subject_type = ds.subject_type
    AND sot.subject_id = ds.subject_id
),
ranked_states AS (
  -- Rank by precedence, pick highest
  SELECT
    company_id,
    subject_type,
    subject_id,
    state,
    precedence,
    description,
    ROW_NUMBER() OVER (
      PARTITION BY company_id, subject_type, subject_id
      ORDER BY precedence DESC
    ) as rn
  FROM matched_rules
  WHERE all_requirements_met = true
)
SELECT
  company_id,
  subject_type,
  subject_id,
  state,
  precedence,
  description,
  now() as computed_at
FROM ranked_states
WHERE rn = 1;

COMMENT ON VIEW public.subject_states IS 'Core Law: Derived states based on recorded outcomes. Read-only, computed from rules.';

-- ---------------------------------------------------------------------------
-- 5. Immutability enforcement for outcomes
-- ---------------------------------------------------------------------------

-- Trigger to prevent UPDATE on outcomes
CREATE OR REPLACE FUNCTION public.tg_outcomes_immutable_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION 'Core Law violation: outcomes are immutable and cannot be updated. Outcome ID: %', OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS trg_outcomes_no_update ON public.outcomes;
CREATE TRIGGER trg_outcomes_no_update
  BEFORE UPDATE ON public.outcomes
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_outcomes_immutable_update();

-- Trigger to prevent DELETE on outcomes (except by system/admin)
CREATE OR REPLACE FUNCTION public.tg_outcomes_immutable_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow deletion only if explicitly bypassed (e.g., for data cleanup migrations)
  IF current_setting('app.allow_outcome_delete', true) = 'true' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Core Law violation: outcomes are immutable and cannot be deleted. Outcome ID: %', OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS trg_outcomes_no_delete ON public.outcomes;
CREATE TRIGGER trg_outcomes_no_delete
  BEFORE DELETE ON public.outcomes
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_outcomes_immutable_delete();

-- ---------------------------------------------------------------------------
-- 6. RLS policies for outcomes
-- ---------------------------------------------------------------------------
ALTER TABLE public.outcomes ENABLE ROW LEVEL SECURITY;

-- Select: users can see outcomes for their companies
DROP POLICY IF EXISTS outcomes_select_tenant ON public.outcomes;
CREATE POLICY outcomes_select_tenant ON public.outcomes
  FOR SELECT
  USING (company_id = ANY(public.authed_company_ids()));

-- Insert: users can record outcomes for their companies
DROP POLICY IF EXISTS outcomes_insert_tenant ON public.outcomes;
CREATE POLICY outcomes_insert_tenant ON public.outcomes
  FOR INSERT
  WITH CHECK (
    company_id = ANY(public.authed_company_ids())
    AND recorded_by = auth.uid()
  );

-- Update: blocked by trigger, but also deny via RLS
DROP POLICY IF EXISTS outcomes_update_deny ON public.outcomes;
CREATE POLICY outcomes_update_deny ON public.outcomes
  FOR UPDATE
  USING (false);

-- Delete: blocked by trigger, but also deny via RLS
DROP POLICY IF EXISTS outcomes_delete_deny ON public.outcomes;
CREATE POLICY outcomes_delete_deny ON public.outcomes
  FOR DELETE
  USING (false);

-- ---------------------------------------------------------------------------
-- 7. RLS policies for state_rules (read-only for users)
-- ---------------------------------------------------------------------------
ALTER TABLE public.state_rules ENABLE ROW LEVEL SECURITY;

-- Anyone can read active rules
DROP POLICY IF EXISTS state_rules_select ON public.state_rules;
CREATE POLICY state_rules_select ON public.state_rules
  FOR SELECT
  USING (is_active = true);

-- Only service role can modify rules (admin operations)
DROP POLICY IF EXISTS state_rules_insert_admin ON public.state_rules;
CREATE POLICY state_rules_insert_admin ON public.state_rules
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS state_rules_update_admin ON public.state_rules;
CREATE POLICY state_rules_update_admin ON public.state_rules
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS state_rules_delete_admin ON public.state_rules;
CREATE POLICY state_rules_delete_admin ON public.state_rules
  FOR DELETE
  USING (false);

-- ---------------------------------------------------------------------------
-- 8. RPCs for Core Law operations
-- ---------------------------------------------------------------------------

-- record_outcome: Insert a new outcome (immutable fact)
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
AS $$
DECLARE
  v_company_id uuid;
  v_result public.outcomes;
BEGIN
  -- Determine company_id (passed or inferred from active company)
  v_company_id := COALESCE(p_company_id, (public.authed_company_ids())[1]);
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Cannot record outcome: no company_id provided or active';
  END IF;
  
  -- Validate company access
  IF NOT (v_company_id = ANY(public.authed_company_ids())) THEN
    RAISE EXCEPTION 'Access denied: not a member of company %', v_company_id;
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

COMMENT ON FUNCTION public.record_outcome IS 'Core Law: Record an immutable outcome fact';

-- get_subject_state: Get the derived state for a subject
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
  computed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ss.*
  FROM public.subject_states ss
  WHERE ss.subject_type = p_subject_type
    AND ss.subject_id = p_subject_id
    AND ss.company_id = ANY(public.authed_company_ids())
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_subject_state IS 'Core Law: Get derived state for a subject';

-- list_outcomes: Get timeline of outcomes for a subject
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
AS $$
  SELECT o.*
  FROM public.outcomes o
  WHERE o.subject_type = p_subject_type
    AND o.subject_id = p_subject_id
    AND o.company_id = ANY(public.authed_company_ids())
  ORDER BY o.occurred_at DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.list_outcomes IS 'Core Law: List outcomes timeline for a subject';

-- get_available_outcome_types: Get outcome types for a subject type
CREATE OR REPLACE FUNCTION public.get_available_outcome_types(
  p_subject_type text
)
RETURNS TABLE (
  outcome_type text,
  leads_to_state text,
  description text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    unnest(sr.required_outcome_types) as outcome_type,
    sr.state as leads_to_state,
    sr.description
  FROM public.state_rules sr
  WHERE sr.subject_type = p_subject_type
    AND sr.is_active = true
  ORDER BY outcome_type;
$$;

COMMENT ON FUNCTION public.get_available_outcome_types IS 'Core Law: Get available outcome types for a subject type';

-- ---------------------------------------------------------------------------
-- 9. Seed initial state rules for projects
-- ---------------------------------------------------------------------------
INSERT INTO public.state_rules (subject_type, state, required_outcome_types, precedence, description) VALUES
  ('project', 'unscheduled', '{}', 0, 'No crew has been scheduled yet'),
  ('project', 'scheduled', '{crew_scheduled}', 10, 'Crew has been scheduled'),
  ('project', 'ready_to_start', '{crew_scheduled,client_notified}', 20, 'Crew scheduled and client notified'),
  ('project', 'in_progress', '{crew_arrived}', 30, 'Crew has arrived on site'),
  ('project', 'work_completed', '{work_completed}', 40, 'Work has been completed'),
  ('project', 'closed', '{work_completed,final_payment_received}', 50, 'Project closed and paid')
ON CONFLICT (subject_type, state) DO UPDATE SET
  required_outcome_types = EXCLUDED.required_outcome_types,
  precedence = EXCLUDED.precedence,
  description = EXCLUDED.description;

-- Schedule block states
INSERT INTO public.state_rules (subject_type, state, required_outcome_types, precedence, description) VALUES
  ('schedule_block', 'scheduled', '{}', 0, 'Block is scheduled'),
  ('schedule_block', 'client_notified', '{client_notified}', 10, 'Client has been notified'),
  ('schedule_block', 'confirmed', '{client_confirmed}', 20, 'Client has confirmed'),
  ('schedule_block', 'crew_arrived', '{crew_arrived}', 30, 'Crew has arrived on site'),
  ('schedule_block', 'completed', '{work_completed}', 40, 'Work completed for this block')
ON CONFLICT (subject_type, state) DO UPDATE SET
  required_outcome_types = EXCLUDED.required_outcome_types,
  precedence = EXCLUDED.precedence,
  description = EXCLUDED.description;

-- Proposal states
INSERT INTO public.state_rules (subject_type, state, required_outcome_types, precedence, description) VALUES
  ('proposal', 'draft', '{}', 0, 'Proposal is in draft'),
  ('proposal', 'sent', '{sent_to_client}', 10, 'Proposal has been sent to client'),
  ('proposal', 'viewed', '{client_viewed}', 15, 'Client has viewed the proposal'),
  ('proposal', 'accepted', '{client_accepted}', 20, 'Client has accepted the proposal'),
  ('proposal', 'declined', '{client_declined}', 20, 'Client has declined the proposal')
ON CONFLICT (subject_type, state) DO UPDATE SET
  required_outcome_types = EXCLUDED.required_outcome_types,
  precedence = EXCLUDED.precedence,
  description = EXCLUDED.description;

-- ---------------------------------------------------------------------------
-- 10. Migration-time validation
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_outcome_count int;
  v_rule_count int;
BEGIN
  -- Verify outcomes table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'outcomes') THEN
    RAISE EXCEPTION 'Migration failed: outcomes table not created';
  END IF;

  -- Verify state_rules table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'state_rules') THEN
    RAISE EXCEPTION 'Migration failed: state_rules table not created';
  END IF;

  -- Verify view exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'subject_states') THEN
    RAISE EXCEPTION 'Migration failed: subject_states view not created';
  END IF;

  -- Verify seed rules exist
  SELECT COUNT(*) INTO v_rule_count FROM public.state_rules;
  IF v_rule_count < 10 THEN
    RAISE EXCEPTION 'Migration failed: expected at least 10 state rules, got %', v_rule_count;
  END IF;

  RAISE NOTICE 'Core Law migration complete: outcomes table, state_rules (% rules), subject_states view created', v_rule_count;
END $$;

-- Notify PostgREST to reload schema
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
  -- Ignore if pg_notify fails
END $$;

