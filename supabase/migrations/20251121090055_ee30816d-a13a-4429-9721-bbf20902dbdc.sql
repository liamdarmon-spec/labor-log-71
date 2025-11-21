-- Add trade_id to cost_codes to link cost codes to specific trades
ALTER TABLE public.cost_codes
ADD COLUMN IF NOT EXISTS trade_id UUID REFERENCES public.trades(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cost_codes_trade_id ON public.cost_codes(trade_id);

-- Update the auto-assignment function to use trade-specific cost codes
CREATE OR REPLACE FUNCTION public.auto_assign_labor_cost_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade_id UUID;
  v_labor_cost_code_id UUID;
BEGIN
  -- Only auto-assign if cost_code_id is null
  IF NEW.cost_code_id IS NULL THEN
    -- Get the worker's trade_id
    SELECT trade_id INTO v_trade_id
    FROM workers
    WHERE id = NEW.worker_id;
    
    IF v_trade_id IS NOT NULL THEN
      -- Find the Labor cost code for this trade
      SELECT id INTO v_labor_cost_code_id
      FROM cost_codes
      WHERE trade_id = v_trade_id
        AND category = 'labor'
        AND is_active = true
      LIMIT 1;
      
      -- Assign it if found
      IF v_labor_cost_code_id IS NOT NULL THEN
        NEW.cost_code_id := v_labor_cost_code_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;