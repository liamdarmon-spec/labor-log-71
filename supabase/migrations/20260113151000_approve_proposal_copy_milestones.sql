-- ============================================================================
-- FIX: approve_proposal_manual must copy payment_schedule_items -> contract_milestones
-- ============================================================================
-- PROBLEM: approve_proposal_manual creates baseline but doesn't freeze milestones
-- SOLUTION: Add milestone copying when billing_basis = 'payment_schedule'
-- ============================================================================

DROP FUNCTION IF EXISTS public.approve_proposal_manual(uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.approve_proposal_manual(
  p_proposal_id uuid,
  p_approved_by text DEFAULT NULL,
  p_create_baseline boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proposal public.proposals;
  v_baseline_id uuid;
  v_billing_basis text;
  v_auth_companies uuid[];
  v_milestone_count int := 0;
  v_sov_count int := 0;
BEGIN
  v_auth_companies := public.authed_company_ids();

  SELECT * INTO v_proposal
  FROM public.proposals p
  WHERE p.id = p_proposal_id
    AND p.company_id = ANY(v_auth_companies);

  IF v_proposal.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Proposal not found or access denied');
  END IF;

  -- Disallow approving change orders here
  IF v_proposal.parent_proposal_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Use change order approval for child proposals');
  END IF;

  -- Already approved
  IF v_proposal.acceptance_status = 'accepted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Proposal already approved');
  END IF;

  -- Require contract_type to be set (default to fixed_price if missing)
  IF v_proposal.contract_type IS NULL THEN
    UPDATE public.proposals
    SET contract_type = 'fixed_price'
    WHERE id = p_proposal_id;
    v_proposal.contract_type := 'fixed_price';
  END IF;

  -- Determine billing basis deterministically
  v_billing_basis := COALESCE(
    v_proposal.billing_basis,
    CASE
      WHEN v_proposal.contract_type = 'progress_billing' THEN 'sov'
      WHEN v_proposal.contract_type = 'milestone' THEN 'payment_schedule'
      ELSE 'payment_schedule'
    END
  );

  -- Update proposal with ALL billing fields explicitly set
  UPDATE public.proposals
  SET
    acceptance_status = 'accepted',
    approved_at = now(),
    approved_by = COALESCE(p_approved_by, 'Manual approval'),
    status = 'accepted',
    billing_basis = v_billing_basis,
    billing_readiness = 'locked'
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
    NULL;
  END;

  -- Create contract baseline if requested
  IF p_create_baseline THEN
    IF EXISTS (
      SELECT 1
      FROM public.contract_baselines cb
      WHERE cb.project_id = v_proposal.project_id
    ) THEN
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Proposal approved (baseline already exists)',
        'baseline_exists', true,
        'billing_basis', v_billing_basis
      );
    END IF;

    -- Create baseline
    BEGIN
      INSERT INTO public.contract_baselines (
        company_id,
        project_id,
        accepted_proposal_id,
        billing_basis,
        base_contract_total,
        created_by
      )
      VALUES (
        v_proposal.company_id,
        v_proposal.project_id,
        p_proposal_id,
        v_billing_basis,
        COALESCE(v_proposal.total_amount, 0),
        auth.uid()
      )
      RETURNING id INTO v_baseline_id;
    EXCEPTION WHEN undefined_column THEN
      INSERT INTO public.contract_baselines (
        company_id,
        project_id,
        proposal_id,
        billing_basis,
        base_contract_total,
        created_by
      )
      VALUES (
        v_proposal.company_id,
        v_proposal.project_id,
        p_proposal_id,
        v_billing_basis,
        COALESCE(v_proposal.total_amount, 0),
        auth.uid()
      )
      RETURNING id INTO v_baseline_id;
    END;

    -- ========================================================================
    -- CRITICAL: Copy payment_schedule_items -> contract_milestones
    -- ========================================================================
    IF v_billing_basis = 'payment_schedule' AND v_baseline_id IS NOT NULL THEN
      INSERT INTO public.contract_milestones (
        company_id,
        project_id,
        contract_baseline_id,
        source_payment_schedule_item_id,
        name,
        scheduled_amount,
        sort_order
      )
      SELECT 
        v_proposal.company_id,
        v_proposal.project_id,
        v_baseline_id,
        psi.id,
        psi.title,
        psi.scheduled_amount,
        psi.sort_order
      FROM public.payment_schedules ps
      JOIN public.payment_schedule_items psi ON psi.payment_schedule_id = ps.id
      WHERE ps.proposal_id = p_proposal_id
        AND psi.is_archived = false
      ORDER BY psi.sort_order;

      GET DIAGNOSTICS v_milestone_count = ROW_COUNT;
    END IF;

    -- ========================================================================
    -- CRITICAL: Copy sov_items -> contract_sov_lines
    -- ========================================================================
    IF v_billing_basis = 'sov' AND v_baseline_id IS NOT NULL THEN
      INSERT INTO public.contract_sov_lines (
        company_id,
        project_id,
        contract_baseline_id,
        source_sov_item_id,
        code,
        description,
        scheduled_value,
        sort_order
      )
      SELECT 
        v_proposal.company_id,
        v_proposal.project_id,
        v_baseline_id,
        si.id,
        COALESCE(si.code, 'SOV-' || si.sort_order),
        si.description,
        si.scheduled_value,
        si.sort_order
      FROM public.sov_items si
      WHERE si.proposal_id = p_proposal_id
        AND si.is_archived = false
      ORDER BY si.sort_order;

      GET DIAGNOSTICS v_sov_count = ROW_COUNT;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Proposal approved and baseline created',
      'baseline_id', v_baseline_id,
      'billing_basis', v_billing_basis,
      'contract_total', v_proposal.total_amount,
      'milestones_created', v_milestone_count,
      'sov_lines_created', v_sov_count
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

COMMENT ON FUNCTION public.approve_proposal_manual IS 
  'Approves a proposal, optionally creating a contract baseline with frozen milestones/SOV lines. 
   Billing basis is determined from contract_type:
   - milestone -> payment_schedule (copies payment_schedule_items to contract_milestones)
   - progress_billing -> sov (copies sov_items to contract_sov_lines)
   - fixed_price -> payment_schedule (no milestones required)';

