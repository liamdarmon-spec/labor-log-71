-- ============================================================================
-- PRODUCTION-READY FIXES: RLS, Auto-Generate Cost Codes, Billing Summary
-- ============================================================================
-- This migration:
-- 1. Fixes RLS INSERT/UPDATE policies for all core directory tables
-- 2. Adds deterministic Auto-Generate Cost Codes RPC
-- 3. Updates get_project_billing_summary for canonical billing
-- 4. Adds performance indexes
-- ============================================================================

-- ============================================================================
-- PART 1: Fix RLS policies for all core directory tables
-- ============================================================================

-- Helper to safely apply tenant policies to a table
-- Tables: subs, vendors (material_vendors), workers, trades, cost_codes, estimates
DO $$
DECLARE
  tables_to_fix text[] := ARRAY[
    'subs',
    'material_vendors', 
    'workers',
    'trades',
    'cost_codes',
    'estimates',
    'estimate_items'
  ];
  t text;
  r record;
BEGIN
  FOREACH t IN ARRAY tables_to_fix LOOP
    -- Skip if table doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r'
    ) THEN
      RAISE NOTICE 'Skipping % - table does not exist', t;
      CONTINUE;
    END IF;

    -- Skip if table doesn't have company_id column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = t 
        AND column_name = 'company_id'
    ) THEN
      RAISE NOTICE 'Skipping % - no company_id column', t;
      CONTINUE;
    END IF;

    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

    -- Drop ALL existing policies (clean slate)
    FOR r IN (
      SELECT policyname FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = t
    ) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', r.policyname, t);
    END LOOP;

    -- Create canonical tenant policies
    -- SELECT
    EXECUTE format($sql$
      CREATE POLICY tenant_select ON public.%I
      FOR SELECT TO authenticated
      USING (company_id = ANY ((SELECT public.authed_company_ids())));
    $sql$, t);

    -- INSERT
    EXECUTE format($sql$
      CREATE POLICY tenant_insert ON public.%I
      FOR INSERT TO authenticated
      WITH CHECK (company_id = ANY ((SELECT public.authed_company_ids())));
    $sql$, t);

    -- UPDATE
    EXECUTE format($sql$
      CREATE POLICY tenant_update ON public.%I
      FOR UPDATE TO authenticated
      USING (company_id = ANY ((SELECT public.authed_company_ids())))
      WITH CHECK (company_id = ANY ((SELECT public.authed_company_ids())));
    $sql$, t);

    -- DELETE
    EXECUTE format($sql$
      CREATE POLICY tenant_delete ON public.%I
      FOR DELETE TO authenticated
      USING (company_id = ANY ((SELECT public.authed_company_ids())));
    $sql$, t);

    RAISE NOTICE 'Applied tenant policies to %', t;
  END LOOP;
END $$;

-- ============================================================================
-- PART 2: Auto-Generate Cost Codes RPC (Deterministic, No AI)
-- ============================================================================

-- Creates 3 cost codes per trade: {trade_code}-L (Labor), {trade_code}-M (Material), {trade_code}-S (Sub)
CREATE OR REPLACE FUNCTION public.auto_generate_trade_cost_codes(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_trade record;
  v_created_count int := 0;
  v_skipped_count int := 0;
  v_result jsonb := '[]'::jsonb;
  v_trade_code text;
  v_code text;
  v_name text;
  v_category text;
  v_categories text[] := ARRAY['labor', 'materials', 'subs'];
  v_suffixes text[] := ARRAY['L', 'M', 'S'];
  v_suffix text;
  v_cat text;
  v_new_code_id uuid;
  i int;
BEGIN
  -- Validate company access
  IF NOT EXISTS (
    SELECT 1 FROM public.company_members 
    WHERE company_id = p_company_id 
      AND user_id = (SELECT public.authed_user_id())
  ) THEN
    RAISE EXCEPTION 'Access denied to company %', p_company_id;
  END IF;

  -- Iterate through all trades for this company
  FOR v_trade IN 
    SELECT id, name, code 
    FROM public.trades 
    WHERE company_id = p_company_id
    ORDER BY name
  LOOP
    -- Generate trade code from name if not set
    v_trade_code := COALESCE(
      v_trade.code,
      UPPER(LEFT(REGEXP_REPLACE(v_trade.name, '[^a-zA-Z0-9]', '', 'g'), 4))
    );
    
    -- If still empty, use first 4 chars of id
    IF v_trade_code = '' THEN
      v_trade_code := UPPER(LEFT(v_trade.id::text, 4));
    END IF;

    -- Create 3 codes per trade
    FOR i IN 1..3 LOOP
      v_suffix := v_suffixes[i];
      v_cat := v_categories[i];
      v_code := v_trade_code || '-' || v_suffix;
      v_name := v_trade.name || ' (' || 
        CASE v_cat 
          WHEN 'labor' THEN 'Labor'
          WHEN 'materials' THEN 'Material'
          WHEN 'subs' THEN 'Subcontractor'
        END || ')';

      -- Check if code already exists
      IF EXISTS (
        SELECT 1 FROM public.cost_codes 
        WHERE company_id = p_company_id AND code = v_code
      ) THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;

      -- Create the cost code
      INSERT INTO public.cost_codes (company_id, code, name, category, is_active)
      VALUES (p_company_id, v_code, v_name, v_cat, true)
      RETURNING id INTO v_new_code_id;

      -- Link back to trade if it's the matching category
      IF v_cat = 'labor' THEN
        UPDATE public.trades SET default_labor_cost_code_id = v_new_code_id WHERE id = v_trade.id;
      ELSIF v_cat = 'materials' THEN
        UPDATE public.trades SET default_material_cost_code_id = v_new_code_id WHERE id = v_trade.id;
      ELSIF v_cat = 'subs' THEN
        UPDATE public.trades SET default_sub_cost_code_id = v_new_code_id WHERE id = v_trade.id;
      END IF;

      v_created_count := v_created_count + 1;
      v_result := v_result || jsonb_build_object(
        'trade_name', v_trade.name,
        'code', v_code,
        'name', v_name,
        'category', v_cat
      );
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'created_count', v_created_count,
    'skipped_count', v_skipped_count,
    'codes', v_result
  );
END;
$$;

COMMENT ON FUNCTION public.auto_generate_trade_cost_codes(uuid)
IS 'Auto-generates 3 cost codes per trade: L (Labor), M (Material), S (Sub). Deterministic and idempotent.';

-- ============================================================================
-- PART 3: Canonical Billing Summary RPC
-- ============================================================================

-- Drop and recreate to ensure correct signature
DROP FUNCTION IF EXISTS public.get_project_billing_summary(uuid);

CREATE OR REPLACE FUNCTION public.get_project_billing_summary(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_base_contract numeric := 0;
  v_approved_cos numeric := 0;
  v_pending_cos numeric := 0;
  v_invoiced numeric := 0;
  v_paid numeric := 0;
  v_has_baseline boolean := false;
  v_billing_basis text := null;
  v_co_count int := 0;
  v_invoice_count int := 0;
  v_payment_count int := 0;
  v_last_invoice_date date := null;
  v_last_payment_date date := null;
  v_retention_held numeric := 0;
BEGIN
  -- Check access
  IF NOT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id
      AND p.company_id = ANY ((SELECT public.authed_company_ids()))
  ) THEN
    RETURN jsonb_build_object('error', 'Access denied or project not found');
  END IF;

  -- Get base contract from accepted proposal (parent_proposal_id IS NULL)
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_base_contract
  FROM public.proposals
  WHERE project_id = p_project_id
    AND parent_proposal_id IS NULL
    AND acceptance_status = 'accepted';

  -- Check if baseline exists
  v_has_baseline := v_base_contract > 0;

  -- Get billing basis from proposal settings or default
  SELECT 
    COALESCE(
      (settings->>'billing_basis')::text,
      CASE WHEN EXISTS (
        SELECT 1 FROM public.payment_schedule_items psi
        JOIN public.payment_schedules ps ON ps.id = psi.payment_schedule_id
        WHERE ps.project_id = p_project_id
      ) THEN 'payment_schedule' ELSE 'sov' END
    )
  INTO v_billing_basis
  FROM public.proposals
  WHERE project_id = p_project_id
    AND parent_proposal_id IS NULL
    AND acceptance_status = 'accepted'
  LIMIT 1;

  -- Get change orders (proposals with parent_proposal_id)
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN acceptance_status = 'accepted' THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN acceptance_status = 'pending' THEN total_amount ELSE 0 END), 0)
  INTO v_co_count, v_approved_cos, v_pending_cos
  FROM public.proposals
  WHERE project_id = p_project_id
    AND parent_proposal_id IS NOT NULL;

  -- Get invoiced totals
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_amount), 0),
    MAX(invoice_date)
  INTO v_invoice_count, v_invoiced, v_last_invoice_date
  FROM public.invoices
  WHERE project_id = p_project_id;

  -- Get paid totals
  SELECT 
    COUNT(*),
    COALESCE(SUM(amount), 0),
    MAX(payment_date)
  INTO v_payment_count, v_paid, v_last_payment_date
  FROM public.customer_payments
  WHERE project_id = p_project_id;

  -- Calculate retention (placeholder - implement based on your retention logic)
  v_retention_held := 0;

  -- Build result
  v_result := jsonb_build_object(
    'project_id', p_project_id,
    'has_baseline', v_has_baseline,
    'billing_basis', COALESCE(v_billing_basis, 'none'),
    'base_contract_value', v_base_contract,
    'approved_change_orders', v_approved_cos,
    'pending_change_orders', v_pending_cos,
    'contract_value', v_base_contract + v_approved_cos,
    'invoiced_total', v_invoiced,
    'paid_total', v_paid,
    'outstanding_balance', v_invoiced - v_paid,
    'balance_to_finish', (v_base_contract + v_approved_cos) - v_invoiced,
    'retention_held', v_retention_held,
    'change_order_count', v_co_count,
    'invoice_count', v_invoice_count,
    'payment_count', v_payment_count,
    'last_invoice_date', v_last_invoice_date,
    'last_payment_date', v_last_payment_date
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_project_billing_summary(uuid)
IS 'Returns canonical billing summary for a project: contract value, COs, invoiced, paid, outstanding.';

-- ============================================================================
-- PART 4: Get Billing Basis Lines RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_billing_basis_lines(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_billing_basis text;
  v_lines jsonb := '[]'::jsonb;
BEGIN
  -- Check access
  IF NOT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id
      AND p.company_id = ANY ((SELECT public.authed_company_ids()))
  ) THEN
    RETURN jsonb_build_object('error', 'Access denied');
  END IF;

  -- Determine billing basis
  SELECT COALESCE(
    (settings->>'billing_basis')::text,
    CASE WHEN EXISTS (
      SELECT 1 FROM public.payment_schedule_items psi
      JOIN public.payment_schedules ps ON ps.id = psi.payment_schedule_id
      WHERE ps.project_id = p_project_id
    ) THEN 'payment_schedule' ELSE 'sov' END
  )
  INTO v_billing_basis
  FROM public.proposals
  WHERE project_id = p_project_id
    AND parent_proposal_id IS NULL
    AND acceptance_status = 'accepted'
  LIMIT 1;

  IF v_billing_basis = 'payment_schedule' THEN
    -- Return payment milestones
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', psi.id,
        'type', 'milestone',
        'description', psi.milestone_name,
        'scheduled_amount', COALESCE(psi.scheduled_amount, 0),
        'invoiced_amount', 0, -- TODO: Calculate from invoice_milestone_allocations
        'remaining_amount', COALESCE(psi.scheduled_amount, 0),
        'percentage', psi.percentage,
        'due_date', psi.due_date,
        'status', COALESCE(psi.status, 'pending')
      ) ORDER BY psi.sort_order
    ), '[]'::jsonb)
    INTO v_lines
    FROM public.payment_schedule_items psi
    JOIN public.payment_schedules ps ON ps.id = psi.payment_schedule_id
    WHERE ps.project_id = p_project_id;

  ELSE
    -- Return SOV lines
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', si.id,
        'type', 'sov',
        'description', si.description,
        'original_value', COALESCE(si.amount, 0),
        'co_additions', 0,
        'revised_value', COALESCE(si.amount, 0),
        'previous_billed', 0,
        'this_period', 0,
        'total_billed', 0,
        'remaining', COALESCE(si.amount, 0),
        'cost_code_id', si.cost_code_id
      ) ORDER BY si.sort_order
    ), '[]'::jsonb)
    INTO v_lines
    FROM public.sov_items si
    JOIN public.sov_schedules ss ON ss.id = si.sov_schedule_id
    WHERE ss.project_id = p_project_id
      AND ss.status = 'active';
  END IF;

  RETURN jsonb_build_object(
    'billing_basis', COALESCE(v_billing_basis, 'none'),
    'lines', v_lines
  );
END;
$$;

COMMENT ON FUNCTION public.get_billing_basis_lines(uuid)
IS 'Returns billing basis lines (milestones OR SOV lines) for invoice creation.';

-- ============================================================================
-- PART 5: Performance Indexes
-- ============================================================================

-- Ensure indexes exist for common queries
CREATE INDEX IF NOT EXISTS idx_subs_company_id ON public.subs(company_id);
CREATE INDEX IF NOT EXISTS idx_workers_company_id ON public.workers(company_id);
CREATE INDEX IF NOT EXISTS idx_material_vendors_company_id ON public.material_vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_trades_company_id ON public.trades(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_codes_company_id ON public.cost_codes(company_id);
CREATE INDEX IF NOT EXISTS idx_estimates_company_id ON public.estimates(company_id);
CREATE INDEX IF NOT EXISTS idx_estimates_project_id ON public.estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_project_id ON public.proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_parent_id ON public.proposals(parent_proposal_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_project_id ON public.customer_payments(project_id);

-- ============================================================================
-- PART 6: Ensure UNASSIGNED cost code exists
-- ============================================================================

-- Create UNASSIGNED cost code for each company that doesn't have one
INSERT INTO public.cost_codes (company_id, code, name, category, is_active)
SELECT DISTINCT c.id, 'UNASSIGNED', 'Unassigned', 'other', true
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.cost_codes cc
  WHERE cc.company_id = c.id AND cc.code = 'UNASSIGNED'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DONE
-- ============================================================================

