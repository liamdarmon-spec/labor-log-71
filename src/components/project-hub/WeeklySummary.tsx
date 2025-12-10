import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Clock, ClipboardCheck, AlertCircle, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WeeklySummaryProps {
  workersScheduledToday?: number | null;
  hoursScheduledThisWeek?: number | null;
  hoursLoggedThisWeek?: number | null;
  varianceHoursThisWeek?: number | null;
  openItemsCount?: number | null;
  overdueTasksCount?: number | null;
}

interface MiniKpiProps {
  label: string;
  value: string;
  icon: React.ElementType;
  valueColor?: string;
  iconColor?: string;
}

function MiniKpi({ label, value, icon: Icon, valueColor, iconColor }: MiniKpiProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor || "text-muted-foreground")} />
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium leading-none">
          {label}
        </p>
        <p className={cn("text-sm font-semibold leading-tight mt-0.5", valueColor)}>
          {value}
        </p>
      </div>
    </div>
  );
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

  return (
    <Card className="rounded-xl border-border/60 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4 text-primary" />
          Today & This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {/* Hours Group */}
          <MiniKpi
            label="Scheduled"
            value={formatHours(hoursScheduledThisWeek)}
            icon={Calendar}
            iconColor="text-violet-500"
          />
          <MiniKpi
            label="Logged"
            value={formatHours(hoursLoggedThisWeek)}
            icon={Clock}
            iconColor="text-emerald-500"
          />
          <MiniKpi
            label="Variance"
            value={variance.value}
            valueColor={variance.color}
            icon={ClipboardCheck}
            iconColor={varianceHoursThisWeek != null && varianceHoursThisWeek > 0 ? 'text-amber-500' : 'text-emerald-500'}
          />
          
          {/* Counts Group */}
          <MiniKpi
            label="Crew Today"
            value={formatValue(workersScheduledToday)}
            icon={Users}
            iconColor="text-blue-500"
          />
          <MiniKpi
            label="Open Items"
            value={formatValue(openItemsCount)}
            icon={ListChecks}
            iconColor="text-primary"
          />
          <MiniKpi
            label="Overdue"
            value={formatValue(overdueTasksCount)}
            valueColor={overdueTasksCount && overdueTasksCount > 0 ? 'text-red-600' : undefined}
            icon={AlertCircle}
            iconColor={overdueTasksCount && overdueTasksCount > 0 ? 'text-red-500' : 'text-muted-foreground'}
          />
        </div>
      </CardContent>
    </Card>
  );
}
