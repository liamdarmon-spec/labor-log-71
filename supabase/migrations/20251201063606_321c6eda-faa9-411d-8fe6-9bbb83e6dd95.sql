-- Create measurement_units table with comprehensive residential construction units
DO $$
BEGIN
  -- 1) Canonical units table
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'measurement_units'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.measurement_units(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text NOT NULL UNIQUE,
      label text NOT NULL,
      category text NOT NULL DEFAULT 'general',
      sort_order int NOT NULL DEFAULT 100,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;

  -- 2) Seed residential construction units (American standards)
  INSERT INTO public.measurement_units (code, label, category, sort_order)
  VALUES
    -- Count
    ('ea', 'Each', 'count', 10),
    ('pc', 'Piece', 'count', 11),
    ('set', 'Set', 'count', 12),
    ('pair', 'Pair', 'count', 13),
    
    -- Time
    ('hr', 'Hour', 'time', 20),
    ('day', 'Day', 'time', 21),
    ('wk', 'Week', 'time', 22),
    
    -- Linear (Length)
    ('lf', 'Linear Foot', 'length', 30),
    ('in', 'Inch', 'length', 31),
    ('ft', 'Foot', 'length', 32),
    ('yd', 'Yard', 'length', 33),
    ('bf', 'Board Foot', 'length', 34),
    
    -- Area
    ('sf', 'Square Foot', 'area', 40),
    ('sy', 'Square Yard', 'area', 41),
    ('sq', 'Square (100 SF)', 'area', 42),
    
    -- Volume
    ('cf', 'Cubic Foot', 'volume', 50),
    ('cy', 'Cubic Yard', 'volume', 51),
    ('gal', 'Gallon', 'volume', 52),
    ('qt', 'Quart', 'volume', 53),
    
    -- Weight
    ('lb', 'Pound', 'weight', 60),
    ('ton', 'Ton', 'weight', 61),
    ('bag', 'Bag', 'weight', 62),
    
    -- Packaging (Drywall, Flooring, Roofing)
    ('sheet', 'Sheet', 'packaging', 70),
    ('box', 'Box', 'packaging', 71),
    ('roll', 'Roll', 'packaging', 72),
    ('bundle', 'Bundle', 'packaging', 73),
    ('pallet', 'Pallet', 'packaging', 74),
    ('batt', 'Batt', 'packaging', 75),
    ('case', 'Case', 'packaging', 76),
    
    -- Other
    ('ls', 'Lump Sum', 'other', 90),
    ('allow', 'Allowance', 'other', 91),
    ('lot', 'Lot', 'other', 92)
  ON CONFLICT (code) DO UPDATE
    SET label = EXCLUDED.label,
        category = EXCLUDED.category,
        sort_order = EXCLUDED.sort_order;

  -- 3) RLS – read-only open
  ALTER TABLE public.measurement_units ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS measurement_units_select_all ON public.measurement_units;
  
  CREATE POLICY measurement_units_select_all
    ON public.measurement_units
    FOR SELECT
    USING (true);
END
$$;