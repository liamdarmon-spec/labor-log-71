-- Ensure trades table has all required default cost code ID columns
-- This migration is idempotent and safe to run multiple times

-- Add default_labor_cost_code_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trades' 
    AND column_name = 'default_labor_cost_code_id'
  ) THEN
    ALTER TABLE public.trades
      ADD COLUMN default_labor_cost_code_id uuid REFERENCES public.cost_codes(id);
  END IF;
END $$;

-- Add default_sub_cost_code_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trades' 
    AND column_name = 'default_sub_cost_code_id'
  ) THEN
    ALTER TABLE public.trades
      ADD COLUMN default_sub_cost_code_id uuid REFERENCES public.cost_codes(id);
  END IF;
END $$;

-- Add default_material_cost_code_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trades' 
    AND column_name = 'default_material_cost_code_id'
  ) THEN
    ALTER TABLE public.trades
      ADD COLUMN default_material_cost_code_id uuid REFERENCES public.cost_codes(id);
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trades_default_labor_cost_code 
  ON public.trades(default_labor_cost_code_id);

CREATE INDEX IF NOT EXISTS idx_trades_default_sub_cost_code 
  ON public.trades(default_sub_cost_code_id);

CREATE INDEX IF NOT EXISTS idx_trades_default_material_cost_code 
  ON public.trades(default_material_cost_code_id);
