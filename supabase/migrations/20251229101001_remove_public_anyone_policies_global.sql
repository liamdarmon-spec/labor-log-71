-- GLOBAL broom: remove permissive {public} policies named "Anyone can ..."
-- across ALL public schema tables, except allowlisted tables.
--
-- Why: policies are OR'd; any {public} policy makes RLS basically meaningless.

DO $$
DECLARE
  r record;
  allowlist text[] := ARRAY[
    'measurement_units' -- keep if you want public read for units; adjust if not
  ];
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'Anyone can %'
      AND NOT (tablename = ANY (allowlist))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END
$$;

