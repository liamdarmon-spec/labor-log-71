BEGIN;

-- Ensure invoice classification cannot silently corrupt contract KPIs:
-- - source_type defaults to 'manual' when omitted
-- - invoice_type defaults to 'standard' when omitted (already present in most envs)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invoices' AND column_name='source_type'
  ) THEN
    ALTER TABLE public.invoices
      ALTER COLUMN source_type SET DEFAULT 'manual';
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invoices' AND column_name='invoice_type'
  ) THEN
    ALTER TABLE public.invoices
      ALTER COLUMN invoice_type SET DEFAULT 'standard';
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- Backfill existing NULL source_type to 'manual' (safe: preserves current behavior but prevents future drift)
UPDATE public.invoices
SET source_type = 'manual'
WHERE source_type IS NULL;

DO $$
BEGIN
  PERFORM pg_notify('pgrst','reload schema');
EXCEPTION WHEN others THEN
  NULL;
END $$;

COMMIT;


