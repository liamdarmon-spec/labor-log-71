-- Add cost code mappings to trades table
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS default_labor_cost_code_id UUID REFERENCES public.cost_codes(id),
ADD COLUMN IF NOT EXISTS default_material_cost_code_id UUID REFERENCES public.cost_codes(id);

-- Create function to auto-assign labor cost code to daily logs
CREATE OR REPLACE FUNCTION public.auto_assign_labor_cost_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_labor_cost_code_id UUID;
BEGIN
  -- Only auto-assign if cost_code_id is null
  IF NEW.cost_code_id IS NULL THEN
    -- Get the worker's trade's default labor cost code
    SELECT t.default_labor_cost_code_id
    INTO v_default_labor_cost_code_id
    FROM workers w
    JOIN trades t ON w.trade_id = t.id
    WHERE w.id = NEW.worker_id;
    
    -- Assign it if found
    IF v_default_labor_cost_code_id IS NOT NULL THEN
      NEW.cost_code_id := v_default_labor_cost_code_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign cost codes on daily_logs insert
DROP TRIGGER IF EXISTS trigger_auto_assign_labor_cost_code ON public.daily_logs;
CREATE TRIGGER trigger_auto_assign_labor_cost_code
  BEFORE INSERT ON public.daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_labor_cost_code();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_daily_logs_cost_code_id ON public.daily_logs(cost_code_id);
CREATE INDEX IF NOT EXISTS idx_trades_default_labor_cost_code ON public.trades(default_labor_cost_code_id);
CREATE INDEX IF NOT EXISTS idx_trades_default_material_cost_code ON public.trades(default_material_cost_code_id);