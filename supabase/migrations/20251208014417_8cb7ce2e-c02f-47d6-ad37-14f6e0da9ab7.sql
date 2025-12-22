-- Add settings column to proposals table for UI toggles
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{
  "show_project_info": true,
  "show_client_info": true,
  "show_address": true,
  "show_scope_summary": true,
  "show_line_items": true,
  "show_line_item_totals": true,
  "group_line_items_by_area": true,
  "show_allowances": true,
  "show_exclusions": true,
  "show_payment_schedule": false,
  "show_terms": true,
  "show_signature_block": true,
  "payment_schedule": [],
  "terms_text": "",
  "exclusions_text": "",
  "allowances_text": ""
}'::jsonb;

-- Add intro_text column for cover/intro section
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS intro_text text;

-- Add job address fields if not present on projects
-- (projects already has address column based on schema check)

-- CREATE INDEX IF NOT EXISTS for faster proposal lookups by project
CREATE INDEX IF NOT EXISTS idx_proposals_project_id ON proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_primary_estimate_id ON proposals(primary_estimate_id);