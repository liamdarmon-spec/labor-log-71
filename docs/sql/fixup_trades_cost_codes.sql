-- ============================================================================
-- FIXUP (MANUAL): Trades → Cost Codes
-- ============================================================================
-- This script MAY contain DML. Run manually and review each step.
-- Rules:
-- - First report problems (invalid categories, orphans, broken trades)
-- - Normalize categories using the same mapping as the canonical migration
-- - Handle company_id NULL cost_codes WITHOUT guessing company_id
--   (detach trades defaults before deleting orphans)
-- - Do NOT silently regenerate trades with 1-2 codes; provide instructions
-- ============================================================================

-- 1) REPORT: invalid categories (should be empty after canonical migration)
SELECT category, COUNT(*)
FROM public.cost_codes
GROUP BY 1
ORDER BY 2 DESC;

-- 2) REPORT: invalid enum mapping would have failed earlier, but keep a sanity query
-- If category is still text for some reason, this will still show unexpected values.
SELECT DISTINCT category
FROM public.cost_codes
ORDER BY 1;

-- 3) REPORT: orphan cost_codes with NULL company_id
SELECT id, code, name, category, trade_id
FROM public.cost_codes
WHERE company_id IS NULL
ORDER BY code;

-- 4) REPORT: trades with broken cost code counts (expected 0 or 3)
SELECT t.id, t.name, t.company_id, COUNT(cc.*) AS cost_code_count
FROM public.trades t
LEFT JOIN public.cost_codes cc ON cc.trade_id = t.id
GROUP BY t.id, t.name, t.company_id
HAVING COUNT(cc.*) NOT IN (0,3)
ORDER BY cost_code_count DESC;

-- ============================================================================
-- SAFE FIXUPS (REVIEW BEFORE RUNNING)
-- ============================================================================

-- A) Normalize categories (only if category is still text in some environments)
-- If category is enum, this section will error; skip it.
-- UPDATE public.cost_codes
-- SET category = CASE
--   WHEN upper(trim(category::text)) IN ('LABOR','L') THEN 'labor'
--   WHEN upper(trim(category::text)) IN ('MATERIAL','MAT','M','MATERIALS') THEN 'material'
--   WHEN upper(trim(category::text)) IN ('SUB','SUBCONTRACTOR','VENDOR','S','SUBS') THEN 'sub'
--   ELSE category::text
-- END;

-- B) Handle orphan cost_codes with NULL company_id
-- DO NOT guess company_id. Instead:
-- 1) Detach any trades default_* pointers that reference these orphans
-- 2) Delete the orphan cost_codes
--
-- 1) DETACH defaults
-- UPDATE public.trades
-- SET
--   default_labor_cost_code_id = CASE WHEN default_labor_cost_code_id IN (SELECT id FROM public.cost_codes WHERE company_id IS NULL) THEN NULL ELSE default_labor_cost_code_id END,
--   default_material_cost_code_id = CASE WHEN default_material_cost_code_id IN (SELECT id FROM public.cost_codes WHERE company_id IS NULL) THEN NULL ELSE default_material_cost_code_id END,
--   default_sub_cost_code_id = CASE WHEN default_sub_cost_code_id IN (SELECT id FROM public.cost_codes WHERE company_id IS NULL) THEN NULL ELSE default_sub_cost_code_id END;
--
-- 2) DELETE orphans
-- DELETE FROM public.cost_codes WHERE company_id IS NULL;

-- C) Trades with 1-2 codes: instructions only (no silent regeneration)
-- For each trade_id returned by the broken-trades query:
-- - Decide whether to delete the partial cost_codes rows and then call:
--     SELECT public.ensure_trade_has_default_cost_codes('<trade_id>'::uuid);
-- - OR delete the trade entirely if it is junk.
-- This must be reviewed manually.


