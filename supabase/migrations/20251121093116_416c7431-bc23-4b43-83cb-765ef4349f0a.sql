-- Create trigger function to auto-assign labor cost code from worker's trade
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
      SELECT default_labor_cost_code_id INTO v_labor_cost_code_id
      FROM trades
      WHERE id = v_trade_id;
      
      -- Assign it if found
      IF v_labor_cost_code_id IS NOT NULL THEN
        NEW.cost_code_id := v_labor_cost_code_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on daily_logs to auto-assign labor cost code
DROP TRIGGER IF EXISTS auto_assign_labor_cost_code_trigger ON daily_logs;
CREATE TRIGGER auto_assign_labor_cost_code_trigger
  BEFORE INSERT OR UPDATE ON daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_labor_cost_code();

-- Create trigger function to auto-assign sub cost code from sub's trade
CREATE OR REPLACE FUNCTION public.auto_assign_sub_cost_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade_id UUID;
  v_sub_cost_code_id UUID;
BEGIN
  -- Only auto-assign if cost_code_id is null
  IF NEW.cost_code_id IS NULL THEN
    -- Get the sub's trade_id
    SELECT trade_id INTO v_trade_id
    FROM subs
    WHERE id = NEW.sub_id;
    
    IF v_trade_id IS NOT NULL THEN
      -- Find the Sub cost code for this trade
      SELECT default_sub_cost_code_id INTO v_sub_cost_code_id
      FROM trades
      WHERE id = v_trade_id;
      
      -- Assign it if found
      IF v_sub_cost_code_id IS NOT NULL THEN
        NEW.cost_code_id := v_sub_cost_code_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on sub_logs to auto-assign sub cost code
DROP TRIGGER IF EXISTS auto_assign_sub_cost_code_trigger ON sub_logs;
CREATE TRIGGER auto_assign_sub_cost_code_trigger
  BEFORE INSERT OR UPDATE ON sub_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_sub_cost_code();