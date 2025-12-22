-- ============================================================================
-- check_rls.sql
-- Lists all tables in public schema that do NOT have RLS enabled
-- ============================================================================

SELECT 
  c.relname AS table_name,
  CASE WHEN c.relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END AS rls_status,
  pg_catalog.pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'  -- ordinary tables only
  AND c.relrowsecurity = false
  -- Exclude known system/config tables that don't need RLS
  AND c.relname NOT IN (
    'schema_migrations',
    'spatial_ref_sys',
    'geography_columns',
    'geometry_columns'
  )
ORDER BY c.relname;
