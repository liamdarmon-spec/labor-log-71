-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'field_user');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'field_user',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- Create workers table
CREATE TABLE public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trade TEXT NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  project_manager TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create daily_logs table
CREATE TABLE public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  hours_worked DECIMAL(5, 2) NOT NULL CHECK (hours_worked > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- Create index for better query performance
CREATE INDEX idx_daily_logs_date ON public.daily_logs(date);
CREATE INDEX idx_daily_logs_worker ON public.daily_logs(worker_id);
CREATE INDEX idx_daily_logs_project ON public.daily_logs(project_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for workers
CREATE POLICY "Anyone authenticated can view workers"
  ON public.workers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage workers"
  ON public.workers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for projects
CREATE POLICY "Anyone authenticated can view projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage projects"
  ON public.projects FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for daily_logs
CREATE POLICY "Anyone authenticated can view daily logs"
  ON public.daily_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone authenticated can create daily logs"
  ON public.daily_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update daily logs"
  ON public.daily_logs FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete daily logs"
  ON public.daily_logs FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON public.workers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to assign default role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'field_user');
  RETURN NEW;
END;
$$;

-- Trigger to assign role when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();