-- Set default values for proposals table columns
ALTER TABLE public.proposals 
  ALTER COLUMN acceptance_status SET DEFAULT 'pending',
  ALTER COLUMN validity_days SET DEFAULT 30;