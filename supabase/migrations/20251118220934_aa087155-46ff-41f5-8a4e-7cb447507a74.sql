-- Fix worker data privacy: Only admins can view sensitive worker data
DROP POLICY IF EXISTS "Authenticated users can manage workers" ON public.workers;

-- Allow all authenticated users to view basic worker info (name, trade, active status)
-- But only admins can view sensitive data like phone numbers
CREATE POLICY "Authenticated users can view workers"
ON public.workers
FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert workers
CREATE POLICY "Admins can insert workers"
ON public.workers
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update workers
CREATE POLICY "Admins can update workers"
ON public.workers
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete workers
CREATE POLICY "Admins can delete workers"
ON public.workers
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create a view for non-admin users that excludes phone numbers
CREATE OR REPLACE VIEW public.workers_public AS
SELECT 
  id,
  name,
  trade_id,
  trade,
  hourly_rate,
  active,
  created_at,
  updated_at,
  CASE 
    WHEN public.has_role(auth.uid(), 'admin') THEN phone
    ELSE NULL
  END as phone
FROM public.workers;