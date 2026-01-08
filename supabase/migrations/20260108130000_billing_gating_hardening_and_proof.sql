-- ============================================================================
-- BILLING GATING HARDENING & PROOF
-- ============================================================================
--
-- THIS MIGRATION:
-- 1) Makes approved_at canonical and ensures it's always set on approval
-- 2) Enforces milestone totals must equal proposal total_amount
-- 3) Secures escape hatch with audit logging
-- 4) Adds self-test functions for verification
--
-- CANONICAL APPROVAL SIGNAL:
--   - proposals.approved_at (timestamptz) is the canonical approval timestamp
--   - proposals.acceptance_status = 'accepted' is the canonical status flag
--   - Both MUST be set together on approval
--   - triggers enforce this invariant
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) ENSURE approved_at COLUMN EXISTS AND IS CANONICAL
-- ============================================================================

-- Add approved_at if missing (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE public.proposals ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

-- Backfill approved_at for any accepted proposals that are missing it
UPDATE public.proposals
SET approved_at = COALESCE(approved_at, updated_at, now())
WHERE acceptance_status = 'accepted'
  AND approved_at IS NULL;

-- ============================================================================
-- 2) CREATE BILLING REVISION AUDIT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.billing_revision_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  user_id uuid,
  company_id uuid,
  reason text NOT NULL,
  operation text NOT NULL, -- 'insert', 'update', 'delete'
  table_name text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_revision_audit_proposal ON public.billing_revision_audit(proposal_id);
CREATE INDEX IF NOT EXISTS idx_billing_revision_audit_company ON public.billing_revision_audit(company_id);

ALTER TABLE public.billing_revision_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON public.billing_revision_audit;
CREATE POLICY tenant_select ON public.billing_revision_audit
FOR SELECT TO authenticated USING (company_id = ANY(public.authed_company_ids()));

-- ============================================================================
-- 3) UPDATE READINESS FUNCTION: ENFORCE MILESTONE TOTALS
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
  v_auth_companies uuid[];
  v_contract_type text;
  v_milestone_count int;
  v_milestone_total numeric;
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
  
  -- Milestone requires:
  --   1) At least one non-archived payment schedule item
  --   2) Sum of milestone amounts equals proposal total (within $0.01)
  IF v_contract_type = 'milestone' THEN
    SELECT COUNT(*), COALESCE(SUM(COALESCE(psi.scheduled_amount, 0)), 0)
    INTO v_milestone_count, v_milestone_total
    FROM public.payment_schedule_items psi
    JOIN public.payment_schedules ps ON ps.id = psi.payment_schedule_id
    WHERE ps.proposal_id = p_proposal_id
      AND NOT COALESCE(psi.is_archived, false);
    
    -- Must have at least one milestone
    IF v_milestone_count = 0 THEN
      RETURN false;
    END IF;
    
    -- Milestone total must equal proposal total (within $0.01)
    IF ABS(v_milestone_total - COALESCE(v_proposal.total_amount, 0)) > 0.01 THEN
      RETURN false;
    END IF;
    
    RETURN true;
  END IF;
  
  -- SOV / progress_billing requires:
  --   Sum of scheduled_values equals proposal total (within $0.01)
  IF v_contract_type IN ('sov', 'progress_billing') THEN
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
  'Checks if proposal billing configuration is valid for approval. Enforces: fixed_price=always ready, milestone=sum must equal total, sov=sum must equal total. Tenant-safe.';

-- ============================================================================
-- 4) UPDATE APPROVAL TRIGGER: SET approved_at CANONICALLY
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
  v_milestone_total numeric;
  v_sov_total numeric;
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
    
    -- Check billing readiness
    v_is_ready := public.is_proposal_billing_ready(NEW.id);
    
    IF NOT v_is_ready THEN
      -- Get specifics for better error message
      IF v_contract_type = 'milestone' THEN
        SELECT COALESCE(SUM(COALESCE(psi.scheduled_amount, 0)), 0)
        INTO v_milestone_total
        FROM public.payment_schedule_items psi
        JOIN public.payment_schedules ps ON ps.id = psi.payment_schedule_id
        WHERE ps.proposal_id = NEW.id
          AND NOT COALESCE(psi.is_archived, false);
        
        RAISE EXCEPTION 'Cannot approve milestone proposal: milestone sum ($%) does not equal proposal total ($%). Difference: $%',
          COALESCE(v_milestone_total, 0),
          COALESCE(NEW.total_amount, 0),
          ABS(COALESCE(v_milestone_total, 0) - COALESCE(NEW.total_amount, 0))
        USING ERRCODE = 'check_violation';
      ELSIF v_contract_type IN ('sov', 'progress_billing') THEN
        SELECT COALESCE(SUM(COALESCE(si.scheduled_value, 0)), 0)
        INTO v_sov_total
        FROM public.sov_items si
        WHERE si.proposal_id = NEW.id
          AND NOT COALESCE(si.is_archived, false);
        
        RAISE EXCEPTION 'Cannot approve SOV proposal: SOV sum ($%) does not equal proposal total ($%). Difference: $%',
          COALESCE(v_sov_total, 0),
          COALESCE(NEW.total_amount, 0),
          ABS(COALESCE(v_sov_total, 0) - COALESCE(NEW.total_amount, 0))
        USING ERRCODE = 'check_violation';
      ELSE
        RAISE EXCEPTION 'Cannot approve proposal: billing configuration incomplete for contract type "%"',
          v_contract_type
        USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    
    -- CANONICAL: Set both flags together
    NEW.billing_readiness := 'locked';
    NEW.approved_at := COALESCE(NEW.approved_at, now());
    NEW.acceptance_status := 'accepted';
    
    -- Ensure billing_basis is set deterministically
    NEW.billing_basis := CASE v_contract_type
      WHEN 'sov' THEN 'sov'
      WHEN 'progress_billing' THEN 'sov'
      WHEN 'milestone' THEN 'payment_schedule'
      ELSE 'payment_schedule'
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_enforce_proposal_billing_on_approval() IS
  'Enforces billing readiness before approval. Sets approved_at, acceptance_status, billing_readiness, billing_basis atomically.';

-- ============================================================================
-- 5) SECURED ESCAPE HATCH RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_billing_revision(
  p_proposal_id uuid,
  p_operation text,
  p_table_name text,
  p_reason text,
  p_payload jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proposal public.proposals;
  v_auth_companies uuid[];
  v_user_id uuid;
BEGIN
  -- Get proposal
  SELECT * INTO v_proposal FROM public.proposals WHERE id = p_proposal_id;
  
  IF v_proposal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Proposal not found');
  END IF;
  
  -- Check tenant membership
  v_auth_companies := public.authed_company_ids();
  IF NOT (v_proposal.company_id = ANY(v_auth_companies)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Verify proposal is accepted (escape hatch only for accepted proposals)
  IF v_proposal.acceptance_status != 'accepted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Escape hatch only needed for accepted proposals');
  END IF;
  
  -- Require reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required for billing revision');
  END IF;
  
  v_user_id := auth.uid();
  
  -- Log the revision request
  INSERT INTO public.billing_revision_audit (
    proposal_id,
    user_id,
    company_id,
    reason,
    operation,
    table_name,
    payload,
    created_at
  ) VALUES (
    p_proposal_id,
    v_user_id,
    v_proposal.company_id,
    p_reason,
    p_operation,
    p_table_name,
    p_payload,
    now()
  );
  
  -- Set the escape hatch for this transaction only
  PERFORM set_config('app.billing_revision_mode', 'on', true);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Escape hatch enabled for this transaction. Execute your changes now.',
    'audit_logged', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_billing_revision(uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_billing_revision(uuid, text, text, text, jsonb) TO authenticated;

COMMENT ON FUNCTION public.apply_billing_revision(uuid, text, text, text, jsonb) IS
  'Enables billing_revision_mode escape hatch for this transaction only. Logs to billing_revision_audit. Use for change order application.';

-- ============================================================================
-- 6) SELF-TEST FUNCTIONS FOR VERIFICATION
-- ============================================================================

-- Test function: Verify INSERT gating works
CREATE OR REPLACE FUNCTION public.test_billing_insert_gating()
RETURNS TABLE (
  test_name text,
  passed boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_test_id uuid := gen_random_uuid();
  v_error text;
BEGIN
  -- Test 1: INSERT accepted milestone proposal should fail
  test_name := 'INSERT accepted milestone proposal without milestones';
  BEGIN
    INSERT INTO public.proposals (
      id, project_id, title, status, acceptance_status, contract_type, company_id
    ) VALUES (
      v_test_id,
      (SELECT id FROM public.projects LIMIT 1),
      'TEST - DELETE ME',
      'accepted',
      'accepted',
      'milestone',
      (SELECT company_id FROM public.projects LIMIT 1)
    );
    passed := false;
    message := 'FAIL: INSERT should have been blocked but succeeded';
  EXCEPTION WHEN check_violation THEN
    passed := true;
    message := 'PASS: INSERT correctly blocked with: ' || SQLERRM;
  WHEN others THEN
    passed := false;
    message := 'UNEXPECTED: ' || SQLERRM;
  END;
  RETURN NEXT;
  
  -- Test 2: INSERT accepted fixed_price proposal should succeed (then cleanup)
  test_name := 'INSERT accepted fixed_price proposal';
  BEGIN
    INSERT INTO public.proposals (
      id, project_id, title, status, acceptance_status, contract_type, company_id
    ) VALUES (
      v_test_id,
      (SELECT id FROM public.projects LIMIT 1),
      'TEST - DELETE ME',
      'accepted',
      'accepted',
      'fixed_price',
      (SELECT company_id FROM public.projects LIMIT 1)
    );
    DELETE FROM public.proposals WHERE id = v_test_id;
    passed := true;
    message := 'PASS: INSERT succeeded for fixed_price';
  EXCEPTION WHEN others THEN
    passed := false;
    message := 'FAIL: ' || SQLERRM;
  END;
  RETURN NEXT;
  
  RETURN;
END;
$$;

-- Test function: Verify UPDATE gating works
CREATE OR REPLACE FUNCTION public.test_billing_update_gating()
RETURNS TABLE (
  test_name text,
  passed boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_test_id uuid := gen_random_uuid();
  v_project_id uuid;
  v_company_id uuid;
BEGIN
  -- Setup: create a draft proposal
  SELECT id, company_id INTO v_project_id, v_company_id FROM public.projects LIMIT 1;
  
  INSERT INTO public.proposals (
    id, project_id, title, status, acceptance_status, contract_type, company_id, total_amount
  ) VALUES (
    v_test_id, v_project_id, 'TEST - DELETE ME', 'draft', 'pending', 'milestone', v_company_id, 1000
  );
  
  -- Test 1: UPDATE to accepted without milestones should fail
  test_name := 'UPDATE to accepted without milestones';
  BEGIN
    UPDATE public.proposals SET acceptance_status = 'accepted' WHERE id = v_test_id;
    passed := false;
    message := 'FAIL: UPDATE should have been blocked but succeeded';
  EXCEPTION WHEN check_violation THEN
    passed := true;
    message := 'PASS: UPDATE correctly blocked with: ' || SQLERRM;
  WHEN others THEN
    passed := false;
    message := 'UNEXPECTED: ' || SQLERRM;
  END;
  RETURN NEXT;
  
  -- Cleanup
  DELETE FROM public.proposals WHERE id = v_test_id;
  
  RETURN;
END;
$$;

-- Test function: Verify post-acceptance mutation is blocked
CREATE OR REPLACE FUNCTION public.test_post_acceptance_mutation_blocked()
RETURNS TABLE (
  test_name text,
  passed boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proposal_id uuid;
  v_schedule_id uuid;
  v_item_id uuid;
BEGIN
  -- Find an accepted proposal with milestones
  SELECT p.id INTO v_proposal_id
  FROM public.proposals p
  WHERE p.acceptance_status = 'accepted'
    AND p.contract_type = 'milestone'
  LIMIT 1;
  
  IF v_proposal_id IS NULL THEN
    test_name := 'Find accepted milestone proposal';
    passed := false;
    message := 'SKIP: No accepted milestone proposal found for testing';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Get a schedule item
  SELECT ps.id, psi.id INTO v_schedule_id, v_item_id
  FROM public.payment_schedules ps
  JOIN public.payment_schedule_items psi ON psi.payment_schedule_id = ps.id
  WHERE ps.proposal_id = v_proposal_id
  LIMIT 1;
  
  IF v_item_id IS NULL THEN
    test_name := 'Find milestone item';
    passed := false;
    message := 'SKIP: No milestone items found for testing';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Test: UPDATE milestone should fail
  test_name := 'UPDATE milestone after acceptance';
  BEGIN
    UPDATE public.payment_schedule_items 
    SET scheduled_amount = scheduled_amount + 1
    WHERE id = v_item_id;
    passed := false;
    message := 'FAIL: UPDATE should have been blocked but succeeded';
    -- Rollback the change
    UPDATE public.payment_schedule_items 
    SET scheduled_amount = scheduled_amount - 1
    WHERE id = v_item_id;
  EXCEPTION WHEN check_violation THEN
    passed := true;
    message := 'PASS: UPDATE correctly blocked with: ' || SQLERRM;
  WHEN others THEN
    passed := false;
    message := 'UNEXPECTED: ' || SQLERRM;
  END;
  RETURN NEXT;
  
  -- Test: DELETE milestone should fail
  test_name := 'DELETE milestone after acceptance';
  BEGIN
    DELETE FROM public.payment_schedule_items WHERE id = v_item_id;
    passed := false;
    message := 'FAIL: DELETE should have been blocked but succeeded';
  EXCEPTION WHEN check_violation THEN
    passed := true;
    message := 'PASS: DELETE correctly blocked with: ' || SQLERRM;
  WHEN others THEN
    passed := false;
    message := 'UNEXPECTED: ' || SQLERRM;
  END;
  RETURN NEXT;
  
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_billing_insert_gating() TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_billing_update_gating() TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_post_acceptance_mutation_blocked() TO authenticated;

COMMENT ON FUNCTION public.test_billing_insert_gating() IS 'Self-test: verify INSERT gating on proposals';
COMMENT ON FUNCTION public.test_billing_update_gating() IS 'Self-test: verify UPDATE gating on proposals';
COMMENT ON FUNCTION public.test_post_acceptance_mutation_blocked() IS 'Self-test: verify post-acceptance mutation is blocked';

-- ============================================================================
-- 7) REFRESH POSTGREST SCHEMA CACHE
-- ============================================================================

NOTIFY pgrst, 'reload schema';

COMMIT;

