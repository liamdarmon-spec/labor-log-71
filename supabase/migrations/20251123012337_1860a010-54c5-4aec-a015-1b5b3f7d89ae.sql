-- =====================================================
-- MATERIAL LAYER BACKEND OPTIMIZATION
-- Fix sync logic, add vendor_type, ensure data integrity
-- =====================================================

-- 1. Update sync function to include vendor_type and proper description
CREATE OR REPLACE FUNCTION public.sync_material_receipt_to_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_name TEXT;
  v_description TEXT;
BEGIN
  -- Get vendor name
  IF NEW.vendor_id IS NOT NULL THEN
    SELECT name INTO v_vendor_name
    FROM material_vendors
    WHERE id = NEW.vendor_id;
  END IF;
  
  -- Use legacy vendor field if vendor_id is null
  IF v_vendor_name IS NULL THEN
    v_vendor_name := COALESCE(NEW.vendor, 'Unknown Vendor');
  END IF;

  v_description := 'Material Receipt - ' || v_vendor_name;

  IF TG_OP = 'INSERT' THEN
    -- Create new cost entry
    INSERT INTO costs (
      project_id,
      vendor_id,
      vendor_type,
      cost_code_id,
      category,
      amount,
      date_incurred,
      description,
      notes,
      status
    ) VALUES (
      NEW.project_id,
      NEW.vendor_id,
      'material_vendor',
      NEW.cost_code_id,
      'materials',
      NEW.total,
      NEW.receipt_date,
      v_description,
      NEW.notes,
      'unpaid'
    )
    RETURNING id INTO NEW.linked_cost_id;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update existing cost entry
    IF NEW.linked_cost_id IS NOT NULL THEN
      UPDATE costs
      SET
        project_id = NEW.project_id,
        vendor_id = NEW.vendor_id,
        vendor_type = 'material_vendor',
        cost_code_id = NEW.cost_code_id,
        category = 'materials',
        amount = NEW.total,
        date_incurred = NEW.receipt_date,
        description = v_description,
        notes = NEW.notes,
        updated_at = now()
      WHERE id = NEW.linked_cost_id;
    ELSE
      -- Create cost entry if it doesn't exist (data recovery)
      INSERT INTO costs (
        project_id,
        vendor_id,
        vendor_type,
        cost_code_id,
        category,
        amount,
        date_incurred,
        description,
        notes,
        status
      ) VALUES (
        NEW.project_id,
        NEW.vendor_id,
        'material_vendor',
        NEW.cost_code_id,
        'materials',
        NEW.total,
        NEW.receipt_date,
        v_description,
        NEW.notes,
        'unpaid'
      )
      RETURNING id INTO NEW.linked_cost_id;
    END IF;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Delete linked cost entry
    IF OLD.linked_cost_id IS NOT NULL THEN
      DELETE FROM costs WHERE id = OLD.linked_cost_id;
    END IF;
    
    RETURN OLD;
  END IF;
END;
$$;

-- 2. Add check constraint to ensure cost_code_id is set
ALTER TABLE public.material_receipts
  DROP CONSTRAINT IF EXISTS material_receipts_cost_code_check;

ALTER TABLE public.material_receipts
  ADD CONSTRAINT material_receipts_cost_code_check
  CHECK (cost_code_id IS NOT NULL);

-- 3. Add additional performance indexes
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_material_receipts_project_id ON public.material_receipts(project_id);
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_costs_project_category ON public.costs(project_id, category);
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_costs_linked_receipt ON public.costs((vendor_type)) WHERE vendor_type = 'material_vendor';
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_costs_vendor_type_category ON public.costs(vendor_type, category);

-- 4. Add function to get material actuals by project (single source of truth)
CREATE OR REPLACE FUNCTION public.get_material_actuals_by_project(p_project_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM costs
  WHERE project_id = p_project_id
    AND category = 'materials'
    AND status != 'void';
$$;

-- 5. Add function to get material actuals by cost code
CREATE OR REPLACE FUNCTION public.get_material_actuals_by_cost_code(p_project_id UUID, p_cost_code_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM costs
  WHERE project_id = p_project_id
    AND category = 'materials'
    AND cost_code_id = p_cost_code_id
    AND status != 'void';
$$;

-- 6. Create view for material actuals summary (for reporting consistency)
CREATE OR REPLACE VIEW public.material_actuals_by_project AS
SELECT
  p.id as project_id,
  p.project_name,
  p.company_id,
  COALESCE(SUM(c.amount), 0) as material_actual,
  pb.materials_budget,
  COALESCE(pb.materials_budget, 0) - COALESCE(SUM(c.amount), 0) as material_variance,
  COUNT(DISTINCT mr.id) as receipt_count,
  COUNT(DISTINCT c.vendor_id) as vendor_count
FROM projects p
LEFT JOIN costs c ON c.project_id = p.id AND c.category = 'materials' AND c.status != 'void'
LEFT JOIN material_receipts mr ON mr.project_id = p.id
LEFT JOIN project_budgets pb ON pb.project_id = p.id
GROUP BY p.id, p.project_name, p.company_id, pb.materials_budget;

-- 7. Enable RLS on the new view
ALTER VIEW public.material_actuals_by_project SET (security_invoker = true);

COMMENT ON VIEW public.material_actuals_by_project IS 
'Single source of truth for material actuals per project. All material costs come from costs table with category=materials.';