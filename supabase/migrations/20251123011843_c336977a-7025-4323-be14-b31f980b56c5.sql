-- =====================================================
-- MATERIAL MANAGEMENT BACKBONE UPGRADE
-- =====================================================

-- 1. Create material_vendors table
CREATE TABLE IF NOT EXISTS public.material_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
  default_cost_code_id UUID REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  phone TEXT,
  email TEXT,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Update material_receipts table to match spec
ALTER TABLE public.material_receipts 
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.material_vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receipt_date DATE,
  ADD COLUMN IF NOT EXISTS shipping NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS receipt_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_cost_id UUID REFERENCES public.costs(id) ON DELETE SET NULL;

-- Migrate existing vendor text to vendor_id (will be handled in app)
-- Migrate existing date to receipt_date
UPDATE public.material_receipts 
SET receipt_date = date 
WHERE receipt_date IS NULL AND date IS NOT NULL;

-- Make receipt_date required going forward
ALTER TABLE public.material_receipts 
  ALTER COLUMN receipt_date SET NOT NULL;

-- 3. Create function to sync material_receipts → costs
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
  ELSE
    v_vendor_name := COALESCE(NEW.vendor, 'Misc Materials Vendor');
  END IF;

  v_description := 'Material Receipt: ' || v_vendor_name;

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
        cost_code_id = NEW.cost_code_id,
        amount = NEW.total,
        date_incurred = NEW.receipt_date,
        description = v_description,
        notes = NEW.notes,
        updated_at = now()
      WHERE id = NEW.linked_cost_id;
    ELSE
      -- Create cost entry if it doesn't exist
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

-- 4. Create trigger for auto-sync
DROP TRIGGER IF EXISTS trigger_sync_material_receipt_to_cost ON public.material_receipts;
CREATE TRIGGER trigger_sync_material_receipt_to_cost
  BEFORE INSERT OR UPDATE ON public.material_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_material_receipt_to_cost();

DROP TRIGGER IF EXISTS trigger_delete_material_receipt_cost ON public.material_receipts;
CREATE TRIGGER trigger_delete_material_receipt_cost
  AFTER DELETE ON public.material_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_material_receipt_to_cost();

-- 5. Add RLS policies for material_vendors
ALTER TABLE public.material_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view material vendors"
  ON public.material_vendors FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert material vendors"
  ON public.material_vendors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update material vendors"
  ON public.material_vendors FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete material vendors"
  ON public.material_vendors FOR DELETE
  USING (true);

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_material_receipts_vendor_id ON public.material_receipts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_material_receipts_receipt_date ON public.material_receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_material_receipts_linked_cost_id ON public.material_receipts(linked_cost_id);
CREATE INDEX IF NOT EXISTS idx_material_vendors_trade_id ON public.material_vendors(trade_id);
CREATE INDEX IF NOT EXISTS idx_material_vendors_active ON public.material_vendors(active);

-- 7. Add updated_at trigger for material_vendors
CREATE TRIGGER update_material_vendors_updated_at
  BEFORE UPDATE ON public.material_vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();