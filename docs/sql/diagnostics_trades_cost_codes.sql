-- =========================================================
-- Trades → Cost Codes diagnostics (READ-ONLY QUERIES ONLY)
-- =========================================================

-- 1) check constraint definition
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'cost_codes_category_check';

-- 2) distinct category values + counts
SELECT category, COUNT(*)
FROM public.cost_codes
GROUP BY 1
ORDER BY 2 DESC;

-- 3) columns (information_schema)
SELECT table_name, ordinal_position, column_name, data_type, udt_name, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('trades','cost_codes')
ORDER BY table_name, ordinal_position;

-- 4) constraints on both tables
SELECT conname, conrelid::regclass AS table_name, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid::regclass::text IN ('public.cost_codes','public.trades')
ORDER BY table_name, conname;

-- 5) indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname='public' AND tablename IN ('trades','cost_codes')
ORDER BY tablename, indexname;

-- 6) broken trades (not exactly 0 or 3 cost codes)
SELECT t.id, t.name, t.company_id, COUNT(cc.*) AS cost_code_count
FROM public.trades t
LEFT JOIN public.cost_codes cc ON cc.trade_id = t.id
GROUP BY t.id, t.name, t.company_id
HAVING COUNT(cc.*) NOT IN (0,3)
ORDER BY cost_code_count DESC;

