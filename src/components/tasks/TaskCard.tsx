import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, User, AlertTriangle, ChevronDown } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { Task, useUpdateTask, useWorkers } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  showProject?: boolean;
  onViewDetails?: (task: Task) => void;
}

const PRIORITY_CONFIG: Record<string, { label: string; dot: string; bg: string }> = {
  low: { label: 'Low', dot: 'bg-blue-400', bg: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
  medium: { label: 'Med', dot: 'bg-slate-400', bg: 'bg-slate-50 text-slate-700 hover:bg-slate-100' },
  high: { label: 'High', dot: 'bg-orange-400', bg: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
  urgent: { label: 'Urgent', dot: 'bg-red-500', bg: 'bg-red-50 text-red-700 hover:bg-red-100' },
};

const PRIORITY_ORDER = ['low', 'medium', 'high', 'urgent'];

const STATUS_CONFIG: Record<string, { label: string; bg: string }> = {
  open: { label: 'Open', bg: 'bg-blue-500' },
  in_progress: { label: 'In Progress', bg: 'bg-amber-500' },
  done: { label: 'Done', bg: 'bg-emerald-500' },
};

const TYPE_LABELS: Record<string, string> = {
  todo: 'To-do',
  meeting: 'Meeting',
  milestone: 'Milestone',
  punchlist: 'Punchlist',
  inspection: 'Inspection',
};

const TYPE_COLORS: Record<string, string> = {
  todo: 'text-slate-500',
  meeting: 'text-purple-500',
  milestone: 'text-emerald-500',
  punchlist: 'text-rose-500',
  inspection: 'text-amber-500',
};

export function TaskCard({ task, showProject = false, onViewDetails }: TaskCardProps) {
  const updateTask = useUpdateTask();
  const { data: workers = [] } = useWorkers();
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [showAssigneePopover, setShowAssigneePopover] = useState(false);
  const [showDatePopover, setShowDatePopover] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  const isOverdue = task.due_date && isBefore(parseISO(task.due_date), startOfDay(new Date())) && task.status !== 'done';
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  // Sync title when task changes externally
  useEffect(() => {
    setTitleValue(task.title);
  }, [task.title]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    const trimmed = titleValue.trim();
    if (!trimmed) {
      setTitleValue(task.title);
    } else if (trimmed !== task.title) {
      updateTask.mutate({ id: task.id, updates: { title: trimmed } });
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setTitleValue(task.title);
      setIsEditingTitle(false);
    }
  };

  const handleStatusChange = (newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (newStatus !== task.status) {
      updateTask.mutate({ id: task.id, updates: { status: newStatus } });
    }
  };

  const handlePriorityClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = PRIORITY_ORDER.indexOf(task.priority);
    const nextIndex = (currentIndex + 1) % PRIORITY_ORDER.length;
    updateTask.mutate({ id: task.id, updates: { priority: PRIORITY_ORDER[nextIndex] } });
  };

  const handleAssigneeChange = (workerId: string | null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateTask.mutate({ id: task.id, updates: { assigned_worker_id: workerId } });
    setShowAssigneePopover(false);
  };

  const handleDateChange = (date: Date | undefined) => {
    updateTask.mutate({ 
      id: task.id, 
      updates: { due_date: date ? format(date, 'yyyy-MM-dd') : null } 
    });
    setShowDatePopover(false);
  };

  const handleCardClick = () => {
    if (!isEditingTitle) {
      onViewDetails?.(task);
    }
  };

  return (
    <Card
      className={cn(
        'p-3 hover:shadow-md hover:border-primary/30 transition-all duration-200 group',
        isOverdue && 'border-l-2 border-l-destructive',
        onViewDetails && !isEditingTitle && 'cursor-pointer'
      )}
      onClick={handleCardClick}
    >
      <div className="space-y-2.5">
        {/* Title row */}
        <div className="flex items-start gap-2">
          <div className={cn('w-1.5 h-1.5 rounded-full mt-2 shrink-0', priority.dot)} />
          {isEditingTitle ? (
            <Input
              ref={titleInputRef}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="h-auto py-0.5 px-1 text-sm font-medium border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary/40 bg-muted/50"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h4 
              className="text-sm font-medium line-clamp-2 flex-1 hover:text-primary transition-colors cursor-text"
              onClick={handleTitleClick}
            >
              {task.title}
            </h4>
          )}
        </div>

        {/* Project + Type row */}
        <div className="flex items-center gap-2 flex-wrap">
          {showProject && task.projects?.project_name && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
              {task.projects.project_name}
            </Badge>
          )}
          <span className={cn('text-[10px] font-medium', TYPE_COLORS[task.task_type])}>
            {TYPE_LABELS[task.task_type] || task.task_type}
          </span>
        </div>

        {/* Status segmented control */}
        <div className="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-md w-fit" onClick={(e) => e.stopPropagation()}>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <button
              key={status}
              onClick={(e) => handleStatusChange(status, e)}
              className={cn(
                'px-2 py-0.5 text-[10px] font-medium rounded transition-all',
                task.status === status 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {config.label}
            </button>
          ))}
        </div>

        {/* Interactive metadata row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority chip - click to cycle */}
          <button
            onClick={handlePriorityClick}
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors',
              priority.bg
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', priority.dot)} />
            {priority.label}
          </button>

          {/* Due date chip */}
          <Popover open={showDatePopover} onOpenChange={setShowDatePopover}>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); setShowDatePopover(true); }}
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors',
                  isOverdue 
                    ? 'bg-red-50 text-red-700 hover:bg-red-100' 
                    : task.due_date 
                      ? 'bg-muted hover:bg-muted/80 text-foreground' 
                      : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                )}
              >
                {isOverdue && <AlertTriangle className="w-3 h-3" />}
                <CalendarIcon className="w-3 h-3" />
                {task.due_date ? format(parseISO(task.due_date), 'MMM d') : 'No date'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
              <Calendar
                mode="single"
                selected={task.due_date ? parseISO(task.due_date) : undefined}
                onSelect={handleDateChange}
                className="pointer-events-auto"
              />
              {task.due_date && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleDateChange(undefined)}
                  >
                    Clear date
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Assignee chip */}
          <Popover open={showAssigneePopover} onOpenChange={setShowAssigneePopover}>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); setShowAssigneePopover(true); }}
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors',
                  task.workers?.name 
                    ? 'bg-muted hover:bg-muted/80 text-foreground' 
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                )}
              >
                <User className="w-3 h-3" />
                {task.workers?.name ? task.workers.name.split(' ')[0] : 'Unassigned'}
                <ChevronDown className="w-2.5 h-2.5 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-0.5">
                <button
                  onClick={(e) => handleAssigneeChange(null, e)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors',
                    !task.assigned_worker_id && 'bg-muted'
                  )}
                >
                  Unassigned
                </button>
                {workers.map((worker) => (
                  <button
                    key={worker.id}
                    onClick={(e) => handleAssigneeChange(worker.id, e)}
                    className={cn(
                      'w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors',
                      task.assigned_worker_id === worker.id && 'bg-muted'
                    )}
                  >
                    {worker.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </Card>
  );
}
