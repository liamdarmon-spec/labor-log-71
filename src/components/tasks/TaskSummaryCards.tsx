import { Card, CardContent } from '@/components/ui/card';
import { CheckSquare, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTaskSummary, TaskFilters } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface TaskSummaryCardsProps {
  filters: TaskFilters;
}

interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger' | 'success';
}

function SummaryCard({ title, value, icon, variant = 'default' }: SummaryCardProps) {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-destructive/10 text-destructive',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', variantStyles[variant])}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TaskSummaryCards({ filters }: TaskSummaryCardsProps) {
  const queryFilters = {
    ...filters,
    dateFrom: filters.dateRange?.from?.toISOString().split('T')[0],
    dateTo: filters.dateRange?.to?.toISOString().split('T')[0],
  };

  const { summary, isLoading } = useTaskSummary(queryFilters);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-20 animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <SummaryCard title="Open Tasks" value={summary.openTasks} icon={<CheckSquare className="w-5 h-5" />} />
      <SummaryCard title="Due Today" value={summary.dueToday} icon={<Clock className="w-5 h-5" />} variant="warning" />
      <SummaryCard
        title="Overdue"
        value={summary.overdue}
        icon={<AlertTriangle className="w-5 h-5" />}
        variant="danger"
      />
      <SummaryCard
        title="Completed This Week"
        value={summary.completedThisWeek}
        icon={<CheckCircle2 className="w-5 h-5" />}
        variant="success"
      />
    </div>
  );
}
