-- Billing proof queries (run in Supabase SQL editor)

-- 1) Accepted proposals missing contract fields
SELECT
  p.id,
  p.company_id,
  p.project_id,
  p.contract_type,
  p.billing_basis,
  p.billing_readiness,
  p.total_amount,
  p.approved_at
FROM public.proposals p
WHERE p.acceptance_status = 'accepted'
  AND (
    p.contract_type IS NULL
    OR p.billing_basis IS NULL
    OR p.billing_readiness IS DISTINCT FROM 'locked'
    OR p.approved_at IS NULL
  )
ORDER BY p.approved_at DESC NULLS LAST;

-- 2) Accepted milestone proposals without schedule rows OR wrong total
SELECT
  p.id,
  p.project_id,
  p.total_amount,
  COUNT(psi.id) AS milestone_count,
  COALESCE(SUM(COALESCE(psi.scheduled_amount, 0)), 0) AS milestone_total
FROM public.proposals p
LEFT JOIN public.payment_schedules ps ON ps.proposal_id = p.id
LEFT JOIN public.payment_schedule_items psi ON psi.payment_schedule_id = ps.id
  AND NOT COALESCE(psi.is_archived, false)
WHERE p.acceptance_status = 'accepted'
  AND p.contract_type = 'milestone'
GROUP BY p.id, p.project_id, p.total_amount
HAVING COUNT(psi.id) = 0 OR ABS(COALESCE(SUM(COALESCE(psi.scheduled_amount, 0)), 0) - COALESCE(p.total_amount, 0)) > 0.01;

-- 3) Accepted SOV / progress_billing proposals where SOV total != proposal total (tolerance $0.01)
SELECT
  p.id,
  p.project_id,
  p.total_amount,
  COUNT(si.id) AS sov_count,
  COALESCE(SUM(COALESCE(si.scheduled_value, 0)), 0) AS sov_total,
  (COALESCE(SUM(COALESCE(si.scheduled_value, 0)), 0) - COALESCE(p.total_amount, 0)) AS delta
FROM public.proposals p
LEFT JOIN public.sov_items si
  ON si.proposal_id = p.id
 AND NOT COALESCE(si.is_archived, false)
WHERE p.acceptance_status = 'accepted'
  AND p.contract_type IN ('sov', 'progress_billing')
GROUP BY p.id, p.project_id, p.total_amount
HAVING COUNT(si.id) = 0 OR ABS(COALESCE(SUM(COALESCE(si.scheduled_value, 0)), 0) - COALESCE(p.total_amount, 0)) >= 0.01;

-- 4) List triggers on proposals/payment_schedules/payment_schedule_items/sov_items
SELECT
  c.relname AS table_name,
  t.tgname AS trigger_name,
  p.proname AS function_name,
  pg_get_triggerdef(t.oid) AS trigger_def,
  t.tgenabled AS enabled
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND c.relname IN ('proposals','payment_schedules','payment_schedule_items','sov_items')
ORDER BY c.relname, t.tgname;

-- 5) List RLS policies for proposals, invoices, customer_payments, change_orders
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('proposals','invoices','customer_payments','change_orders')
ORDER BY tablename, policyname;

-- 6) Verify get_invoices_summary exists and returns expected columns
SELECT
  n.nspname AS schema,
  p.proname AS name,
  pg_get_function_identity_arguments(p.oid) AS args,
  pg_get_function_result(p.oid) AS returns
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_invoices_summary'
ORDER BY args;


