-- ============================================================================
-- PAYMENT SCHEDULES + ITEMS TENANT HARDENING
-- ============================================================================
-- FIXES:
-- 1) Add company_id columns (missing - needed for RLS)
-- 2) Backfill company_id from project
-- 3) Add triggers to auto-set company_id from project
-- 4) Enable RLS with tenant-scoped policies
-- 5) Add indexes for 10k+ scale queries
-- ============================================================================

-- ============================================================================
-- PART 1: ADD COMPANY_ID TO PAYMENT_SCHEDULES
-- ============================================================================

-- Add company_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'payment_schedules' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.payment_schedules ADD COLUMN company_id uuid;
  END IF;
END $$;

-- Backfill from project
UPDATE public.payment_schedules ps
SET company_id = p.company_id
FROM public.projects p
WHERE ps.project_id = p.id
  AND ps.company_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE public.payment_schedules ALTER COLUMN company_id SET NOT NULL;

-- Add FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payment_schedules_company_id_fkey'
    AND table_name = 'payment_schedules'
  ) THEN
    ALTER TABLE public.payment_schedules
    ADD CONSTRAINT payment_schedules_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id);
  END IF;
END $$;

-- ============================================================================
-- PART 2: ADD COMPANY_ID TO PAYMENT_SCHEDULE_ITEMS
-- ============================================================================

-- Add company_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'payment_schedule_items' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.payment_schedule_items ADD COLUMN company_id uuid;
  END IF;
END $$;

-- Backfill from parent payment_schedule
UPDATE public.payment_schedule_items psi
SET company_id = ps.company_id
FROM public.payment_schedules ps
WHERE psi.payment_schedule_id = ps.id
  AND psi.company_id IS NULL;

-- Make NOT NULL after backfill (only if all rows have company_id)
DO $$
BEGIN
  -- First set default for any remaining nulls (edge case: orphaned items)
  UPDATE public.payment_schedule_items psi
  SET company_id = ps.company_id
  FROM public.payment_schedules ps
  WHERE psi.payment_schedule_id = ps.id
    AND psi.company_id IS NULL;

  -- Only make NOT NULL if no nulls remain
  IF NOT EXISTS (SELECT 1 FROM public.payment_schedule_items WHERE company_id IS NULL) THEN
    ALTER TABLE public.payment_schedule_items ALTER COLUMN company_id SET NOT NULL;
  END IF;
END $$;

-- Add FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payment_schedule_items_company_id_fkey'
    AND table_name = 'payment_schedule_items'
  ) THEN
    ALTER TABLE public.payment_schedule_items
    ADD CONSTRAINT payment_schedule_items_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id);
  END IF;
END $$;

-- ============================================================================
-- PART 3: TRIGGERS TO AUTO-SET COMPANY_ID
-- ============================================================================

-- Trigger for payment_schedules: inherit company_id from project
CREATE OR REPLACE FUNCTION public.tg_set_payment_schedule_company_id_from_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.projects
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_payment_schedule_company_id_from_project ON public.payment_schedules;
CREATE TRIGGER set_payment_schedule_company_id_from_project
  BEFORE INSERT OR UPDATE OF project_id, company_id
  ON public.payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_payment_schedule_company_id_from_project();

-- Trigger for payment_schedule_items: inherit company_id from payment_schedule
CREATE OR REPLACE FUNCTION public.tg_set_payment_schedule_item_company_id_from_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.payment_schedule_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.payment_schedules
    WHERE id = NEW.payment_schedule_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_payment_schedule_item_company_id_from_schedule ON public.payment_schedule_items;
CREATE TRIGGER set_payment_schedule_item_company_id_from_schedule
  BEFORE INSERT OR UPDATE OF payment_schedule_id, company_id
  ON public.payment_schedule_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_payment_schedule_item_company_id_from_schedule();

-- ============================================================================
-- PART 4: ENABLE RLS + TENANT-SCOPED POLICIES
-- ============================================================================

-- payment_schedules
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON public.payment_schedules;
CREATE POLICY tenant_select ON public.payment_schedules
  FOR SELECT TO authenticated
  USING (company_id = ANY(public.authed_company_ids()));

DROP POLICY IF EXISTS tenant_insert ON public.payment_schedules;
CREATE POLICY tenant_insert ON public.payment_schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IS NULL OR company_id = ANY(public.authed_company_ids())
  );

DROP POLICY IF EXISTS tenant_update ON public.payment_schedules;
CREATE POLICY tenant_update ON public.payment_schedules
  FOR UPDATE TO authenticated
  USING (company_id = ANY(public.authed_company_ids()))
  WITH CHECK (company_id = ANY(public.authed_company_ids()));

DROP POLICY IF EXISTS tenant_delete ON public.payment_schedules;
CREATE POLICY tenant_delete ON public.payment_schedules
  FOR DELETE TO authenticated
  USING (company_id = ANY(public.authed_company_ids()));

-- payment_schedule_items
ALTER TABLE public.payment_schedule_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON public.payment_schedule_items;
CREATE POLICY tenant_select ON public.payment_schedule_items
  FOR SELECT TO authenticated
  USING (company_id = ANY(public.authed_company_ids()));

DROP POLICY IF EXISTS tenant_insert ON public.payment_schedule_items;
CREATE POLICY tenant_insert ON public.payment_schedule_items
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IS NULL OR company_id = ANY(public.authed_company_ids())
  );

DROP POLICY IF EXISTS tenant_update ON public.payment_schedule_items;
CREATE POLICY tenant_update ON public.payment_schedule_items
  FOR UPDATE TO authenticated
  USING (company_id = ANY(public.authed_company_ids()))
  WITH CHECK (company_id = ANY(public.authed_company_ids()));

DROP POLICY IF EXISTS tenant_delete ON public.payment_schedule_items;
CREATE POLICY tenant_delete ON public.payment_schedule_items
  FOR DELETE TO authenticated
  USING (company_id = ANY(public.authed_company_ids()));

-- ============================================================================
-- PART 5: INDEXES FOR 10K+ SCALE
-- ============================================================================

-- payment_schedules
CREATE INDEX IF NOT EXISTS idx_payment_schedules_company 
  ON public.payment_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_proposal 
  ON public.payment_schedules(proposal_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_project_company 
  ON public.payment_schedules(project_id, company_id);

-- payment_schedule_items
CREATE INDEX IF NOT EXISTS idx_payment_schedule_items_company 
  ON public.payment_schedule_items(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedule_items_schedule_company 
  ON public.payment_schedule_items(payment_schedule_id, company_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedule_items_not_archived 
  ON public.payment_schedule_items(payment_schedule_id) 
  WHERE is_archived = false;

-- ============================================================================
-- PART 6: VERIFY DATA INTEGRITY
-- ============================================================================

-- Ensure all items have company_id set
DO $$
DECLARE
  v_orphan_count int;
BEGIN
  SELECT COUNT(*) INTO v_orphan_count
  FROM public.payment_schedule_items
  WHERE company_id IS NULL;
  
  IF v_orphan_count > 0 THEN
    RAISE NOTICE 'WARNING: % payment_schedule_items have NULL company_id. This should be investigated.', v_orphan_count;
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.payment_schedules IS 
  'Payment/milestone schedules linked to proposals. company_id auto-inherits from project.';

COMMENT ON TABLE public.payment_schedule_items IS 
  'Individual milestones within a payment schedule. company_id auto-inherits from parent schedule.';

COMMENT ON COLUMN public.payment_schedule_items.percent_of_contract IS 
  'Percentage of contract value (e.g., 25 for 25%). Mutually exclusive with fixed_amount.';

COMMENT ON COLUMN public.payment_schedule_items.fixed_amount IS 
  'Fixed dollar amount. Mutually exclusive with percent_of_contract.';

COMMENT ON COLUMN public.payment_schedule_items.scheduled_amount IS 
  'Computed scheduled amount in dollars. This is the canonical billing amount.';

