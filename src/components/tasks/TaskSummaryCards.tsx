import { Card } from '@/components/ui/card';
import { CheckSquare, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTaskSummary, TaskFilters } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface TaskSummaryCardsProps {
  filters: TaskFilters;
}

export function TaskSummaryCards({ filters }: TaskSummaryCardsProps) {
  const queryFilters = {
    ...filters,
    dateFrom: filters.dateRange?.from?.toISOString().split('T')[0],
    dateTo: filters.dateRange?.to?.toISOString().split('T')[0],
  };

  const { summary, isLoading } = useTaskSummary(queryFilters);

  const cards = [
    {
      label: 'Open',
      value: summary.openTasks,
      icon: CheckSquare,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Due Today',
      value: summary.dueToday,
      icon: Clock,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Overdue',
      value: summary.overdue,
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      label: 'Done This Week',
      value: summary.completedThisWeek,
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4">
            <div className="h-12 bg-muted rounded animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', card.bgColor)}>
              <card.icon className={cn('w-4 h-4', card.iconColor)} />
            </div>
            <div>
              <p className="text-2xl font-semibold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
