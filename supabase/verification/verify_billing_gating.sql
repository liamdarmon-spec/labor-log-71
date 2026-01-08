-- ============================================================================
-- BILLING GATING VERIFICATION SCRIPT
-- ============================================================================
-- Copy-paste this entire script into Supabase SQL Editor to verify all
-- billing gating guarantees are enforced at the DB level.
--
-- PREREQUISITES:
--   - You must be authenticated (run as a logged-in user with company access)
--   - At least one project must exist in your tenant
--
-- EXPECTED RESULTS:
--   All tests should show "passed: true"
-- ============================================================================

-- ============================================================================
-- PART 0: SHOW CURRENT TRIGGER STATE
-- ============================================================================

SELECT '=== PART 0: TRIGGER DEFINITIONS ===' as section;

SELECT 
  c.relname as table_name,
  t.tgname as trigger_name,
  CASE t.tgenabled
    WHEN 'O' THEN '✓ enabled (origin)'
    WHEN 'D' THEN '✗ DISABLED'
    WHEN 'R' THEN '✓ enabled (replica)'
    WHEN 'A' THEN '✓ enabled (always)'
    ELSE t.tgenabled::text
  END AS status
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('proposals', 'payment_schedules', 'payment_schedule_items', 'sov_items')
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- PART 1: VERIFY INSERT GATING
-- ============================================================================

SELECT '=== PART 1: INSERT GATING TESTS ===' as section;
SELECT * FROM public.test_billing_insert_gating();

-- ============================================================================
-- PART 2: VERIFY UPDATE GATING
-- ============================================================================

SELECT '=== PART 2: UPDATE GATING TESTS ===' as section;
SELECT * FROM public.test_billing_update_gating();

-- ============================================================================
-- PART 3: VERIFY POST-ACCEPTANCE MUTATION BLOCKED
-- ============================================================================

SELECT '=== PART 3: POST-ACCEPTANCE MUTATION TESTS ===' as section;
SELECT * FROM public.test_post_acceptance_mutation_blocked();

-- ============================================================================
-- PART 4: VERIFY DATA INTEGRITY
-- ============================================================================

SELECT '=== PART 4: DATA INTEGRITY CHECKS ===' as section;

-- 4a: Find accepted proposals with missing fields
SELECT 'Accepted proposals with missing billing config' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END as result
FROM public.proposals
WHERE acceptance_status = 'accepted'
  AND (
    contract_type IS NULL
    OR billing_basis IS NULL
    OR billing_readiness IS DISTINCT FROM 'locked'
    OR approved_at IS NULL
  );

-- 4b: Find milestone contracts with 0 milestones
SELECT 'Accepted milestone proposals with 0 milestones' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '⚠️ WARNING' END as result
FROM public.proposals p
WHERE p.acceptance_status = 'accepted'
  AND p.contract_type = 'milestone'
  AND NOT EXISTS (
    SELECT 1 FROM public.payment_schedule_items psi
    JOIN public.payment_schedules ps ON ps.id = psi.payment_schedule_id
    WHERE ps.proposal_id = p.id
      AND NOT COALESCE(psi.is_archived, false)
  );

-- 4c: Find milestone contracts where sum != total
SELECT 'Accepted milestone proposals where sum != total' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '⚠️ WARNING' END as result
FROM (
  SELECT p.id,
    COALESCE(SUM(COALESCE(psi.scheduled_amount, 0)), 0) as milestone_sum,
    COALESCE(p.total_amount, 0) as proposal_total
  FROM public.proposals p
  LEFT JOIN public.payment_schedules ps ON ps.proposal_id = p.id
  LEFT JOIN public.payment_schedule_items psi ON psi.payment_schedule_id = ps.id
    AND NOT COALESCE(psi.is_archived, false)
  WHERE p.acceptance_status = 'accepted'
    AND p.contract_type = 'milestone'
  GROUP BY p.id, p.total_amount
  HAVING ABS(COALESCE(SUM(COALESCE(psi.scheduled_amount, 0)), 0) - COALESCE(p.total_amount, 0)) > 0.01
) bad_milestones;

-- 4d: Find SOV contracts where sum != total
SELECT 'Accepted SOV proposals where sum != total' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '⚠️ WARNING' END as result
FROM (
  SELECT p.id,
    COALESCE(SUM(COALESCE(si.scheduled_value, 0)), 0) as sov_sum,
    COALESCE(p.total_amount, 0) as proposal_total
  FROM public.proposals p
  LEFT JOIN public.sov_items si ON si.proposal_id = p.id
    AND NOT COALESCE(si.is_archived, false)
  WHERE p.acceptance_status = 'accepted'
    AND p.contract_type IN ('sov', 'progress_billing')
  GROUP BY p.id, p.total_amount
  HAVING COALESCE(SUM(COALESCE(si.scheduled_value, 0)), 0) = 0 
     OR ABS(COALESCE(SUM(COALESCE(si.scheduled_value, 0)), 0) - COALESCE(p.total_amount, 0)) > 0.01
) bad_sov;

-- ============================================================================
-- PART 5: VERIFY FUNCTIONS EXIST
-- ============================================================================

SELECT '=== PART 5: FUNCTION VERIFICATION ===' as section;

SELECT 
  p.proname as function_name,
  CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security,
  '✓ EXISTS' as status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_proposal_billing_ready',
    'is_proposal_accepted',
    'tg_enforce_proposal_billing_on_insert',
    'tg_enforce_proposal_billing_on_approval',
    'tg_prevent_contract_type_change_after_approval',
    'tg_block_billing_schedule_mutation_after_acceptance',
    'tg_block_sov_mutation_after_acceptance',
    'apply_billing_revision',
    'test_billing_insert_gating',
    'test_billing_update_gating',
    'test_post_acceptance_mutation_blocked'
  )
ORDER BY p.proname;

-- ============================================================================
-- PART 6: VERIFY AUDIT TABLE EXISTS
-- ============================================================================

SELECT '=== PART 6: AUDIT TABLE VERIFICATION ===' as section;

SELECT 
  'billing_revision_audit' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'billing_revision_audit'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '=== VERIFICATION COMPLETE ===' as section;
SELECT 'If all tests show ✓ PASS and all functions/tables exist, billing gating is enforced.' as summary;

