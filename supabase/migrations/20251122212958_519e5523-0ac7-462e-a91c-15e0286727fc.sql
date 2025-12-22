-- Add AI extraction fields to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS ai_title TEXT,
ADD COLUMN IF NOT EXISTS ai_counterparty_name TEXT,
ADD COLUMN IF NOT EXISTS ai_effective_date DATE,
ADD COLUMN IF NOT EXISTS ai_expiration_date DATE,
ADD COLUMN IF NOT EXISTS ai_total_amount NUMERIC,
ADD COLUMN IF NOT EXISTS ai_currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS ai_tags TEXT[],
ADD COLUMN IF NOT EXISTS ai_last_run_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_last_run_status TEXT;

-- Rename ai_doc_type to ai_type for consistency (if needed)
-- We'll keep both for backward compatibility

-- Add compliance tracking fields to subs table
ALTER TABLE subs
ADD COLUMN IF NOT EXISTS compliance_coi_expiration DATE,
ADD COLUMN IF NOT EXISTS compliance_w9_received BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS compliance_license_expiration DATE,
ADD COLUMN IF NOT EXISTS compliance_notes TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_documents_ai_last_run_status ON documents(ai_last_run_status);
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_documents_ai_expiration_date ON documents(ai_expiration_date);
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_subs_compliance_coi ON subs(compliance_coi_expiration);
CREATE INDEX IF NOT EXISTS IF NOT EXISTS idx_subs_compliance_license ON subs(compliance_license_expiration);

-- Create a function to auto-update sub compliance from documents
CREATE OR REPLACE FUNCTION update_sub_compliance_from_document()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a COI document linked to a sub
  IF NEW.ai_doc_type = 'COI' AND NEW.owner_type = 'sub' AND NEW.owner_id IS NOT NULL THEN
    UPDATE subs
    SET compliance_coi_expiration = NEW.ai_expiration_date
    WHERE id = NEW.owner_id::uuid
      AND (compliance_coi_expiration IS NULL OR NEW.ai_expiration_date > compliance_coi_expiration);
  END IF;

  -- If this is a W-9 document
  IF NEW.ai_doc_type = 'W9' AND NEW.owner_type = 'sub' AND NEW.owner_id IS NOT NULL THEN
    UPDATE subs
    SET compliance_w9_received = true
    WHERE id = NEW.owner_id::uuid;
  END IF;

  -- If this is a license document
  IF NEW.ai_doc_type = 'license' AND NEW.owner_type = 'sub' AND NEW.owner_id IS NOT NULL THEN
    UPDATE subs
    SET compliance_license_expiration = NEW.ai_expiration_date
    WHERE id = NEW.owner_id::uuid
      AND (compliance_license_expiration IS NULL OR NEW.ai_expiration_date > compliance_license_expiration);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-updating compliance
DROP TRIGGER IF EXISTS trigger_update_sub_compliance ON documents;
CREATE TRIGGER trigger_update_sub_compliance
  AFTER INSERT OR UPDATE OF ai_doc_type, ai_expiration_date ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_sub_compliance_from_document();