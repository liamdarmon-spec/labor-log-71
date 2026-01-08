-- ============================================================================
-- FIX: draft_version ambiguous + approve_proposal_manual baseline creation
-- ============================================================================
-- 
-- REPRO + ROOT CAUSE:
-- 1. "column reference 'draft_version' is ambiguous" error occurs because:
--    - upsert_proposal_draft / upsert_estimate_draft functions use RETURNS TABLE
--      with output column named `draft_version`
--    - The RETURNING ... INTO clause tries to assign proposals.draft_version (column)
--      into the output column draft_version, causing PostgreSQL ambiguity
--    FIX: Rename output columns to out_draft_version, out_proposal_id, etc.
--
-- 2. "Billing Basis: Not set" after approval occurs because:
--    - approve_proposal_manual calls `public.create_contract_baseline(p_proposal_id)`
--    - But that function doesn't exist! The correct one is `accept_proposal_and_create_baseline`
--    - The error is caught silently and baseline is never created
--    FIX: Inline the baseline creation logic in approve_proposal_manual
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) FIX upsert_proposal_draft - rename output columns to avoid ambiguity
-- ============================================================================

DROP FUNCTION IF EXISTS public.upsert_proposal_draft(uuid, uuid, uuid, jsonb, integer);

CREATE OR REPLACE FUNCTION public.upsert_proposal_draft(
  p_company_id uuid,
  p_proposal_id uuid,
  p_project_id uuid,
  p_payload jsonb,
  p_expected_version integer DEFAULT NULL
)
RETURNS TABLE (
  out_proposal_id uuid,
  out_draft_version integer,
  out_updated_at timestamptz
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
  v_intro text;
  v_settings jsonb;
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
    RETURNING id, proposals.draft_version, proposals.updated_at
    INTO out_proposal_id, out_draft_version, out_updated_at;

    RETURN NEXT;
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
  RETURNING id, proposals.draft_version, proposals.updated_at
  INTO out_proposal_id, out_draft_version, out_updated_at;

  RETURN NEXT;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_proposal_draft(uuid, uuid, uuid, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_proposal_draft(uuid, uuid, uuid, jsonb, integer) TO authenticated;

COMMENT ON FUNCTION public.upsert_proposal_draft(uuid, uuid, uuid, jsonb, integer) IS
  'Canonical draft upsert for proposal autosave. Output columns prefixed with out_ to avoid ambiguity.';

-- ============================================================================
-- 2) FIX upsert_estimate_draft - same ambiguity fix
-- ============================================================================

DROP FUNCTION IF EXISTS public.upsert_estimate_draft(uuid, uuid, uuid, jsonb, integer);

CREATE OR REPLACE FUNCTION public.upsert_estimate_draft(
  p_company_id uuid,
  p_estimate_id uuid,
  p_project_id uuid,
  p_payload jsonb,
  p_expected_version integer DEFAULT NULL
)
RETURNS TABLE (
  out_estimate_id uuid,
  out_draft_version integer,
  out_updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_existing public.estimates;
  v_project_company uuid;
  v_title text;
  v_settings jsonb;
BEGIN
  IF p_company_id IS NULL THEN RAISE EXCEPTION 'p_company_id is required'; END IF;
  IF p_estimate_id IS NULL THEN RAISE EXCEPTION 'p_estimate_id is required'; END IF;
  IF p_project_id IS NULL THEN RAISE EXCEPTION 'p_project_id is required'; END IF;

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

  v_title := NULLIF(trim(COALESCE(p_payload->>'title', '')), '');
  v_settings := CASE WHEN jsonb_typeof(p_payload->'settings') = 'object' THEN p_payload->'settings' ELSE NULL END;

  SELECT * INTO v_existing
  FROM public.estimates
  WHERE id = p_estimate_id;

  IF FOUND THEN
    IF v_existing.company_id <> p_company_id THEN
      RAISE EXCEPTION 'estimate % does not belong to company %', p_estimate_id, p_company_id USING ERRCODE='42501';
    END IF;
    IF v_existing.project_id <> p_project_id THEN
      RAISE EXCEPTION 'estimate % project mismatch', p_estimate_id;
    END IF;
    IF v_existing.status <> 'draft' THEN
      RAISE EXCEPTION 'estimate % is not draft', p_estimate_id;
    END IF;

    IF p_expected_version IS NOT NULL AND v_existing.draft_version <> p_expected_version THEN
      RAISE EXCEPTION 'estimate_version_conflict'
        USING ERRCODE='40001',
              DETAIL = format('expected %s, actual %s', p_expected_version, v_existing.draft_version);
    END IF;

    UPDATE public.estimates
    SET
      draft_payload = p_payload,
      draft_version = v_existing.draft_version + 1,
      title = COALESCE(v_title, title),
      settings = COALESCE(v_settings, settings)
    WHERE id = p_estimate_id
    RETURNING id, estimates.draft_version, estimates.updated_at
    INTO out_estimate_id, out_draft_version, out_updated_at;

    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.estimates (
    id,
    company_id,
    project_id,
    title,
    status,
    subtotal_amount,
    tax_amount,
    total_amount,
    is_budget_source,
    settings,
    draft_payload,
    draft_version,
    created_by
  )
  VALUES (
    p_estimate_id,
    p_company_id,
    p_project_id,
    COALESCE(v_title, 'Draft Estimate'),
    'draft',
    COALESCE((p_payload->>'subtotal_amount')::numeric, 0),
    COALESCE((p_payload->>'tax_amount')::numeric, 0),
    COALESCE((p_payload->>'total_amount')::numeric, 0),
    COALESCE((p_payload->>'is_budget_source')::boolean, false),
    COALESCE(v_settings, '{}'::jsonb),
    p_payload,
    1,
    public.authed_user_id()
  )
  RETURNING id, estimates.draft_version, estimates.updated_at
  INTO out_estimate_id, out_draft_version, out_updated_at;

  RETURN NEXT;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_estimate_draft(uuid, uuid, uuid, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_estimate_draft(uuid, uuid, uuid, jsonb, integer) TO authenticated;

COMMENT ON FUNCTION public.upsert_estimate_draft(uuid, uuid, uuid, jsonb, integer) IS
  'Canonical draft upsert for estimate autosave. Output columns prefixed with out_ to avoid ambiguity.';

-- ============================================================================
-- 3) FIX approve_proposal_manual - inline baseline creation instead of calling missing function
-- ============================================================================

DROP FUNCTION IF EXISTS public.approve_proposal_manual(uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.approve_proposal_manual(
  p_proposal_id uuid,
  p_approved_by text DEFAULT NULL,
  p_create_baseline boolean DEFAULT true  -- Default to TRUE now (safer)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proposal record;
  v_auth_companies uuid[];
  v_baseline_id uuid;
  v_milestones jsonb;
  v_sov_lines jsonb;
  v_billing_basis text;
BEGIN
  -- Get proposal
  SELECT * INTO v_proposal
  FROM public.proposals
  WHERE id = p_proposal_id;

  IF v_proposal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Proposal not found');
  END IF;

  -- Check tenant membership
  v_auth_companies := public.authed_company_ids();
  IF NOT (v_proposal.company_id = ANY(v_auth_companies)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check if already approved
  IF v_proposal.acceptance_status = 'accepted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Proposal already approved');
  END IF;

  -- Check if this is a change order (parent_proposal_id set)
  IF v_proposal.parent_proposal_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Use change order approval for child proposals');
  END IF;

  -- Derive billing_basis from contract_type if not set
  v_billing_basis := v_proposal.billing_basis;
  IF v_billing_basis IS NULL THEN
    v_billing_basis := CASE 
      WHEN v_proposal.contract_type = 'progress_billing' THEN 'sov'
      WHEN v_proposal.contract_type = 'milestone' THEN 'payment_schedule'
      ELSE 'payment_schedule'  -- fixed_price defaults to payment_schedule
    END;
    
    -- Persist the billing_basis
    UPDATE public.proposals
    SET billing_basis = v_billing_basis
    WHERE id = p_proposal_id;
  END IF;

  -- Update proposal to approved status
  UPDATE public.proposals
  SET 
    acceptance_status = 'accepted',
    approved_at = now(),
    approved_by = COALESCE(p_approved_by, 'Manual approval'),
    status = 'accepted'
  WHERE id = p_proposal_id;

  -- Log approval event (if table exists)
  BEGIN
    INSERT INTO public.proposal_events (
      proposal_id,
      event_type,
      actor_name,
      metadata,
      created_at
    ) VALUES (
      p_proposal_id,
      'accepted',
      COALESCE(p_approved_by, 'Admin'),
      jsonb_build_object('source', 'manual_approval', 'timestamp', now()),
      now()
    );
  EXCEPTION WHEN undefined_table THEN
    -- proposal_events table doesn't exist, skip
    NULL;
  END;

  -- Create contract baseline if requested
  IF p_create_baseline THEN
    -- Check if baseline already exists for this project
    IF EXISTS (SELECT 1 FROM public.contract_baselines WHERE project_id = v_proposal.project_id) THEN
      RETURN jsonb_build_object(
        'success', true, 
        'message', 'Proposal approved (baseline already exists)',
        'baseline_exists', true
      );
    END IF;

    -- Freeze milestones or SOV lines based on billing basis
    IF v_billing_basis = 'payment_schedule' THEN
      -- Get payment schedule items as frozen milestones
      BEGIN
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', psi.id,
            'description', psi.description,
            'amount', psi.scheduled_amount,
            'due_date', psi.due_date,
            'sort_order', psi.sort_order
          ) ORDER BY psi.sort_order
        )
        INTO v_milestones
        FROM public.payment_schedule_items psi
        WHERE psi.proposal_id = p_proposal_id;
      EXCEPTION WHEN undefined_table THEN
        v_milestones := null;
      END;
      
      v_sov_lines := null;
    ELSE
      -- Get SOV items as frozen lines
      BEGIN
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', si.id,
            'description', si.description,
            'amount', si.scheduled_value,
            'sort_order', si.sort_order
          ) ORDER BY si.sort_order
        )
        INTO v_sov_lines
        FROM public.sov_items si
        JOIN public.sov_schedules ss ON ss.id = si.sov_schedule_id
        WHERE ss.project_id = v_proposal.project_id;
      EXCEPTION WHEN undefined_table THEN
        v_sov_lines := null;
      END;
      
      v_milestones := null;
    END IF;

    -- Create contract baseline
    INSERT INTO public.contract_baselines (
      company_id,
      project_id,
      proposal_id,
      base_contract_total,
      billing_basis,
      frozen_milestones,
      frozen_sov_lines,
      created_by
    )
    VALUES (
      v_proposal.company_id,
      v_proposal.project_id,
      p_proposal_id,
      COALESCE(v_proposal.total_amount, 0),
      v_billing_basis,
      v_milestones,
      v_sov_lines,
      (SELECT auth.uid())
    )
    RETURNING id INTO v_baseline_id;

    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Proposal approved and baseline created',
      'baseline_id', v_baseline_id,
      'billing_basis', v_billing_basis,
      'contract_total', v_proposal.total_amount
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Proposal approved (no baseline created)',
    'billing_basis', v_billing_basis
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_proposal_manual(uuid, text, boolean) TO authenticated;

COMMENT ON FUNCTION public.approve_proposal_manual(uuid, text, boolean) IS
  'Manual admin approval of a proposal. Creates contract baseline by default (p_create_baseline=true). Fixed: now actually creates baseline instead of calling non-existent function.';

-- ============================================================================
-- 4) Update get_project_billing_summary to be more robust
--    Return billing_basis from proposal if no baseline exists yet
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_project_billing_summary(uuid);

CREATE OR REPLACE FUNCTION public.get_project_billing_summary(p_project_id uuid)
RETURNS TABLE (
  has_contract_baseline boolean,
  contract_baseline_id uuid,
  billing_basis text,
  base_contract_total numeric,
  approved_change_order_total numeric,
  current_contract_total numeric,
  pending_change_order_count integer,
  approved_change_order_count integer,
  pending_change_order_value numeric,
  billed_to_date numeric,
  paid_to_date numeric,
  open_ar numeric,
  remaining_to_bill numeric,
  retention_held numeric,
  invoice_count integer,
  payment_count integer,
  has_base_proposal boolean,
  base_proposal_id uuid,
  base_proposal_total numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_baseline public.contract_baselines;
  v_base_proposal_id uuid;
  v_base_proposal_total numeric := 0;
  v_billing_basis text := null;
  v_has_base_proposal boolean := false;
  v_approved_co_total numeric := 0;
  v_pending_co_count int := 0;
  v_approved_co_count int := 0;
  v_pending_co_value numeric := 0;
  v_contract_billed numeric := 0;
  v_all_billed numeric := 0;
  v_paid numeric := 0;
  v_retention numeric := 0;
  v_invoice_count int := 0;
  v_payment_count int := 0;
BEGIN
  -- Get contract baseline for this project
  SELECT cb.*
  INTO v_baseline
  FROM public.contract_baselines cb
  WHERE cb.project_id = p_project_id
    AND cb.company_id = ANY(public.authed_company_ids());

  IF v_baseline IS NOT NULL THEN
    v_billing_basis := v_baseline.billing_basis;
  END IF;

  -- Get base proposal info (fallback for billing_basis if no baseline)
  SELECT p.id, p.total_amount, 
         COALESCE(p.billing_basis, 
           CASE 
             WHEN p.contract_type = 'progress_billing' THEN 'sov'
             WHEN p.contract_type = 'milestone' THEN 'payment_schedule'
             ELSE NULL
           END
         ), 
         true
  INTO v_base_proposal_id, v_base_proposal_total, v_billing_basis, v_has_base_proposal
  FROM public.proposals p
  WHERE p.project_id = p_project_id
    AND p.parent_proposal_id IS NULL
    AND p.acceptance_status = 'accepted'
    AND p.company_id = ANY(public.authed_company_ids())
  ORDER BY p.accepted_at DESC NULLS LAST
  LIMIT 1;

  -- If still no billing basis but we have a pending/draft proposal, derive from it
  IF v_billing_basis IS NULL THEN
    SELECT 
      COALESCE(p.billing_basis,
        CASE 
          WHEN p.contract_type = 'progress_billing' THEN 'sov'
          WHEN p.contract_type = 'milestone' THEN 'payment_schedule'
          ELSE NULL
        END
      )
    INTO v_billing_basis
    FROM public.proposals p
    WHERE p.project_id = p_project_id
      AND p.parent_proposal_id IS NULL
      AND p.company_id = ANY(public.authed_company_ids())
    ORDER BY p.created_at DESC
    LIMIT 1;
  END IF;

  -- Calculate approved change orders
  SELECT COALESCE(SUM(co.total_amount), 0), COUNT(*)
  INTO v_approved_co_total, v_approved_co_count
  FROM public.change_orders co
  WHERE co.project_id = p_project_id
    AND co.status = 'approved'
    AND co.company_id = ANY(public.authed_company_ids());

  -- Calculate pending change orders
  SELECT COUNT(*), COALESCE(SUM(co.total_amount), 0)
  INTO v_pending_co_count, v_pending_co_value
  FROM public.change_orders co
  WHERE co.project_id = p_project_id
    AND co.status IN ('draft', 'sent')
    AND co.company_id = ANY(public.authed_company_ids());

  -- Calculate invoiced totals
  -- v_contract_billed = only invoices tied to contract (for remaining_to_bill)
  -- v_all_billed = all invoices including standalone (for AR)
  SELECT 
    COALESCE(SUM(CASE WHEN i.source_type IN ('milestone', 'sov_period', 'payment_schedule') OR i.sov_based THEN i.total_amount ELSE 0 END), 0),
    COALESCE(SUM(i.total_amount), 0),
    COUNT(*)
  INTO v_contract_billed, v_all_billed, v_invoice_count
  FROM public.invoices i
  WHERE i.project_id = p_project_id
    AND i.status != 'void'
    AND i.company_id = ANY(public.authed_company_ids());

  -- Calculate payments
  SELECT COALESCE(SUM(cp.amount), 0), COUNT(*)
  INTO v_paid, v_payment_count
  FROM public.customer_payments cp
  WHERE cp.project_id = p_project_id
    AND cp.company_id = ANY(public.authed_company_ids());

  -- Calculate retention held (from invoices)
  SELECT COALESCE(SUM(i.retention_amount), 0)
  INTO v_retention
  FROM public.invoices i
  WHERE i.project_id = p_project_id
    AND i.status NOT IN ('void', 'paid')
    AND i.company_id = ANY(public.authed_company_ids());

  RETURN QUERY SELECT
    v_baseline IS NOT NULL,
    v_baseline.id,
    v_billing_basis,
    COALESCE(v_baseline.base_contract_total, v_base_proposal_total, 0::numeric),
    v_approved_co_total,
    COALESCE(v_baseline.base_contract_total, v_base_proposal_total, 0::numeric) + v_approved_co_total,
    v_pending_co_count,
    v_approved_co_count,
    v_pending_co_value,
    v_all_billed,
    v_paid,
    v_all_billed - v_paid,
    COALESCE(v_baseline.base_contract_total, v_base_proposal_total, 0::numeric) + v_approved_co_total - v_contract_billed,
    v_retention,
    v_invoice_count,
    v_payment_count,
    v_has_base_proposal,
    v_base_proposal_id,
    v_base_proposal_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_billing_summary(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_project_billing_summary(uuid) IS
  'Returns canonical billing summary. Fixed: derives billing_basis from proposal.contract_type if no baseline. Separates contract-based billing from standalone for remaining_to_bill.';

COMMIT;

