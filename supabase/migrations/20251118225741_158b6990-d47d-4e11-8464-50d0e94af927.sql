-- Create archived_daily_logs table
CREATE TABLE IF NOT EXISTS public.archived_daily_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id UUID NOT NULL,
  date DATE NOT NULL,
  worker_id UUID NOT NULL,
  project_id UUID NOT NULL,
  hours_worked NUMERIC NOT NULL,
  notes TEXT,
  trade_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  archived_by UUID
);

-- Enable RLS on archived_daily_logs
ALTER TABLE public.archived_daily_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage archived logs
CREATE POLICY "Authenticated users can manage archived logs"
ON public.archived_daily_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to auto-delete old archived entries
CREATE OR REPLACE FUNCTION delete_old_archived_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.archived_daily_logs
  WHERE archived_at < NOW() - INTERVAL '3 days';
END;
$$;

-- Create trigger to automatically delete old archived entries daily
-- Note: This uses pg_cron which needs to be enabled in Supabase
-- The cron job will be set up separately