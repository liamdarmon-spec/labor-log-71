import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, AlertTriangle } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  showProject?: boolean;
  onViewDetails?: (task: Task) => void;
}

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-blue-400',
  medium: 'bg-slate-400',
  high: 'bg-orange-400',
  urgent: 'bg-red-500',
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
  const isOverdue = task.due_date && isBefore(parseISO(task.due_date), startOfDay(new Date())) && task.status !== 'done';

  return (
    <Card
      className={cn(
        'p-3 hover:shadow-md hover:border-primary/30 transition-all duration-200 group',
        isOverdue && 'border-l-2 border-l-destructive',
        onViewDetails && 'cursor-pointer'
      )}
      onClick={onViewDetails ? () => onViewDetails(task) : undefined}
    >
      <div className="space-y-2">
        {/* Title with priority indicator */}
        <div className="flex items-start gap-2">
          <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', PRIORITY_DOT[task.priority])} />
          <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors flex-1">
            {task.title}
          </h4>
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

        {/* Metadata row - simpler */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {task.due_date && (
            <span className={cn('flex items-center gap-1', isOverdue && 'text-destructive font-medium')}>
              {isOverdue && <AlertTriangle className="w-3 h-3" />}
              <Calendar className="w-3 h-3" />
              {format(parseISO(task.due_date), 'MMM d')}
            </span>
          )}
          {task.workers?.name && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {task.workers.name.split(' ')[0]}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
