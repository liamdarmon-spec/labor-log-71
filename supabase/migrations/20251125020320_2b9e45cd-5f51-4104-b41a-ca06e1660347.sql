-- Add missing columns to labor_pay_runs table
ALTER TABLE labor_pay_runs 
ADD COLUMN IF NOT EXISTS total_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Add comment to clarify the trigger behavior
COMMENT ON FUNCTION mark_time_logs_paid_on_pay_run() IS 
'Automatically updates time_logs.payment_status and paid_amount when a labor_pay_run status changes to paid';
