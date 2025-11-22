-- Migration: Create DayCard Architecture for Unified Workforce Management
-- This replaces the separate scheduled_shifts and daily_logs pattern with a unified DayCard model

-- Step 1: Create day_cards table
CREATE TABLE IF NOT EXISTS day_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  scheduled_hours NUMERIC DEFAULT 0,
  logged_hours NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'logged', 'approved', 'paid')),
  pay_rate NUMERIC,
  pay_status TEXT DEFAULT 'unpaid' CHECK (pay_status IN ('unpaid', 'pending', 'paid')),
  company_id UUID REFERENCES companies(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  locked BOOLEAN DEFAULT false,
  -- Ensure only one DayCard per worker per date
  UNIQUE(worker_id, date)
);

-- Step 2: Create day_card_jobs table (for multi-project splits)
CREATE TABLE IF NOT EXISTS day_card_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_card_id UUID NOT NULL REFERENCES day_cards(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  trade_id UUID REFERENCES trades(id),
  cost_code_id UUID REFERENCES cost_codes(id),
  hours NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_day_cards_worker_date ON day_cards(worker_id, date);
CREATE INDEX idx_day_cards_date ON day_cards(date);
CREATE INDEX idx_day_cards_status ON day_cards(status);
CREATE INDEX idx_day_cards_pay_status ON day_cards(pay_status);
CREATE INDEX idx_day_card_jobs_day_card ON day_card_jobs(day_card_id);
CREATE INDEX idx_day_card_jobs_project ON day_card_jobs(project_id);

-- Step 4: Enable RLS
ALTER TABLE day_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_card_jobs ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies (open for now, can be restricted later)
CREATE POLICY "Anyone can view day cards"
  ON day_cards FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert day cards"
  ON day_cards FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update day cards"
  ON day_cards FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete day cards"
  ON day_cards FOR DELETE
  USING (true);

CREATE POLICY "Anyone can view day card jobs"
  ON day_card_jobs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert day card jobs"
  ON day_card_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update day card jobs"
  ON day_card_jobs FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete day card jobs"
  ON day_card_jobs FOR DELETE
  USING (true);

-- Step 6: Create trigger for updated_at
CREATE TRIGGER update_day_cards_updated_at
  BEFORE UPDATE ON day_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_day_card_jobs_updated_at
  BEFORE UPDATE ON day_card_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Migration function to consolidate existing data into DayCards
-- This merges scheduled_shifts and daily_logs into the new day_cards structure
CREATE OR REPLACE FUNCTION migrate_to_day_cards()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_worker_id UUID;
  v_date DATE;
  v_day_card_id UUID;
  v_scheduled_total NUMERIC;
  v_logged_total NUMERIC;
  v_worker_rate NUMERIC;
  v_status TEXT;
  v_pay_status TEXT;
BEGIN
  -- Get all unique worker+date combinations from both schedules and logs
  FOR v_worker_id, v_date IN 
    SELECT DISTINCT worker_id, scheduled_date as date
    FROM scheduled_shifts
    UNION
    SELECT DISTINCT worker_id, date
    FROM daily_logs
  LOOP
    -- Calculate scheduled hours for this worker+date
    SELECT COALESCE(SUM(scheduled_hours), 0)
    INTO v_scheduled_total
    FROM scheduled_shifts
    WHERE worker_id = v_worker_id AND scheduled_date = v_date;
    
    -- Calculate logged hours for this worker+date
    SELECT COALESCE(SUM(hours_worked), 0)
    INTO v_logged_total
    FROM daily_logs
    WHERE worker_id = v_worker_id AND date = v_date;
    
    -- Get worker's hourly rate
    SELECT hourly_rate
    INTO v_worker_rate
    FROM workers
    WHERE id = v_worker_id;
    
    -- Determine status based on date and logged hours
    IF v_logged_total > 0 THEN
      v_status := 'logged';
    ELSIF v_date < CURRENT_DATE THEN
      v_status := 'scheduled';
    ELSE
      v_status := 'scheduled';
    END IF;
    
    -- Determine pay status from daily_logs
    SELECT CASE 
      WHEN payment_status = 'paid' THEN 'paid'
      WHEN payment_status = 'pending' THEN 'pending'
      ELSE 'unpaid'
    END
    INTO v_pay_status
    FROM daily_logs
    WHERE worker_id = v_worker_id AND date = v_date
    LIMIT 1;
    
    IF v_pay_status IS NULL THEN
      v_pay_status := 'unpaid';
    END IF;
    
    -- Create or update the DayCard
    INSERT INTO day_cards (
      worker_id,
      date,
      scheduled_hours,
      logged_hours,
      status,
      pay_rate,
      pay_status
    ) VALUES (
      v_worker_id,
      v_date,
      v_scheduled_total,
      v_logged_total,
      v_status,
      v_worker_rate,
      v_pay_status
    )
    ON CONFLICT (worker_id, date) DO UPDATE
    SET
      scheduled_hours = EXCLUDED.scheduled_hours,
      logged_hours = EXCLUDED.logged_hours,
      status = EXCLUDED.status,
      pay_rate = EXCLUDED.pay_rate,
      pay_status = EXCLUDED.pay_status,
      updated_at = now()
    RETURNING id INTO v_day_card_id;
    
    -- Migrate job splits from scheduled_shifts
    INSERT INTO day_card_jobs (day_card_id, project_id, trade_id, cost_code_id, hours)
    SELECT 
      v_day_card_id,
      project_id,
      trade_id,
      cost_code_id,
      scheduled_hours
    FROM scheduled_shifts
    WHERE worker_id = v_worker_id AND scheduled_date = v_date
    ON CONFLICT DO NOTHING;
    
    -- Migrate job splits from daily_logs (if different from schedules)
    INSERT INTO day_card_jobs (day_card_id, project_id, trade_id, cost_code_id, hours, notes)
    SELECT 
      v_day_card_id,
      project_id,
      trade_id,
      cost_code_id,
      hours_worked,
      notes
    FROM daily_logs
    WHERE worker_id = v_worker_id AND date = v_date
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Migration complete. DayCards created from existing schedules and logs.';
END;
$$;

-- Step 8: Create helper views for common queries
CREATE OR REPLACE VIEW day_cards_with_details AS
SELECT 
  dc.*,
  w.name as worker_name,
  w.hourly_rate as worker_default_rate,
  t.name as trade_name,
  array_agg(
    jsonb_build_object(
      'id', dcj.id,
      'project_id', dcj.project_id,
      'project_name', p.project_name,
      'trade_id', dcj.trade_id,
      'cost_code_id', dcj.cost_code_id,
      'hours', dcj.hours,
      'notes', dcj.notes
    ) ORDER BY dcj.created_at
  ) FILTER (WHERE dcj.id IS NOT NULL) as jobs
FROM day_cards dc
LEFT JOIN workers w ON dc.worker_id = w.id
LEFT JOIN trades t ON w.trade_id = t.id
LEFT JOIN day_card_jobs dcj ON dc.id = dcj.day_card_id
LEFT JOIN projects p ON dcj.project_id = p.id
GROUP BY dc.id, w.name, w.hourly_rate, t.name;

-- Step 9: Add comments for documentation
COMMENT ON TABLE day_cards IS 'Universal day cards - ONE per worker per date. Consolidates scheduling, logging, and payment tracking.';
COMMENT ON TABLE day_card_jobs IS 'Job splits within a day card. Multiple projects/trades per day.';
COMMENT ON COLUMN day_cards.status IS 'scheduled = future/unlogged, logged = hours entered, approved = reviewed, paid = payment completed';
COMMENT ON COLUMN day_cards.locked IS 'When true, prevents scheduler from editing (e.g., after payment)';

-- Step 10: Run the migration (commented out - uncomment when ready)
-- SELECT migrate_to_day_cards();