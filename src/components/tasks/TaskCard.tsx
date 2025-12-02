import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, User, Users, CheckSquare, Package, AlertTriangle, Flag, GripVertical } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { Task, useUpdateTask, useWorkers } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  showProject?: boolean;
  onViewDetails?: (task: Task) => void;
}

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  medium: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700',
  high: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  urgent: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
};

const TYPE_STYLES: Record<string, string> = {
  todo: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700',
  meeting: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  milestone: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  punchlist: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  inspection: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
};

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const TYPE_OPTIONS = [
  { value: 'todo', label: 'To-Do' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'punchlist', label: 'Punchlist' },
  { value: 'inspection', label: 'Inspection' },
];

export function TaskCard({ task, showProject = false, onViewDetails }: TaskCardProps) {
  const updateTask = useUpdateTask();
  const { data: workers = [] } = useWorkers();
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    setEditedTitle(task.title);
  }, [task.title]);

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    const trimmed = editedTitle.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask.mutate({ id: task.id, updates: { title: trimmed } });
    } else {
      setEditedTitle(task.title);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleInputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setEditedTitle(task.title);
      setIsEditingTitle(false);
    }
  };

  const handleFieldUpdate = (field: string, value: string | null) => {
    updateTask.mutate({ id: task.id, updates: { [field]: value } });
  };

  const handleCardClick = () => {
    if (!isEditingTitle) {
      onViewDetails?.(task);
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return <Users className="w-3 h-3" />;
      case 'inspection':
        return <CheckSquare className="w-3 h-3" />;
      case 'milestone':
        return <Flag className="w-3 h-3" />;
      case 'punchlist':
        return <Package className="w-3 h-3" />;
      default:
        return <CheckSquare className="w-3 h-3" />;
    }
  };

  const isOverdue =
    task.due_date && isBefore(parseISO(task.due_date), startOfDay(new Date())) && task.status !== 'done';

  return (
    <Card
      className={cn(
        'p-3 cursor-pointer hover:shadow-md transition-all border group',
        isOverdue && 'border-destructive/50 bg-destructive/5'
      )}
      onClick={handleCardClick}
    >
      <div className="space-y-2">
        {/* Drag Handle + Title Row */}
        <div className="flex items-start gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground/50 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <Input
                ref={titleInputRef}
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className="text-sm font-medium h-auto py-0 px-1 -mx-1"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h4
                className="text-sm font-medium line-clamp-2 hover:text-primary transition-colors cursor-text"
                onClick={handleTitleClick}
              >
                {task.title}
              </h4>
            )}
          </div>
        </div>

        {/* Type and Priority Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Type Badge - Clickable */}
          <Popover>
            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Badge
                variant="outline"
                className={cn('gap-1 text-xs cursor-pointer hover:opacity-80', TYPE_STYLES[task.task_type])}
              >
                {getTaskTypeIcon(task.task_type)}
                <span className="capitalize">{task.task_type}</span>
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="start" onClick={(e) => e.stopPropagation()}>
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFieldUpdate('task_type', opt.value)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted flex items-center gap-2',
                    task.task_type === opt.value && 'bg-muted'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full', TYPE_STYLES[opt.value]?.split(' ')[0])} />
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Priority Badge - Clickable */}
          <Popover>
            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Badge
                variant="outline"
                className={cn('text-xs capitalize cursor-pointer hover:opacity-80', PRIORITY_STYLES[task.priority])}
              >
                {task.priority}
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-32 p-1" align="start" onClick={(e) => e.stopPropagation()}>
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFieldUpdate('priority', opt.value)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted flex items-center gap-2',
                    task.priority === opt.value && 'bg-muted'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full', PRIORITY_STYLES[opt.value]?.split(' ')[0])} />
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* Project Badge */}
        {showProject && task.projects?.project_name && (
          <Badge variant="secondary" className="text-xs">
            {task.projects.project_name}
          </Badge>
        )}

        {/* Metadata Row */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Assignee - Clickable */}
          <Popover>
            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Badge
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-secondary/80"
              >
                <User className="w-3 h-3" />
                {task.workers?.name || 'Unassigned'}
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1 max-h-60 overflow-y-auto" align="start" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => handleFieldUpdate('assigned_worker_id', null)}
                className={cn(
                  'w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted',
                  !task.assigned_worker_id && 'bg-muted'
                )}
              >
                Unassigned
              </button>
              {workers.map((w) => (
                <button
                  key={w.id}
                  onClick={() => handleFieldUpdate('assigned_worker_id', w.id)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted',
                    task.assigned_worker_id === w.id && 'bg-muted'
                  )}
                >
                  {w.name}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Due Date */}
          {task.due_date && (
            <Badge variant={isOverdue ? 'destructive' : 'outline'} className="gap-1">
              {isOverdue && <AlertTriangle className="w-3 h-3" />}
              <Calendar className="w-3 h-3" />
              {format(parseISO(task.due_date), 'MMM d')}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
