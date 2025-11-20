-- Drop all RLS policies and make all tables publicly accessible
-- WARNING: This removes all security! Anyone can read/write all data.

-- Drop all policies on archived_daily_logs
DROP POLICY IF EXISTS "Authenticated users can manage archived logs" ON public.archived_daily_logs;
ALTER TABLE public.archived_daily_logs DISABLE ROW LEVEL SECURITY;

-- Drop all policies on companies
DROP POLICY IF EXISTS "Authenticated users can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

-- Drop all policies on daily_logs
DROP POLICY IF EXISTS "Authenticated users can manage daily logs" ON public.daily_logs;
ALTER TABLE public.daily_logs DISABLE ROW LEVEL SECURITY;

-- Drop all policies on invitations
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can check their own invitation" ON public.invitations;
ALTER TABLE public.invitations DISABLE ROW LEVEL SECURITY;

-- Drop all policies on payments
DROP POLICY IF EXISTS "Authenticated users can delete payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can update payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;

-- Drop all policies on projects
DROP POLICY IF EXISTS "Authenticated users can manage projects" ON public.projects;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

-- Drop all policies on schedule_modifications
DROP POLICY IF EXISTS "Authenticated users can create schedule modifications" ON public.schedule_modifications;
DROP POLICY IF EXISTS "Authenticated users can view schedule modifications" ON public.schedule_modifications;
ALTER TABLE public.schedule_modifications DISABLE ROW LEVEL SECURITY;

-- Drop all policies on scheduled_shifts
DROP POLICY IF EXISTS "Authenticated users can delete schedules" ON public.scheduled_shifts;
DROP POLICY IF EXISTS "Authenticated users can insert schedules" ON public.scheduled_shifts;
DROP POLICY IF EXISTS "Authenticated users can update schedules" ON public.scheduled_shifts;
DROP POLICY IF EXISTS "Authenticated users can view schedules" ON public.scheduled_shifts;
ALTER TABLE public.scheduled_shifts DISABLE ROW LEVEL SECURITY;

-- Drop all policies on trades
DROP POLICY IF EXISTS "Authenticated users can manage trades" ON public.trades;
ALTER TABLE public.trades DISABLE ROW LEVEL SECURITY;

-- Drop all policies on user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Drop all policies on workers
DROP POLICY IF EXISTS "Admins can delete workers" ON public.workers;
DROP POLICY IF EXISTS "Admins can insert workers" ON public.workers;
DROP POLICY IF EXISTS "Admins can update workers" ON public.workers;
DROP POLICY IF EXISTS "Authenticated users can view workers" ON public.workers;
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;