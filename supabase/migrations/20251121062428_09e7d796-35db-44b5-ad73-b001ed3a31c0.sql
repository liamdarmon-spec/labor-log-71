-- Add budget source tracking to estimates
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS is_budget_source BOOLEAN DEFAULT false;

-- Add category to estimate_items if not exists
ALTER TABLE estimate_items ADD COLUMN IF NOT EXISTS category TEXT;

-- Add blocked status for tasks if not exists (for consistency)
-- No changes needed as status is already text field