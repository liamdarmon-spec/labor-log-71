-- ============================================================================
-- db: cost codes canonical source of truth (trades tenant-scoped)
-- ============================================================================
-- Goals:
-- - Enforce cost_codes as canonical source for budgeting/time/AP/etc
-- - Trades owns metadata + default pointers only
-- - Tenant safety: company-scoped, RLS-safe
-- - Legacy cleanup: preserve orphan codes (trade_id IS NULL) but mark legacy + deactivate
-- - Invariants:
--   - trades.company_id NOT NULL (tenant scoped)
--   - cost_codes.company_id NOT NULL (already)
--   - Active cost codes must be trade-linked (trade_id NOT NULL)
--   - cost_codes.company_id must match trades.company_id when trade-linked
--   - FK cost_codes.trade_id -> trades.id (ON DELETE CASCADE)
--   - trades.default_* pointers are DEFERRABLE INITIALLY DEFERRED
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0) Pre-flight: ensure required tables exist
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.trades') IS NULL THEN
    RAISE EXCEPTION 'public.trades does not exist';
  END IF;
  IF to_regclass('public.cost_codes') IS NULL THEN
    RAISE EXCEPTION 'public.cost_codes does not exist';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1) Ensure trades is tenant-scoped: company_id NOT NULL (backfill if single-company)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_company_id uuid;
  v_company_count int;
  v_null_count int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='trades' AND column_name='company_id'
  ) THEN
    ALTER TABLE public.trades ADD COLUMN company_id uuid;
  END IF;

  SELECT COUNT(*) INTO v_null_count FROM public.trades WHERE company_id IS NULL;
  IF v_null_count > 0 THEN
    SELECT COUNT(*) INTO v_company_count FROM public.companies;
    IF v_company_count = 1 THEN
      SELECT id INTO v_company_id FROM public.companies LIMIT 1;
      UPDATE public.trades SET company_id = v_company_id WHERE company_id IS NULL;
    ELSIF v_company_count = 0 THEN
      -- Dev environment: no companies, delete orphaned trades
      RAISE NOTICE 'No companies exist. Deleting % orphaned trades with NULL company_id.', v_null_count;
      DELETE FROM public.trades WHERE company_id IS NULL;
    ELSE
      RAISE EXCEPTION 'Cannot backfill trades.company_id: % rows are NULL and there are % companies. Resolve manually.', v_null_count, v_company_count;
    END IF;
  END IF;

  -- Enforce NOT NULL (only if trades exist)
  IF EXISTS (SELECT 1 FROM public.trades LIMIT 1) THEN
    ALTER TABLE public.trades ALTER COLUMN company_id SET NOT NULL;
  END IF;
END $$;

-- Fix trades uniqueness: drop global UNIQUE(name), enforce UNIQUE(company_id, name)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trades_name_key') THEN
    ALTER TABLE public.trades DROP CONSTRAINT trades_name_key;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trades_company_id_name_key') THEN
    ALTER TABLE public.trades
      ADD CONSTRAINT trades_company_id_name_key UNIQUE (company_id, name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_trades_company_id ON public.trades(company_id);

-- ----------------------------------------------------------------------------
-- 2) Security: remove any permissive/global trades policies (keep tenant_* only)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- Old global preset policies
  DROP POLICY IF EXISTS trades_select ON public.trades;
  DROP POLICY IF EXISTS trades_insert ON public.trades;
  DROP POLICY IF EXISTS trades_update ON public.trades;
  DROP POLICY IF EXISTS trades_delete ON public.trades;

  -- Ensure tenant_* exists (idempotent recreate)
  ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS tenant_select ON public.trades;
  DROP POLICY IF EXISTS tenant_insert ON public.trades;
  DROP POLICY IF EXISTS tenant_update ON public.trades;
  DROP POLICY IF EXISTS tenant_delete ON public.trades;

  CREATE POLICY tenant_select ON public.trades
    FOR SELECT TO authenticated
    USING (company_id = ANY (public.authed_company_ids()));

  CREATE POLICY tenant_insert ON public.trades
    FOR INSERT TO authenticated
    WITH CHECK (company_id = ANY (public.authed_company_ids()));

  CREATE POLICY tenant_update ON public.trades
    FOR UPDATE TO authenticated
    USING (company_id = ANY (public.authed_company_ids()))
    WITH CHECK (company_id = ANY (public.authed_company_ids()));

  CREATE POLICY tenant_delete ON public.trades
    FOR DELETE TO authenticated
    USING (company_id = ANY (public.authed_company_ids()));
END $$;

-- cost_codes: ensure tenant_* exists, drop permissive legacy policies if any
DO $$
BEGIN
  ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS company_select ON public.cost_codes;
  DROP POLICY IF EXISTS company_insert ON public.cost_codes;
  DROP POLICY IF EXISTS company_update ON public.cost_codes;
  DROP POLICY IF EXISTS company_delete ON public.cost_codes;

  DROP POLICY IF EXISTS tenant_select ON public.cost_codes;
  DROP POLICY IF EXISTS tenant_insert ON public.cost_codes;
  DROP POLICY IF EXISTS tenant_update ON public.cost_codes;
  DROP POLICY IF EXISTS tenant_delete ON public.cost_codes;

  CREATE POLICY tenant_select ON public.cost_codes
    FOR SELECT TO authenticated
    USING (company_id = ANY (public.authed_company_ids()));

  CREATE POLICY tenant_insert ON public.cost_codes
    FOR INSERT TO authenticated
    WITH CHECK (company_id = ANY (public.authed_company_ids()));

  CREATE POLICY tenant_update ON public.cost_codes
    FOR UPDATE TO authenticated
    USING (company_id = ANY (public.authed_company_ids()))
    WITH CHECK (company_id = ANY (public.authed_company_ids()));

  CREATE POLICY tenant_delete ON public.cost_codes
    FOR DELETE TO authenticated
    USING (company_id = ANY (public.authed_company_ids()));
END $$;

-- ----------------------------------------------------------------------------
-- 3) Legacy handling: mark trade_id IS NULL rows as legacy + deactivate
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cost_codes' AND column_name='is_legacy'
  ) THEN
    ALTER TABLE public.cost_codes ADD COLUMN is_legacy boolean NOT NULL DEFAULT false;
  END IF;
END $$;

UPDATE public.cost_codes
SET is_legacy = true,
    is_active = false
WHERE trade_id IS NULL
  AND is_legacy = false;

-- Enforce: active codes must be trade-linked
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cost_codes_active_requires_trade_id') THEN
    ALTER TABLE public.cost_codes
      ADD CONSTRAINT cost_codes_active_requires_trade_id
      CHECK (NOT is_active OR trade_id IS NOT NULL);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4) FK + company consistency invariants
-- ----------------------------------------------------------------------------
-- cost_codes.trade_id -> trades.id ON DELETE CASCADE
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cost_codes_trade_id_fkey') THEN
    ALTER TABLE public.cost_codes DROP CONSTRAINT cost_codes_trade_id_fkey;
  END IF;
  ALTER TABLE public.cost_codes
    ADD CONSTRAINT cost_codes_trade_id_fkey
    FOREIGN KEY (trade_id) REFERENCES public.trades(id) ON DELETE CASCADE;
END $$;

-- Company match enforcement for trade-linked cost codes
CREATE OR REPLACE FUNCTION public.trg_cost_codes_company_match_trade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_trade_company_id uuid;
BEGIN
  IF NEW.trade_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT company_id INTO v_trade_company_id
  FROM public.trades
  WHERE id = NEW.trade_id;

  IF v_trade_company_id IS NULL THEN
    RAISE EXCEPTION 'cost_codes.trade_id references missing trade %', NEW.trade_id;
  END IF;

  IF NEW.company_id IS DISTINCT FROM v_trade_company_id THEN
    RAISE EXCEPTION
      'company mismatch: cost_codes.company_id=% must match trades.company_id=% for trade_id=%',
      NEW.company_id, v_trade_company_id, NEW.trade_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cost_codes_company_match_trade ON public.cost_codes;
CREATE CONSTRAINT TRIGGER cost_codes_company_match_trade
AFTER INSERT OR UPDATE OF trade_id, company_id ON public.cost_codes
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.trg_cost_codes_company_match_trade();

-- trades.default_* pointers must be DEFERRABLE INITIALLY DEFERRED
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trades_default_labor_cost_code_id_fkey') THEN
    ALTER TABLE public.trades DROP CONSTRAINT trades_default_labor_cost_code_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trades_default_material_cost_code_id_fkey') THEN
    ALTER TABLE public.trades DROP CONSTRAINT trades_default_material_cost_code_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trades_default_sub_cost_code_id_fkey') THEN
    ALTER TABLE public.trades DROP CONSTRAINT trades_default_sub_cost_code_id_fkey;
  END IF;

  ALTER TABLE public.trades
    ADD CONSTRAINT trades_default_labor_cost_code_id_fkey
    FOREIGN KEY (default_labor_cost_code_id) REFERENCES public.cost_codes(id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;

  ALTER TABLE public.trades
    ADD CONSTRAINT trades_default_material_cost_code_id_fkey
    FOREIGN KEY (default_material_cost_code_id) REFERENCES public.cost_codes(id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;

  ALTER TABLE public.trades
    ADD CONSTRAINT trades_default_sub_cost_code_id_fkey
    FOREIGN KEY (default_sub_cost_code_id) REFERENCES public.cost_codes(id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_cost_codes_company_trade_id ON public.cost_codes(company_id, trade_id);
CREATE INDEX IF NOT EXISTS idx_cost_codes_company_is_legacy ON public.cost_codes(company_id, is_legacy);

COMMIT;


