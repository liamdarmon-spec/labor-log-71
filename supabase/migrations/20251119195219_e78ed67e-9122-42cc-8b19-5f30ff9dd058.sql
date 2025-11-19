-- Create scheduled_shifts table for scheduling workers
CREATE TABLE public.scheduled_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  scheduled_hours NUMERIC NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_shifts ENABLE ROW LEVEL SECURITY;

-- RLS policies for scheduled_shifts
CREATE POLICY "Authenticated users can view schedules"
ON public.scheduled_shifts
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert schedules"
ON public.scheduled_shifts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update schedules"
ON public.scheduled_shifts
FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete schedules"
ON public.scheduled_shifts
FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_scheduled_shifts_updated_at
BEFORE UPDATE ON public.scheduled_shifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_scheduled_shifts_date ON public.scheduled_shifts(scheduled_date);
CREATE INDEX idx_scheduled_shifts_worker ON public.scheduled_shifts(worker_id);
CREATE INDEX idx_scheduled_shifts_project ON public.scheduled_shifts(project_id);