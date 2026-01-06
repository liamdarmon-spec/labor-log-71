-- ============================================================================
-- Trade Packs System: Production-Grade Trades + Cost Codes
-- ============================================================================
-- Replaces fragile global trades with a pack-based tenant-safe system:
-- - trade_packs: System or company-owned packs
-- - trade_pack_items: Items within packs
-- - company_trades: Tenant-scoped trades used by estimates/budgets
-- - cost_codes: Tenant-scoped codes linked to company_trades
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) trade_packs - Collection of trade templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trade_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_by_company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: System packs readable by all authed; company packs by members only
ALTER TABLE public.trade_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trade_packs_select ON public.trade_packs;
CREATE POLICY trade_packs_select ON public.trade_packs
  FOR SELECT TO authenticated
  USING (
    is_system = true 
    OR created_by_company_id = ANY(public.authed_company_ids())
  );

DROP POLICY IF EXISTS trade_packs_insert ON public.trade_packs;
CREATE POLICY trade_packs_insert ON public.trade_packs
  FOR INSERT TO authenticated
  WITH CHECK (
    is_system = false 
    AND created_by_company_id = ANY(public.authed_company_ids())
  );

DROP POLICY IF EXISTS trade_packs_update ON public.trade_packs;
CREATE POLICY trade_packs_update ON public.trade_packs
  FOR UPDATE TO authenticated
  USING (
    is_system = false 
    AND created_by_company_id = ANY(public.authed_company_ids())
  );

DROP POLICY IF EXISTS trade_packs_delete ON public.trade_packs;
CREATE POLICY trade_packs_delete ON public.trade_packs
  FOR DELETE TO authenticated
  USING (
    is_system = false 
    AND created_by_company_id = ANY(public.authed_company_ids())
  );

-- ============================================================================
-- 2) trade_pack_items - Items within a pack
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trade_pack_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_pack_id uuid NOT NULL REFERENCES public.trade_packs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  code_prefix text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint for ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trade_pack_items_pack_name_unique'
  ) THEN
    ALTER TABLE public.trade_pack_items 
      ADD CONSTRAINT trade_pack_items_pack_name_unique 
      UNIQUE (trade_pack_id, name);
  END IF;
END $$;

-- RLS: Inherit from parent pack
ALTER TABLE public.trade_pack_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trade_pack_items_select ON public.trade_pack_items;
CREATE POLICY trade_pack_items_select ON public.trade_pack_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trade_packs tp 
      WHERE tp.id = trade_pack_id 
        AND (tp.is_system = true OR tp.created_by_company_id = ANY(public.authed_company_ids()))
    )
  );

DROP POLICY IF EXISTS trade_pack_items_insert ON public.trade_pack_items;
CREATE POLICY trade_pack_items_insert ON public.trade_pack_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trade_packs tp 
      WHERE tp.id = trade_pack_id 
        AND tp.is_system = false 
        AND tp.created_by_company_id = ANY(public.authed_company_ids())
    )
  );

DROP POLICY IF EXISTS trade_pack_items_update ON public.trade_pack_items;
CREATE POLICY trade_pack_items_update ON public.trade_pack_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trade_packs tp 
      WHERE tp.id = trade_pack_id 
        AND tp.is_system = false 
        AND tp.created_by_company_id = ANY(public.authed_company_ids())
    )
  );

DROP POLICY IF EXISTS trade_pack_items_delete ON public.trade_pack_items;
CREATE POLICY trade_pack_items_delete ON public.trade_pack_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trade_packs tp 
      WHERE tp.id = trade_pack_id 
        AND tp.is_system = false 
        AND tp.created_by_company_id = ANY(public.authed_company_ids())
    )
  );

-- ============================================================================
-- 3) company_trades - Tenant-scoped trades (what estimates/budgets use)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.company_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  code_prefix text NOT NULL,
  source_pack_item_id uuid REFERENCES public.trade_pack_items(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_trades_company_name_unique'
  ) THEN
    ALTER TABLE public.company_trades 
      ADD CONSTRAINT company_trades_company_name_unique 
      UNIQUE (company_id, name);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_trades_company_prefix_unique'
  ) THEN
    ALTER TABLE public.company_trades 
      ADD CONSTRAINT company_trades_company_prefix_unique 
      UNIQUE (company_id, code_prefix);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_trades_company_id ON public.company_trades(company_id);
CREATE INDEX IF NOT EXISTS idx_company_trades_active ON public.company_trades(company_id, is_active);

-- RLS
ALTER TABLE public.company_trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_trades_select ON public.company_trades;
CREATE POLICY company_trades_select ON public.company_trades
  FOR SELECT TO authenticated
  USING (company_id = ANY(public.authed_company_ids()));

DROP POLICY IF EXISTS company_trades_insert ON public.company_trades;
CREATE POLICY company_trades_insert ON public.company_trades
  FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.authed_company_ids()));

DROP POLICY IF EXISTS company_trades_update ON public.company_trades;
CREATE POLICY company_trades_update ON public.company_trades
  FOR UPDATE TO authenticated
  USING (company_id = ANY(public.authed_company_ids()));

DROP POLICY IF EXISTS company_trades_delete ON public.company_trades;
CREATE POLICY company_trades_delete ON public.company_trades
  FOR DELETE TO authenticated
  USING (company_id = ANY(public.authed_company_ids()));

-- ============================================================================
-- 4) Update cost_codes to reference company_trades
-- ============================================================================
DO $$
BEGIN
  -- Add company_trade_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cost_codes' AND column_name = 'company_trade_id'
  ) THEN
    ALTER TABLE public.cost_codes ADD COLUMN company_trade_id uuid REFERENCES public.company_trades(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for trade lookups
CREATE INDEX IF NOT EXISTS idx_cost_codes_company_trade ON public.cost_codes(company_id, company_trade_id);

-- ============================================================================
-- 5) Seed system trade pack (Construction Standard)
-- ============================================================================
INSERT INTO public.trade_packs (id, name, description, is_system, created_by_company_id)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Construction Standard',
  'Standard construction trades for residential and commercial projects',
  true,
  null
) ON CONFLICT (id) DO NOTHING;

-- Seed items into system pack
INSERT INTO public.trade_pack_items (trade_pack_id, name, description, code_prefix, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'General Conditions', 'Project overhead and management', 'GEN', 0),
  ('00000000-0000-0000-0000-000000000001', 'Demolition', 'Selective and complete demolition', 'DEMO', 1),
  ('00000000-0000-0000-0000-000000000001', 'Concrete', 'Foundations, slabs, and flatwork', 'CONC', 2),
  ('00000000-0000-0000-0000-000000000001', 'Masonry', 'Brick, block, and stone work', 'MAS', 3),
  ('00000000-0000-0000-0000-000000000001', 'Structural Steel', 'Steel framing and connections', 'STL', 4),
  ('00000000-0000-0000-0000-000000000001', 'Wood Framing', 'Rough carpentry and framing', 'FRM', 5),
  ('00000000-0000-0000-0000-000000000001', 'Finish Carpentry', 'Trim, millwork, and cabinetry', 'FIN', 6),
  ('00000000-0000-0000-0000-000000000001', 'Roofing', 'Shingles, membrane, and flashing', 'ROOF', 7),
  ('00000000-0000-0000-0000-000000000001', 'Insulation', 'Thermal and acoustic insulation', 'INS', 8),
  ('00000000-0000-0000-0000-000000000001', 'Drywall', 'Gypsum board and finishing', 'DRY', 9),
  ('00000000-0000-0000-0000-000000000001', 'Flooring', 'Tile, hardwood, carpet, and vinyl', 'FLR', 10),
  ('00000000-0000-0000-0000-000000000001', 'Painting', 'Interior and exterior finishes', 'PNT', 11),
  ('00000000-0000-0000-0000-000000000001', 'Plumbing', 'Piping, fixtures, and equipment', 'PLB', 12),
  ('00000000-0000-0000-0000-000000000001', 'HVAC', 'Heating, ventilation, and AC', 'HVAC', 13),
  ('00000000-0000-0000-0000-000000000001', 'Electrical', 'Power, lighting, and systems', 'ELEC', 14),
  ('00000000-0000-0000-0000-000000000001', 'Fire Protection', 'Sprinklers and fire alarm', 'FIRE', 15),
  ('00000000-0000-0000-0000-000000000001', 'Doors & Windows', 'Installation and hardware', 'DW', 16),
  ('00000000-0000-0000-0000-000000000001', 'Landscaping', 'Hardscape and softscape', 'LAND', 17),
  ('00000000-0000-0000-0000-000000000001', 'Site Work', 'Grading, utilities, and paving', 'SITE', 18),
  ('00000000-0000-0000-0000-000000000001', 'Specialty', 'Custom and specialty items', 'SPEC', 19)
ON CONFLICT (trade_pack_id, name) DO NOTHING;

COMMIT;

