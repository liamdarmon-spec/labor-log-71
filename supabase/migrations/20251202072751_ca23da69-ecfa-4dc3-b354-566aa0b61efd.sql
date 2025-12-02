-- Allow company-wide tasks by making project_id nullable
ALTER TABLE public.project_todos ALTER COLUMN project_id DROP NOT NULL;

-- Add an index for efficient querying of company-wide tasks (where project_id is null)
CREATE INDEX IF NOT EXISTS idx_project_todos_project_id ON public.project_todos(project_id);

-- Add an index for filtering by status
CREATE INDEX IF NOT EXISTS idx_project_todos_status ON public.project_todos(status);