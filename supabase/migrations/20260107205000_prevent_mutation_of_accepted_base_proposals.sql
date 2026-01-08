-- ============================================================================
-- Prevent mutation of accepted base proposals (contract immutability)
--
-- Rationale: Accepted proposals become contractual documents. Editing after acceptance
-- is a legal + financial hazard. Users should create a Change Order instead.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tg_prevent_mutation_of_accepted_base_proposals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only apply to base proposals (not change orders) once accepted.
  IF OLD.parent_proposal_id IS NULL AND OLD.acceptance_status = 'accepted' AND NEW.acceptance_status = 'accepted' THEN
    -- Block any changes to contractual fields.
    IF
      (NEW.title IS DISTINCT FROM OLD.title) OR
      (NEW.intro_text IS DISTINCT FROM OLD.intro_text) OR
      (NEW.settings IS DISTINCT FROM OLD.settings) OR
      (NEW.subtotal_amount IS DISTINCT FROM OLD.subtotal_amount) OR
      (NEW.tax_amount IS DISTINCT FROM OLD.tax_amount) OR
      (NEW.total_amount IS DISTINCT FROM OLD.total_amount) OR
      (NEW.billing_basis IS DISTINCT FROM OLD.billing_basis) OR
      (NEW.contract_type IS DISTINCT FROM OLD.contract_type) OR
      (NEW.billing_terms IS DISTINCT FROM OLD.billing_terms) OR
      (NEW.retainage_percent IS DISTINCT FROM OLD.retainage_percent)
    THEN
      RAISE EXCEPTION 'Accepted proposal is immutable. Create a change order to modify the contract.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_mutation_of_accepted_base_proposals ON public.proposals;

CREATE TRIGGER prevent_mutation_of_accepted_base_proposals
BEFORE UPDATE ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.tg_prevent_mutation_of_accepted_base_proposals();


