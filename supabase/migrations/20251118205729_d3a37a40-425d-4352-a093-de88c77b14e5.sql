-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create policy for companies
CREATE POLICY "Authenticated users can view companies"
ON public.companies
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage companies"
ON public.companies
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add company_id to projects table
ALTER TABLE public.projects ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Insert the two companies
INSERT INTO public.companies (name) VALUES 
  ('Forma Homes'),
  ('GA Painting');