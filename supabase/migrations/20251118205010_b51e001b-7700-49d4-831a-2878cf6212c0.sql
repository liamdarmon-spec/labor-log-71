-- Update RLS policies to allow all authenticated users to manage data

-- Projects: Allow all authenticated users to manage
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone authenticated can view projects" ON public.projects;

CREATE POLICY "Authenticated users can manage projects"
ON public.projects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Workers: Allow all authenticated users to manage
DROP POLICY IF EXISTS "Admins can manage workers" ON public.workers;
DROP POLICY IF EXISTS "Anyone authenticated can view workers" ON public.workers;

CREATE POLICY "Authenticated users can manage workers"
ON public.workers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trades: Allow all authenticated users to manage
DROP POLICY IF EXISTS "Admins can manage trades" ON public.trades;
DROP POLICY IF EXISTS "Anyone authenticated can view trades" ON public.trades;

CREATE POLICY "Authenticated users can manage trades"
ON public.trades
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Daily logs: Update to allow all authenticated users to manage
DROP POLICY IF EXISTS "Admins can delete daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Admins can update daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Anyone authenticated can create daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Anyone authenticated can view daily logs" ON public.daily_logs;

CREATE POLICY "Authenticated users can manage daily logs"
ON public.daily_logs
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);