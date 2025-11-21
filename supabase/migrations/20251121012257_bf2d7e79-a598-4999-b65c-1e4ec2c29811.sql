-- Create sub_scheduled_shifts table for scheduling subcontractors
CREATE TABLE IF NOT EXISTS public.sub_scheduled_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_id UUID NOT NULL REFERENCES public.subs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_hours NUMERIC(5,2) DEFAULT 8,
  notes TEXT,
  status TEXT DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sub_scheduled_shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view sub schedules"
  ON public.sub_scheduled_shifts
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert sub schedules"
  ON public.sub_scheduled_shifts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update sub schedules"
  ON public.sub_scheduled_shifts
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete sub schedules"
  ON public.sub_scheduled_shifts
  FOR DELETE
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_sub_scheduled_shifts_updated_at
  BEFORE UPDATE ON public.sub_scheduled_shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_sub_scheduled_shifts_sub_id ON public.sub_scheduled_shifts(sub_id);
CREATE INDEX idx_sub_scheduled_shifts_project_id ON public.sub_scheduled_shifts(project_id);
CREATE INDEX idx_sub_scheduled_shifts_date ON public.sub_scheduled_shifts(scheduled_date);