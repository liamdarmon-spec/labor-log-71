-- ============================================================================
-- FIX: approve_proposal_manual baseline insert must match contract_baselines schema
-- ============================================================================
-- Symptom (UI): "column \"proposal_id\" of relation \"contract_baselines\" does not exist"
-- Root cause: DB schema drift across environments:
--   - Some environments have contract_baselines.accepted_proposal_id (canonical)
--   - Others have contract_baselines.proposal_id (legacy)
-- approve_proposal_manual must be compatible with BOTH.
--
-- This migration replaces public.approve_proposal_manual to insert using:
--   - accepted_proposal_id when available
--   - proposal_id fallback when accepted_proposal_id is missing
-- and ONLY uses shared columns (company_id, project_id, billing_basis, base_contract_total, created_by).
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.approve_proposal_manual(
  p_proposal_id uuid,
  p_approved_by text DEFAULT NULL,
  p_create_baseline boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proposal public.proposals;
  v_baseline_id uuid;
  v_billing_basis text;
  v_auth_companies uuid[];
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

  -- Determine billing basis deterministically
  v_billing_basis := COALESCE(
    v_proposal.billing_basis,
    CASE
      WHEN v_proposal.contract_type = 'progress_billing' THEN 'sov'
      WHEN v_proposal.contract_type = 'milestone' THEN 'payment_schedule'
      ELSE 'payment_schedule'
    END
  );

  -- Persist billing_basis if missing
  IF v_proposal.billing_basis IS NULL THEN
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

    -- Create baseline compatible with both schemas (accepted_proposal_id vs proposal_id)
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

NOTIFY pgrst, 'reload schema';

COMMIT;


