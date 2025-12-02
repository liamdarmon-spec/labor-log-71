import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { useWorkers, useProjectsList } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

export interface TaskFilterValue {
  projectId?: string;
  assigneeId?: string;
  status?: string[];
  taskType?: string[];
  dateRange?: { from?: Date; to?: Date };
}

interface TaskFiltersProps {
  projectId?: string;
  value: TaskFilterValue;
  onChange: (value: TaskFilterValue) => void;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const TASK_TYPE_OPTIONS = [
  { value: 'todo', label: 'To-Do' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'punchlist', label: 'Punchlist' },
];

export function TaskFilters({ projectId, value, onChange }: TaskFiltersProps) {
  const { data: workers = [] } = useWorkers();
  const { data: projects = [] } = useProjectsList();

  const handleProjectChange = (newProjectId: string) => {
    onChange({ ...value, projectId: newProjectId === 'all' ? undefined : newProjectId });
  };

  const handleAssigneeChange = (assigneeId: string) => {
    onChange({ ...value, assigneeId: assigneeId === 'all' ? undefined : assigneeId });
  };

  const handleStatusChange = (status: string) => {
    onChange({ ...value, status: status === 'all' ? undefined : [status] });
  };

  const handleTypeChange = (taskType: string) => {
    onChange({ ...value, taskType: taskType === 'all' ? undefined : [taskType] });
  };

  const clearFilters = () => {
    onChange({ projectId: projectId });
  };

  const hasActiveFilters =
    (!projectId && value.projectId) ||
    value.assigneeId ||
    (value.status && value.status.length > 0) ||
    (value.taskType && value.taskType.length > 0) ||
    value.dateRange?.from ||
    value.dateRange?.to;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Project filter - only on global page */}
      {!projectId && (
        <Select value={value.projectId || 'all'} onValueChange={handleProjectChange}>
          <SelectTrigger className="h-9 w-[160px] text-sm">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Assignee filter */}
      <Select value={value.assigneeId || 'all'} onValueChange={handleAssigneeChange}>
        <SelectTrigger className="h-9 w-[140px] text-sm">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          {workers.map((worker) => (
            <SelectItem key={worker.id} value={worker.id}>{worker.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select value={value.status?.[0] || 'all'} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-9 w-[130px] text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any Status</SelectItem>
          {STATUS_OPTIONS.map((status) => (
            <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type filter */}
      <Select value={value.taskType?.[0] || 'all'} onValueChange={handleTypeChange}>
        <SelectTrigger className="h-9 w-[120px] text-sm">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any Type</SelectItem>
          {TASK_TYPE_OPTIONS.map((type) => (
            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn('h-9 gap-2 text-sm font-normal', value.dateRange?.from && 'text-foreground')}>
            <CalendarIcon className="w-3.5 h-3.5" />
            {value.dateRange?.from ? (
              value.dateRange.to ? (
                <>{format(value.dateRange.from, 'MMM d')} - {format(value.dateRange.to, 'MMM d')}</>
              ) : (
                format(value.dateRange.from, 'MMM d')
              )
            ) : (
              'Due Date'
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: value.dateRange?.from, to: value.dateRange?.to }}
            onSelect={(range) => onChange({ ...value, dateRange: range ? { from: range.from, to: range.to } : undefined })}
            numberOfMonths={1}
            className="pointer-events-auto"
          />
          {value.dateRange?.from && (
            <div className="p-2 border-t">
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => onChange({ ...value, dateRange: undefined })}>
                Clear dates
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Clear all button */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-sm text-muted-foreground hover:text-foreground gap-1">
          <X className="w-3.5 h-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
