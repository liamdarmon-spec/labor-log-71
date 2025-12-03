-- workers.trade_id → trades.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workers_trade_id_fkey'
  ) THEN
    ALTER TABLE public.workers
    ADD CONSTRAINT workers_trade_id_fkey
      FOREIGN KEY (trade_id)
      REFERENCES public.trades(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END$$;

-- time_logs.worker_id → workers.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'time_logs_worker_id_fkey'
  ) THEN
    ALTER TABLE public.time_logs
    ADD CONSTRAINT time_logs_worker_id_fkey
      FOREIGN KEY (worker_id)
      REFERENCES public.workers(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END$$;

-- time_logs.project_id → projects.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'time_logs_project_id_fkey'
  ) THEN
    ALTER TABLE public.time_logs
    ADD CONSTRAINT time_logs_project_id_fkey
      FOREIGN KEY (project_id)
      REFERENCES public.projects(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END$$;