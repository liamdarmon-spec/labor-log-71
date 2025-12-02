import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CalendarIcon, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { useWorkers, useProjectsList } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { ActiveFilterChips } from './ActiveFilterChips';

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
  const [isOpen, setIsOpen] = useState(false);
  const { data: workers = [] } = useWorkers();
  const { data: projects = [] } = useProjectsList();

  const handleProjectChange = (newProjectId: string) => {
    onChange({ ...value, projectId: newProjectId === 'all' ? undefined : newProjectId });
  };

  const handleAssigneeChange = (assigneeId: string) => {
    onChange({ ...value, assigneeId: assigneeId === 'all' ? undefined : assigneeId });
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

  const activeFilterCount = [
    !projectId && value.projectId,
    value.assigneeId,
    value.status?.length,
    value.taskType?.length,
    value.dateRange?.from || value.dateRange?.to,
  ].filter(Boolean).length;

  const selectedProject = projects.find((p) => p.id === value.projectId);
  const selectedAssignee = workers.find((w) => w.id === value.assigneeId);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">{activeFilterCount}</Badge>
              )}
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="flex flex-wrap gap-2 items-start p-4 rounded-lg border bg-muted/30">
              {!projectId && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Project</label>
                  <Select value={value.projectId || 'all'} onValueChange={handleProjectChange}>
                    <SelectTrigger className={cn('w-[180px]', compact && 'h-8 text-xs')}>
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Assignee</label>
                <Select value={value.assigneeId || 'all'} onValueChange={handleAssigneeChange}>
                  <SelectTrigger className={cn('w-[160px]', compact && 'h-8 text-xs')}>
                    <SelectValue placeholder="All Assignees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {workers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>{worker.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Status</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size={compact ? 'sm' : 'default'} className="w-[140px] justify-between">
                      {value.status?.length ? `${value.status.length} selected` : 'Any status'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
                    {STATUS_OPTIONS.map((status) => (
                      <Button key={status.value} variant={value.status?.includes(status.value) ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start" onClick={() => toggleStatus(status.value)}>{status.label}</Button>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Type</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size={compact ? 'sm' : 'default'} className="w-[140px] justify-between">
                      {value.taskType?.length ? `${value.taskType.length} selected` : 'Any type'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
                    {TASK_TYPE_OPTIONS.map((type) => (
                      <Button key={type.value} variant={value.taskType?.includes(type.value) ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start" onClick={() => toggleTaskType(type.value)}>{type.label}</Button>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Due Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size={compact ? 'sm' : 'default'} className="gap-1 w-[180px] justify-start">
                      <CalendarIcon className="w-3 h-3" />
                      {value.dateRange?.from ? (value.dateRange.to ? <>{format(value.dateRange.from, 'MMM d')} - {format(value.dateRange.to, 'MMM d')}</> : format(value.dateRange.from, 'MMM d')) : 'Any date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="range" selected={{ from: value.dateRange?.from, to: value.dateRange?.to }} onSelect={(range) => onChange({ ...value, dateRange: range ? { from: range.from, to: range.to } : undefined })} numberOfMonths={1} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              {hasActiveFilters && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground invisible">Clear</label>
                  <Button variant="ghost" size={compact ? 'sm' : 'default'} onClick={clearFilters} className="gap-1"><X className="w-3 h-3" />Clear all</Button>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
        <ActiveFilterChips value={value} onChange={onChange} projectName={selectedProject?.project_name} assigneeName={selectedAssignee?.name} showProjectChip={!projectId} />
      </div>
    </div>
  );
}
