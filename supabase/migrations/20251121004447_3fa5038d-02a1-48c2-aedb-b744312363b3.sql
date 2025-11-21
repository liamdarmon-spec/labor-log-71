-- Add task_type column to project_todos table
ALTER TABLE public.project_todos
ADD COLUMN task_type text NOT NULL DEFAULT 'todo';

-- Add comment for documentation
COMMENT ON COLUMN public.project_todos.task_type IS 'Type of task: todo, meeting, inspection, delivery';

-- Create index for better query performance
CREATE INDEX idx_project_todos_task_type ON public.project_todos(task_type);