import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, 
  Clock, ListTodo, Minus 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SnapshotBarProps {
  projectName: string;
  projectStatus?: string;
  clientName?: string;
  scheduleHealthPercent?: number | null;
  budgetVariance?: number | null;
  weeklyLaborHours?: number | null;
  openTasksCount?: number | null;
}

interface KpiPillProps {
  label: string;
  value: string;
  valueColor?: string;
  icon: React.ElementType;
  iconColor?: string;
  bgColor?: string;
  chip?: string;
  chipColor?: string;
}

function KpiPill({ label, value, valueColor, icon: Icon, iconColor, bgColor, chip, chipColor }: KpiPillProps) {
  return (
    <div className={cn(
      "flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200",
      "hover:shadow-sm hover:scale-[1.01]",
      bgColor || "bg-muted/40"
    )}>
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-background/60">
        <Icon className={cn("h-4 w-4", iconColor || "text-muted-foreground")} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium leading-none mb-1">
          {label}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn("text-sm font-semibold leading-none", valueColor)}>
            {value}
          </span>
          {chip && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-[9px] px-1.5 py-0 h-4 font-medium border-0",
                chipColor
              )}
            >
              {chip}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export function SnapshotBar({
  projectName,
  projectStatus,
  clientName,
  scheduleHealthPercent,
  budgetVariance,
  weeklyLaborHours,
  openTasksCount,
}: SnapshotBarProps) {
  const getStatusStyle = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active': 
        return { dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' };
      case 'completed': 
        return { dot: 'bg-blue-500', badge: 'bg-blue-500/10 text-blue-600 border-blue-200' };
      case 'on-hold': 
        return { dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-600 border-amber-200' };
      default: 
        return { dot: 'bg-muted-foreground', badge: 'bg-muted text-muted-foreground' };
    }
  };

  const getScheduleKpi = () => {
    if (scheduleHealthPercent == null) {
      return { value: '—', color: 'text-muted-foreground', icon: Minus, iconColor: 'text-muted-foreground' };
    }
    if (scheduleHealthPercent >= 85) {
      return { 
        value: `${scheduleHealthPercent.toFixed(0)}%`, 
        color: 'text-emerald-600', 
        icon: CheckCircle2, 
        iconColor: 'text-emerald-500',
        chip: 'On Track',
        chipColor: 'bg-emerald-500/10 text-emerald-600'
      };
    }
    if (scheduleHealthPercent >= 50) {
      return { 
        value: `${scheduleHealthPercent.toFixed(0)}%`, 
        color: 'text-amber-600', 
        icon: AlertTriangle, 
        iconColor: 'text-amber-500',
        chip: 'At Risk',
        chipColor: 'bg-amber-500/10 text-amber-600'
      };
    }
    return { 
      value: `${scheduleHealthPercent.toFixed(0)}%`, 
      color: 'text-red-600', 
      icon: AlertTriangle, 
      iconColor: 'text-red-500',
      chip: 'Delayed',
      chipColor: 'bg-red-500/10 text-red-600'
    };
  };

  const getBudgetKpi = () => {
    if (budgetVariance == null) {
      return { value: '—', color: 'text-muted-foreground', icon: Minus, iconColor: 'text-muted-foreground' };
    }
    if (budgetVariance >= 0) {
      return { 
        value: `+$${budgetVariance.toLocaleString()}`, 
        color: 'text-emerald-600', 
        icon: TrendingDown, 
        iconColor: 'text-emerald-500' 
      };
    }
    return { 
      value: `-$${Math.abs(budgetVariance).toLocaleString()}`, 
      color: 'text-red-600', 
      icon: TrendingUp, 
      iconColor: 'text-red-500' 
    };
  };

  const scheduleKpi = getScheduleKpi();
  const budgetKpi = getBudgetKpi();
  const statusStyle = getStatusStyle(projectStatus);

  return (
    <Card className="p-4 lg:p-5 rounded-xl border-border/60 shadow-sm animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Project Identity */}
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight truncate">
              {projectName}
            </h1>
            {projectStatus && (
              <Badge 
                variant="outline" 
                className={cn("gap-1.5 px-2.5 py-0.5 font-medium", statusStyle.badge)}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", statusStyle.dot)} />
                {projectStatus}
              </Badge>
            )}
          </div>
          {clientName && (
            <p className="text-sm text-muted-foreground">
              <span className="text-muted-foreground/60">Client:</span> {clientName}
            </p>
          )}
        </div>

        {/* Right: KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-3">
          <KpiPill
            label="Schedule"
            value={scheduleKpi.value}
            valueColor={scheduleKpi.color}
            icon={scheduleKpi.icon}
            iconColor={scheduleKpi.iconColor}
            chip={scheduleKpi.chip}
            chipColor={scheduleKpi.chipColor}
          />
          <KpiPill
            label="Budget"
            value={budgetKpi.value}
            valueColor={budgetKpi.color}
            icon={budgetKpi.icon}
            iconColor={budgetKpi.iconColor}
          />
          <KpiPill
            label="This Week"
            value={weeklyLaborHours != null ? `${weeklyLaborHours.toFixed(1)}h` : '—'}
            icon={Clock}
            iconColor="text-primary"
          />
          <KpiPill
            label="Tasks"
            value={openTasksCount != null ? `${openTasksCount} open` : '—'}
            icon={ListTodo}
            iconColor="text-primary"
          />
        </div>
      </div>
    </Card>
  );
}
