-- ============================================================================
-- check_company_id.sql
-- Lists tables that likely need company_id for tenant isolation but don't have it
-- Heuristics: has project_id, customer_id, created_by, or is tenant-data-like
-- ============================================================================

WITH tenant_indicator_tables AS (
  -- Tables with columns that suggest tenant-scoped data
  SELECT DISTINCT table_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name IN ('project_id', 'customer_id', 'created_by', 'worker_id', 'sub_id', 'invoice_id', 'proposal_id')
),
tables_with_company_id AS (
  SELECT DISTINCT table_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'company_id'
),
known_tenant_tables AS (
  -- Known tables that should have company_id
  SELECT unnest(ARRAY[
    'projects', 'workers', 'subs', 'trades', 'cost_codes',
    'daily_logs', 'day_cards', 'scheduled_shifts', 'time_logs',
    'invoices', 'invoice_items', 'invoice_payments',
    'proposals', 'proposal_sections', 'proposal_section_items',
    'estimates', 'estimate_items',
    'documents', 'payments', 'material_receipts',
    'project_budgets', 'project_budget_lines', 'project_todos',
    'sub_contracts', 'sub_invoices', 'sub_payments', 'sub_logs',
    'change_orders', 'change_order_items',
    'activity_log', 'costs', 'customer_payments'
  ]) AS table_name
),
all_suspect_tables AS (
  SELECT table_name FROM tenant_indicator_tables
  UNION
  SELECT table_name FROM known_tenant_tables
)
SELECT 
  ast.table_name,
  CASE WHEN twc.table_name IS NOT NULL THEN '✅ Has company_id' ELSE '❌ MISSING company_id' END AS status,
  COALESCE(
    (SELECT string_agg(column_name, ', ')
     FROM information_schema.columns c
     WHERE c.table_schema = 'public' 
       AND c.table_name = ast.table_name
       AND c.column_name IN ('project_id', 'customer_id', 'created_by', 'worker_id', 'sub_id')
    ), '-'
  ) AS tenant_indicators
FROM all_suspect_tables ast
LEFT JOIN tables_with_company_id twc ON twc.table_name = ast.table_name
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables t 
  WHERE t.table_schema = 'public' AND t.table_name = ast.table_name
)
ORDER BY 
  CASE WHEN twc.table_name IS NULL THEN 0 ELSE 1 END,
  ast.table_name;

-- Summary
SELECT 
  '--- SUMMARY ---' AS info,
  COUNT(*) FILTER (WHERE twc.table_name IS NULL) AS missing_company_id,
  COUNT(*) AS total_checked
FROM all_suspect_tables ast
LEFT JOIN tables_with_company_id twc ON twc.table_name = ast.table_name
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables t 
  WHERE t.table_schema = 'public' AND t.table_name = ast.table_name
);
