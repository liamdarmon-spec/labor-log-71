-- ============================================================================
-- Backfill company_id for proposals + estimates from their project
-- This fixes RLS blocking for legacy data where company_id was not set
-- ============================================================================

-- 1) Backfill proposals.company_id from project.company_id
UPDATE public.proposals p
SET company_id = pr.company_id
FROM public.projects pr
WHERE p.project_id = pr.id
  AND p.company_id IS NULL
  AND pr.company_id IS NOT NULL;

-- 2) Backfill estimates.company_id from project.company_id
UPDATE public.estimates e
SET company_id = pr.company_id
FROM public.projects pr
WHERE e.project_id = pr.id
  AND e.company_id IS NULL
  AND pr.company_id IS NOT NULL;

-- 3) Backfill scope_blocks.company_id from estimate.company_id
UPDATE public.scope_blocks sb
SET company_id = e.company_id
FROM public.estimates e
WHERE sb.entity_type = 'estimate'
  AND sb.entity_id = e.id
  AND sb.company_id IS NULL
  AND e.company_id IS NOT NULL;

-- 4) Backfill scope_block_cost_items.company_id from scope_block.company_id
UPDATE public.scope_block_cost_items sci
SET company_id = sb.company_id
FROM public.scope_blocks sb
WHERE sci.scope_block_id = sb.id
  AND sci.company_id IS NULL
  AND sb.company_id IS NOT NULL;

-- 5) Add trigger to auto-set company_id from project on proposals insert
CREATE OR REPLACE FUNCTION public.tg_set_proposal_company_id_from_project()
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

DROP TRIGGER IF EXISTS set_proposal_company_id_from_project ON public.proposals;
CREATE TRIGGER set_proposal_company_id_from_project
  BEFORE INSERT OR UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_proposal_company_id_from_project();

-- 6) Add trigger to auto-set company_id from project on estimates insert
CREATE OR REPLACE FUNCTION public.tg_set_estimate_company_id_from_project()
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

DROP TRIGGER IF EXISTS set_estimate_company_id_from_project ON public.estimates;
CREATE TRIGGER set_estimate_company_id_from_project
  BEFORE INSERT OR UPDATE ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_estimate_company_id_from_project();

-- Report what was updated
DO $$
DECLARE
  v_proposals int;
  v_estimates int;
  v_blocks int;
  v_items int;
BEGIN
  SELECT COUNT(*) INTO v_proposals FROM public.proposals WHERE company_id IS NOT NULL;
  SELECT COUNT(*) INTO v_estimates FROM public.estimates WHERE company_id IS NOT NULL;
  SELECT COUNT(*) INTO v_blocks FROM public.scope_blocks WHERE company_id IS NOT NULL;
  SELECT COUNT(*) INTO v_items FROM public.scope_block_cost_items WHERE company_id IS NOT NULL;
  
  RAISE NOTICE 'Backfill complete:';
  RAISE NOTICE '  Proposals with company_id: %', v_proposals;
  RAISE NOTICE '  Estimates with company_id: %', v_estimates;
  RAISE NOTICE '  Scope blocks with company_id: %', v_blocks;
  RAISE NOTICE '  Cost items with company_id: %', v_items;
END $$;

