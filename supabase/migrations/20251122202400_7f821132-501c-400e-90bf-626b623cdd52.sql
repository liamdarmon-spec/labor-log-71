-- Proposal & Estimate v2: Unified System with Scope Blocks & Versioning

-- 1. Add versioning and enhanced fields to estimates
ALTER TABLE estimates
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_estimate_id UUID REFERENCES estimates(id),
ADD COLUMN IF NOT EXISTS change_log JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS margin_percent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- 2. Add versioning and enhanced fields to proposals
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_proposal_id UUID REFERENCES proposals(id),
ADD COLUMN IF NOT EXISTS change_log JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS template_settings JSONB DEFAULT '{}'::jsonb;

-- 3. Create scope_blocks table for modular content
CREATE TABLE IF NOT EXISTS scope_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES scope_blocks(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('estimate', 'proposal')),
  entity_id UUID NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  block_type TEXT NOT NULL CHECK (block_type IN ('section', 'cost_items', 'text', 'image', 'nested')),
  title TEXT,
  description TEXT,
  content_richtext TEXT,
  image_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scope_blocks_entity ON scope_blocks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_scope_blocks_parent ON scope_blocks(parent_id);

-- 4. Create scope_block_cost_items table
CREATE TABLE IF NOT EXISTS scope_block_cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_block_id UUID NOT NULL REFERENCES scope_blocks(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('labor', 'materials', 'subs', 'other')),
  cost_code_id UUID REFERENCES cost_codes(id),
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'ea',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  markup_percent NUMERIC DEFAULT 0,
  margin_percent NUMERIC DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scope_block_cost_items_block ON scope_block_cost_items(scope_block_id);

-- 5. Create proposal_estimate_settings table
CREATE TABLE IF NOT EXISTS proposal_estimate_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  setting_type TEXT NOT NULL CHECK (setting_type IN ('proposal', 'estimate', 'global')),
  default_terms TEXT,
  default_markup_labor NUMERIC DEFAULT 0,
  default_markup_materials NUMERIC DEFAULT 0,
  default_markup_subs NUMERIC DEFAULT 0,
  default_margin_percent NUMERIC DEFAULT 0,
  branding_logo_url TEXT,
  branding_colors JSONB DEFAULT '{}'::jsonb,
  template_config JSONB DEFAULT '{}'::jsonb,
  ai_enabled BOOLEAN DEFAULT false,
  ai_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, setting_type)
);

-- 6. Create change_log table for tracking all changes
CREATE TABLE IF NOT EXISTS entity_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('estimate', 'proposal', 'scope_block')),
  entity_id UUID NOT NULL,
  version INTEGER NOT NULL,
  changed_by UUID,
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'duplicated', 'approved', 'rejected', 'synced')),
  change_summary TEXT,
  changes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_change_log_entity ON entity_change_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_change_log_version ON entity_change_log(entity_type, entity_id, version);

-- 7. Update trigger for scope_blocks
CREATE OR REPLACE FUNCTION update_scope_block_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS scope_blocks_updated_at ON scope_blocks;
CREATE TRIGGER scope_blocks_updated_at
  BEFORE UPDATE ON scope_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_scope_block_updated_at();

-- 8. Update trigger for scope_block_cost_items
DROP TRIGGER IF EXISTS scope_block_cost_items_updated_at ON scope_block_cost_items;
CREATE TRIGGER scope_block_cost_items_updated_at
  BEFORE UPDATE ON scope_block_cost_items
  FOR EACH ROW
  EXECUTE FUNCTION update_scope_block_updated_at();

-- 9. Function to auto-calculate line_total for scope_block_cost_items
CREATE OR REPLACE FUNCTION calculate_scope_item_line_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate line total with markup/margin
  NEW.line_total = NEW.quantity * NEW.unit_price * (1 + COALESCE(NEW.markup_percent, 0) / 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_scope_item_total ON scope_block_cost_items;
CREATE TRIGGER calculate_scope_item_total
  BEFORE INSERT OR UPDATE ON scope_block_cost_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_scope_item_line_total();

-- 10. RLS Policies for new tables
ALTER TABLE scope_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_block_cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_estimate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view scope blocks" ON scope_blocks;
CREATE POLICY "Anyone can view scope blocks" ON scope_blocks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert scope blocks" ON scope_blocks;
CREATE POLICY "Anyone can insert scope blocks" ON scope_blocks FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update scope blocks" ON scope_blocks;
CREATE POLICY "Anyone can update scope blocks" ON scope_blocks FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anyone can delete scope blocks" ON scope_blocks;
CREATE POLICY "Anyone can delete scope blocks" ON scope_blocks FOR DELETE USING (true);
DROP POLICY IF EXISTS "Anyone can view scope block cost items" ON scope_block_cost_items;
CREATE POLICY "Anyone can view scope block cost items" ON scope_block_cost_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert scope block cost items" ON scope_block_cost_items;
CREATE POLICY "Anyone can insert scope block cost items" ON scope_block_cost_items FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update scope block cost items" ON scope_block_cost_items;
CREATE POLICY "Anyone can update scope block cost items" ON scope_block_cost_items FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anyone can delete scope block cost items" ON scope_block_cost_items;
CREATE POLICY "Anyone can delete scope block cost items" ON scope_block_cost_items FOR DELETE USING (true);
DROP POLICY IF EXISTS "Anyone can view settings" ON proposal_estimate_settings;
CREATE POLICY "Anyone can view settings" ON proposal_estimate_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert settings" ON proposal_estimate_settings;
CREATE POLICY "Anyone can insert settings" ON proposal_estimate_settings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update settings" ON proposal_estimate_settings;
CREATE POLICY "Anyone can update settings" ON proposal_estimate_settings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can view change log" ON entity_change_log;
CREATE POLICY "Anyone can view change log" ON entity_change_log FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert change log" ON entity_change_log;
CREATE POLICY "Anyone can insert change log" ON entity_change_log FOR INSERT WITH CHECK (true);
