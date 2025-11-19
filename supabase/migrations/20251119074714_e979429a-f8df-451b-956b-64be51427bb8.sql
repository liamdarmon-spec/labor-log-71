-- Add reimbursement tracking fields to payments table
ALTER TABLE public.payments
ADD COLUMN reimbursement_status TEXT CHECK (reimbursement_status IN ('pending', 'reimbursed')),
ADD COLUMN reimbursement_date DATE;