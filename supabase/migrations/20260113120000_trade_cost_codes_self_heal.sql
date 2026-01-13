BEGIN;

-- ensure_trade_cost_codes: deterministic self-heal for trades -> exactly 3 cost codes (labor/material/sub)
DROP FUNCTION IF EXISTS public.ensure_trade_cost_codes(uuid);

CREATE OR REPLACE FUNCTION public.ensure_trade_cost_codes(p_trade_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
DECLARE
  v_trade public.trades;
  v_prefix text;
  v_letters text;
  v_existing_prefix text;
  v_is_unassigned boolean := false;
  v_labor_code text;
  v_material_code text;
  v_sub_code text;
  v_labor_name text;
  v_material_name text;
  v_sub_name text;
  v_labor_id uuid;
  v_material_id uuid;
  v_sub_id uuid;
BEGIN
  SELECT * INTO v_trade
  FROM public.trades t
  WHERE t.id = p_trade_id;

  IF v_trade.id IS NULL THEN
    RAISE EXCEPTION 'trade not found: %', p_trade_id;
  END IF;

  IF v_trade.company_id IS NULL THEN
    RAISE EXCEPTION 'trade % has NULL company_id', p_trade_id;
  END IF;

  -- Enforce tenant membership in normal request contexts.
  -- During migrations/backfills auth.uid() is NULL; allow system repair.
  IF auth.uid() IS NOT NULL AND NOT public.is_company_member(v_trade.company_id) THEN
    RAISE EXCEPTION 'not authorized for trade %', p_trade_id USING ERRCODE='42501';
  END IF;

  v_is_unassigned := lower(coalesce(v_trade.name, '')) = 'unassigned';

  -- Prefer existing prefix for stability
  SELECT split_part(cc.code, '-', 1)
  INTO v_existing_prefix
  FROM public.cost_codes cc
  WHERE cc.trade_id = v_trade.id
    AND cc.company_id = v_trade.company_id
  ORDER BY cc.code
  LIMIT 1;

  IF v_existing_prefix IS NOT NULL AND btrim(v_existing_prefix) <> '' THEN
    v_prefix := v_existing_prefix;
  ELSE
    v_letters := upper(regexp_replace(coalesce(v_trade.name, ''), '[^A-Za-z0-9]', '', 'g'));
    IF v_letters IS NULL OR length(v_letters) < 3 THEN
      v_letters := 'XXX';
    END IF;
    -- derive a prefix deterministically, resolving collisions within the company
    v_prefix := left(v_letters, 4);
    IF v_prefix IS NULL OR length(v_prefix) < 3 THEN
      v_prefix := 'XXX';
    END IF;

    DECLARE
      v_i int := 0;
      v_try text;
      v_trade_token text;
      v_len int;
    BEGIN
      -- Try a bounded number of suffixes for human-friendly prefixes
      WHILE v_i <= 99 LOOP
        v_try := CASE WHEN v_i = 0 THEN v_prefix ELSE (v_prefix || v_i::text) END;
        IF NOT EXISTS (
          SELECT 1 FROM public.cost_codes
          WHERE company_id = v_trade.company_id
            AND code IN (v_try || '-L', v_try || '-M', v_try || '-S', 'UNASSIGNED', 'UNASSIGNED-M', 'UNASSIGNED-S')
        ) THEN
          v_prefix := v_try;
          EXIT;
        END IF;
        v_i := v_i + 1;
      END LOOP;

      -- Deterministic fallback: prefix derived from trade id (guaranteed to converge)
      IF v_i > 99 THEN
        v_trade_token := replace(p_trade_id::text, '-', '');
        v_len := 6;
        LOOP
          v_try := 'T' || left(v_trade_token, v_len);
          IF NOT EXISTS (
            SELECT 1 FROM public.cost_codes
            WHERE company_id = v_trade.company_id
              AND code IN (v_try || '-L', v_try || '-M', v_try || '-S')
          ) THEN
            v_prefix := v_try;
            EXIT;
          END IF;
          v_len := v_len + 2;
          IF v_len > 20 THEN
            RAISE EXCEPTION 'unable to find unique cost code prefix for trade %', p_trade_id;
          END IF;
        END LOOP;
      END IF;
    END;
  END IF;

  IF v_is_unassigned THEN
    v_labor_code := 'UNASSIGNED';
    v_material_code := 'UNASSIGNED-M';
    v_sub_code := 'UNASSIGNED-S';
    v_labor_name := 'Unassigned (Labor)';
    v_material_name := 'Unassigned (Material)';
    v_sub_name := 'Unassigned (Subcontractor)';
  ELSE
    v_labor_code := v_prefix || '-L';
    v_material_code := v_prefix || '-M';
    v_sub_code := v_prefix || '-S';
    v_labor_name := v_trade.name || ' (Labor)';
    v_material_name := v_trade.name || ' (Material)';
    v_sub_name := v_trade.name || ' (Subcontractor)';
  END IF;

  -- Upsert the 3 canonical rows by (trade_id, category)
  INSERT INTO public.cost_codes (company_id, trade_id, code, name, category, is_active)
  VALUES
    (v_trade.company_id, v_trade.id, v_labor_code, v_labor_name, 'labor'::public.cost_code_category, true),
    (v_trade.company_id, v_trade.id, v_material_code, v_material_name, 'material'::public.cost_code_category, true),
    (v_trade.company_id, v_trade.id, v_sub_code, v_sub_name, 'sub'::public.cost_code_category, true)
  ON CONFLICT (trade_id, category) DO UPDATE
    SET
      company_id = EXCLUDED.company_id,
      trade_id = EXCLUDED.trade_id,
      code = EXCLUDED.code,
      name = EXCLUDED.name,
      is_active = true;

  SELECT id INTO v_labor_id
  FROM public.cost_codes
  WHERE company_id = v_trade.company_id AND trade_id = v_trade.id AND category = 'labor'::public.cost_code_category;

  SELECT id INTO v_material_id
  FROM public.cost_codes
  WHERE company_id = v_trade.company_id AND trade_id = v_trade.id AND category = 'material'::public.cost_code_category;

  SELECT id INTO v_sub_id
  FROM public.cost_codes
  WHERE company_id = v_trade.company_id AND trade_id = v_trade.id AND category = 'sub'::public.cost_code_category;

  UPDATE public.trades
  SET
    default_labor_cost_code_id = v_labor_id,
    default_material_cost_code_id = v_material_id,
    default_sub_cost_code_id = v_sub_id
  WHERE id = v_trade.id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_trade_cost_codes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_trade_cost_codes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_trade_cost_codes(uuid) TO service_role;

-- Trigger: keep trades -> cost codes deterministic on insert and relevant updates
DROP FUNCTION IF EXISTS public.tg_trades_ensure_cost_codes();
CREATE OR REPLACE FUNCTION public.tg_trades_ensure_cost_codes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = on
AS $$
BEGIN
  PERFORM public.ensure_trade_cost_codes(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_trades_ensure_cost_codes ON public.trades;
CREATE TRIGGER tg_trades_ensure_cost_codes
AFTER INSERT OR UPDATE OF name, company_id ON public.trades
FOR EACH ROW
EXECUTE FUNCTION public.tg_trades_ensure_cost_codes();

-- Uniqueness guard (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cost_codes'::regclass AND conname = 'cost_codes_trade_id_category_key'
  ) THEN
    ALTER TABLE public.cost_codes
      ADD CONSTRAINT cost_codes_trade_id_category_key UNIQUE (trade_id, category);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cost_codes'::regclass AND conname = 'cost_codes_company_id_code_key'
  ) THEN
    ALTER TABLE public.cost_codes
      ADD CONSTRAINT cost_codes_company_id_code_key UNIQUE (company_id, code);
  END IF;
END $$;

-- Backfill all existing trades (includes Unassigned)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.trades LOOP
    PERFORM public.ensure_trade_cost_codes(r.id);
  END LOOP;
END $$;

DO $$
BEGIN
  PERFORM pg_notify('pgrst','reload schema');
EXCEPTION WHEN others THEN
  NULL;
END $$;

COMMIT;


