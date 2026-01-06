-- ============================================================================
-- Canonical Admin: Cost Codes are a product of Company Trades (defaults)
-- ============================================================================
-- Goals:
-- - Add default cost code references to public.company_trades (L/M/S)
-- - Ensure defaults are represented as rows in public.cost_codes
-- - Provide canonical RPCs:
--   - create_cost_code_safe(...)  : collision-safe code creation (tenant scoped)
--   - set_company_trade_default_cost_code(...) : assign defaults safely
--   - list_company_trades(...) : fast company_trades list for UI filters
-- - Ensure uniqueness constraints used by ON CONFLICT are correct
-- - NO delete-to-fix; safe backfills only
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) company_trades: add default_*_cost_code_id columns (nullable, FK-safe)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.company_trades') IS NULL THEN
    RAISE NOTICE 'company_trades does not exist; skipping defaults columns';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'company_trades' AND column_name = 'default_labor_cost_code_id'
  ) THEN
    ALTER TABLE public.company_trades ADD COLUMN default_labor_cost_code_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'company_trades' AND column_name = 'default_material_cost_code_id'
  ) THEN
    ALTER TABLE public.company_trades ADD COLUMN default_material_cost_code_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'company_trades' AND column_name = 'default_sub_cost_code_id'
  ) THEN
    ALTER TABLE public.company_trades ADD COLUMN default_sub_cost_code_id uuid;
  END IF;
END $$;

-- Add FK constraints (ON DELETE SET NULL) in a safe/conditional way
DO $$
BEGIN
  IF to_regclass('public.company_trades') IS NULL OR to_regclass('public.cost_codes') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_trades_default_labor_cost_code_id_fkey'
  ) THEN
    ALTER TABLE public.company_trades
      ADD CONSTRAINT company_trades_default_labor_cost_code_id_fkey
      FOREIGN KEY (default_labor_cost_code_id) REFERENCES public.cost_codes(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_trades_default_material_cost_code_id_fkey'
  ) THEN
    ALTER TABLE public.company_trades
      ADD CONSTRAINT company_trades_default_material_cost_code_id_fkey
      FOREIGN KEY (default_material_cost_code_id) REFERENCES public.cost_codes(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_trades_default_sub_cost_code_id_fkey'
  ) THEN
    ALTER TABLE public.company_trades
      ADD CONSTRAINT company_trades_default_sub_cost_code_id_fkey
      FOREIGN KEY (default_sub_cost_code_id) REFERENCES public.cost_codes(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_trades_company_defaults
  ON public.company_trades(company_id, default_labor_cost_code_id, default_material_cost_code_id, default_sub_cost_code_id);

-- ----------------------------------------------------------------------------
-- 2) Ensure tenant-scoped uniqueness for cost_codes: UNIQUE(company_id, code)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.cost_codes') IS NULL THEN
    RETURN;
  END IF;

  -- Drop legacy global unique(code) if it exists (name varies)
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cost_codes_code_key'
  ) THEN
    ALTER TABLE public.cost_codes DROP CONSTRAINT IF EXISTS cost_codes_code_key;
  END IF;

  -- Ensure correct unique exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cost_codes_company_code_key'
  ) THEN
    ALTER TABLE public.cost_codes
      ADD CONSTRAINT cost_codes_company_code_key UNIQUE (company_id, code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cost_codes_company_code ON public.cost_codes(company_id, code);
CREATE INDEX IF NOT EXISTS idx_cost_codes_company_company_trade ON public.cost_codes(company_id, company_trade_id);

-- ----------------------------------------------------------------------------
-- 3) Canonical RPC: create_cost_code_safe (collision-safe, tenant scoped)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_cost_code_safe(uuid, text, text, text, uuid, boolean);

CREATE OR REPLACE FUNCTION public.create_cost_code_safe(
  p_company_id uuid,
  p_code text,
  p_name text,
  p_category text,
  p_company_trade_id uuid DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code text;
  v_attempt int := 0;
  v_new_id uuid;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'company_id is required');
  END IF;

  IF NOT public.is_company_member(p_company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  IF p_code IS NULL OR btrim(p_code) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'code is required');
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'name is required');
  END IF;

  -- cost_codes_category_check expects: labor/subs/materials/other
  IF p_category NOT IN ('labor','subs','materials','other') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid category');
  END IF;

  -- If assigning to a trade, ensure the trade belongs to this company
  IF p_company_trade_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.company_trades ct
      WHERE ct.id = p_company_trade_id AND ct.company_id = p_company_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'invalid company_trade_id');
    END IF;
  END IF;

  LOOP
    v_code := upper(btrim(p_code));
    IF v_attempt > 0 THEN
      v_code := v_code || '-' || (v_attempt + 1)::text;
    END IF;

    BEGIN
      INSERT INTO public.cost_codes(company_id, company_trade_id, code, name, category, is_active)
      VALUES (p_company_id, p_company_trade_id, v_code, p_name, p_category, COALESCE(p_is_active, true))
      RETURNING id INTO v_new_id;

      RETURN jsonb_build_object(
        'success', true,
        'id', v_new_id,
        'code', v_code
      );
    EXCEPTION WHEN unique_violation THEN
      v_attempt := v_attempt + 1;
      IF v_attempt >= 50 THEN
        RETURN jsonb_build_object('success', false, 'error', 'unable to generate unique code');
      END IF;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_cost_code_safe(uuid, text, text, text, uuid, boolean) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4) Canonical RPC: set_company_trade_default_cost_code
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.set_company_trade_default_cost_code(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.set_company_trade_default_cost_code(
  p_company_trade_id uuid,
  p_default_kind text,
  p_cost_code_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_trade record;
  v_code record;
BEGIN
  SELECT * INTO v_trade FROM public.company_trades WHERE id = p_company_trade_id;
  IF v_trade IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'trade not found');
  END IF;

  IF NOT public.is_company_member(v_trade.company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  IF p_default_kind NOT IN ('labor','materials','subs') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid default kind');
  END IF;

  IF p_cost_code_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'cost_code_id is required');
  END IF;

  SELECT id, company_id, category, company_trade_id INTO v_code
  FROM public.cost_codes
  WHERE id = p_cost_code_id;

  IF v_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'cost code not found');
  END IF;

  IF v_code.company_id <> v_trade.company_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'cost code belongs to a different company');
  END IF;

  -- category must match the default kind
  IF v_code.category <> p_default_kind THEN
    RETURN jsonb_build_object('success', false, 'error', 'cost code category does not match default kind');
  END IF;

  -- Ensure the cost code is linked to the trade (optional but canonical)
  IF v_code.company_trade_id IS DISTINCT FROM v_trade.id THEN
    UPDATE public.cost_codes
    SET company_trade_id = v_trade.id
    WHERE id = v_code.id;
  END IF;

  IF p_default_kind = 'labor' THEN
    UPDATE public.company_trades SET default_labor_cost_code_id = v_code.id WHERE id = v_trade.id;
  ELSIF p_default_kind = 'materials' THEN
    UPDATE public.company_trades SET default_material_cost_code_id = v_code.id WHERE id = v_trade.id;
  ELSE
    UPDATE public.company_trades SET default_sub_cost_code_id = v_code.id WHERE id = v_trade.id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_company_trade_default_cost_code(uuid, text, uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5) list_company_trades(p_company_id): fast list for UI dropdowns/filters
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.list_company_trades(uuid);

CREATE OR REPLACE FUNCTION public.list_company_trades(p_company_id uuid)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  name text,
  description text,
  code_prefix text,
  is_active boolean,
  default_labor_cost_code_id uuid,
  default_material_cost_code_id uuid,
  default_sub_cost_code_id uuid,
  defaults_complete boolean
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    ct.id,
    ct.company_id,
    ct.name,
    ct.description,
    ct.code_prefix,
    ct.is_active,
    ct.default_labor_cost_code_id,
    ct.default_material_cost_code_id,
    ct.default_sub_cost_code_id,
    (ct.default_labor_cost_code_id IS NOT NULL
      AND ct.default_material_cost_code_id IS NOT NULL
      AND ct.default_sub_cost_code_id IS NOT NULL) AS defaults_complete
  FROM public.company_trades ct
  WHERE ct.company_id = p_company_id
  ORDER BY ct.name;
$$;

GRANT EXECUTE ON FUNCTION public.list_company_trades(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6) Backfill defaults on company_trades (safe, idempotent)
-- ----------------------------------------------------------------------------
-- If cost codes exist for a trade, fill default_* if missing.
DO $$
DECLARE
  r record;
BEGIN
  IF to_regclass('public.company_trades') IS NULL OR to_regclass('public.cost_codes') IS NULL THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT ct.id AS company_trade_id, ct.company_id
    FROM public.company_trades ct
  LOOP
    -- Labor
    UPDATE public.company_trades
    SET default_labor_cost_code_id = COALESCE(default_labor_cost_code_id, (
      SELECT cc.id FROM public.cost_codes cc
      WHERE cc.company_id = r.company_id
        AND cc.company_trade_id = r.company_trade_id
        AND cc.category = 'labor'
      ORDER BY cc.code
      LIMIT 1
    ))
    WHERE id = r.company_trade_id;

    -- Materials
    UPDATE public.company_trades
    SET default_material_cost_code_id = COALESCE(default_material_cost_code_id, (
      SELECT cc.id FROM public.cost_codes cc
      WHERE cc.company_id = r.company_id
        AND cc.company_trade_id = r.company_trade_id
        AND cc.category = 'materials'
      ORDER BY cc.code
      LIMIT 1
    ))
    WHERE id = r.company_trade_id;

    -- Subs
    UPDATE public.company_trades
    SET default_sub_cost_code_id = COALESCE(default_sub_cost_code_id, (
      SELECT cc.id FROM public.cost_codes cc
      WHERE cc.company_id = r.company_id
        AND cc.company_trade_id = r.company_trade_id
        AND cc.category = 'subs'
      ORDER BY cc.code
      LIMIT 1
    ))
    WHERE id = r.company_trade_id;
  END LOOP;
END $$;

COMMIT;


