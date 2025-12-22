-- Add missing acceptance flow columns to proposals
ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS acceptance_status TEXT DEFAULT 'pending' CHECK (acceptance_status IN ('pending', 'accepted', 'changes_requested', 'rejected')),
ADD COLUMN IF NOT EXISTS acceptance_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS acceptance_notes TEXT,
ADD COLUMN IF NOT EXISTS accepted_by_name TEXT,
ADD COLUMN IF NOT EXISTS accepted_by_email TEXT,
ADD COLUMN IF NOT EXISTS client_signature TEXT,
ADD COLUMN IF NOT EXISTS acceptance_ip TEXT,
ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE;

-- Create proposal_events table for activity tracking
CREATE TABLE IF NOT EXISTS public.proposal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'sent', 'viewed', 'pdf_downloaded', 'accepted', 'changes_requested', 'rejected', 'updated')),
  actor_name TEXT,
  actor_email TEXT,
  actor_ip TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposals_public_token ON public.proposals(public_token);
CREATE INDEX IF NOT EXISTS idx_proposals_acceptance_status ON public.proposals(acceptance_status);
CREATE INDEX IF NOT EXISTS idx_proposal_events_proposal_id ON public.proposal_events(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_events_created_at ON public.proposal_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.proposal_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proposal_events
CREATE POLICY "Anyone can view proposal events" ON public.proposal_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert proposal events" ON public.proposal_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update proposal events" ON public.proposal_events FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete proposal events" ON public.proposal_events FOR DELETE USING (true);

-- Function to generate secure public tokens
CREATE OR REPLACE FUNCTION generate_proposal_public_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token TEXT;
  exists_check INT;
BEGIN
  LOOP
    token := encode(gen_random_bytes(32), 'base64');
    token := replace(replace(replace(token, '/', ''), '+', ''), '=', '');
    
    SELECT COUNT(*) INTO exists_check 
    FROM proposals 
    WHERE public_token = token;
    
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN token;
END;
$$;

-- Function to automatically create "created" event
CREATE OR REPLACE FUNCTION log_proposal_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO proposal_events (proposal_id, event_type, metadata)
  VALUES (NEW.id, 'created', jsonb_build_object('created_by', NEW.created_by));
  RETURN NEW;
END;
$$;

-- Trigger for proposal creation
DROP TRIGGER IF EXISTS trigger_log_proposal_created ON public.proposals;
CREATE TRIGGER trigger_log_proposal_created
  AFTER INSERT ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION log_proposal_created();