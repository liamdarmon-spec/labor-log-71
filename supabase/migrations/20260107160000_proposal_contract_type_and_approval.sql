-- ============================================================================
-- Add contract_type to proposals for billing automation clarity
-- Contract Types: 'fixed_price' | 'milestone' | 'progress_billing'
-- Also add RPC for manual approval from admin
-- ============================================================================

-- 1) Add contract_type column to proposals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'contract_type'
  ) THEN
    ALTER TABLE public.proposals 
    ADD COLUMN contract_type text 
    CHECK (contract_type IN ('fixed_price', 'milestone', 'progress_billing'))
    DEFAULT 'fixed_price';
  END IF;
END $$;

-- 2) Add billing_terms for payment terms (net30, net60, etc)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'billing_terms'
  ) THEN
    ALTER TABLE public.proposals 
    ADD COLUMN billing_terms text DEFAULT 'net30';
  END IF;
END $$;

-- 3) Add retainage_percent for progress billing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'retainage_percent'
  ) THEN
    ALTER TABLE public.proposals 
    ADD COLUMN retainage_percent numeric(5,2) DEFAULT 0;
  END IF;
END $$;

-- 4) Add approved_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE public.proposals 
    ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

-- 5) Add approved_by (user id or name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE public.proposals 
    ADD COLUMN approved_by text;
  END IF;
END $$;

-- 6) Migrate billing_basis to contract_type where appropriate
-- (billing_basis stays for baseline creation, but contract_type is the user-facing choice)
UPDATE public.proposals
SET contract_type = CASE
  WHEN billing_basis = 'sov' THEN 'progress_billing'
  WHEN billing_basis = 'payment_schedule' THEN 'milestone'
  ELSE 'fixed_price'
END
WHERE contract_type IS NULL;

-- 7) Create/replace RPC for manual admin approval
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
  v_company_id uuid;
  v_auth_companies uuid[];
  v_baseline_result jsonb;
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

  -- Update proposal to approved status
  UPDATE public.proposals
  SET 
    acceptance_status = 'accepted',
    approved_at = now(),
    approved_by = COALESCE(p_approved_by, 'Manual approval'),
    status = 'accepted'
  WHERE id = p_proposal_id;

  -- Log approval event
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

  -- Optionally create contract baseline
  IF p_create_baseline THEN
    -- Set billing_basis from contract_type if not already set
    UPDATE public.proposals
    SET billing_basis = CASE 
      WHEN contract_type = 'progress_billing' THEN 'sov'
      WHEN contract_type = 'milestone' THEN 'payment_schedule'
      ELSE 'payment_schedule'  -- fixed_price uses payment schedule with single milestone
    END
    WHERE id = p_proposal_id
      AND billing_basis IS NULL;

    -- Call existing baseline creation RPC if it exists
    BEGIN
      SELECT public.create_contract_baseline(p_proposal_id) INTO v_baseline_result;
    EXCEPTION WHEN undefined_function THEN
      v_baseline_result := jsonb_build_object('skipped', true, 'reason', 'create_contract_baseline not available');
    END;

    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Proposal approved and baseline created',
      'baseline', v_baseline_result
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Proposal approved');
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_proposal_manual(uuid, text, boolean) TO authenticated;

-- 8) Create function to update proposal contract settings
CREATE OR REPLACE FUNCTION public.update_proposal_contract_settings(
  p_proposal_id uuid,
  p_contract_type text DEFAULT NULL,
  p_billing_terms text DEFAULT NULL,
  p_retainage_percent numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proposal record;
  v_auth_companies uuid[];
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

  -- Cannot change contract type after approval
  IF v_proposal.acceptance_status = 'accepted' AND p_contract_type IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot change contract type after approval');
  END IF;

  -- Update settings
  UPDATE public.proposals
  SET 
    contract_type = COALESCE(p_contract_type, contract_type),
    billing_terms = COALESCE(p_billing_terms, billing_terms),
    retainage_percent = COALESCE(p_retainage_percent, retainage_percent),
    updated_at = now()
  WHERE id = p_proposal_id;

  -- Update billing_basis to match contract_type
  IF p_contract_type IS NOT NULL THEN
    UPDATE public.proposals
    SET billing_basis = CASE 
      WHEN p_contract_type = 'progress_billing' THEN 'sov'
      WHEN p_contract_type = 'milestone' THEN 'payment_schedule'
      ELSE 'payment_schedule'
    END
    WHERE id = p_proposal_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_proposal_contract_settings(uuid, text, text, numeric) TO authenticated;

-- 9) Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_proposals_contract_type ON public.proposals(contract_type);
CREATE INDEX IF NOT EXISTS idx_proposals_approved_at ON public.proposals(approved_at);

COMMENT ON COLUMN public.proposals.contract_type IS 
  'Contract billing type: fixed_price (single payment), milestone (progress payments against milestones), progress_billing (SOV-based % complete)';

COMMENT ON COLUMN public.proposals.billing_terms IS 
  'Payment terms: net30, net60, due_on_receipt, etc.';

COMMENT ON COLUMN public.proposals.retainage_percent IS 
  'Retainage percentage held until project completion (common in construction)';

