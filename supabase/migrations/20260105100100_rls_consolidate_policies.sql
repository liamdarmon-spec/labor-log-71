-- ============================================================================
-- RLS Standardization Part 2: Consolidate duplicate policies
-- ============================================================================
-- Problem: Many tables have BOTH company_* and tenant_* policies (duplicates).
-- Solution: Drop company_* policies, keep tenant_* policies (canonical names).
--
-- Also fixes initplan warning on company_members by recreating policy with
-- (select auth.uid()) pattern.
-- ============================================================================

-- ============================================================================
-- PART 1: Fix company_members initplan warning
-- ============================================================================
-- The "read own memberships" policy uses auth.uid() directly; wrap it.

DROP POLICY IF EXISTS "read own memberships" ON public.company_members;
CREATE POLICY "read own memberships"
ON public.company_members
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 2: Drop duplicate company_* policies from tenant-scoped tables
-- ============================================================================
-- These tables have BOTH company_* and tenant_* policies. We keep tenant_*.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'activity_log',
    'budget_revisions',
    'cost_codes',
    'costs',
    'customer_payments',
    'day_card_jobs',
    'day_cards',
    'document_tags',
    'documents',
    'entity_change_log',
    'estimate_items',
    'estimates',
    'invoice_items',
    'invoices',
    'labor_pay_run_items',
    'labor_pay_runs',
    'material_receipts',
    'material_vendors',
    'project_budget_groups',
    'project_budget_lines',
    'projects',
    'proposal_events',
    'proposal_images',
    'proposal_templates',
    'proposals',
    'scope_block_cost_items',
    'scope_blocks',
    'time_logs',
    'work_schedules',
    'workers'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      -- Drop the company_* policies (keeping tenant_* as canonical)
      EXECUTE format('DROP POLICY IF EXISTS "company_select" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "company_insert" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "company_update" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "company_delete" ON public.%I', t);
    END IF;
  END LOOP;
END
$$;

-- ============================================================================
-- PART 3: Clean up any stray old-style policies on companies/company_members
-- ============================================================================

-- companies: consolidate to single policy per action
DROP POLICY IF EXISTS "company_companies_select" ON public.companies;
DROP POLICY IF EXISTS "company_companies_insert" ON public.companies;
DROP POLICY IF EXISTS "company_companies_update" ON public.companies;
DROP POLICY IF EXISTS "company_companies_delete" ON public.companies;
DROP POLICY IF EXISTS "create company" ON public.companies;

-- Ensure we have the canonical policies on companies
-- (read own companies already exists from previous migration)

-- Recreate "read own companies" with initplan-safe pattern
DROP POLICY IF EXISTS "read own companies" ON public.companies;
CREATE POLICY "read own companies"
ON public.companies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = companies.id
      AND cm.user_id = (SELECT auth.uid())
  )
);

-- company_members: clean up duplicates
DROP POLICY IF EXISTS "company_company_members_select" ON public.company_members;
DROP POLICY IF EXISTS "company_company_members_insert" ON public.company_members;
DROP POLICY IF EXISTS "company_company_members_update" ON public.company_members;
DROP POLICY IF EXISTS "company_company_members_delete" ON public.company_members;
DROP POLICY IF EXISTS "admins manage members" ON public.company_members;

-- ============================================================================
-- PART 4: Ensure measurement_units has only ONE select policy
-- ============================================================================
-- measurement_units is a shared lookup table; keep single permissive select.

DO $$
BEGIN
  IF to_regclass('public.measurement_units') IS NOT NULL THEN
    -- Ensure RLS is enabled
    EXECUTE 'ALTER TABLE public.measurement_units ENABLE ROW LEVEL SECURITY';
    
    -- Keep only one select-all policy
    -- (measurement_units_select_all already exists per lint output)
  END IF;
END
$$;


