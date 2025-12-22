-- PHASE 1: DATA MODEL & INTEGRITY HARDENING (REVISED)

-- 1. Add unique constraint to public_token to prevent duplicates
-- Pre-clean: Remove duplicates from proposals on (public_token)
-- Keep: smallest created_at (or smallest id if no created_at), delete rest

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY public_token
      ORDER BY
        (CASE WHEN created_at IS NULL THEN 1 ELSE 0 END),
        created_at ASC NULLS LAST,
        id ASC
    ) AS rn
  FROM public.proposals
  WHERE public_token IS NOT NULL
)
DELETE FROM public.proposals t
USING ranked r
WHERE t.id = r.id AND r.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposals_public_token_unique'
  ) THEN

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE c.conname = 'proposals_public_token_unique'
          AND n.nspname = 'public'
      ) THEN
        ALTER TABLE proposals
          ADD CONSTRAINT proposals_public_token_unique UNIQUE (public_token);
      END IF;
    END
    $$;
  END IF;
END $$;

-- 2. Add check constraint for event_type enum in proposal_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proposal_events_event_type_check'
  ) THEN
    ALTER TABLE proposal_events
      ADD CONSTRAINT proposal_events_event_type_check
      CHECK (event_type IN ('created', 'sent', 'viewed', 'pdf_downloaded', 'accepted', 'changes_requested', 'rejected', 'updated'));
  END IF;
END $$;

-- PHASE 4: PERFORMANCE OPTIMIZATION

-- 3. Add composite index for proposal_events queries (proposal_id + created_at desc)
CREATE INDEX IF NOT EXISTS idx_proposal_events_proposal_created 
  ON proposal_events(proposal_id, created_at DESC);

-- 4. Add index on public_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_proposals_public_token 
  ON proposals(public_token) 
  WHERE public_token IS NOT NULL;

-- 5. Add index on acceptance_status for filtering
CREATE INDEX IF NOT EXISTS idx_proposals_acceptance_status 
  ON proposals(acceptance_status);

-- PHASE 2: TOKEN SECURITY - Improve token generation function
CREATE OR REPLACE FUNCTION generate_proposal_public_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_token text;
  token_exists boolean;
BEGIN
  LOOP
    -- Generate a secure random token (32 chars, URL-safe)
    new_token := encode(gen_random_bytes(24), 'base64');
    new_token := replace(new_token, '/', '_');
    new_token := replace(new_token, '+', '-');
    new_token := replace(new_token, '=', '');
    
    -- Check if token already exists
    SELECT EXISTS(
      SELECT 1 FROM proposals WHERE public_token = new_token
    ) INTO token_exists;
    
    -- Exit loop if token is unique
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN new_token;
END;
$$;

-- PHASE 3: ACCEPTANCE FLOW HARDENING
-- CREATE OR REPLACE FUNCTION to safely update acceptance status (prevents double submission)
CREATE OR REPLACE FUNCTION update_proposal_acceptance(
  p_proposal_id uuid,
  p_new_status text,
  p_accepted_by_name text,
  p_accepted_by_email text DEFAULT NULL,
  p_acceptance_notes text DEFAULT NULL,
  p_client_signature text DEFAULT NULL,
  p_acceptance_ip text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status text;
BEGIN
  -- Get current acceptance status with row lock
  SELECT acceptance_status INTO v_current_status
  FROM proposals
  WHERE id = p_proposal_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Proposal not found'
    );
  END IF;
  
  -- Prevent overwriting terminal states
  IF v_current_status IN ('accepted', 'rejected') AND v_current_status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Proposal already has a final response',
      'current_status', v_current_status
    );
  END IF;
  
  -- Update proposal
  UPDATE proposals
  SET 
    acceptance_status = p_new_status,
    acceptance_date = now(),
    accepted_by_name = p_accepted_by_name,
    accepted_by_email = p_accepted_by_email,
    acceptance_notes = p_acceptance_notes,
    client_signature = p_client_signature,
    acceptance_ip = p_acceptance_ip,
    updated_at = now()
  WHERE id = p_proposal_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
END;
$$;

-- CREATE OR REPLACE FUNCTION to log proposal event (with deduplication for 'viewed')
CREATE OR REPLACE FUNCTION log_proposal_event(
  p_proposal_id uuid,
  p_event_type text,
  p_actor_name text DEFAULT NULL,
  p_actor_email text DEFAULT NULL,
  p_actor_ip text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
  v_last_viewed timestamp with time zone;
BEGIN
  -- Special handling for 'viewed' events - only log if not viewed in last 5 minutes
  IF p_event_type = 'viewed' THEN
    SELECT created_at INTO v_last_viewed
    FROM proposal_events
    WHERE proposal_id = p_proposal_id 
      AND event_type = 'viewed'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If viewed in last 5 minutes, don't create duplicate
    IF v_last_viewed IS NOT NULL AND v_last_viewed > (now() - interval '5 minutes') THEN
      RETURN NULL;
    END IF;
  END IF;
  
  -- Insert event
  INSERT INTO proposal_events (
    proposal_id,
    event_type,
    actor_name,
    actor_email,
    actor_ip,
    metadata
  ) VALUES (
    p_proposal_id,
    p_event_type,
    p_actor_name,
    p_actor_email,
    p_actor_ip,
    p_metadata
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- Create trigger to auto-log 'created' event when proposal is inserted
CREATE OR REPLACE FUNCTION trigger_log_proposal_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO proposal_events (
    proposal_id,
    event_type,
    metadata
  ) VALUES (
    NEW.id,
    'created',
    jsonb_build_object(
      'project_id', NEW.project_id,
      'title', NEW.title
    )
  );
  
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_proposal_created ON proposals;
CREATE TRIGGER trigger_proposal_created
  AFTER INSERT ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_proposal_created();

-- Comments
COMMENT ON FUNCTION update_proposal_acceptance IS 
  'Safely updates proposal acceptance status with guards against double submission using row-level locking';
COMMENT ON FUNCTION log_proposal_event IS 
  'Logs proposal events with deduplication for viewed events (5 min window)';
COMMENT ON FUNCTION generate_proposal_public_token IS 
  'Generates unique 32-character secure URL-safe token for public proposal links';