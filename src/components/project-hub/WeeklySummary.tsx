import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Clock, ClipboardCheck, AlertCircle, ListChecks } from 'lucide-react';

export interface WeeklySummaryProps {
  workersScheduledToday?: number | null;
  hoursScheduledThisWeek?: number | null;
  hoursLoggedThisWeek?: number | null;
  varianceHoursThisWeek?: number | null;
  openItemsCount?: number | null;
  overdueTasksCount?: number | null;
}

export function WeeklySummary({
  workersScheduledToday,
  hoursScheduledThisWeek,
  hoursLoggedThisWeek,
  varianceHoursThisWeek,
  openItemsCount,
  overdueTasksCount,
}: WeeklySummaryProps) {
  const formatValue = (value: number | null | undefined, suffix = '') => {
    if (value == null) return '—';
    return `${value}${suffix}`;
  };

  const formatHours = (value: number | null | undefined) => {
    if (value == null) return '—';
    return `${value.toFixed(1)}h`;
  };

  const getVarianceDisplay = () => {
    if (varianceHoursThisWeek == null) return { value: '—', color: 'text-muted-foreground' };
    const isUnder = varianceHoursThisWeek <= 0;
    return {
      value: `${isUnder ? '+' : '-'}${Math.abs(varianceHoursThisWeek).toFixed(1)}h`,
      color: isUnder ? 'text-emerald-600' : 'text-amber-600',
    };
  };

  const variance = getVarianceDisplay();

  const stats = [
    {
      label: 'Workers Today',
      value: formatValue(workersScheduledToday),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Scheduled Hours',
      value: formatHours(hoursScheduledThisWeek),
      icon: Calendar,
      color: 'text-violet-600',
      bgColor: 'bg-violet-500/10',
    },
    {
      label: 'Logged Hours',
      value: formatHours(hoursLoggedThisWeek),
      icon: Clock,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Variance',
      value: variance.value,
      icon: ClipboardCheck,
      color: variance.color,
      bgColor: varianceHoursThisWeek != null && varianceHoursThisWeek > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10',
    },
    {
      label: 'Open Items',
      value: formatValue(openItemsCount),
      icon: ListChecks,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Overdue Tasks',
      value: formatValue(overdueTasksCount),
      icon: AlertCircle,
      color: overdueTasksCount && overdueTasksCount > 0 ? 'text-red-600' : 'text-muted-foreground',
      bgColor: overdueTasksCount && overdueTasksCount > 0 ? 'bg-red-500/10' : 'bg-muted/50',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Today & This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-start gap-2.5 p-3 bg-muted/30 rounded-lg">
              <div className={`p-1.5 rounded-md ${stat.bgColor}`}>
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {stat.label}
                </p>
                <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
