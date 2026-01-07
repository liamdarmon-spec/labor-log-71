-- ============================================================================
-- Billing pipeline verification fixes (production hardening)
-- هدف: eliminate silent failures and insecure public acceptance.
--
-- Fixes:
-- 1) Make public proposal acceptance token-validated (no raw proposal_id writes).
-- 2) Make manual proposal approval baseline creation deterministic (no missing RPC fallback).
-- 3) Allow standalone/manual invoices without requiring a contract baseline.
-- ============================================================================

-- ============================================================================
-- 1) Secure public proposal acceptance: token-validated RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_proposal_acceptance_public(
  p_public_token text,
  p_new_status text,
  p_accepted_by_name text,
  p_accepted_by_email text DEFAULT NULL,
  p_acceptance_notes text DEFAULT NULL,
  p_client_signature text DEFAULT NULL,
  p_acceptance_ip text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proposal_id uuid;
  v_current_status text;
BEGIN
  IF p_public_token IS NULL OR length(trim(p_public_token)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
  END IF;

  -- Lock the proposal row via token (prevents double-submission)
  SELECT p.id, p.acceptance_status
  INTO v_proposal_id, v_current_status
  FROM public.proposals p
  WHERE p.public_token = p_public_token
  FOR UPDATE OF p;

  IF v_proposal_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Proposal not found');
  END IF;

  -- Prevent overwriting terminal states
  IF v_current_status IN ('accepted', 'rejected') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Proposal already has a final response',
      'current_status', v_current_status
    );
  END IF;

  -- Update proposal
  UPDATE public.proposals
  SET
    acceptance_status = p_new_status,
    acceptance_date = now(),
    accepted_by_name = p_accepted_by_name,
    accepted_by_email = p_accepted_by_email,
    acceptance_notes = p_acceptance_notes,
    client_signature = p_client_signature,
    acceptance_ip = p_acceptance_ip,
    updated_at = now()
  WHERE id = v_proposal_id;

  RETURN jsonb_build_object(
    'success', true,
    'proposal_id', v_proposal_id,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
END;
$$;

-- Lock down insecure legacy RPC that accepted raw proposal_id without token validation.
-- Note: do NOT drop it (avoid breaking existing DB references); revoke public access instead.
REVOKE ALL ON FUNCTION public.update_proposal_acceptance(uuid, text, text, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_proposal_acceptance(uuid, text, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_proposal_acceptance(uuid, text, text, text, text, text, text) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.update_proposal_acceptance_public(text, text, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.update_proposal_acceptance_public(text, text, text, text, text, text, text) TO authenticated;


-- ============================================================================
-- 2) Manual proposal approval must create baseline deterministically when requested
-- ============================================================================

CREATE OR REPLACE FUNCTION public.approve_proposal_manual(
  p_proposal_id uuid,
  p_approved_by text DEFAULT NULL,
  p_create_baseline boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proposal record;
  v_auth_companies uuid[];
  v_accept_result jsonb;
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

  -- Ensure billing_basis matches contract_type before acceptance/baseline
  UPDATE public.proposals
  SET billing_basis = CASE
    WHEN contract_type = 'progress_billing' THEN 'sov'
    WHEN contract_type = 'milestone' THEN 'payment_schedule'
    ELSE 'payment_schedule'  -- fixed_price uses payment schedule (single milestone)
  END
  WHERE id = p_proposal_id
    AND (billing_basis IS NULL OR billing_basis NOT IN ('payment_schedule', 'sov'));

  IF p_create_baseline THEN
    BEGIN
      -- This RPC is the canonical acceptance+baseline path used by the app (tenant validated).
      SELECT public.accept_proposal_create_baseline(
        p_proposal_id,
        COALESCE(p_approved_by, 'Manual approval'),
        NULL
      ) INTO v_accept_result;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', COALESCE(SQLERRM, 'Failed to approve proposal')
      );
    END;

    -- Mark manual approval metadata (non-canonical, UI convenience)
    UPDATE public.proposals
    SET
      approved_at = now(),
      approved_by = COALESCE(p_approved_by, 'Manual approval'),
      status = 'accepted'
    WHERE id = p_proposal_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Proposal approved and baseline created',
      'baseline', v_accept_result
    );
  END IF;

  -- Approve without baseline (explicit choice)
  UPDATE public.proposals
  SET
    acceptance_status = 'accepted',
    approved_at = now(),
    approved_by = COALESCE(p_approved_by, 'Manual approval'),
    status = 'accepted',
    updated_at = now()
  WHERE id = p_proposal_id;

  RETURN jsonb_build_object('success', true, 'message', 'Proposal approved');
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_proposal_manual(uuid, text, boolean) TO authenticated;


-- ============================================================================
-- 3) Standalone invoices: allow 'manual' source type without baseline
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_invoice_from_source(
  p_project_id uuid,
  p_source_type text,  -- 'milestone', 'sov_period', 'change_order', 'deposit', 'manual'
  p_source_id uuid DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_milestone_allocations jsonb DEFAULT NULL,  -- For milestone: [{milestone_id, amount}]
  p_sov_lines jsonb DEFAULT NULL,              -- For SOV: [{sov_line_id, this_period_amount}]
  p_billing_period_from date DEFAULT NULL,
  p_billing_period_to date DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_baseline public.contract_baselines;
  v_invoice_id uuid;
  v_total_amount numeric := 0;
  v_company_id uuid;
  v_invoice_type text := 'standard';
  v_project_company_id uuid;
  v_result jsonb;
BEGIN
  -- Standalone invoice path: does NOT require a baseline
  IF p_source_type = 'manual' THEN
    IF p_amount IS NULL OR p_amount <= 0 THEN
      RAISE EXCEPTION 'Amount required';
    END IF;

    SELECT pr.company_id
    INTO v_project_company_id
    FROM public.projects pr
    WHERE pr.id = p_project_id;

    IF v_project_company_id IS NULL THEN
      RAISE EXCEPTION 'Project not found';
    END IF;

    IF NOT (v_project_company_id = ANY(public.authed_company_ids())) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;

    v_company_id := v_project_company_id;
    v_total_amount := p_amount;
    v_invoice_type := 'standard';

    INSERT INTO public.invoices (
      company_id,
      project_id,
      invoice_number,
      invoice_type,
      status,
      issue_date,
      subtotal_amount,
      total_amount,
      source_type,
      source_id,
      billing_period_from,
      billing_period_to,
      notes
    )
    VALUES (
      v_company_id,
      p_project_id,
      '',
      v_invoice_type,
      'draft',
      CURRENT_DATE,
      v_total_amount,
      v_total_amount,
      'manual',
      NULL,
      p_billing_period_from,
      p_billing_period_to,
      p_notes
    )
    RETURNING id INTO v_invoice_id;

    RETURN jsonb_build_object(
      'success', true,
      'invoice_id', v_invoice_id,
      'invoice_type', v_invoice_type,
      'source_type', 'manual',
      'total_amount', v_total_amount
    );
  END IF;

  -- Get and validate baseline for all other invoice types
  SELECT * INTO v_baseline
  FROM public.contract_baselines cb
  WHERE cb.project_id = p_project_id
    AND cb.company_id = ANY(public.authed_company_ids());

  IF v_baseline.id IS NULL THEN
    RAISE EXCEPTION 'No contract baseline found. Accept a proposal first.';
  END IF;

  v_company_id := v_baseline.company_id;

  -- Route based on source type
  CASE p_source_type
    -- Milestone Invoice
    WHEN 'milestone' THEN
      IF v_baseline.billing_basis != 'payment_schedule' THEN
        RAISE EXCEPTION 'Project uses SOV billing, not milestones';
      END IF;
      IF p_milestone_allocations IS NULL OR jsonb_array_length(p_milestone_allocations) = 0 THEN
        RAISE EXCEPTION 'Milestone allocations required';
      END IF;
      v_result := public.create_invoice_from_milestones(p_project_id, p_milestone_allocations);
      RETURN v_result;

    -- SOV Period Invoice
    WHEN 'sov_period' THEN
      IF v_baseline.billing_basis != 'sov' THEN
        RAISE EXCEPTION 'Project uses payment schedule billing, not SOV';
      END IF;
      IF p_sov_lines IS NULL OR jsonb_array_length(p_sov_lines) = 0 THEN
        RAISE EXCEPTION 'SOV lines required';
      END IF;
      v_result := public.create_invoice_from_sov(p_project_id, p_sov_lines);
      RETURN v_result;

    -- Change Order Invoice
    WHEN 'change_order' THEN
      IF p_source_id IS NULL THEN
        RAISE EXCEPTION 'Change order ID required';
      END IF;
      -- Validate CO is approved and has remaining balance
      DECLARE
        v_co public.change_orders;
        v_available numeric;
      BEGIN
        SELECT * INTO v_co
        FROM public.change_orders co
        WHERE co.id = p_source_id
          AND co.project_id = p_project_id
          AND co.status = 'approved';

        IF v_co.id IS NULL THEN
          RAISE EXCEPTION 'Change order not found or not approved';
        END IF;

        v_available := v_co.total_amount - COALESCE(v_co.invoiced_amount, 0);
        v_total_amount := COALESCE(p_amount, v_available);

        IF v_total_amount > v_available THEN
          RAISE EXCEPTION 'Invoice amount (%) exceeds available CO balance (%)', v_total_amount, v_available;
        END IF;
      END;
      v_invoice_type := 'standard';

    -- Deposit Invoice
    WHEN 'deposit' THEN
      IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Deposit amount required';
      END IF;
      v_total_amount := p_amount;
      v_invoice_type := 'deposit';

    ELSE
      RAISE EXCEPTION 'Invalid source type: %. Must be milestone, sov_period, change_order, deposit, or manual', p_source_type;
  END CASE;

  -- Create the invoice for CO and Deposit types
  INSERT INTO public.invoices (
    company_id,
    project_id,
    invoice_number,
    invoice_type,
    status,
    issue_date,
    subtotal_amount,
    total_amount,
    source_type,
    source_id,
    change_order_id,
    billing_period_from,
    billing_period_to,
    notes
  )
  VALUES (
    v_company_id,
    p_project_id,
    '',  -- Auto-generated
    v_invoice_type,
    'draft',
    CURRENT_DATE,
    v_total_amount,
    v_total_amount,
    p_source_type,
    p_source_id,
    CASE WHEN p_source_type = 'change_order' THEN p_source_id ELSE NULL END,
    p_billing_period_from,
    p_billing_period_to,
    p_notes
  )
  RETURNING id INTO v_invoice_id;

  -- Update CO invoiced amount if applicable
  IF p_source_type = 'change_order' THEN
    UPDATE public.change_orders
    SET invoiced_amount = COALESCE(invoiced_amount, 0) + v_total_amount
    WHERE id = p_source_id;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'invoice_type', v_invoice_type,
    'source_type', p_source_type,
    'total_amount', v_total_amount
  );

  RETURN v_result;
END;
$$;


