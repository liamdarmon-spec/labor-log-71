-- Ensure default cost code ID columns exist on trades

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS default_labor_cost_code_id UUID,
  ADD COLUMN IF NOT EXISTS default_sub_cost_code_id UUID,
  ADD COLUMN IF NOT EXISTS default_material_cost_code_id UUID,
  ADD COLUMN IF NOT EXISTS default_equipment_cost_code_id UUID;

-- Add FKs only if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'trades_default_labor_cost_code_id_fkey'
  ) THEN
    ALTER TABLE public.trades
      ADD CONSTRAINT trades_default_labor_cost_code_id_fkey
      FOREIGN KEY (default_labor_cost_code_id)
      REFERENCES public.cost_codes(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'trades_default_sub_cost_code_id_fkey'
  ) THEN
    ALTER TABLE public.trades
      ADD CONSTRAINT trades_default_sub_cost_code_id_fkey
      FOREIGN KEY (default_sub_cost_code_id)
      REFERENCES public.cost_codes(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'trades_default_material_cost_code_id_fkey'
  ) THEN
    ALTER TABLE public.trades
      ADD CONSTRAINT trades_default_material_cost_code_id_fkey
      FOREIGN KEY (default_material_cost_code_id)
      REFERENCES public.cost_codes(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'trades_default_equipment_cost_code_id_fkey'
  ) THEN
    ALTER TABLE public.trades
      ADD CONSTRAINT trades_default_equipment_cost_code_id_fkey
      FOREIGN KEY (default_equipment_cost_code_id)
      REFERENCES public.cost_codes(id)
      ON DELETE SET NULL;
  END IF;
END $$;
