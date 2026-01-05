--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--



-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from bid_invitations on (bid_package_id, sub_id), keep smallest id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY bid_package_id, sub_id
          ORDER BY id ASC
        ) AS rn
      FROM public.bid_invitations
      WHERE bid_package_id IS NOT NULL AND sub_id IS NOT NULL
    )
    DELETE FROM public.bid_invitations t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from companies on (name), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY name
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.companies
      WHERE name IS NOT NULL
    )
    DELETE FROM public.companies t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from cost_codes on (code), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY code
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.cost_codes
      WHERE code IS NOT NULL
    )
    DELETE FROM public.cost_codes t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from day_cards on (worker_id, date), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY worker_id, date
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.day_cards
      WHERE worker_id IS NOT NULL AND date IS NOT NULL
    )
    DELETE FROM public.day_cards t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from invitations on (email), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY email
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.invitations
      WHERE email IS NOT NULL
    )
    DELETE FROM public.invitations t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from project_budget_lines on (project_id, cost_code_id), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY project_id, cost_code_id
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.project_budget_lines
      WHERE project_id IS NOT NULL AND cost_code_id IS NOT NULL
    )
    DELETE FROM public.project_budget_lines t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from project_budgets on (project_id), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY project_id
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.project_budgets
      WHERE project_id IS NOT NULL
    )
    DELETE FROM public.project_budgets t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from project_subcontracts on (project_id, sub_id), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY project_id, sub_id
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.project_subcontracts
      WHERE project_id IS NOT NULL AND sub_id IS NOT NULL
    )
    DELETE FROM public.project_subcontracts t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from sub_bids on (bid_package_id, sub_id), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY bid_package_id, sub_id
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.sub_bids
      WHERE bid_package_id IS NOT NULL AND sub_id IS NOT NULL
    )
    DELETE FROM public.sub_bids t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from trades on (name), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY name
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.trades
      WHERE name IS NOT NULL
    )
    DELETE FROM public.trades t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;




-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from user_roles on (user_id, role), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY user_id, role
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.user_roles
      WHERE user_id IS NOT NULL AND role IS NOT NULL
    )
    DELETE FROM public.user_roles t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

--



-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from cost_codes on (trade_id, category), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY trade_id, category
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.cost_codes
      WHERE is_active = true AND trade_id IS NOT NULL
    )
    DELETE FROM public.cost_codes t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;

--



-- Conditional dedupe
DO $$
BEGIN
  IF current_setting('app.run_dedupe', true) = 'true' THEN
    -- Pre-clean: Remove duplicates from daily_logs on (schedule_id), keep smallest created_at then id
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY schedule_id
          ORDER BY (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
            created_at ASC NULLS LAST,
            id ASC
        ) AS rn
      FROM public.daily_logs
      WHERE schedule_id IS NOT NULL
    )
    DELETE FROM public.daily_logs t
    USING ranked r
    WHERE t.id = r.id AND r.rn > 1;
  END IF;
END $$;
