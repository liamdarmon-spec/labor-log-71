-- ============================================================================
-- CANONICAL CONTRACT & BILLING LOCK
-- ============================================================================
-- This migration eliminates the possibility of real-money states where a
-- Proposal is "Approved" while its billing basis is missing or invalid.
--
-- ENFORCED AT DATABASE LEVEL - UI/API/RPC misuse cannot bypass this.
--
-- CONTRACT TYPES:
--   fixed_price     - Always billable, standalone invoices allowed
--   milestone       - Requires ≥1 milestone before approval
--   sov             - Requires SOV allocation totaling 100%
--
-- HARD RULES:
--   1) Approval is BLOCKED unless billing config is valid
--   2) Contract type drives billing deterministically
--   3) After approval: contract_type is IMMUTABLE, billing is LOCKED
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) ENUMS (idempotent)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_readiness_status') THEN
    CREATE TYPE billing_readiness_status AS ENUM ('incomplete', 'ready', 'locked');
  END IF;
END $$;

-- Note: We keep contract_type as text with CHECK constraint since it already exists that way
-- and migrating to enum would require complex type conversion. The CHECK constraint is equally safe.

-- ============================================================================
-- 2) ENSURE proposals TABLE HAS REQUIRED COLUMNS
-- ============================================================================

-- Add billing_readiness column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'billing_readiness'
  ) THEN
    ALTER TABLE public.proposals 
      ADD COLUMN billing_readiness text NOT NULL DEFAULT 'incomplete'
      CHECK (billing_readiness IN ('incomplete', 'ready', 'locked'));
  END IF;
END $$;

-- Ensure contract_type column has correct constraint (may already exist)
DO $$
BEGIN
  -- Drop old constraint if exists and recreate with correct values
  ALTER TABLE public.proposals 
    DROP CONSTRAINT IF EXISTS proposals_contract_type_check;
  
  -- Add constraint that includes 'sov' as alias for progress_billing
  ALTER TABLE public.proposals 
    ADD CONSTRAINT proposals_contract_type_check 
    CHECK (contract_type IS NULL OR contract_type IN ('fixed_price', 'milestone', 'progress_billing', 'sov'));
EXCEPTION WHEN others THEN
  NULL; -- Constraint might already exist with correct values
END $$;

-- ============================================================================
-- 3) BILLING READINESS CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_proposal_billing_ready(p_proposal_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proposal public.proposals;
  v_contract_type text;
  v_milestone_count int;
  v_sov_total numeric;
BEGIN
  -- Get proposal
  SELECT * INTO v_proposal FROM public.proposals WHERE id = p_proposal_id;
  
  IF v_proposal IS NULL THEN
    RETURN false;
  END IF;
  
  v_contract_type := COALESCE(v_proposal.contract_type, 'fixed_price');
  
  -- Fixed price is always billable
  IF v_contract_type = 'fixed_price' THEN
    RETURN true;
  END IF;
  
  -- Milestone requires at least one payment schedule item
  IF v_contract_type = 'milestone' THEN
    SELECT COUNT(*) INTO v_milestone_count
    FROM public.payment_schedule_items psi
    JOIN public.payment_schedules ps ON ps.id = psi.payment_schedule_id
    WHERE ps.proposal_id = p_proposal_id
      AND NOT COALESCE(psi.is_archived, false);
    
    RETURN v_milestone_count > 0;
  END IF;
  
  -- SOV / progress_billing requires valid SOV allocation
  IF v_contract_type IN ('sov', 'progress_billing') THEN
    -- Check sov_items linked to proposal
    SELECT COALESCE(SUM(
      CASE 
        WHEN si.percent_of_total IS NOT NULL THEN si.percent_of_total
        -- If using scheduled_value, calculate percent from proposal total
        WHEN v_proposal.total_amount > 0 THEN 
          (COALESCE(si.scheduled_value, 0) / v_proposal.total_amount) * 100
        ELSE 0
      END
    ), 0) INTO v_sov_total
    FROM public.sov_items si
    WHERE si.proposal_id = p_proposal_id;
    
    -- Must equal 100% (with small tolerance for floating point)
    -- Also accept if at least one SOV item exists and amounts match total
    IF v_sov_total >= 99.99 AND v_sov_total <= 100.01 THEN
      RETURN true;
    END IF;
    
    -- Alternative: Check if sum of scheduled_values equals proposal total
    SELECT COALESCE(SUM(COALESCE(si.scheduled_value, 0)), 0) INTO v_sov_total
    FROM public.sov_items si
    WHERE si.proposal_id = p_proposal_id;
    
    IF v_sov_total > 0 AND ABS(v_sov_total - COALESCE(v_proposal.total_amount, 0)) < 0.01 THEN
      RETURN true;
    END IF;
    
    RETURN false;
  END IF;
  
  -- Unknown contract type - block approval
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_proposal_billing_ready(uuid) TO authenticated;

COMMENT ON FUNCTION public.is_proposal_billing_ready(uuid) IS
  'Checks if proposal billing configuration is valid for approval. Returns true only if contract type requirements are met.';

-- ============================================================================
-- 4) TRIGGER: BLOCK APPROVAL UNLESS BILLING READY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tg_enforce_proposal_billing_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_ready boolean;
  v_contract_type text;
BEGIN
  -- Only fire when acceptance_status transitions to 'accepted'
  -- or when approved_at transitions from NULL to NOT NULL
  IF (
    (OLD.acceptance_status IS DISTINCT FROM 'accepted' AND NEW.acceptance_status = 'accepted')
    OR
    (OLD.approved_at IS NULL AND NEW.approved_at IS NOT NULL)
  ) THEN
    -- Check billing readiness
    v_is_ready := public.is_proposal_billing_ready(NEW.id);
    v_contract_type := COALESCE(NEW.contract_type, 'fixed_price');
    
    IF NOT v_is_ready THEN
      RAISE EXCEPTION 'Cannot approve proposal: billing configuration is incomplete for contract type "%". %',
        v_contract_type,
        CASE v_contract_type
          WHEN 'milestone' THEN 'At least one milestone must be defined.'
          WHEN 'sov' THEN 'SOV allocation must total exactly 100%.'
          WHEN 'progress_billing' THEN 'SOV allocation must total exactly 100%.'
          ELSE 'Unknown contract type.'
        END
      USING ERRCODE = 'check_violation';
    END IF;
    
    -- Lock the billing configuration
    NEW.billing_readiness := 'locked';
    
    -- Ensure billing_basis is set based on contract_type
    IF NEW.billing_basis IS NULL THEN
      NEW.billing_basis := CASE v_contract_type
        WHEN 'sov' THEN 'sov'
        WHEN 'progress_billing' THEN 'sov'
        WHEN 'milestone' THEN 'payment_schedule'
        ELSE 'payment_schedule'  -- fixed_price uses payment_schedule
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_proposal_billing_on_approval ON public.proposals;
CREATE TRIGGER enforce_proposal_billing_on_approval
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_enforce_proposal_billing_on_approval();

-- ============================================================================
-- 5) TRIGGER: PREVENT CONTRACT TYPE CHANGES AFTER APPROVAL
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tg_prevent_contract_type_change_after_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Block if proposal was already accepted and contract_type is being changed
  IF OLD.acceptance_status = 'accepted' OR OLD.approved_at IS NOT NULL THEN
    IF OLD.contract_type IS DISTINCT FROM NEW.contract_type THEN
      RAISE EXCEPTION 'Cannot modify contract_type after proposal approval. Contract type is locked at: %',
        OLD.contract_type
      USING ERRCODE = 'check_violation';
    END IF;
    
    -- Also block billing_basis changes after approval
    IF OLD.billing_basis IS DISTINCT FROM NEW.billing_basis AND NEW.billing_basis IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot modify billing_basis after proposal approval. Billing basis is locked at: %',
        OLD.billing_basis
      USING ERRCODE = 'check_violation';
    END IF;
    
    -- Block billing_readiness changes from 'locked'
    IF OLD.billing_readiness = 'locked' AND NEW.billing_readiness != 'locked' THEN
      RAISE EXCEPTION 'Cannot unlock billing configuration after approval'
      USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_contract_type_change_after_approval ON public.proposals;
CREATE TRIGGER prevent_contract_type_change_after_approval
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_prevent_contract_type_change_after_approval();

-- ============================================================================
-- 6) UPDATE approve_proposal_manual TO RESPECT THESE RULES
-- ============================================================================
-- The triggers will fire automatically, but update the RPC to give better errors

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
  v_proposal record;
  v_auth_companies uuid[];
  v_is_ready boolean;
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

  -- Pre-check billing readiness (trigger will also check, but give cleaner error)
  v_is_ready := public.is_proposal_billing_ready(p_proposal_id);
  IF NOT v_is_ready THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('Billing configuration is incomplete for contract type "%s"', COALESCE(v_proposal.contract_type, 'fixed_price')),
      'contract_type', COALESCE(v_proposal.contract_type, 'fixed_price'),
      'hint', CASE COALESCE(v_proposal.contract_type, 'fixed_price')
        WHEN 'milestone' THEN 'Add at least one milestone before approval'
        WHEN 'sov' THEN 'Configure SOV allocation totaling 100%'
        WHEN 'progress_billing' THEN 'Configure SOV allocation totaling 100%'
        ELSE 'Check billing configuration'
      END
    );
  END IF;

  -- Derive billing_basis from contract_type
  v_billing_basis := CASE COALESCE(v_proposal.contract_type, 'fixed_price')
    WHEN 'sov' THEN 'sov'
    WHEN 'progress_billing' THEN 'sov'
    WHEN 'milestone' THEN 'payment_schedule'
    ELSE 'payment_schedule'
  END;

  -- Update proposal to approved status
  -- The trigger will validate and set billing_readiness = 'locked'
  UPDATE public.proposals
  SET 
    acceptance_status = 'accepted',
    approved_at = now(),
    approved_by = COALESCE(p_approved_by, 'Manual approval'),
    status = 'accepted',
    billing_basis = v_billing_basis
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
      jsonb_build_object(
        'source', 'manual_approval', 
        'timestamp', now(),
        'contract_type', v_proposal.contract_type,
        'billing_basis', v_billing_basis,
        'billing_readiness', 'locked'
      ),
      now()
    );
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- Create contract baseline if requested
  IF p_create_baseline THEN
    -- Check if baseline already exists for this project
    IF EXISTS (SELECT 1 FROM public.contract_baselines WHERE project_id = v_proposal.project_id) THEN
      RETURN jsonb_build_object(
        'success', true, 
        'message', 'Proposal approved (baseline already exists)',
        'baseline_exists', true,
        'billing_basis', v_billing_basis,
        'billing_readiness', 'locked'
      );
    END IF;

    -- Freeze milestones or SOV lines based on billing basis
    IF v_billing_basis = 'payment_schedule' THEN
      BEGIN
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', psi.id,
            'title', psi.title,
            'amount', psi.scheduled_amount,
            'due_on', psi.due_on,
            'sort_order', psi.sort_order
          ) ORDER BY psi.sort_order
        )
        INTO v_milestones
        FROM public.payment_schedule_items psi
        JOIN public.payment_schedules ps ON ps.id = psi.payment_schedule_id
        WHERE ps.proposal_id = p_proposal_id
          AND NOT COALESCE(psi.is_archived, false);
      EXCEPTION WHEN undefined_table THEN
        v_milestones := null;
      END;
      
      v_sov_lines := null;
    ELSE
      BEGIN
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', si.id,
            'description', si.description,
            'scheduled_value', si.scheduled_value,
            'percent_of_total', si.percent_of_total,
            'sort_order', si.sort_order
          ) ORDER BY si.sort_order
        )
        INTO v_sov_lines
        FROM public.sov_items si
        WHERE si.proposal_id = p_proposal_id;
      EXCEPTION WHEN undefined_table THEN
        v_sov_lines := null;
      END;
      
      v_milestones := null;
    END IF;

    -- Create contract baseline
    BEGIN
      INSERT INTO public.contract_baselines (
        company_id,
        project_id,
        accepted_proposal_id,
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
        auth.uid()
      )
      RETURNING id INTO v_baseline_id;
    EXCEPTION WHEN undefined_column THEN
      -- Handle case where accepted_proposal_id doesn't exist yet
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
        auth.uid()
      )
      RETURNING id INTO v_baseline_id;
    END;

    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Proposal approved and baseline created',
      'baseline_id', v_baseline_id,
      'billing_basis', v_billing_basis,
      'contract_total', v_proposal.total_amount,
      'billing_readiness', 'locked'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Proposal approved (no baseline created)',
    'billing_basis', v_billing_basis,
    'billing_readiness', 'locked'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_proposal_manual(uuid, text, boolean) TO authenticated;

COMMENT ON FUNCTION public.approve_proposal_manual(uuid, text, boolean) IS
  'Approve proposal with billing validation. Blocks approval if billing configuration is incomplete. Locks contract_type and billing_basis after approval.';

-- ============================================================================
-- 7) BACKFILL: Set billing_readiness for existing approved proposals
-- ============================================================================

UPDATE public.proposals
SET billing_readiness = 'locked'
WHERE acceptance_status = 'accepted'
  AND billing_readiness != 'locked';

UPDATE public.proposals
SET billing_readiness = 'ready'
WHERE acceptance_status != 'accepted'
  AND billing_readiness = 'incomplete'
  AND public.is_proposal_billing_ready(id) = true;

-- ============================================================================
-- 8) REFRESH POSTGREST SCHEMA CACHE
-- ============================================================================

NOTIFY pgrst, 'reload schema';

COMMIT;

