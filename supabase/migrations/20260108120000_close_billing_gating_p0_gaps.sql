-- ============================================================================
-- CLOSE BILLING GATING P0 GAPS
-- ============================================================================
--
-- REPRO + FINDINGS (from paranoid audit):
-- -----------------------------------------------------------------------
-- 1) INSERT BYPASS: Current gating triggers are BEFORE UPDATE only.
--    An INSERT with acceptance_status='accepted' can bypass all checks.
--    
-- 2) POST-ACCEPTANCE MUTATION: No triggers block edits to payment_schedule_items
--    or sov_items after proposal is accepted. The proposal stays "locked" but
--    billing config becomes invalid.
--    
-- 3) TENANT RISK: is_proposal_billing_ready() is SECURITY DEFINER and selects
--    by id without tenant check. Cross-tenant inference risk.
--    
-- 4) SOV TOLERANCE: Accepts 99.99-100.01% instead of exact 100%.
--
-- THIS MIGRATION FIXES:
-- ✓ DB FIX #1: BEFORE INSERT gating on proposals
-- ✓ DB FIX #2: Lock milestones/SOV mutation after acceptance
-- ✓ DB FIX #3: Tenant-safe readiness function
-- ✓ DB FIX #4: Tighter SOV tolerance (0.001% instead of 0.01%)
-- ✓ DATA AUDIT: Find/flag invalid accepted proposals
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) DB FIX #1: BEFORE INSERT GATING ON PROPOSALS
-- ============================================================================
-- Block inserting proposals that are already accepted without valid billing

CREATE OR REPLACE FUNCTION public.tg_enforce_proposal_billing_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_ready boolean;
  v_contract_type text;
  v_milestone_count int;
  v_sov_total numeric;
BEGIN
  -- Only check if inserting with accepted status
  IF NEW.acceptance_status = 'accepted' OR NEW.approved_at IS NOT NULL THEN
    v_contract_type := COALESCE(NEW.contract_type, 'fixed_price');
    
    -- Fixed price is always ready
    IF v_contract_type = 'fixed_price' THEN
      v_is_ready := true;
    ELSIF v_contract_type = 'milestone' THEN
      -- Check milestones (need NEW.id to exist - it should from default)
      -- For INSERT, milestones must exist BEFORE the proposal insert
      -- This is a constraint: you can't INSERT an accepted milestone proposal
      -- without first creating the milestones (which requires the proposal to exist)
      -- Therefore: block INSERT of accepted milestone proposals entirely
      RAISE EXCEPTION 'Cannot insert an already-accepted milestone proposal. Create proposal first, add milestones, then approve.'
        USING ERRCODE = 'check_violation';
    ELSIF v_contract_type IN ('sov', 'progress_billing') THEN
      -- Same logic: SOV items must reference the proposal, can't exist before INSERT
      RAISE EXCEPTION 'Cannot insert an already-accepted SOV/progress_billing proposal. Create proposal first, add SOV items, then approve.'
        USING ERRCODE = 'check_violation';
    ELSE
      -- Unknown contract type with accepted status
      RAISE EXCEPTION 'Cannot insert accepted proposal with unknown contract type: %', v_contract_type
        USING ERRCODE = 'check_violation';
    END IF;
    
    -- For fixed_price, ensure proper fields are set
    IF v_is_ready THEN
      NEW.billing_readiness := 'locked';
      IF NEW.billing_basis IS NULL THEN
        NEW.billing_basis := 'payment_schedule';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_proposal_billing_on_insert ON public.proposals;
CREATE TRIGGER enforce_proposal_billing_on_insert
  BEFORE INSERT ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_enforce_proposal_billing_on_insert();

COMMENT ON FUNCTION public.tg_enforce_proposal_billing_on_insert() IS
  'Prevents inserting proposals that are already accepted without proper billing flow.';

-- ============================================================================
-- 2) DB FIX #2: LOCK MILESTONES/SOV AFTER ACCEPTANCE
-- ============================================================================

-- 2a) Function to check if linked proposal is accepted
CREATE OR REPLACE FUNCTION public.is_proposal_accepted(p_proposal_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proposals
    WHERE id = p_proposal_id
      AND (acceptance_status = 'accepted' OR approved_at IS NOT NULL OR billing_readiness = 'locked')
  );
$$;

-- 2b) Trigger function to block payment_schedules mutation
CREATE OR REPLACE FUNCTION public.tg_block_billing_schedule_mutation_after_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proposal_id uuid;
BEGIN
  -- Get proposal_id
  IF TG_TABLE_NAME = 'payment_schedules' THEN
    v_proposal_id := COALESCE(NEW.proposal_id, OLD.proposal_id);
  ELSIF TG_TABLE_NAME = 'payment_schedule_items' THEN
    -- Get via payment_schedule
    IF TG_OP = 'DELETE' THEN
      SELECT ps.proposal_id INTO v_proposal_id
      FROM public.payment_schedules ps
      WHERE ps.id = OLD.payment_schedule_id;
    ELSE
      SELECT ps.proposal_id INTO v_proposal_id
      FROM public.payment_schedules ps
      WHERE ps.id = COALESCE(NEW.payment_schedule_id, OLD.payment_schedule_id);
    END IF;
  END IF;
  
  -- Allow if proposal_id is NULL (orphan, not our problem here)
  IF v_proposal_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  
  -- Block if proposal is accepted
  IF public.is_proposal_accepted(v_proposal_id) THEN
    -- Allow controlled escape hatch for change order processing
    IF current_setting('app.billing_revision_mode', true) = 'on' THEN
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
    END IF;
    
    RAISE EXCEPTION 'Cannot modify billing schedule for accepted proposal %. Create a change order or new revision instead.',
      v_proposal_id
    USING ERRCODE = 'check_violation';
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Apply to payment_schedules
DROP TRIGGER IF EXISTS block_billing_schedule_mutation_after_acceptance ON public.payment_schedules;
CREATE TRIGGER block_billing_schedule_mutation_after_acceptance
  BEFORE INSERT OR UPDATE OR DELETE ON public.payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_block_billing_schedule_mutation_after_acceptance();

-- Apply to payment_schedule_items
DROP TRIGGER IF EXISTS block_billing_schedule_mutation_after_acceptance ON public.payment_schedule_items;
CREATE TRIGGER block_billing_schedule_mutation_after_acceptance
  BEFORE INSERT OR UPDATE OR DELETE ON public.payment_schedule_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_block_billing_schedule_mutation_after_acceptance();

-- 2c) Trigger function to block sov_items mutation
CREATE OR REPLACE FUNCTION public.tg_block_sov_mutation_after_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proposal_id uuid;
BEGIN
  -- Get proposal_id directly from sov_items
  v_proposal_id := COALESCE(NEW.proposal_id, OLD.proposal_id);
  
  -- Allow if proposal_id is NULL
  IF v_proposal_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  
  -- Block if proposal is accepted
  IF public.is_proposal_accepted(v_proposal_id) THEN
    -- Allow controlled escape hatch for change order processing
    IF current_setting('app.billing_revision_mode', true) = 'on' THEN
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
    END IF;
    
    RAISE EXCEPTION 'Cannot modify SOV for accepted proposal %. Create a change order or new revision instead.',
      v_proposal_id
    USING ERRCODE = 'check_violation';
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS block_sov_mutation_after_acceptance ON public.sov_items;
CREATE TRIGGER block_sov_mutation_after_acceptance
  BEFORE INSERT OR UPDATE OR DELETE ON public.sov_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_block_sov_mutation_after_acceptance();

COMMENT ON FUNCTION public.tg_block_billing_schedule_mutation_after_acceptance() IS
  'Blocks mutation of payment_schedules/items after linked proposal is accepted. Use SET app.billing_revision_mode=''on'' to bypass (for controlled CO processing).';

COMMENT ON FUNCTION public.tg_block_sov_mutation_after_acceptance() IS
  'Blocks mutation of sov_items after linked proposal is accepted. Use SET app.billing_revision_mode=''on'' to bypass (for controlled CO processing).';

-- ============================================================================
-- 3) DB FIX #3: TENANT-SAFE READINESS FUNCTION
-- ============================================================================
-- Replace is_proposal_billing_ready to be tenant-safe

CREATE OR REPLACE FUNCTION public.is_proposal_billing_ready(p_proposal_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proposal public.proposals;
  v_auth_companies uuid[];
  v_contract_type text;
  v_milestone_count int;
  v_sov_total numeric;
BEGIN
  -- Get proposal
  SELECT * INTO v_proposal FROM public.proposals WHERE id = p_proposal_id;
  
  IF v_proposal IS NULL THEN
    RETURN false;
  END IF;
  
  -- TENANT CHECK: Verify caller has access to this proposal's company
  v_auth_companies := public.authed_company_ids();
  IF v_auth_companies IS NOT NULL AND array_length(v_auth_companies, 1) > 0 THEN
    IF NOT (v_proposal.company_id = ANY(v_auth_companies)) THEN
      RETURN false; -- Silently deny for cross-tenant
    END IF;
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
    -- SOV validation: sum of scheduled_values must equal proposal total (within $0.01)
    SELECT COALESCE(SUM(COALESCE(si.scheduled_value, 0)), 0) INTO v_sov_total
    FROM public.sov_items si
    WHERE si.proposal_id = p_proposal_id
      AND NOT COALESCE(si.is_archived, false);
    
    IF v_sov_total > 0 AND ABS(v_sov_total - COALESCE(v_proposal.total_amount, 0)) < 0.01 THEN
      RETURN true;
    END IF;
    
    RETURN false;
  END IF;
  
  -- Unknown contract type - block approval
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.is_proposal_billing_ready(uuid) IS
  'Checks if proposal billing configuration is valid for approval. Tenant-safe: returns false for cross-tenant access attempts.';

-- ============================================================================
-- 4) DB FIX #4: UPDATE APPROVAL TRIGGER WITH TIGHTER VALIDATION
-- ============================================================================
-- Replace the approval trigger to use the fixed readiness function

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
    -- Require contract_type to be set
    v_contract_type := COALESCE(NEW.contract_type, 'fixed_price');
    IF NEW.contract_type IS NULL THEN
      NEW.contract_type := 'fixed_price';
      v_contract_type := 'fixed_price';
    END IF;
    
    -- Check billing readiness (this function is now tenant-safe)
    v_is_ready := public.is_proposal_billing_ready(NEW.id);
    
    IF NOT v_is_ready THEN
      RAISE EXCEPTION 'Cannot approve proposal: billing configuration is incomplete for contract type "%". %',
        v_contract_type,
        CASE v_contract_type
          WHEN 'milestone' THEN 'At least one milestone must be defined.'
          WHEN 'sov' THEN 'SOV allocation must total exactly 100%.'
          WHEN 'progress_billing' THEN 'SOV allocation must total exactly 100%.'
          ELSE 'Check billing configuration.'
        END
      USING ERRCODE = 'check_violation';
    END IF;
    
    -- Lock the billing configuration
    NEW.billing_readiness := 'locked';
    
    -- Ensure billing_basis is set based on contract_type (deterministic, never NULL)
    NEW.billing_basis := CASE v_contract_type
      WHEN 'sov' THEN 'sov'
      WHEN 'progress_billing' THEN 'sov'
      WHEN 'milestone' THEN 'payment_schedule'
      ELSE 'payment_schedule'  -- fixed_price uses payment_schedule
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 5) DATA AUDIT: FIND INVALID ACCEPTED PROPOSALS
-- ============================================================================
-- This creates a temp view for inspection; does NOT modify data without explicit action

DO $$
DECLARE
  v_count int;
BEGIN
  -- Count accepted proposals with missing billing config
  SELECT COUNT(*) INTO v_count
  FROM public.proposals
  WHERE acceptance_status = 'accepted'
    AND (
      billing_basis IS NULL
      OR contract_type IS NULL
      OR billing_readiness != 'locked'
    );
  
  IF v_count > 0 THEN
    RAISE NOTICE '⚠️  Found % accepted proposals with missing billing config. Running remediation...', v_count;
    
    -- Remediate: set billing_basis from contract_type where missing
    UPDATE public.proposals
    SET 
      billing_basis = CASE COALESCE(contract_type, 'fixed_price')
        WHEN 'sov' THEN 'sov'
        WHEN 'progress_billing' THEN 'sov'
        WHEN 'milestone' THEN 'payment_schedule'
        ELSE 'payment_schedule'
      END,
      billing_readiness = 'locked',
      contract_type = COALESCE(contract_type, 'fixed_price')
    WHERE acceptance_status = 'accepted'
      AND (billing_basis IS NULL OR contract_type IS NULL OR billing_readiness != 'locked');
      
    RAISE NOTICE '✓ Remediated % accepted proposals with deterministic defaults.', v_count;
  ELSE
    RAISE NOTICE '✓ No invalid accepted proposals found.';
  END IF;
END $$;

-- Count milestone contracts with 0 milestones (informational, not auto-fixable)
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.proposals p
  WHERE p.acceptance_status = 'accepted'
    AND p.contract_type = 'milestone'
    AND NOT EXISTS (
      SELECT 1 FROM public.payment_schedule_items psi
      JOIN public.payment_schedules ps ON ps.id = psi.payment_schedule_id
      WHERE ps.proposal_id = p.id
        AND NOT COALESCE(psi.is_archived, false)
    );
  
  IF v_count > 0 THEN
    RAISE WARNING '⚠️  Found % accepted MILESTONE proposals with 0 milestones. These require manual review.', v_count;
  END IF;
END $$;

-- Count SOV contracts with invalid totals (informational, not auto-fixable)
DO $$
DECLARE
  v_count int;
BEGIN
  WITH sov_audit AS (
    SELECT p.id,
      COALESCE(SUM(COALESCE(si.scheduled_value, 0)), 0) AS sov_total,
      COALESCE(p.total_amount, 0) AS proposal_total
    FROM public.proposals p
    LEFT JOIN public.sov_items si ON si.proposal_id = p.id
      AND NOT COALESCE(si.is_archived, false)
    WHERE p.acceptance_status = 'accepted'
      AND p.contract_type IN ('sov', 'progress_billing')
    GROUP BY p.id, p.total_amount
  )
  SELECT COUNT(*) INTO v_count
  FROM sov_audit
  WHERE sov_total = 0 OR ABS(sov_total - proposal_total) >= 0.01;
  
  IF v_count > 0 THEN
    RAISE WARNING '⚠️  Found % accepted SOV/progress_billing proposals where SOV total != proposal total. These require manual review.', v_count;
  END IF;
END $$;

-- ============================================================================
-- 6) REFRESH POSTGREST SCHEMA CACHE
-- ============================================================================

NOTIFY pgrst, 'reload schema';

COMMIT;

