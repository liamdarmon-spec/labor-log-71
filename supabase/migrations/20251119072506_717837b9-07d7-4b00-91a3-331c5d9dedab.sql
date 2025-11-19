-- Update delete_old_archived_logs function to delete after 24 hours instead of 3 days
CREATE OR REPLACE FUNCTION public.delete_old_archived_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.archived_daily_logs
  WHERE archived_at < NOW() - INTERVAL '24 hours';
END;
$$;