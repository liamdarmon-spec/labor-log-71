-- ============================================================================
-- db: atomic trade + default cost codes
-- ============================================================================
-- Adds:
-- - public.create_trade_with_default_cost_codes(...) RETURNS public.trades
-- - public.ensure_trade_has_default_cost_codes(p_trade_id uuid) RETURNS void
-- Requirements:
-- - SECURITY DEFINER + safe search_path
-- - explicit membership checks for p_company_id (ERRCODE 42501)
-- - deterministic prefix collision handling
-- - creates EXACTLY 3 cost codes when enabled: labor/material/sub
-- - atomic transaction behavior (function executes in single txn)
-- ============================================================================

BEGIN;

-- Ensure trades is tenant-scoped (required by spec and diagnostics script)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='trades' AND column_name='company_id'
  ) THEN
    ALTER TABLE public.trades ADD COLUMN company_id uuid;
  END IF;
END $$;

-- Helper: derive deterministic unique prefix for a company (internal to this migration)
CREATE OR REPLACE FUNCTION public._derive_unique_cost_code_prefix(
  p_company_id uuid,
  p_letters text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_len int;
  v_prefix text;
  v_i int;
  v_full text;
BEGIN
  v_full := p_letters;
  IF v_full IS NULL OR length(v_full) < 3 THEN
    RAISE EXCEPTION 'prefix must have at least 3 letters';
  END IF;

  -- Try 3..full length
  v_len := 3;
  WHILE v_len <= length(v_full) LOOP
    v_prefix := left(v_full, v_len);
    IF NOT EXISTS (
      SELECT 1 FROM public.cost_codes
      WHERE company_id = p_company_id
        AND code IN (v_prefix || '-L', v_prefix || '-M', v_prefix || '-S')
    ) THEN
      RETURN v_prefix;
    END IF;
    v_len := v_len + 1;
  END LOOP;

  -- If still colliding, append smallest integer suffix deterministically
  v_i := 1;
  LOOP
    v_prefix := v_full || v_i::text;
    IF NOT EXISTS (
      SELECT 1 FROM public.cost_codes
      WHERE company_id = p_company_id
        AND code IN (v_prefix || '-L', v_prefix || '-M', v_prefix || '-S')
    ) THEN
      RETURN v_prefix;
    END IF;
    v_i := v_i + 1;
    IF v_i > 10000 THEN
      RAISE EXCEPTION 'unable to find unique cost code prefix for company %', p_company_id;
    END IF;
  END LOOP;
END;
$$;

-- Main RPC
DROP FUNCTION IF EXISTS public.create_trade_with_default_cost_codes(uuid, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.create_trade_with_default_cost_codes(
  p_company_id uuid,
  p_name text,
  p_description text,
  p_code_prefix text DEFAULT NULL,
  p_auto_generate boolean DEFAULT true
) RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_trade public.trades;
  v_letters text;
  v_prefix text;
  v_labor_id uuid;
  v_material_id uuid;
  v_sub_id uuid;
BEGIN
  IF NOT public.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'not a member of company %', p_company_id USING ERRCODE='42501';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'trade name is required';
  END IF;

  -- Create trade (tenant scoped)
  INSERT INTO public.trades (name, description, company_id)
  VALUES (trim(p_name), NULLIF(trim(p_description), ''), p_company_id)
  RETURNING * INTO v_trade;

  IF NOT p_auto_generate THEN
    RETURN v_trade;
  END IF;

  -- Determine base letters
  IF p_code_prefix IS NOT NULL AND trim(p_code_prefix) <> '' THEN
    v_letters := upper(regexp_replace(trim(p_code_prefix), '[^A-Za-z]', '', 'g'));
  ELSE
    v_letters := upper(regexp_replace(trim(p_name), '[^A-Za-z]', '', 'g'));
  END IF;

  IF v_letters IS NULL OR length(v_letters) < 3 THEN
    RAISE EXCEPTION 'code prefix must contain at least 3 letters';
  END IF;

  -- Determine unique prefix
  v_prefix := public._derive_unique_cost_code_prefix(p_company_id, v_letters);

  -- Create exactly 3 cost codes (trade_id FK)
  INSERT INTO public.cost_codes (company_id, trade_id, code, name, category, is_active)
  VALUES
    (p_company_id, v_trade.id, v_prefix || '-L', v_trade.name || ' (Labor)',    'labor'::public.cost_code_category, true),
    (p_company_id, v_trade.id, v_prefix || '-M', v_trade.name || ' (Material)', 'material'::public.cost_code_category, true),
    (p_company_id, v_trade.id, v_prefix || '-S', v_trade.name || ' (Subcontractor)', 'sub'::public.cost_code_category, true);

  -- Grab IDs deterministically (category unique per trade is enforced by constraints)
  SELECT id INTO v_labor_id    FROM public.cost_codes WHERE trade_id = v_trade.id AND category = 'labor'::public.cost_code_category;
  SELECT id INTO v_material_id FROM public.cost_codes WHERE trade_id = v_trade.id AND category = 'material'::public.cost_code_category;
  SELECT id INTO v_sub_id      FROM public.cost_codes WHERE trade_id = v_trade.id AND category = 'sub'::public.cost_code_category;

  -- Set default pointers
  UPDATE public.trades
  SET
    default_labor_cost_code_id = v_labor_id,
    default_material_cost_code_id = v_material_id,
    default_sub_cost_code_id = v_sub_id
  WHERE id = v_trade.id
  RETURNING * INTO v_trade;

  RETURN v_trade;
END;
$$;

REVOKE ALL ON FUNCTION public.create_trade_with_default_cost_codes(uuid, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_trade_with_default_cost_codes(uuid, text, text, text, boolean) TO authenticated;

-- Backfill / ensure defaults
DROP FUNCTION IF EXISTS public.ensure_trade_has_default_cost_codes(uuid);

CREATE OR REPLACE FUNCTION public.ensure_trade_has_default_cost_codes(p_trade_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_trade public.trades;
  v_count int;
  v_letters text;
  v_prefix text;
  v_labor_id uuid;
  v_material_id uuid;
  v_sub_id uuid;
BEGIN
  SELECT * INTO v_trade FROM public.trades WHERE id = p_trade_id;
  IF v_trade IS NULL THEN
    RAISE EXCEPTION 'trade not found: %', p_trade_id;
  END IF;

  IF v_trade.company_id IS NULL OR NOT public.is_company_member(v_trade.company_id) THEN
    RAISE EXCEPTION 'not authorized for trade %', p_trade_id USING ERRCODE='42501';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.cost_codes WHERE trade_id = p_trade_id;

  IF v_count = 0 THEN
    v_letters := upper(regexp_replace(trim(v_trade.name), '[^A-Za-z]', '', 'g'));
    IF v_letters IS NULL OR length(v_letters) < 3 THEN
      RAISE EXCEPTION 'cannot derive code prefix: trade name must contain at least 3 letters';
    END IF;
    v_prefix := public._derive_unique_cost_code_prefix(v_trade.company_id, v_letters);

    INSERT INTO public.cost_codes (company_id, trade_id, code, name, category, is_active)
    VALUES
      (v_trade.company_id, v_trade.id, v_prefix || '-L', v_trade.name || ' (Labor)',    'labor'::public.cost_code_category, true),
      (v_trade.company_id, v_trade.id, v_prefix || '-M', v_trade.name || ' (Material)', 'material'::public.cost_code_category, true),
      (v_trade.company_id, v_trade.id, v_prefix || '-S', v_trade.name || ' (Subcontractor)', 'sub'::public.cost_code_category, true);

    SELECT id INTO v_labor_id    FROM public.cost_codes WHERE trade_id = v_trade.id AND category = 'labor'::public.cost_code_category;
    SELECT id INTO v_material_id FROM public.cost_codes WHERE trade_id = v_trade.id AND category = 'material'::public.cost_code_category;
    SELECT id INTO v_sub_id      FROM public.cost_codes WHERE trade_id = v_trade.id AND category = 'sub'::public.cost_code_category;

    UPDATE public.trades
    SET
      default_labor_cost_code_id = v_labor_id,
      default_material_cost_code_id = v_material_id,
      default_sub_cost_code_id = v_sub_id
    WHERE id = v_trade.id;

    RETURN;
  END IF;

  IF v_count = 3 THEN
    -- verify correct categories
    IF NOT EXISTS (SELECT 1 FROM public.cost_codes WHERE trade_id = p_trade_id AND category='labor'::public.cost_code_category)
       OR NOT EXISTS (SELECT 1 FROM public.cost_codes WHERE trade_id = p_trade_id AND category='material'::public.cost_code_category)
       OR NOT EXISTS (SELECT 1 FROM public.cost_codes WHERE trade_id = p_trade_id AND category='sub'::public.cost_code_category) THEN
      RAISE EXCEPTION 'trade % has 3 cost codes but categories are not (labor, material, sub)', p_trade_id;
    END IF;
    RETURN;
  END IF;

  RAISE EXCEPTION 'trade % has % cost codes (expected 0 or 3)', p_trade_id, v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_trade_has_default_cost_codes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_trade_has_default_cost_codes(uuid) TO authenticated;

COMMIT;


