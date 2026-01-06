-- ============================================================================
-- DIAGNOSTICS: Trades → Cost Codes System Audit
-- ============================================================================
-- Run in Supabase SQL Editor to inspect current state.
-- This is READ-ONLY - no modifications.
-- ============================================================================

-- 1) Check constraint definition for cost_codes.category
SELECT 
  'cost_codes_category_check' as check_name,
  conname, 
  pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint 
WHERE conname = 'cost_codes_category_check';

-- 2) List distinct category values with counts
SELECT 
  category, 
  COUNT(*) as count
FROM public.cost_codes 
GROUP BY 1 
ORDER BY 2 DESC;

-- 3) Describe columns for trades and cost_codes
SELECT 
  table_name,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('trades', 'cost_codes', 'company_trades') 
ORDER BY table_name, ordinal_position;

-- 4) List all constraints on cost_codes and trades
SELECT 
  conname as constraint_name, 
  conrelid::regclass AS table_name, 
  contype as type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid::regclass::text IN ('public.cost_codes', 'public.trades', 'public.company_trades') 
ORDER BY table_name, conname;

-- 5) List indexes on trades and cost_codes
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('trades', 'cost_codes', 'company_trades') 
ORDER BY tablename, indexname;

-- 6) Detect "broken trades" (not exactly 0 or 3 codes) - using trades table
SELECT 
  t.id, 
  t.name, 
  COUNT(cc.*) AS cost_code_count
FROM public.trades t
LEFT JOIN public.cost_codes cc ON cc.trade_id = t.id
GROUP BY t.id, t.name
HAVING COUNT(cc.*) NOT IN (0, 3)
ORDER BY cost_code_count DESC;

-- 7) Detect "broken company_trades" (not exactly 0 or 3 codes)
SELECT 
  ct.id, 
  ct.name,
  ct.company_id,
  COUNT(cc.*) AS cost_code_count
FROM public.company_trades ct
LEFT JOIN public.cost_codes cc ON cc.company_trade_id = ct.id
GROUP BY ct.id, ct.name, ct.company_id
HAVING COUNT(cc.*) NOT IN (0, 3)
ORDER BY cost_code_count DESC;

-- 8) Check for orphan cost_codes (NULL company_id)
SELECT 
  id, 
  code, 
  name, 
  category, 
  trade_id,
  company_trade_id
FROM public.cost_codes 
WHERE company_id IS NULL;

-- 9) Check for invalid categories (not in canonical set)
SELECT 
  id, 
  code, 
  name, 
  category
FROM public.cost_codes 
WHERE category NOT IN ('labor', 'material', 'sub', 'materials', 'subs', 'other');

-- 10) Check if trades table is tenant-scoped (has company_id)
SELECT 
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'trades' 
      AND column_name = 'company_id'
  ) as trades_has_company_id;

-- 11) Summary: cost codes per category
SELECT 
  category,
  COUNT(*) as total,
  COUNT(DISTINCT company_id) as unique_companies,
  COUNT(CASE WHEN company_trade_id IS NOT NULL THEN 1 END) as linked_to_company_trade,
  COUNT(CASE WHEN trade_id IS NOT NULL THEN 1 END) as linked_to_trade
FROM public.cost_codes
GROUP BY category
ORDER BY category;

-- 12) Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('trades', 'cost_codes', 'company_trades')
ORDER BY tablename;

-- 13) List RLS policies
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
  AND tablename IN ('trades', 'cost_codes', 'company_trades')
ORDER BY tablename, policyname;

