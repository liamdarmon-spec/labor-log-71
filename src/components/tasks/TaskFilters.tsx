import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, X, Filter } from 'lucide-react';
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
  projectId?: string; // If provided, project filter is locked/hidden
  value: TaskFilterValue;
  onChange: (value: TaskFilterValue) => void;
  compact?: boolean;
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

export function TaskFilters({ projectId, value, onChange, compact = false }: TaskFiltersProps) {
  const { data: workers = [] } = useWorkers();
  const { data: projects = [] } = useProjectsList();

  const handleProjectChange = (newProjectId: string) => {
    onChange({
      ...value,
      projectId: newProjectId === 'all' ? undefined : newProjectId,
    });
  };

  const handleAssigneeChange = (assigneeId: string) => {
    onChange({
      ...value,
      assigneeId: assigneeId === 'all' ? undefined : assigneeId,
    });
  };

  const toggleStatus = (status: string) => {
    const currentStatuses = value.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];
    onChange({ ...value, status: newStatuses.length > 0 ? newStatuses : undefined });
  };

  const toggleTaskType = (taskType: string) => {
    const currentTypes = value.taskType || [];
    const newTypes = currentTypes.includes(taskType)
      ? currentTypes.filter((t) => t !== taskType)
      : [...currentTypes, taskType];
    onChange({ ...value, taskType: newTypes.length > 0 ? newTypes : undefined });
  };

  const handleDateChange = (field: 'from' | 'to', date: Date | undefined) => {
    const currentRange = value.dateRange || {};
    onChange({
      ...value,
      dateRange: {
        ...currentRange,
        [field]: date,
      },
    });
  };

  const clearFilters = () => {
    onChange({
      projectId: projectId, // Keep project locked if provided
    });
  };

  const hasActiveFilters =
    (!projectId && value.projectId) ||
    value.assigneeId ||
    (value.status && value.status.length > 0) ||
    (value.taskType && value.taskType.length > 0) ||
    value.dateRange?.from ||
    value.dateRange?.to;

  return (
    <div className={cn('flex flex-wrap gap-2 items-center', compact ? 'gap-1' : 'gap-2')}>
      {/* Project Filter - only show if not scoped to a project */}
      {!projectId && (
        <Select value={value.projectId || 'all'} onValueChange={handleProjectChange}>
          <SelectTrigger className={cn('w-[180px]', compact && 'h-8 text-xs')}>
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.project_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Assignee Filter */}
      <Select value={value.assigneeId || 'all'} onValueChange={handleAssigneeChange}>
        <SelectTrigger className={cn('w-[160px]', compact && 'h-8 text-xs')}>
          <SelectValue placeholder="All Assignees" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          {workers.map((worker) => (
            <SelectItem key={worker.id} value={worker.id}>
              {worker.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Multi-Select */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size={compact ? 'sm' : 'default'} className="gap-1">
            <Filter className="w-3 h-3" />
            Status
            {value.status && value.status.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                {value.status.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            {STATUS_OPTIONS.map((status) => (
              <Button
                key={status.value}
                variant={value.status?.includes(status.value) ? 'secondary' : 'ghost'}
                size="sm"
                className="w-full justify-start"
                onClick={() => toggleStatus(status.value)}
              >
                {status.label}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Task Type Multi-Select */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size={compact ? 'sm' : 'default'} className="gap-1">
            <Filter className="w-3 h-3" />
            Type
            {value.taskType && value.taskType.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                {value.taskType.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            {TASK_TYPE_OPTIONS.map((type) => (
              <Button
                key={type.value}
                variant={value.taskType?.includes(type.value) ? 'secondary' : 'ghost'}
                size="sm"
                className="w-full justify-start"
                onClick={() => toggleTaskType(type.value)}
              >
                {type.label}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Date Range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size={compact ? 'sm' : 'default'} className="gap-1">
            <CalendarIcon className="w-3 h-3" />
            {value.dateRange?.from ? (
              value.dateRange.to ? (
                <>
                  {format(value.dateRange.from, 'MMM d')} - {format(value.dateRange.to, 'MMM d')}
                </>
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
            selected={{
              from: value.dateRange?.from,
              to: value.dateRange?.to,
            }}
            onSelect={(range) => {
              onChange({
                ...value,
                dateRange: range ? { from: range.from, to: range.to } : undefined,
              });
            }}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size={compact ? 'sm' : 'default'} onClick={clearFilters} className="gap-1">
          <X className="w-3 h-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
