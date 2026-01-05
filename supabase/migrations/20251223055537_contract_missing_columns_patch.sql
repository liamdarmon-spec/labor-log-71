-- ============================================================================
-- MIGRATION CONTRACT PATCH
-- ============================================================================
-- Generated: 2025-12-23T05:55:37.629Z
-- Mode: BASIC (columns only)
-- ============================================================================

-- ============================================================================
-- SECTION 1: ADD MISSING COLUMNS
-- ============================================================================

-- Table: documents
DO $$
BEGIN
  IF to_regclass('public.documents') IS NOT NULL THEN

    -- Add source_context (inferred: text)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'source_context'
    ) THEN
      EXECUTE 'ALTER TABLE public.documents ADD COLUMN source_context text';
    END IF;

    -- Add related_cost_id (inferred: uuid)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'related_cost_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.documents ADD COLUMN related_cost_id uuid';
    END IF;

    -- Add related_invoice_id (inferred: uuid)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'related_invoice_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.documents ADD COLUMN related_invoice_id uuid';
    END IF;

    -- Add is_archived (inferred: boolean)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'is_archived'
    ) THEN
      EXECUTE 'ALTER TABLE public.documents ADD COLUMN is_archived boolean';
    END IF;

    -- Add version_group_id (inferred: uuid)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'version_group_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.documents ADD COLUMN version_group_id uuid';
    END IF;

  END IF;
END $$;

-- ============================================================================
-- PATCH COMPLETE
-- ============================================================================
