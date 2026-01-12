-- ============================================================================
-- FIX: approve_proposal_manual must EXPLICITLY set billing_readiness = 'locked'
-- ============================================================================
--
-- ROOT CAUSE:
-- The RPC relied on DB triggers to set billing_readiness after updating
-- acceptance_status. If triggers are missing or fail, billing_readiness is NULL,
-- causing the Billing UI to show "Not set" even for approved proposals.
--
-- FIX:
-- 1. RPC explicitly sets billing_readiness = 'locked' in the UPDATE statement
-- 2. Backfill any accepted proposals with NULL billing_readiness
-- 3. Add billing_basis derivation for fixed_price (previously returned 'payment_schedule')
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) BACKFILL: Set billing_readiness = 'locked' for all accepted proposals
-- ============================================================================

UPDATE public.proposals
SET
  billing_readiness = 'locked',
  billing_basis = CASE
    WHEN billing_basis IS NOT NULL THEN billing_basis
    WHEN contract_type = 'progress_billing' THEN 'sov'
    WHEN contract_type = 'milestone' THEN 'payment_schedule'
    WHEN contract_type = 'fixed_price' THEN 'payment_schedule'
    ELSE 'payment_schedule'
  END
WHERE
  acceptance_status = 'accepted'
  AND (billing_readiness IS NULL OR billing_readiness != 'locked');

-- ============================================================================
-- 2) FIX RPC: approve_proposal_manual now explicitly sets billing_readiness
-- ============================================================================

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

  -- FIX: Update proposal with ALL billing fields explicitly set
  -- Do NOT rely on triggers alone
  UPDATE public.proposals
  SET
    acceptance_status = 'accepted',
    approved_at = now(),
    approved_by = COALESCE(p_approved_by, 'Manual approval'),
    status = 'accepted',
    billing_basis = v_billing_basis,
    billing_readiness = 'locked'  -- EXPLICIT: This was previously missing
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

-- ============================================================================
-- 3) FIX get_project_billing_summary: Remove parent_proposal_id restriction
--    This ensures accepted COs (versions) are also found for billing basis
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_project_billing_summary(uuid);

CREATE OR REPLACE FUNCTION public.get_project_billing_summary(p_project_id uuid)
RETURNS TABLE(
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
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_baseline public.contract_baselines;
  v_has_baseline boolean := false;
  v_billing_basis text := null;
  v_base_contract numeric := 0;

  v_approved_co_total numeric := 0;
  v_pending_co_count integer := 0;
  v_approved_co_count integer := 0;
  v_pending_co_value numeric := 0;

  v_contract_billed numeric := 0;
  v_all_billed numeric := 0;
  v_paid numeric := 0;
  v_retention numeric := 0;
  v_contract_inv_count integer := 0;
  v_pay_count integer := 0;

  v_has_base_proposal boolean := false;
  v_base_proposal_id uuid := null;
  v_base_proposal_total numeric := 0;
BEGIN
  -- Baseline (tenant-scoped)
  SELECT * INTO v_baseline
  FROM public.contract_baselines cb
  WHERE cb.project_id = p_project_id
    AND cb.company_id = ANY(public.authed_company_ids())
  LIMIT 1;

  IF v_baseline.id IS NOT NULL THEN
    v_has_baseline := true;
    v_billing_basis := v_baseline.billing_basis;
    v_base_contract := COALESCE(v_baseline.base_contract_total, 0);
  ELSE
    -- Fall back to accepted proposal (ANY accepted proposal, not just base)
    -- Priority: base proposal (parent_proposal_id IS NULL) first
    SELECT p.id, p.total_amount, p.billing_basis, true
    INTO v_base_proposal_id, v_base_proposal_total, v_billing_basis, v_has_base_proposal
    FROM public.proposals p
    WHERE p.project_id = p_project_id
      AND p.company_id = ANY(public.authed_company_ids())
      AND p.acceptance_status = 'accepted'
    ORDER BY
      (p.parent_proposal_id IS NULL) DESC,  -- Base proposals first
      p.approved_at DESC NULLS LAST,
      p.updated_at DESC
    LIMIT 1;

    v_base_contract := COALESCE(v_base_proposal_total, 0);
  END IF;

  -- Change order counts & pending value (tenant-scoped)
  SELECT
    COUNT(*) FILTER (WHERE co.status IN ('draft', 'sent')),
    COUNT(*) FILTER (WHERE co.status = 'approved'),
    COALESCE(SUM(co.total_amount) FILTER (WHERE co.status IN ('draft', 'sent')), 0)
  INTO v_pending_co_count, v_approved_co_count, v_pending_co_value
  FROM public.change_orders co
  WHERE co.project_id = p_project_id
    AND co.company_id = ANY(public.authed_company_ids())
    AND co.status NOT IN ('rejected', 'void');

  -- Approved change orders
  SELECT COALESCE(SUM(co.total_amount), 0)
  INTO v_approved_co_total
  FROM public.change_orders co
  WHERE co.project_id = p_project_id
    AND co.company_id = ANY(public.authed_company_ids())
    AND co.status = 'approved';

  -- Also include accepted proposal-based COs (legacy support)
  SELECT v_approved_co_total + COALESCE(SUM(p.total_amount), 0)
  INTO v_approved_co_total
  FROM public.proposals p
  WHERE p.project_id = p_project_id
    AND p.company_id = ANY(public.authed_company_ids())
    AND p.acceptance_status = 'accepted'
    AND p.parent_proposal_id IS NOT NULL;

  -- Invoice totals
  SELECT
    COALESCE(SUM(i.total_amount) FILTER (
      WHERE i.status NOT IN ('void', 'draft')
        AND (i.source_type IS DISTINCT FROM 'manual')
        AND (i.source_type IS DISTINCT FROM 'deposit')
        AND (i.invoice_type IS DISTINCT FROM 'deposit')
    ), 0),
    COALESCE(SUM(i.total_amount) FILTER (WHERE i.status NOT IN ('void', 'draft')), 0),
    COUNT(*) FILTER (
      WHERE i.status NOT IN ('void', 'draft')
        AND (i.source_type IS DISTINCT FROM 'manual')
        AND (i.source_type IS DISTINCT FROM 'deposit')
        AND (i.invoice_type IS DISTINCT FROM 'deposit')
    ),
    COALESCE(SUM(i.retention_amount) FILTER (
      WHERE i.status NOT IN ('void', 'draft')
        AND (i.source_type IS DISTINCT FROM 'manual')
    ), 0)
  INTO v_contract_billed, v_all_billed, v_contract_inv_count, v_retention
  FROM public.invoices i
  WHERE i.project_id = p_project_id
    AND i.company_id = ANY(public.authed_company_ids());

  -- Payments
  SELECT COALESCE(SUM(cp.amount), 0), COUNT(*)
  INTO v_paid, v_pay_count
  FROM public.customer_payments cp
  WHERE cp.project_id = p_project_id
    AND cp.company_id = ANY(public.authed_company_ids());

  RETURN QUERY SELECT
    v_has_baseline,
    v_baseline.id,
    v_billing_basis,
    v_base_contract,
    v_approved_co_total,
    (v_base_contract + v_approved_co_total),
    v_pending_co_count,
    v_approved_co_count,
    v_pending_co_value,
    v_contract_billed,
    v_paid,
    (v_all_billed - v_paid),
    ((v_base_contract + v_approved_co_total) - v_contract_billed),
    v_retention,
    v_contract_inv_count,
    v_pay_count,
    v_has_base_proposal OR v_has_baseline,
    v_base_proposal_id,
    v_base_proposal_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_billing_summary(uuid) TO authenticated;

-- ============================================================================
-- 4) REFRESH SCHEMA CACHE
-- ============================================================================

NOTIFY pgrst, 'reload schema';

COMMIT;

