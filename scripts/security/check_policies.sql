-- ============================================================================
-- check_policies.sql
-- Lists potentially open/unsafe RLS policies in public schema
-- Detects: USING(true), WITH CHECK(true), "Anyone can" patterns
-- ============================================================================

-- Find policies with open USING or WITH CHECK clauses
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text AS roles,
  cmd,
  CASE 
    WHEN qual::text = 'true' THEN '⚠️  OPEN: USING(true)'
    WHEN qual::text LIKE '%true%' AND qual::text NOT LIKE '%is_company%' THEN '⚠️  SUSPICIOUS: contains true'
    ELSE SUBSTRING(qual::text, 1, 60)
  END AS using_clause,
  CASE 
    WHEN with_check::text = 'true' THEN '⚠️  OPEN: WITH CHECK(true)'
    WHEN with_check::text LIKE '%true%' AND with_check::text NOT LIKE '%is_company%' THEN '⚠️  SUSPICIOUS'
    ELSE SUBSTRING(with_check::text, 1, 60)
  END AS with_check_clause,
  CASE
    WHEN roles::text LIKE '%service_role%' THEN 'OK (service_role)'
    WHEN qual::text = 'true' OR with_check::text = 'true' THEN '🔴 CRITICAL'
    WHEN policyname LIKE 'Anyone can%' THEN '🔴 CRITICAL'
    WHEN qual::text NOT LIKE '%company%' AND qual::text NOT LIKE '%auth.uid%' THEN '🟡 WARNING'
    ELSE '✅ OK'
  END AS severity
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY 
  CASE 
    WHEN qual::text = 'true' OR with_check::text = 'true' THEN 0
    WHEN policyname LIKE 'Anyone can%' THEN 1
    ELSE 2
  END,
  tablename,
  policyname;

-- Summary count
SELECT 
  '--- SUMMARY ---' AS info,
  COUNT(*) FILTER (WHERE qual::text = 'true' OR with_check::text = 'true') AS open_policies,
  COUNT(*) FILTER (WHERE policyname LIKE 'Anyone can%') AS anyone_can_policies,
  COUNT(*) AS total_policies
FROM pg_policies
WHERE schemaname = 'public';
