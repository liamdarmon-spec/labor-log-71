-- ============================================================================
-- db: canonical UNASSIGNED cost code (tenant-scoped, trade-linked)
-- ============================================================================
-- Purpose:
-- Some flows create records before a user selects a cost code (bulk logging, migrations).
-- Historically they used a global `code = 'UNASSIGNED'` row.
--
-- Canonical requirement:
-- - must be tenant-scoped (company_id)
-- - must be trade-linked (trade_id NOT NULL)
-- - must not be legacy (is_legacy=false)
-- - must be active (is_active=true)
-- - category must be canonical (labor/material/sub)
--
-- Strategy:
-- - Ensure each company has a trade named 'Unassigned'
-- - Ensure each company has a canonical cost code `code='UNASSIGNED'` (category='labor')
--   linked to that trade
-- - Reattach any existing UNASSIGNED codes that were orphaned
-- ============================================================================

BEGIN;

-- Ensure required columns exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cost_codes' AND column_name='is_legacy'
  ) THEN
    ALTER TABLE public.cost_codes ADD COLUMN is_legacy boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create per-company "Unassigned" trade if missing
DO $$
DECLARE
  r record;
  v_trade_id uuid;
BEGIN
  FOR r IN SELECT id AS company_id FROM public.companies LOOP
    SELECT id INTO v_trade_id
    FROM public.trades
    WHERE company_id = r.company_id AND name = 'Unassigned'
    LIMIT 1;

    IF v_trade_id IS NULL THEN
      INSERT INTO public.trades (company_id, name, description)
      VALUES (r.company_id, 'Unassigned', 'System trade used when a cost code is not yet selected')
      RETURNING id INTO v_trade_id;
    END IF;

    -- Reattach orphan UNASSIGNED cost code for this company if it exists
    UPDATE public.cost_codes
    SET
      trade_id = v_trade_id,
      category = 'labor'::public.cost_code_category,
      is_active = true,
      is_legacy = false
    WHERE company_id = r.company_id
      AND code = 'UNASSIGNED'
      AND (trade_id IS NULL OR COALESCE(is_legacy, false) = true);

    -- Ensure canonical UNASSIGNED exists
    IF NOT EXISTS (
      SELECT 1 FROM public.cost_codes
      WHERE company_id = r.company_id
        AND code = 'UNASSIGNED'
    ) THEN
      INSERT INTO public.cost_codes (company_id, trade_id, code, name, category, is_active, is_legacy)
      VALUES (
        r.company_id,
        v_trade_id,
        'UNASSIGNED',
        'Unassigned (Labor)',
        'labor'::public.cost_code_category,
        true,
        false
      );
    END IF;
  END LOOP;
END $$;

COMMIT;


