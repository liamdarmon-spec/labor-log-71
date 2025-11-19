-- Add paid_via column to payments table
ALTER TABLE public.payments 
ADD COLUMN paid_via TEXT;