import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Trash2, Loader2, Circle, CheckCircle2, Clock, Flag, User, FolderOpen, FileText, ListTodo } from 'lucide-react';
import { Task, useUpdateTask, useDeleteTask, useWorkers, useProjectsList } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface TaskDetailDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-blue-500', bgLight: 'bg-blue-50 text-blue-700' },
  { value: 'medium', label: 'Medium', color: 'bg-slate-400', bgLight: 'bg-slate-100 text-slate-700' },
  { value: 'high', label: 'High', color: 'bg-amber-500', bgLight: 'bg-amber-50 text-amber-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500', bgLight: 'bg-red-50 text-red-700' },
];

const TYPE_OPTIONS = [
  { value: 'todo', label: 'To-Do', color: 'bg-slate-500', bgLight: 'bg-slate-100 text-slate-700' },
  { value: 'meeting', label: 'Meeting', color: 'bg-violet-500', bgLight: 'bg-violet-50 text-violet-700' },
  { value: 'milestone', label: 'Milestone', color: 'bg-emerald-500', bgLight: 'bg-emerald-50 text-emerald-700' },
  { value: 'punchlist', label: 'Punchlist', color: 'bg-rose-500', bgLight: 'bg-rose-50 text-rose-700' },
  { value: 'inspection', label: 'Inspection', color: 'bg-amber-500', bgLight: 'bg-amber-50 text-amber-700' },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', icon: Circle, color: 'text-blue-500' },
  { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-amber-500' },
  { value: 'done', label: 'Done', icon: CheckCircle2, color: 'text-emerald-500' },
];

export function TaskDetailDrawer({ task, open, onOpenChange }: TaskDetailDrawerProps) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: workers = [] } = useWorkers();
  const { data: projects = [] } = useProjectsList();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const debounceRef = useRef<NodeJS.Timeout>();

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
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header with badges */}
        <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Badge className={cn('text-xs font-medium border-0', typeOption.bgLight)}>
              {typeOption.label}
            </Badge>
            <Badge className={cn('text-xs font-medium border-0', priorityOption.bgLight)}>
              {priorityOption.label}
            </Badge>
          </div>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {/* Title - large editable input */}
          <div className="space-y-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="text-xl font-bold border-0 px-0 h-auto focus-visible:ring-0 shadow-none bg-transparent placeholder:text-muted-foreground/40"
              placeholder="Task title..."
            />
          </div>

          <Separator />

          {/* Status selector - visual cards */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Circle className="w-3.5 h-3.5" />
              Status
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = task.status === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleFieldUpdate('status', opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                      isSelected 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'border-transparent bg-muted/50 hover:bg-muted hover:border-muted-foreground/20'
                    )}
                  >
                    <Icon className={cn('w-5 h-5', isSelected ? opt.color : 'text-muted-foreground')} />
                    <span className={cn('text-xs font-medium', isSelected ? 'text-foreground' : 'text-muted-foreground')}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Project */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <FolderOpen className="w-3.5 h-3.5" />
              Project
            </Label>
            <Select
              value={task.project_id || 'none'}
              onValueChange={(v) => handleFieldUpdate('project_id', v === 'none' ? null : v)}
            >
              <SelectTrigger className="w-full h-11 bg-muted/50 border-0">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="none">No project (company-wide)</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type & Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <ListTodo className="w-3.5 h-3.5" />
                Type
              </Label>
              <Select value={task.task_type} onValueChange={(v) => handleFieldUpdate('task_type', v)}>
                <SelectTrigger className="h-11 bg-muted/50 border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', opt.color)} />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Flag className="w-3.5 h-3.5" />
                Priority
              </Label>
              <Select value={task.priority} onValueChange={(v) => handleFieldUpdate('priority', v)}>
                <SelectTrigger className="h-11 bg-muted/50 border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', opt.color)} />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <User className="w-3.5 h-3.5" />
              Assignee
            </Label>
            <Select
              value={task.assigned_worker_id || 'unassigned'}
              onValueChange={(v) => handleFieldUpdate('assigned_worker_id', v === 'unassigned' ? null : v)}
            >
              <SelectTrigger className="w-full h-11 bg-muted/50 border-0">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="unassigned">
                  <span className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-3 h-3 text-muted-foreground" />
                    </div>
                    Unassigned
                  </span>
                </SelectItem>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    <span className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
                        {w.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      {w.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <CalendarIcon className="w-3.5 h-3.5" />
              Due Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="w-full h-11 justify-start text-left font-normal bg-muted/50 hover:bg-muted">
                  <CalendarIcon className="mr-3 h-4 w-4 text-muted-foreground" />
                  {task.due_date ? format(parseISO(task.due_date), 'EEEE, MMMM d, yyyy') : 'No due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
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
                      className="w-full text-muted-foreground"
                      onClick={() => handleFieldUpdate('due_date', null)}
                    >
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Add a description..."
              className="min-h-[140px] resize-none bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* Metadata footer */}
          <div className="pt-2 space-y-1 text-xs text-muted-foreground">
            <p>Created: {format(parseISO(task.created_at), 'MMMM d, yyyy')}</p>
            {task.completed_at && <p>Completed: {format(parseISO(task.completed_at), 'MMMM d, yyyy')}</p>}
          </div>

          {/* Delete button */}
          <div className="pt-2">
            <Button
              variant="destructive"
              className="w-full h-11"
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
