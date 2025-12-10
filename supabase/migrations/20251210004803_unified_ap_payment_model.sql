-- ============================================================================
-- UNIFIED AP PAYMENT MODEL
-- 
-- This migration standardizes the Accounts Payable (AP) model for all 
-- non-labor costs (subs, materials, equipment, other) to support:
-- 1. Partial payments (paid_amount tracking)
-- 2. Many-to-many relationship between payments and costs via join table
-- 3. Unified payment batch processing for subs and materials
-- ============================================================================

-- ============================================================================
-- 1) ADD paid_amount COLUMN TO costs TABLE
-- ============================================================================

ALTER TABLE public.costs 
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0 NOT NULL;

-- Backfill: if status = 'paid', set paid_amount = amount
UPDATE public.costs 
SET paid_amount = amount 
WHERE status = 'paid' AND paid_amount = 0;

-- ============================================================================
-- 2) EXPAND status CONSTRAINT TO INCLUDE 'partially_paid'
-- ============================================================================

ALTER TABLE public.costs 
  DROP CONSTRAINT IF EXISTS costs_status_check;

ALTER TABLE public.costs
  ADD CONSTRAINT costs_status_check 
  CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'void', 'disputed'));

-- ============================================================================
-- 3) ENSURE vendor_payment_items TABLE EXISTS AND HAS CORRECT COLUMN NAME
-- ============================================================================

-- This table should already exist from migration 20251125054535
-- If it doesn't, create it:
CREATE TABLE IF NOT EXISTS public.vendor_payment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.vendor_payments(id) ON DELETE CASCADE,
  cost_id UUID NOT NULL REFERENCES public.costs(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL, -- Old column name
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rename 'amount' to 'applied_amount' if it exists and applied_amount doesn't
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vendor_payment_items' 
    AND column_name = 'amount'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vendor_payment_items' 
    AND column_name = 'applied_amount'
  ) THEN
    ALTER TABLE public.vendor_payment_items 
      RENAME COLUMN amount TO applied_amount;
  END IF;
END $$;

-- Add applied_amount column if it doesn't exist (after rename attempt)
ALTER TABLE public.vendor_payment_items 
  ADD COLUMN IF NOT EXISTS applied_amount NUMERIC(12,2);

-- If applied_amount is NULL, backfill from amount (if amount still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vendor_payment_items' 
    AND column_name = 'amount'
  ) THEN
    UPDATE public.vendor_payment_items 
    SET applied_amount = amount 
    WHERE applied_amount IS NULL;
    
    -- Drop old amount column
    ALTER TABLE public.vendor_payment_items DROP COLUMN IF EXISTS amount;
  END IF;
END $$;

-- Ensure applied_amount is NOT NULL and has constraint
ALTER TABLE public.vendor_payment_items 
  ALTER COLUMN applied_amount SET NOT NULL;

ALTER TABLE public.vendor_payment_items 
  DROP CONSTRAINT IF EXISTS vendor_payment_items_applied_amount_check;

ALTER TABLE public.vendor_payment_items
  ADD CONSTRAINT vendor_payment_items_applied_amount_check 
  CHECK (applied_amount > 0);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vendor_payment_items_payment_id_cost_id_key'
  ) THEN
    ALTER TABLE public.vendor_payment_items 
      ADD CONSTRAINT vendor_payment_items_payment_id_cost_id_key 
      UNIQUE(payment_id, cost_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vendor_payment_items_payment 
  ON public.vendor_payment_items(payment_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payment_items_cost 
  ON public.vendor_payment_items(cost_id);

-- ============================================================================
-- 4) FUNCTION: UPDATE cost.paid_amount FROM payment_items
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_cost_paid_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  total_paid NUMERIC(12,2);
  cost_amount NUMERIC(12,2);
  new_status TEXT;
BEGIN
  -- Calculate total paid_amount for this cost from all payment_items
  SELECT COALESCE(SUM(applied_amount), 0), c.amount
  INTO total_paid, cost_amount
  FROM public.vendor_payment_items vpi
  JOIN public.costs c ON c.id = vpi.cost_id
  WHERE vpi.cost_id = COALESCE(NEW.cost_id, OLD.cost_id)
  GROUP BY c.amount;

  -- Determine status based on paid_amount vs amount
  IF total_paid = 0 THEN
    new_status := 'unpaid';
  ELSIF total_paid >= cost_amount THEN
    new_status := 'paid';
  ELSE
    new_status := 'partially_paid';
  END IF;

  -- Update the cost record
  UPDATE public.costs
  SET 
    paid_amount = total_paid,
    status = new_status,
    paid_date = CASE WHEN new_status = 'paid' THEN CURRENT_DATE ELSE paid_date END,
    updated_at = now()
  WHERE id = COALESCE(NEW.cost_id, OLD.cost_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- 5) TRIGGERS: AUTO-UPDATE cost.paid_amount WHEN payment_items CHANGE
-- ============================================================================

DROP TRIGGER IF EXISTS trg_update_cost_paid_on_payment_item_insert 
  ON public.vendor_payment_items;
DROP TRIGGER IF EXISTS trg_update_cost_paid_on_payment_item_update 
  ON public.vendor_payment_items;
DROP TRIGGER IF EXISTS trg_update_cost_paid_on_payment_item_delete 
  ON public.vendor_payment_items;

CREATE TRIGGER trg_update_cost_paid_on_payment_item_insert
  AFTER INSERT ON public.vendor_payment_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cost_paid_amount();

CREATE TRIGGER trg_update_cost_paid_on_payment_item_update
  AFTER UPDATE ON public.vendor_payment_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cost_paid_amount();

CREATE TRIGGER trg_update_cost_paid_on_payment_item_delete
  AFTER DELETE ON public.vendor_payment_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cost_paid_amount();

-- ============================================================================
-- 6) ADD retention_amount COLUMN TO costs (for subcontractor retention)
-- ============================================================================

ALTER TABLE public.costs 
  ADD COLUMN IF NOT EXISTS retention_amount NUMERIC(12,2) DEFAULT 0;

COMMENT ON COLUMN public.costs.retention_amount IS 
  'Amount held as retention (typically for subcontractor costs). Payable amount = amount - retention_amount.';

-- ============================================================================
-- 7) UPDATE EXISTING VIEWS TO USE paid_amount
-- ============================================================================

-- Update project_costs_view to use paid_amount
DROP VIEW IF EXISTS public.project_costs_view CASCADE;

CREATE OR REPLACE VIEW public.project_costs_view AS
SELECT 
  p.id AS project_id,
  p.project_name,
  c.category,
  c.cost_code_id,
  cc.code AS cost_code,
  cc.name AS cost_code_name,
  SUM(c.amount) AS total_cost,
  SUM(c.amount - c.paid_amount) AS unpaid_cost,
  SUM(c.paid_amount) AS paid_cost,
  COUNT(*) AS cost_entry_count,
  MIN(c.date_incurred) AS first_cost_date,
  MAX(c.date_incurred) AS last_cost_date
FROM public.projects p
JOIN public.costs c ON c.project_id = p.id
LEFT JOIN public.cost_codes cc ON cc.id = c.cost_code_id
GROUP BY p.id, p.project_name, c.category, c.cost_code_id, cc.code, cc.name;

-- Update monthly_costs_view to use paid_amount
DROP VIEW IF EXISTS public.monthly_costs_view CASCADE;

CREATE OR REPLACE VIEW public.monthly_costs_view AS
SELECT
  date_trunc('month', c.date_incurred)::date AS month,
  c.category,
  SUM(c.amount) AS total_cost,
  SUM(c.amount - c.paid_amount) AS unpaid_cost,
  SUM(c.paid_amount) AS paid_cost,
  COUNT(*) AS cost_entry_count
FROM public.costs c
GROUP BY date_trunc('month', c.date_incurred), c.category;

-- ============================================================================
-- 8) INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_costs_paid_amount 
  ON public.costs(paid_amount) 
  WHERE paid_amount > 0;

CREATE INDEX IF NOT EXISTS idx_costs_status_paid_amount 
  ON public.costs(status, paid_amount);

-- ============================================================================
-- 9) COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.costs.paid_amount IS 
  'Total amount paid against this cost (sum of applied_amount from vendor_payment_items). Auto-calculated by trigger.';

COMMENT ON COLUMN public.costs.status IS 
  'Payment status: unpaid (paid_amount=0), partially_paid (0<paid_amount<amount), paid (paid_amount>=amount), void, disputed.';

COMMENT ON TABLE public.vendor_payment_items IS 
  'Join table linking vendor_payments to costs. Each row represents a payment applied to a specific cost.';

COMMENT ON COLUMN public.vendor_payment_items.applied_amount IS 
  'Amount from this payment applied to the linked cost. Sum of all applied_amount for a cost = cost.paid_amount.';
