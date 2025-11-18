-- Create trades table for better trade management
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trades
CREATE POLICY "Anyone authenticated can view trades"
  ON public.trades FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage trades"
  ON public.trades FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Add trade_id column to workers table
ALTER TABLE public.workers ADD COLUMN trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_workers_trade ON public.workers(trade_id);

-- Insert common construction trades as starting data
INSERT INTO public.trades (name, description) VALUES
  ('Carpenter', 'Framing, finish work, cabinetry'),
  ('Electrician', 'Electrical installation and repair'),
  ('Plumber', 'Plumbing installation and repair'),
  ('HVAC Technician', 'Heating, ventilation, and air conditioning'),
  ('Mason', 'Bricklaying, stonework, concrete'),
  ('Painter', 'Interior and exterior painting'),
  ('Roofer', 'Roofing installation and repair'),
  ('Drywall Installer', 'Drywall hanging and finishing'),
  ('Flooring Installer', 'Hardwood, tile, carpet installation'),
  ('General Laborer', 'General construction support'),
  ('Foreman', 'Site supervision and coordination'),
  ('Equipment Operator', 'Heavy machinery operation');