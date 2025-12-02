import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, 
  Clock, ListTodo, Minus 
} from 'lucide-react';

export interface SnapshotBarProps {
  projectName: string;
  projectStatus?: string;
  clientName?: string;
  scheduleHealthPercent?: number | null;
  budgetVariance?: number | null;
  weeklyLaborHours?: number | null;
  openTasksCount?: number | null;
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
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'on-hold': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getScheduleStatus = () => {
    if (scheduleHealthPercent == null) return { label: '—', color: 'text-muted-foreground', chip: null };
    if (scheduleHealthPercent >= 85) return { label: `${scheduleHealthPercent.toFixed(0)}%`, color: 'text-emerald-600', chip: 'On Track' };
    if (scheduleHealthPercent >= 50) return { label: `${scheduleHealthPercent.toFixed(0)}%`, color: 'text-amber-600', chip: 'At Risk' };
    return { label: `${scheduleHealthPercent.toFixed(0)}%`, color: 'text-red-600', chip: 'Delayed' };
  };

  const getBudgetStatus = () => {
    if (budgetVariance == null) return { label: '—', color: 'text-muted-foreground' };
    if (budgetVariance >= 0) return { label: `+$${budgetVariance.toLocaleString()}`, color: 'text-emerald-600' };
    return { label: `-$${Math.abs(budgetVariance).toLocaleString()}`, color: 'text-red-600' };
  };

  const scheduleStatus = getScheduleStatus();
  const budgetStatus = getBudgetStatus();

  return (
    <Card className="p-4 lg:p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Project Identity */}
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl lg:text-2xl font-semibold tracking-tight truncate">
              {projectName}
            </h1>
            {projectStatus && (
              <Badge variant="outline" className={getStatusColor(projectStatus)}>
                {projectStatus}
              </Badge>
            )}
          </div>
          {clientName && (
            <p className="text-sm text-muted-foreground mt-0.5">Client: {clientName}</p>
          )}
        </div>

        {/* Right: Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-5">
          {/* Schedule Health */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg min-w-0">
            {scheduleStatus.chip ? (
              scheduleHealthPercent != null && scheduleHealthPercent >= 85 ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              )
            ) : (
              <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Schedule</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-sm font-semibold ${scheduleStatus.color}`}>
                  {scheduleStatus.label}
                </span>
                {scheduleStatus.chip && (
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] px-1.5 py-0 h-4 ${
                      scheduleStatus.chip === 'On Track' 
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    }`}
                  >
                    {scheduleStatus.chip}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Budget Variance */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg min-w-0">
            {budgetVariance != null ? (
              budgetVariance >= 0 ? (
                <TrendingDown className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5 text-red-500 shrink-0" />
              )
            ) : (
              <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Budget</p>
              <span className={`text-sm font-semibold ${budgetStatus.color}`}>
                {budgetStatus.label}
              </span>
            </div>
          </div>

          {/* Labor This Week */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg min-w-0">
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">This Week</p>
              <span className="text-sm font-semibold">
                {weeklyLaborHours != null ? `${weeklyLaborHours.toFixed(1)}h` : '—'}
              </span>
            </div>
          </div>

          {/* Open Tasks */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg min-w-0">
            <ListTodo className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Tasks</p>
              <span className="text-sm font-semibold">
                {openTasksCount != null ? `${openTasksCount} open` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
