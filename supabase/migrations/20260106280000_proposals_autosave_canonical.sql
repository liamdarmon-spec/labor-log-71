-- ============================================================================
-- db: canonical proposal autosave
-- ============================================================================
-- Goals:
-- - Deterministic draft write path via ONE RPC: public.upsert_proposal_draft(...)
-- - Tenant-safe: explicit membership + project/company verification
-- - Performance: single round-trip upsert, optimistic locking via draft_version
-- - No mystery state: every autosave increments draft_version
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Columns / triggers
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_null_count int;
BEGIN
  -- Ensure company_id exists on proposals and is NOT NULL (tenant scope)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='proposals' AND column_name='company_id'
  ) THEN
    ALTER TABLE public.proposals ADD COLUMN company_id uuid;
  END IF;

  -- Backfill company_id from projects when missing
  UPDATE public.proposals p
  SET company_id = pr.company_id
  FROM public.projects pr
  WHERE p.company_id IS NULL
    AND pr.id = p.project_id;

  SELECT COUNT(*) INTO v_null_count FROM public.proposals WHERE company_id IS NULL;
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce proposals.company_id NOT NULL: % rows still NULL', v_null_count;
  END IF;

  ALTER TABLE public.proposals ALTER COLUMN company_id SET NOT NULL;

  -- Draft payload storage (if builder uses JSON model)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='proposals' AND column_name='draft_payload'
  ) THEN
    ALTER TABLE public.proposals ADD COLUMN draft_payload jsonb;
  END IF;

  -- Monotonic draft version for optimistic locking (separate from proposal.version which may be used for sent versions)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='proposals' AND column_name='draft_version'
  ) THEN
    ALTER TABLE public.proposals ADD COLUMN draft_version integer NOT NULL DEFAULT 0;
  END IF;

  -- created_by default (if column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='proposals' AND column_name='created_by'
  ) THEN
    BEGIN
      ALTER TABLE public.proposals ALTER COLUMN created_by SET DEFAULT public.authed_user_id();
    EXCEPTION WHEN others THEN
      -- Ignore if default cannot be set (older schema)
      NULL;
    END;
  END IF;
END $$;

-- updated_at trigger (idempotent, safe)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at_proposals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_proposals ON public.proposals;
CREATE TRIGGER set_updated_at_proposals
BEFORE UPDATE ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_updated_at_proposals();

-- ----------------------------------------------------------------------------
-- 2) Canonical RPC: upsert_proposal_draft
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.upsert_proposal_draft(uuid, uuid, uuid, jsonb, integer);

CREATE OR REPLACE FUNCTION public.upsert_proposal_draft(
  p_company_id uuid,
  p_proposal_id uuid,
  p_project_id uuid,
  p_payload jsonb,
  p_expected_version integer DEFAULT NULL
)
RETURNS TABLE (
  proposal_id uuid,
  draft_version integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_existing public.proposals;
  v_project_company uuid;
  v_title text;
  v_status text;
  v_settings jsonb;
  v_intro text;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'p_company_id is required';
  END IF;
  IF p_proposal_id IS NULL THEN
    RAISE EXCEPTION 'p_proposal_id is required';
  END IF;
  IF p_project_id IS NULL THEN
    RAISE EXCEPTION 'p_project_id is required';
  END IF;

  IF NOT public.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'not a member of company %', p_company_id USING ERRCODE='42501';
  END IF;

  -- Verify project belongs to company (prevents cross-tenant write)
  SELECT company_id INTO v_project_company
  FROM public.projects
  WHERE id = p_project_id;

  IF v_project_company IS NULL THEN
    RAISE EXCEPTION 'project not found: %', p_project_id;
  END IF;
  IF v_project_company <> p_company_id THEN
    RAISE EXCEPTION 'project % does not belong to company %', p_project_id, p_company_id USING ERRCODE='42501';
  END IF;

  -- Parse payload (optional)
  v_title := NULLIF(trim(COALESCE(p_payload->>'title', '')), '');
  v_intro := NULLIF(COALESCE(p_payload->>'intro_text', ''), '');
  v_settings := CASE WHEN jsonb_typeof(p_payload->'settings') = 'object' THEN p_payload->'settings' ELSE NULL END;

  SELECT * INTO v_existing
  FROM public.proposals
  WHERE id = p_proposal_id;

  IF FOUND THEN
    -- Enforce tenant + draft-only writes
    IF v_existing.company_id <> p_company_id THEN
      RAISE EXCEPTION 'proposal % does not belong to company %', p_proposal_id, p_company_id USING ERRCODE='42501';
    END IF;
    IF v_existing.project_id <> p_project_id THEN
      RAISE EXCEPTION 'proposal % project mismatch', p_proposal_id;
    END IF;
    IF v_existing.status <> 'draft' THEN
      RAISE EXCEPTION 'proposal % is not draft', p_proposal_id;
    END IF;

    IF p_expected_version IS NOT NULL AND v_existing.draft_version <> p_expected_version THEN
      RAISE EXCEPTION 'proposal_version_conflict'
        USING ERRCODE='40001',
              DETAIL = format('expected %s, actual %s', p_expected_version, v_existing.draft_version);
    END IF;

    UPDATE public.proposals
    SET
      draft_payload = p_payload,
      draft_version = v_existing.draft_version + 1,
      title = COALESCE(v_title, title),
      intro_text = COALESCE(v_intro, intro_text),
      settings = COALESCE(v_settings, settings)
    WHERE id = p_proposal_id
    RETURNING id, draft_version, updated_at
    INTO proposal_id, draft_version, updated_at;

    RETURN;
  END IF;

  -- Insert deterministic draft (client-generated id)
  INSERT INTO public.proposals (
    id,
    company_id,
    project_id,
    primary_estimate_id,
    title,
    status,
    acceptance_status,
    proposal_date,
    validity_days,
    subtotal_amount,
    tax_amount,
    total_amount,
    settings,
    intro_text,
    draft_payload,
    draft_version,
    created_by
  )
  VALUES (
    p_proposal_id,
    p_company_id,
    p_project_id,
    NULL,
    COALESCE(v_title, 'Draft Proposal'),
    'draft',
    'pending',
    CURRENT_DATE,
    30,
    0,
    0,
    0,
    COALESCE(v_settings, '{}'::jsonb),
    v_intro,
    p_payload,
    1,
    public.authed_user_id()
  )
  RETURNING id, draft_version, updated_at
  INTO proposal_id, draft_version, updated_at;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_proposal_draft(uuid, uuid, uuid, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_proposal_draft(uuid, uuid, uuid, jsonb, integer) TO authenticated;

COMMENT ON FUNCTION public.upsert_proposal_draft(uuid, uuid, uuid, jsonb, integer) IS
  'Canonical draft upsert for proposal autosave. Deterministic id, tenant checks, draft_version optimistic locking.';

COMMIT;


