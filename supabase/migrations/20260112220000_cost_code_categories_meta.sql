BEGIN;

-- cost_code_categories_meta: DB-sourced category metadata for cost_codes.category
-- Exposes enum ordering deterministically via ordinality.
CREATE OR REPLACE VIEW public.cost_code_categories_meta AS
WITH enum_vals AS (
  SELECT
    (e.key)::text AS key,
    e.ord::int AS sort_order
  FROM unnest(enum_range(NULL::public.cost_code_category)) WITH ORDINALITY AS e(key, ord)
)
SELECT
  v.key,
  CASE v.key
    WHEN 'labor' THEN 'Labor'
    WHEN 'material' THEN 'Material'
    WHEN 'sub' THEN 'Sub'
    ELSE initcap(v.key)
  END AS label,
  CASE v.key
    WHEN 'labor' THEN 'bg-blue-500/10 text-blue-700 border-blue-200'
    WHEN 'material' THEN 'bg-green-500/10 text-green-700 border-green-200'
    WHEN 'sub' THEN 'bg-orange-500/10 text-orange-700 border-orange-200'
    ELSE 'bg-gray-500/10 text-gray-700 border-gray-200'
  END AS color,
  v.sort_order
FROM enum_vals v
ORDER BY v.sort_order;

REVOKE ALL ON public.cost_code_categories_meta FROM PUBLIC;
GRANT SELECT ON public.cost_code_categories_meta TO authenticated;
GRANT SELECT ON public.cost_code_categories_meta TO service_role;

DO $$
BEGIN
  PERFORM pg_notify('pgrst','reload schema');
EXCEPTION WHEN others THEN
  NULL;
END $$;

COMMIT;


