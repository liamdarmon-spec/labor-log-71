-- Create invitations table
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'field_user',
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  used boolean DEFAULT false,
  used_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invitations
CREATE POLICY "Admins can manage invitations"
ON public.invitations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone can check if their email is invited (for signup validation)
CREATE POLICY "Users can check their own invitation"
ON public.invitations
FOR SELECT
TO anon
USING (true);

-- Create index for faster email lookups
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_used ON public.invitations(used);