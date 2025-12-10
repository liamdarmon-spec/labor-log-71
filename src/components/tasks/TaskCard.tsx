import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, User, AlertTriangle, ChevronDown, Circle, CheckCircle2, Clock } from 'lucide-react';
import { format, isBefore, startOfDay, isToday as dateFnsIsToday } from 'date-fns';
import { Task, useUpdateTask, useWorkers } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { safeParseDate, safeFormat } from '@/lib/utils/safeDate';

interface TaskCardProps {
  task: Task;
  showProject?: boolean;
  onViewDetails?: (task: Task) => void;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  low: { label: 'Low', color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100', ring: 'ring-blue-200' },
  medium: { label: 'Med', color: 'text-slate-600', bg: 'bg-slate-100 hover:bg-slate-200', ring: 'ring-slate-200' },
  high: { label: 'High', color: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100', ring: 'ring-amber-200' },
  urgent: { label: 'Urgent', color: 'text-red-600', bg: 'bg-red-50 hover:bg-red-100', ring: 'ring-red-200' },
};

const PRIORITY_ORDER = ['low', 'medium', 'high', 'urgent'];

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Circle; color: string }> = {
  open: { label: 'Open', icon: Circle, color: 'text-blue-500' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-amber-500' },
  done: { label: 'Done', icon: CheckCircle2, color: 'text-emerald-500' },
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  todo: { label: 'To-do', color: 'text-slate-600', bg: 'bg-slate-100' },
  meeting: { label: 'Meeting', color: 'text-violet-600', bg: 'bg-violet-50' },
  milestone: { label: 'Milestone', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  punchlist: { label: 'Punchlist', color: 'text-rose-600', bg: 'bg-rose-50' },
  inspection: { label: 'Inspection', color: 'text-amber-600', bg: 'bg-amber-50' },
};

export function TaskCard({ task, showProject = false, onViewDetails }: TaskCardProps) {
  const updateTask = useUpdateTask();
  const { data: workers = [] } = useWorkers();
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [showAssigneePopover, setShowAssigneePopover] = useState(false);
  const [showDatePopover, setShowDatePopover] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  const parsedDueDate = safeParseDate(task.due_date);
  const isOverdue = parsedDueDate && isBefore(parsedDueDate, startOfDay(new Date())) && task.status !== 'done';
  const isDueToday = parsedDueDate && dateFnsIsToday(parsedDueDate) && task.status !== 'done';
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const type = TYPE_CONFIG[task.task_type] || TYPE_CONFIG.todo;

  useEffect(() => {
    setTitleValue(task.title);
  }, [task.title]);

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

  const StatusIcon = STATUS_CONFIG[task.status]?.icon || Circle;

  return (
    <Card
      className={cn(
        'group relative p-4 hover:shadow-lg transition-all duration-200 border-l-[3px]',
        task.status === 'done' 
          ? 'border-l-emerald-400 bg-emerald-50/30' 
          : isOverdue 
            ? 'border-l-red-400 bg-red-50/20' 
            : isDueToday
              ? 'border-l-amber-400 bg-amber-50/20'
              : 'border-l-transparent hover:border-l-primary/40',
        onViewDetails && !isEditingTitle && 'cursor-pointer'
      )}
      onClick={handleCardClick}
    >
      <div className="space-y-3">
        {/* Header: Status icon + Title */}
        <div className="flex items-start gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const statuses = ['open', 'in_progress', 'done'];
              const currentIdx = statuses.indexOf(task.status);
              const nextStatus = statuses[(currentIdx + 1) % statuses.length];
              updateTask.mutate({ id: task.id, updates: { status: nextStatus } });
            }}
            className={cn('mt-0.5 transition-transform hover:scale-110', STATUS_CONFIG[task.status]?.color)}
          >
            <StatusIcon className="w-5 h-5" />
          </button>
          
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <Input
                ref={titleInputRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className="h-auto py-1 px-2 text-sm font-semibold border-primary/30 bg-background shadow-sm"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h4 
                className={cn(
                  'text-sm font-semibold leading-snug line-clamp-2 transition-colors',
                  task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground group-hover:text-primary'
                )}
                onClick={handleTitleClick}
              >
                {task.title}
              </h4>
            )}
          </div>
        </div>

        {/* Meta row: Project badge + Type */}
        <div className="flex items-center gap-2 flex-wrap pl-8">
          {showProject && task.projects?.project_name && (
            <Badge className="text-[10px] h-5 px-2 font-medium bg-primary/10 text-primary border-0 hover:bg-primary/20">
              {task.projects.project_name}
            </Badge>
          )}
          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', type.bg, type.color)}>
            {type.label}
          </span>
        </div>

        {/* Status segmented control */}
        <div 
          className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg w-fit ml-8" 
          onClick={(e) => e.stopPropagation()}
        >
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={status}
                onClick={(e) => handleStatusChange(status, e)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all',
                  task.status === status 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                <Icon className={cn('w-3 h-3', task.status === status && config.color)} />
                <span className="hidden sm:inline">{config.label}</span>
              </button>
            );
          })}
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-1.5 flex-wrap pl-8">
          {/* Priority chip */}
          <button
            onClick={handlePriorityClick}
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ring-1 ring-inset',
              priority.bg, priority.color, priority.ring
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', priority.color.replace('text-', 'bg-'))} />
            {priority.label}
          </button>

          {/* Due date chip */}
          <Popover open={showDatePopover} onOpenChange={setShowDatePopover}>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); setShowDatePopover(true); }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all ring-1 ring-inset',
                  isOverdue 
                    ? 'bg-red-50 text-red-700 ring-red-200 hover:bg-red-100' 
                    : isDueToday
                      ? 'bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100'
                      : task.due_date 
                        ? 'bg-background text-foreground ring-border hover:bg-muted' 
                        : 'bg-muted/50 text-muted-foreground ring-transparent hover:bg-muted hover:ring-border'
                )}
              >
                {isOverdue && <AlertTriangle className="w-3 h-3" />}
                <CalendarIcon className="w-3 h-3" />
                <span>{safeFormat(task.due_date, 'MMM d', 'No date')}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start" onClick={(e) => e.stopPropagation()}>
              <Calendar
                mode="single"
                selected={parsedDueDate ?? undefined}
                onSelect={handleDateChange}
                className="pointer-events-auto"
              />
              {task.due_date && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
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
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all ring-1 ring-inset',
                  task.workers?.name 
                    ? 'bg-background text-foreground ring-border hover:bg-muted' 
                    : 'bg-muted/50 text-muted-foreground ring-transparent hover:bg-muted hover:ring-border'
                )}
              >
                <User className="w-3 h-3" />
                <span>{task.workers?.name ? task.workers.name.split(' ')[0] : 'Unassigned'}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2 z-50 bg-popover" align="start" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-1">
                <button
                  onClick={(e) => handleAssigneeChange(null, e)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2',
                    !task.assigned_worker_id && 'bg-muted font-medium'
                  )}
                >
                  <User className="w-4 h-4 text-muted-foreground" />
                  Unassigned
                </button>
                {workers.map((worker) => (
                  <button
                    key={worker.id}
                    onClick={(e) => handleAssigneeChange(worker.id, e)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors flex items-center gap-2',
                      task.assigned_worker_id === worker.id && 'bg-muted font-medium'
                    )}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
                      {worker.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
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
