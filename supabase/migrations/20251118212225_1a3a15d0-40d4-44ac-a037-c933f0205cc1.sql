-- Add trade_id column to daily_logs table to track which trade was performed on each project
ALTER TABLE public.daily_logs
ADD COLUMN trade_id uuid REFERENCES public.trades(id);

-- Add index for better query performance
CREATE INDEX idx_daily_logs_trade_id ON public.daily_logs(trade_id);