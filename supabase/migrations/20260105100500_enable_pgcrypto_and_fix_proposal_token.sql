-- ============================================================================
-- Fix: generate_proposal_public_token uses gen_random_bytes without schema
-- ============================================================================
-- Problem: The function calls gen_random_bytes(24) but pgcrypto extension is
-- installed in the "extensions" schema, not public. This causes:
--   ERROR: function gen_random_bytes(integer) does not exist
--
-- Solution:
-- - Ensure pgcrypto exists in extensions schema (idempotent)
-- - Recreate function with explicit extensions.gen_random_bytes() call
-- - Set search_path to prevent future implicit resolution issues
-- - Preserve the uniqueness check loop from the original
-- ============================================================================

-- 1) Ensure pgcrypto extension exists in extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2) Recreate the function with explicit schema reference
CREATE OR REPLACE FUNCTION public.generate_proposal_public_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  new_token text;
  token_exists boolean;
BEGIN
  LOOP
    -- Generate 24 random bytes -> 48 hex chars (URL-safe, no padding issues)
    -- Using explicit extensions.gen_random_bytes() to avoid search_path issues
    new_token := encode(extensions.gen_random_bytes(24), 'hex');
    
    -- Check if token already exists (collision retry)
    SELECT EXISTS(
      SELECT 1 FROM public.proposals WHERE public_token = new_token
    ) INTO token_exists;
    
    -- Exit loop if token is unique
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN new_token;
END;
$$;

COMMENT ON FUNCTION public.generate_proposal_public_token() IS 
  'Generates unique 48-character hex token for public proposal links. Uses extensions.gen_random_bytes() with collision retry.';
