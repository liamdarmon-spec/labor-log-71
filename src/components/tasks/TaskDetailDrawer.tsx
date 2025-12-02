import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Trash2, Loader2 } from 'lucide-react';
import { Task, useUpdateTask, useDeleteTask, useWorkers, useProjectsList } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TaskDetailDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'medium', label: 'Medium', className: 'bg-slate-50 text-slate-700 border-slate-200' },
  { value: 'high', label: 'High', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'urgent', label: 'Urgent', className: 'bg-red-50 text-red-700 border-red-200' },
];

const TYPE_OPTIONS = [
  { value: 'todo', label: 'To-Do', className: 'bg-slate-50 text-slate-700 border-slate-200' },
  { value: 'meeting', label: 'Meeting', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'milestone', label: 'Milestone', className: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'punchlist', label: 'Punchlist', className: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'inspection', label: 'Inspection', className: 'bg-amber-50 text-amber-700 border-amber-200' },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export function TaskDetailDrawer({ task, open, onOpenChange }: TaskDetailDrawerProps) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: workers = [] } = useWorkers();
  const { data: projects = [] } = useProjectsList();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const debounceRef = useRef<NodeJS.Timeout>();

  // Sync local state when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
    }
  }, [task?.id, task?.title, task?.description]);

  const handleFieldUpdate = (field: string, value: string | null) => {
    if (!task) return;
    updateTask.mutate({ id: task.id, updates: { [field]: value } });
  };

  const handleTitleBlur = () => {
    if (!task || title === task.title) return;
    if (!title.trim()) {
      setTitle(task.title);
      return;
    }
    handleFieldUpdate('title', title.trim());
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (task && value !== task.description) {
        handleFieldUpdate('description', value || null);
      }
    }, 500);
  };

  const handleDelete = () => {
    if (!task) return;
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  if (!task) return null;

  const priorityOption = PRIORITY_OPTIONS.find((p) => p.value === task.priority) || PRIORITY_OPTIONS[1];
  const typeOption = TYPE_OPTIONS.find((t) => t.value === task.task_type) || TYPE_OPTIONS[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="text-left sr-only">Task Details</SheetTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('text-xs', typeOption.className)}>
                {typeOption.label}
              </Badge>
              <Badge variant="outline" className={cn('text-xs', priorityOption.className)}>
                {priorityOption.label}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Title */}
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="text-lg font-semibold border-0 px-0 focus-visible:ring-0 shadow-none"
              placeholder="Task title..."
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
            <Select value={task.status} onValueChange={(v) => handleFieldUpdate('status', v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Project</Label>
            <Select
              value={task.project_id || 'none'}
              onValueChange={(v) => handleFieldUpdate('project_id', v === 'none' ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project (company-wide)</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Type</Label>
              <Select value={task.task_type} onValueChange={(v) => handleFieldUpdate('task_type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', opt.className.split(' ')[0])} />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Priority</Label>
              <Select value={task.priority} onValueChange={(v) => handleFieldUpdate('priority', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', opt.className.split(' ')[0])} />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Assignee</Label>
            <Select
              value={task.assigned_worker_id || 'unassigned'}
              onValueChange={(v) => handleFieldUpdate('assigned_worker_id', v === 'unassigned' ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {task.due_date ? format(parseISO(task.due_date), 'PPP') : 'No due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={task.due_date ? parseISO(task.due_date) : undefined}
                  onSelect={(date) =>
                    handleFieldUpdate('due_date', date ? format(date, 'yyyy-MM-dd') : null)
                  }
                  className="pointer-events-auto"
                />
                {task.due_date && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => handleFieldUpdate('due_date', null)}
                    >
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Add a description..."
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t space-y-2 text-xs text-muted-foreground">
            <p>Created: {format(parseISO(task.created_at), 'PPP')}</p>
            {task.completed_at && <p>Completed: {format(parseISO(task.completed_at), 'PPP')}</p>}
          </div>

          {/* Delete */}
          <div className="pt-4">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleDelete}
              disabled={deleteTask.isPending}
            >
              {deleteTask.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Task
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
