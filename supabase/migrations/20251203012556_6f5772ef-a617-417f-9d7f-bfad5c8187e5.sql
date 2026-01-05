-- invoices.project_id → projects.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_project_id_fkey'
  ) THEN
    ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_project_id_fkey;
    ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_project_id_fkey
      FOREIGN KEY (project_id)
      REFERENCES public.projects(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_items_invoice_id_fkey'
  ) THEN
    ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey;
    ALTER TABLE public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey
      FOREIGN KEY (invoice_id)
      REFERENCES public.invoices(id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoice_items_cost_code_id_fkey'
  ) THEN
    ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS invoice_items_cost_code_id_fkey;
    ALTER TABLE public.invoice_items
    ADD CONSTRAINT invoice_items_cost_code_id_fkey
      FOREIGN KEY (cost_code_id)
      REFERENCES public.cost_codes(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customer_payments_project_id_fkey'
  ) THEN
    ALTER TABLE public.customer_payments DROP CONSTRAINT IF EXISTS customer_payments_project_id_fkey;
    ALTER TABLE public.customer_payments
    ADD CONSTRAINT customer_payments_project_id_fkey
      FOREIGN KEY (project_id)
      REFERENCES public.projects(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customer_payments_invoice_id_fkey'
  ) THEN
    ALTER TABLE public.customer_payments DROP CONSTRAINT IF EXISTS customer_payments_invoice_id_fkey;
    ALTER TABLE public.customer_payments
    ADD CONSTRAINT customer_payments_invoice_id_fkey
      FOREIGN KEY (invoice_id)
      REFERENCES public.invoices(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;