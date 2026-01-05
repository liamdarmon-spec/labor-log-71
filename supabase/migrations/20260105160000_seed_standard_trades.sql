-- ============================================================================
-- Seed standard trades for construction GC
-- Trades are SHARED across all companies (no company_id column)
-- ============================================================================

-- Add unique constraint on trades.name first
ALTER TABLE public.trades ADD CONSTRAINT trades_name_key UNIQUE (name);

-- Insert trades using a DO block to avoid ON CONFLICT issues
DO $$
DECLARE
  v_trade RECORD;
  v_count int := 0;
BEGIN
  FOR v_trade IN 
    SELECT * FROM (VALUES
      ('Demolition', 'Selective and structural demolition, haul-off'),
      ('Concrete & Foundations', 'Footings, slabs, foundations, flatwork'),
      ('Framing & Rough Carpentry', 'Structural framing, blocking, sheathing'),
      ('Structural Steel', 'Structural steel, moment frames, lintels'),
      ('Waterproofing', 'Membranes, deck and wall waterproofing, below-grade systems'),
      ('Roofing', 'Roofing systems and related flashings'),
      ('Windows & Exterior Doors', 'Supply and install windows, sliders, exterior doors'),
      ('Exterior Cladding', 'Stucco, siding, exterior trim and façade systems'),
      ('Insulation', 'Thermal and acoustic insulation'),
      ('Drywall & Taping', 'Board, tape, mud, texture'),
      ('Interior Painting', 'Interior paint, stain, coatings'),
      ('Tile & Stone', 'Floor and wall tile, stone, shower pans'),
      ('Flooring', 'Hardwood, engineered, LVP, carpet, underlayments'),
      ('Cabinets & Millwork', 'Custom and semi-custom cabinetry, millwork'),
      ('Countertops', 'Stone, quartz, solid surface, installation'),
      ('Plumbing', 'Rough and finish plumbing'),
      ('HVAC', 'Heating, cooling, ventilation'),
      ('Electrical', 'Rough and finish electrical'),
      ('Low Voltage', 'Data, AV, security, low-voltage wiring and devices'),
      ('Glass & Shower Enclosures', 'Glass railings, shower doors, mirrors'),
      ('Landscaping', 'Exterior landscape, irrigation, pavers, site walls'),
      ('Fencing & Gates', 'Site fencing, gates, railings'),
      ('Pools & Spas', 'Pool / spa construction and equipment'),
      ('Appliances Install', 'Install of appliances, specialty fixtures'),
      ('General Conditions', 'Supervision, project management, temp facilities')
    ) AS t(name, description)
  LOOP
    -- Insert if not exists
    IF NOT EXISTS (SELECT 1 FROM public.trades WHERE name = v_trade.name) THEN
      INSERT INTO public.trades (name, description) 
      VALUES (v_trade.name, v_trade.description);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Inserted % new trades', v_count;
END $$;

-- Report total
DO $$
DECLARE
  v_total int;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.trades;
  RAISE NOTICE 'Total trades in database: %', v_total;
END $$;
