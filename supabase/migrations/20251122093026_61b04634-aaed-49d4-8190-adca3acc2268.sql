-- Migration: Normalize cost codes to be trade-based only
-- Remove subcontractor-specific codes and consolidate to {TRADE}-L, {TRADE}-M, {TRADE}-S

-- Step 1: Mark old subcontractor-specific codes as deprecated
-- These are codes like {TRADE}-SM (sub materials) and {TRADE}-C (contract)
UPDATE cost_codes
SET 
  is_active = false,
  name = name || ' (deprecated - use ' || SUBSTRING(code FROM 1 FOR POSITION('-' IN code)) || '-S)',
  updated_at = now()
WHERE 
  category IN ('subs', 'sub')
  AND (
    code LIKE '%-SM'  -- Sub materials pattern
    OR code LIKE '%-C'  -- Contract pattern
  );

-- Step 2: Ensure all trades have the 3 standard cost codes
-- This will check for each trade and create missing codes
DO $$
DECLARE
  trade_record RECORD;
  trade_prefix TEXT;
  has_labor BOOLEAN;
  has_materials BOOLEAN;
  has_subs BOOLEAN;
BEGIN
  FOR trade_record IN SELECT id, name FROM trades ORDER BY name
  LOOP
    -- Get the first 3 characters as prefix, uppercase
    trade_prefix := UPPER(SUBSTRING(trade_record.name FROM 1 FOR 3));
    
    -- Check which codes exist for this trade
    SELECT EXISTS(
      SELECT 1 FROM cost_codes 
      WHERE trade_id = trade_record.id 
        AND category = 'labor' 
        AND is_active = true
    ) INTO has_labor;
    
    SELECT EXISTS(
      SELECT 1 FROM cost_codes 
      WHERE trade_id = trade_record.id 
        AND category = 'materials' 
        AND is_active = true
    ) INTO has_materials;
    
    SELECT EXISTS(
      SELECT 1 FROM cost_codes 
      WHERE trade_id = trade_record.id 
        AND category = 'subs' 
        AND is_active = true
    ) INTO has_subs;
    
    -- Create missing Labor code
    IF NOT has_labor THEN
      INSERT INTO cost_codes (code, name, category, trade_id, is_active)
      VALUES (
        trade_prefix || '-L',
        trade_record.name || ' Labor',
        'labor',
        trade_record.id,
        true
      )
      ON CONFLICT (code) DO UPDATE
      SET 
        trade_id = trade_record.id,
        category = 'labor',
        is_active = true,
        updated_at = now();
    END IF;
    
    -- Create missing Materials code
    IF NOT has_materials THEN
      INSERT INTO cost_codes (code, name, category, trade_id, is_active)
      VALUES (
        trade_prefix || '-M',
        trade_record.name || ' Materials',
        'materials',
        trade_record.id,
        true
      )
      ON CONFLICT (code) DO UPDATE
      SET 
        trade_id = trade_record.id,
        category = 'materials',
        is_active = true,
        updated_at = now();
    END IF;
    
    -- Create missing Subs code
    IF NOT has_subs THEN
      INSERT INTO cost_codes (code, name, category, trade_id, is_active)
      VALUES (
        trade_prefix || '-S',
        trade_record.name || ' Subs/Contract',
        'subs',
        trade_record.id,
        true
      )
      ON CONFLICT (code) DO UPDATE
      SET 
        trade_id = trade_record.id,
        category = 'subs',
        is_active = true,
        updated_at = now();
    END IF;
  END LOOP;
END $$;

-- Step 3: Migrate existing cost entries from old sub-specific codes to trade-based codes
-- This updates sub_invoices, sub_logs, and other tables that reference deprecated codes

-- Create a temporary mapping table for the migration
CREATE TEMP TABLE code_migration_map AS
SELECT 
  old_cc.id as old_code_id,
  new_cc.id as new_code_id,
  old_cc.code as old_code,
  new_cc.code as new_code
FROM cost_codes old_cc
INNER JOIN cost_codes new_cc 
  ON old_cc.trade_id = new_cc.trade_id
  AND new_cc.category = 'subs'
  AND new_cc.is_active = true
WHERE 
  old_cc.is_active = false
  AND old_cc.category IN ('subs', 'sub')
  AND (old_cc.code LIKE '%-SM' OR old_cc.code LIKE '%-C');

-- Update sub_logs to use new trade-based codes
UPDATE sub_logs
SET cost_code_id = map.new_code_id
FROM code_migration_map map
WHERE sub_logs.cost_code_id = map.old_code_id;

-- Update material_receipts (some might be linked to sub codes)
UPDATE material_receipts
SET cost_code_id = map.new_code_id
FROM code_migration_map map
WHERE material_receipts.cost_code_id = map.old_code_id;

-- Update project_budget_lines
UPDATE project_budget_lines
SET cost_code_id = map.new_code_id
FROM code_migration_map map
WHERE project_budget_lines.cost_code_id = map.old_code_id;

-- Update estimate_items
UPDATE estimate_items
SET cost_code_id = map.new_code_id
FROM code_migration_map map
WHERE estimate_items.cost_code_id = map.old_code_id;

-- Step 4: Create a unique constraint on (trade_id, category) to ensure only one code per trade+category
-- First, remove any duplicates (keep the most recently updated one)
DELETE FROM cost_codes c1
WHERE EXISTS (
  SELECT 1 FROM cost_codes c2
  WHERE c1.trade_id = c2.trade_id
    AND c1.category = c2.category
    AND c1.is_active = true
    AND c2.is_active = true
    AND c1.id < c2.id
);

-- Add unique constraint (only for active codes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cost_codes_trade_category_unique
ON cost_codes (trade_id, category)
WHERE is_active = true AND trade_id IS NOT NULL;

-- Step 5: Add helpful comment
COMMENT ON TABLE cost_codes IS 'Trade-based cost codes: Each trade has exactly 3 codes (L=Labor, M=Materials, S=Subs)';
COMMENT ON COLUMN cost_codes.category IS 'Must be one of: labor, materials, subs, equipment, misc';
COMMENT ON COLUMN cost_codes.trade_id IS 'Links code to trade. NULL for misc/general codes';
COMMENT ON INDEX idx_cost_codes_trade_category_unique IS 'Ensures each trade has only one active code per category';