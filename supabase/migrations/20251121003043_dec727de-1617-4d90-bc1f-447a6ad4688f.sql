-- 1. Create project_dashboard_view for project metrics
CREATE OR REPLACE VIEW project_dashboard_view AS
SELECT 
  p.id AS project_id,
  p.project_name,
  p.client_name,
  p.company_id,
  p.status,
  p.address,
  p.project_manager,
  COALESCE(SUM(dl.hours_worked), 0) AS total_hours,
  COALESCE(SUM(dl.hours_worked * w.hourly_rate), 0) AS total_cost,
  COUNT(DISTINCT dl.worker_id) AS worker_count,
  MAX(dl.date) AS last_activity
FROM projects p
LEFT JOIN daily_logs dl ON p.id = dl.project_id
LEFT JOIN workers w ON dl.worker_id = w.id
GROUP BY p.id, p.project_name, p.client_name, p.company_id, p.status, p.address, p.project_manager;

-- 2. Create project_todos table
CREATE TABLE IF NOT EXISTS project_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  assigned_worker_id UUID REFERENCES workers(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Add indexes for project_todos
CREATE INDEX IF NOT EXISTS idx_project_todos_project_id ON project_todos(project_id);
CREATE INDEX IF NOT EXISTS idx_project_todos_status ON project_todos(status);
CREATE INDEX IF NOT EXISTS idx_project_todos_assigned_worker_id ON project_todos(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_project_todos_due_date ON project_todos(due_date);

-- Enable RLS on project_todos
ALTER TABLE project_todos ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_todos
CREATE POLICY "Anyone can view todos" ON project_todos
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert todos" ON project_todos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update todos" ON project_todos
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete todos" ON project_todos
  FOR DELETE USING (true);

-- Add trigger to update updated_at
CREATE TRIGGER update_project_todos_updated_at
  BEFORE UPDATE ON project_todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. Create project_schedule_view
CREATE OR REPLACE VIEW project_schedule_view AS
SELECT 
  id,
  project_id,
  worker_id,
  trade_id,
  scheduled_date,
  scheduled_hours,
  status,
  notes,
  converted_to_timelog,
  created_at,
  updated_at
FROM scheduled_shifts;

-- 4. Create project_activity_view
CREATE OR REPLACE VIEW project_activity_view AS
SELECT 
  dl.id AS log_id,
  dl.project_id,
  dl.worker_id,
  dl.trade_id,
  dl.date,
  dl.hours_worked,
  dl.schedule_id,
  dl.notes,
  dl.created_at,
  (dl.hours_worked * COALESCE(w.hourly_rate, 0)) AS cost,
  w.name AS worker_name,
  w.trade AS worker_trade,
  p.project_name
FROM daily_logs dl
LEFT JOIN workers w ON dl.worker_id = w.id
LEFT JOIN projects p ON dl.project_id = p.id;