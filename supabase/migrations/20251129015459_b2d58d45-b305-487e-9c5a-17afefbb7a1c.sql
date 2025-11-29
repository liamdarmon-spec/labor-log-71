-- Hard guardrail: prevent changing hours or labor_cost on PAID time logs
CREATE OR REPLACE FUNCTION prevent_paid_time_log_mutation()
RETURNS trigger AS $$
BEGIN
  -- Only apply to already-paid logs
  IF OLD.payment_status = 'paid' THEN
    -- If hours or labor_cost changed, block it
    IF NEW.hours_worked IS DISTINCT FROM OLD.hours_worked
       OR NEW.labor_cost IS DISTINCT FROM OLD.labor_cost THEN
      RAISE EXCEPTION 
        'Cannot change hours or labor_cost on a paid time log. Adjust allocations instead.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_paid_time_log_mutation ON public.time_logs;

CREATE TRIGGER trg_prevent_paid_time_log_mutation
BEFORE UPDATE ON public.time_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_paid_time_log_mutation();