import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, Users, CheckSquare, Package, AlertTriangle, Flag } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { Task, useUpdateTask } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  showProject?: boolean;
  onViewDetails?: (task: Task) => void;
}

export function TaskCard({ task, showProject = false, onViewDetails }: TaskCardProps) {
  const updateTask = useUpdateTask();

  const handleStatusChange = (newStatus: string) => {
    updateTask.mutate({ id: task.id, updates: { status: newStatus } });
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

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'inspection':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'milestone':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'punchlist':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-destructive';
      case 'low':
        return 'text-muted-foreground';
      default:
        return 'text-warning';
    }
  };

  const isOverdue = task.due_date && isBefore(parseISO(task.due_date), startOfDay(new Date())) && task.status !== 'done';

  return (
    <Card
      className={cn(
        'p-3 cursor-pointer hover:shadow-md transition-all border',
        isOverdue && 'border-destructive/50 bg-destructive/5'
      )}
      onClick={() => onViewDetails?.(task)}
    >
      <div className="space-y-2">
        {/* Header: Title and Type Badge */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium line-clamp-2 flex-1">{task.title}</h4>
          <Badge variant="outline" className={cn('shrink-0 gap-1 text-xs', getTaskTypeColor(task.task_type))}>
            {getTaskTypeIcon(task.task_type)}
            <span className="capitalize">{task.task_type}</span>
          </Badge>
        </div>

        {/* Project Badge */}
        {showProject && task.projects?.project_name && (
          <Badge variant="secondary" className="text-xs">
            {task.projects.project_name}
          </Badge>
        )}

        {/* Description Preview */}
        {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}

        {/* Metadata Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {task.assigned_worker_id && task.workers?.name && (
            <Badge variant="secondary" className="text-xs gap-1">
              <User className="w-3 h-3" />
              {task.workers.name}
            </Badge>
          )}

          {task.due_date && (
            <Badge variant={isOverdue ? 'destructive' : 'outline'} className="text-xs gap-1">
              {isOverdue && <AlertTriangle className="w-3 h-3" />}
              <Calendar className="w-3 h-3" />
              {format(parseISO(task.due_date), 'MMM d')}
            </Badge>
          )}

          <Badge variant="outline" className={cn('text-xs capitalize', getPriorityColor(task.priority))}>
            {task.priority}
          </Badge>
        </div>

        {/* Status Change Buttons */}
        <div className="flex gap-1 pt-2 border-t">
          {task.status !== 'open' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs flex-1"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange('open');
              }}
              disabled={updateTask.isPending}
            >
              Open
            </Button>
          )}
          {task.status !== 'in_progress' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs flex-1"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange('in_progress');
              }}
              disabled={updateTask.isPending}
            >
              In Progress
            </Button>
          )}
          {task.status !== 'done' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs flex-1"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange('done');
              }}
              disabled={updateTask.isPending}
            >
              Done
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
