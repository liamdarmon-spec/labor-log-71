-- Clean up duplicate time logs in pay runs and add UNIQUE constraint

-- 1. Delete duplicate labor_pay_run_items (keep the first one based on created_at)
WITH ranked_items AS (
  SELECT 
    id,
    time_log_id,
    ROW_NUMBER() OVER (PARTITION BY time_log_id ORDER BY created_at ASC, id) AS rn
  FROM public.labor_pay_run_items
)
DELETE FROM public.labor_pay_run_items
WHERE id IN (
  SELECT id FROM ranked_items WHERE rn > 1
);

-- 2. Cancel pay runs that now have zero items
UPDATE public.labor_pay_runs pr
SET 
  status = 'cancelled',
  updated_at = now()
WHERE pr.status = 'draft'
  AND NOT EXISTS (
    SELECT 1
    FROM public.labor_pay_run_items lpri
    WHERE lpri.pay_run_id = pr.id
  );

-- 3. Add UNIQUE constraint on time_log_id
ALTER TABLE public.labor_pay_run_items
  ADD CONSTRAINT labor_pay_run_items_time_log_id_unique
  UNIQUE (time_log_id);