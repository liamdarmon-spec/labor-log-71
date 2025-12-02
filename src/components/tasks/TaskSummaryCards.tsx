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
      gradient: 'from-blue-500 to-blue-600',
      bgGlow: 'bg-blue-500/10',
      iconBg: 'bg-blue-500/15',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Due Today',
      value: summary.dueToday,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      bgGlow: 'bg-amber-500/10',
      iconBg: 'bg-amber-500/15',
      iconColor: 'text-amber-500',
    },
    {
      label: 'Overdue',
      value: summary.overdue,
      icon: AlertTriangle,
      gradient: 'from-red-500 to-rose-500',
      bgGlow: 'bg-red-500/10',
      iconBg: 'bg-red-500/15',
      iconColor: 'text-red-500',
    },
    {
      label: 'Done This Week',
      value: summary.completedThisWeek,
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-green-500',
      bgGlow: 'bg-emerald-500/10',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-500',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5 border-0 shadow-sm">
            <div className="h-16 bg-muted rounded-lg animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card 
          key={card.label} 
          className={cn(
            'relative overflow-hidden p-5 border-0 shadow-sm hover:shadow-md transition-all duration-300 group',
            card.bgGlow
          )}
        >
          {/* Subtle gradient overlay */}
          <div className={cn(
            'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br',
            card.gradient,
            'mix-blend-soft-light'
          )} style={{ opacity: 0.05 }} />
          
          <div className="relative flex items-center gap-4">
            <div className={cn('p-3 rounded-xl', card.iconBg)}>
              <card.icon className={cn('w-5 h-5', card.iconColor)} />
            </div>
            <div>
              <p className="text-3xl font-bold tracking-tight">{card.value}</p>
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
