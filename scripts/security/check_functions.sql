-- ============================================================================
-- check_functions.sql
-- Lists SECURITY DEFINER functions and flags potential issues:
-- - Missing SET search_path
-- - No tenant filtering (company_id check)
-- - Potentially unsafe patterns
-- ============================================================================

WITH definer_functions AS (
  SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_catalog.pg_get_function_arguments(p.oid) AS arguments,
    pg_catalog.pg_get_userbyid(p.proowner) AS owner,
    p.prosecdef AS is_security_definer,
    p.proconfig AS config,
    pg_catalog.pg_get_functiondef(p.oid) AS source
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.prosecdef = true
    AND n.nspname = 'public'
)
SELECT 
  schema_name,
  function_name,
  arguments,
  owner,
  -- Check for search_path
  CASE 
    WHEN source NOT LIKE '%SET search_path%' AND source NOT LIKE '%search_path = ''public''%'
    THEN '❌ NO search_path'
    ELSE '✅ Has search_path'
  END AS search_path_check,
  -- Check for tenant filtering
  CASE 
    WHEN function_name IN ('is_company_member', 'has_company_role', 'is_company_admin', 
                           'get_user_company_ids', 'get_user_worker_id', 'assert_company_member',
                           'current_user_id', 'handle_new_user')
    THEN '✅ Auth helper'
    WHEN source LIKE '%company_id%' OR source LIKE '%is_company_member%' OR source LIKE '%assert_company%'
    THEN '✅ Has tenant check'
    WHEN source LIKE '%SELECT%FROM%public.%' OR source LIKE '%UPDATE%public.%' OR source LIKE '%DELETE%public.%'
    THEN '⚠️  Accesses tables (verify tenant filter)'
    ELSE '🟡 Review needed'
  END AS tenant_check,
  -- Config summary
  CASE 
    WHEN config IS NULL THEN 'No config'
    ELSE array_to_string(config, ', ')
  END AS function_config,
  -- First 200 chars of source for reference
  SUBSTRING(source, 1, 200) AS source_preview
FROM definer_functions
ORDER BY 
  CASE 
    WHEN source NOT LIKE '%SET search_path%' THEN 0
    ELSE 1
  END,
  function_name;

-- Summary
SELECT 
  '--- SUMMARY ---' AS info,
  COUNT(*) AS total_definer_functions,
  COUNT(*) FILTER (WHERE source NOT LIKE '%SET search_path%' AND source NOT LIKE '%search_path = ''public''%') AS missing_search_path,
  COUNT(*) FILTER (WHERE source NOT LIKE '%company_id%' AND source NOT LIKE '%is_company_member%' AND source NOT LIKE '%assert_company%'
                   AND function_name NOT IN ('is_company_member', 'has_company_role', 'is_company_admin', 'get_user_company_ids', 'get_user_worker_id', 'assert_company_member', 'current_user_id', 'handle_new_user')
                   AND (source LIKE '%SELECT%FROM%public.%' OR source LIKE '%UPDATE%public.%' OR source LIKE '%DELETE%public.%')) AS potential_tenant_bypass
FROM definer_functions;
