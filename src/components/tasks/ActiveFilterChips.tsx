import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { TaskFilterValue } from './TaskFilters';

interface ActiveFilterChipsProps {
  value: TaskFilterValue;
  onChange: (value: TaskFilterValue) => void;
  projectName?: string;
  assigneeName?: string;
  showProjectChip?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  done: 'Done',
};

const TYPE_LABELS: Record<string, string> = {
  todo: 'To-Do',
  meeting: 'Meeting',
  inspection: 'Inspection',
  milestone: 'Milestone',
  punchlist: 'Punchlist',
};

export function ActiveFilterChips({
  value,
  onChange,
  projectName,
  assigneeName,
  showProjectChip = true,
}: ActiveFilterChipsProps) {
  const chips: { label: string; key: string; onRemove: () => void }[] = [];

  // Project chip
  if (showProjectChip && value.projectId && projectName) {
    chips.push({
      label: `Project: ${projectName}`,
      key: 'project',
      onRemove: () => onChange({ ...value, projectId: undefined }),
    });
  }

  // Assignee chip
  if (value.assigneeId && assigneeName) {
    chips.push({
      label: `Assignee: ${assigneeName}`,
      key: 'assignee',
      onRemove: () => onChange({ ...value, assigneeId: undefined }),
    });
  }

  // Status chips
  if (value.status && value.status.length > 0) {
    value.status.forEach((s) => {
      chips.push({
        label: `Status: ${STATUS_LABELS[s] || s}`,
        key: `status-${s}`,
        onRemove: () =>
          onChange({
            ...value,
            status: value.status?.filter((st) => st !== s),
          }),
      });
    });
  }

  // Type chips
  if (value.taskType && value.taskType.length > 0) {
    value.taskType.forEach((t) => {
      chips.push({
        label: `Type: ${TYPE_LABELS[t] || t}`,
        key: `type-${t}`,
        onRemove: () =>
          onChange({
            ...value,
            taskType: value.taskType?.filter((tt) => tt !== t),
          }),
      });
    });
  }

  // Date range chip
  if (value.dateRange?.from || value.dateRange?.to) {
    const from = value.dateRange.from ? format(value.dateRange.from, 'MMM d') : '';
    const to = value.dateRange.to ? format(value.dateRange.to, 'MMM d') : '';
    const label = from && to ? `Due: ${from} - ${to}` : from ? `Due from: ${from}` : `Due until: ${to}`;
    chips.push({
      label,
      key: 'date',
      onRemove: () => onChange({ ...value, dateRange: undefined }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          className="gap-1 pl-2 pr-1 py-1 text-xs font-normal cursor-pointer hover:bg-secondary/80"
        >
          {chip.label}
          <button
            onClick={(e) => {
              e.stopPropagation();
              chip.onRemove();
            }}
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
