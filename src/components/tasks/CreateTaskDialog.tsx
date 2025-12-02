import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Lock } from 'lucide-react';
import { useCreateTask, useWorkers, useProjectsList } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface CreateTaskDialogProps {
  projectId?: string;
  onCreated?: (taskId?: string) => void;
  trigger?: React.ReactNode;
}

export function CreateTaskDialog({ projectId, onCreated, trigger }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const createTask = useCreateTask();
  const { data: workers = [] } = useWorkers();
  const { data: projects = [] } = useProjectsList();

  const isProjectLocked = !!projectId;

  const [formData, setFormData] = useState({
    project_id: projectId || '',
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    task_type: 'todo',
    due_date: '',
    assigned_worker_id: '',
  });

  // Reset form when dialog opens or projectId changes
  useEffect(() => {
    if (open) {
      setFormData({
        project_id: projectId || '',
        title: '',
        description: '',
        status: 'open',
        priority: 'medium',
        task_type: 'todo',
        due_date: '',
        assigned_worker_id: '',
      });
    }
  }, [open, projectId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      return;
    }

    createTask.mutate(
      {
        project_id: formData.project_id || null,
        title: formData.title.trim(),
        description: formData.description || undefined,
        status: formData.status,
        priority: formData.priority,
        task_type: formData.task_type,
        due_date: formData.due_date || undefined,
        assigned_worker_id: formData.assigned_worker_id || null,
      },
      {
        onSuccess: (data) => {
          setOpen(false);
          onCreated?.(data?.id);
        },
      }
    );
  };

  const isValid = formData.title.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title - Always Required */}
          <div>
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          {/* Project Selection */}
          <div>
            <Label htmlFor="project">
              Project {isProjectLocked && <Lock className="w-3 h-3 inline ml-1 text-muted-foreground" />}
            </Label>
            {isProjectLocked ? (
              <>
                <Input
                  value={projects.find((p) => p.id === projectId)?.project_name || 'Loading...'}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">This task will be scoped to this project</p>
              </>
            ) : (
              <>
                <Select
                  value={formData.project_id || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, project_id: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project (company-wide)</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Optional — leave blank for company-wide task</p>
              </>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Add more details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="task_type">Type</Label>
              <Select
                value={formData.task_type}
                onValueChange={(value) => setFormData({ ...formData, task_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To-Do</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="punchlist">Punchlist</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assigned_worker_id">Assignee</Label>
              <Select
                value={formData.assigned_worker_id || 'unassigned'}
                onValueChange={(value) =>
                  setFormData({ ...formData, assigned_worker_id: value === 'unassigned' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {workers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending || !isValid}>
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
