-- Verification: Trades ↔ Cost Codes consistency (run in Supabase SQL editor)

-- 1) Trades missing 3 cost codes
SELECT
  t.id AS trade_id,
  t.name AS trade_name,
  COUNT(cc.id) AS cost_code_count
FROM public.trades t
LEFT JOIN public.cost_codes cc ON cc.trade_id = t.id
GROUP BY 1,2
HAVING COUNT(cc.id) <> 3
ORDER BY trade_name;

-- 2) Category distribution
SELECT category, COUNT(*)
FROM public.cost_codes
GROUP BY category
ORDER BY category;

-- 3) Inspect “Unassigned” trade + its codes
SELECT t.id, t.name, cc.id AS cost_code_id, cc.code, cc.category
FROM public.trades t
LEFT JOIN public.cost_codes cc ON cc.trade_id = t.id
WHERE lower(t.name) = 'unassigned'
ORDER BY cc.category NULLS LAST;

-- 4) Check enum values / category domain
SELECT enumlabel
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname='public' AND t.typname IN ('cost_code_category','cost_code_category_enum')
ORDER BY enumsortorder;


