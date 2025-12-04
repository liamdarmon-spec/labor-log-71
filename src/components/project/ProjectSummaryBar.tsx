import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectOverviewStats } from '@/hooks/useProjectOverviewStats';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Percent,
  CheckSquare,
} from 'lucide-react';

interface ProjectSummaryBarProps {
  projectId: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toLocaleString()}`;
}

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

function MetricCard({ label, value, subtext, icon: Icon, variant = 'default', onClick }: MetricCardProps) {
  const variantStyles = {
    default: 'bg-card border-border',
    success: 'bg-success/5 border-success/20',
    warning: 'bg-amber-500/5 border-amber-500/20',
    danger: 'bg-destructive/5 border-destructive/20',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    success: 'text-success',
    warning: 'text-amber-500',
    danger: 'text-destructive',
  };

  const valueStyles = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-destructive',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border p-4 transition-all',
        variantStyles[variant],
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/30'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
          <p className={cn('text-xl font-bold truncate', valueStyles[variant])}>{value}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground truncate">{subtext}</p>
          )}
        </div>
        <div className={cn('p-2 rounded-lg bg-muted/50', iconStyles[variant])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}

export function ProjectSummaryBar({ projectId }: ProjectSummaryBarProps) {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const { data: stats, isLoading } = useProjectOverviewStats(projectId);

  const goToTasks = () => {
    const next = new URLSearchParams();
    next.set('tab', 'tasks');
    setSearchParams(next);
  };

  const goToBudget = () => {
    const next = new URLSearchParams();
    next.set('tab', 'budget');
    setSearchParams(next);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const totalBudget = stats?.totalBudget ?? 0;
  const actualCost = stats?.actualCost ?? 0;
  const grossProfit = stats?.grossProfit ?? 0;
  const profitMargin = stats?.profitMargin;
  const tasksOpen = stats?.tasksOpen ?? 0;
  const tasksOverdue = stats?.tasksOverdue ?? 0;

  // Determine variants based on values
  const profitVariant = grossProfit > 0 ? 'success' : grossProfit < 0 ? 'danger' : 'default';
  const taskVariant = tasksOverdue > 0 ? 'warning' : 'default';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* Total Budget */}
      <MetricCard
        label="Total Budget"
        value={totalBudget > 0 ? formatCurrency(totalBudget) : '$0'}
        subtext={totalBudget === 0 ? 'No budget set' : undefined}
        icon={Wallet}
        onClick={goToBudget}
      />

      {/* Actual Cost */}
      <MetricCard
        label="Actual Cost"
        value={formatCurrency(actualCost)}
        subtext={actualCost > 0 ? 'Incurred to date' : undefined}
        icon={TrendingDown}
      />

      {/* Gross Profit */}
      <MetricCard
        label="Gross Profit"
        value={totalBudget > 0 || actualCost > 0 ? formatCurrency(grossProfit) : '$0'}
        subtext={totalBudget === 0 && actualCost === 0 ? 'Waiting on data' : undefined}
        icon={grossProfit >= 0 ? TrendingUp : TrendingDown}
        variant={profitVariant}
      />

      {/* Profit Margin */}
      <MetricCard
        label="Profit Margin"
        value={profitMargin !== null ? `${profitMargin.toFixed(1)}%` : '—'}
        subtext={profitMargin === null ? 'No budget' : undefined}
        icon={Percent}
        variant={profitMargin !== null && profitMargin > 0 ? 'success' : profitMargin !== null && profitMargin < 0 ? 'danger' : 'default'}
      />

      {/* Tasks */}
      <MetricCard
        label="Tasks"
        value={`${tasksOpen} open`}
        subtext={`${tasksOverdue} overdue`}
        icon={CheckSquare}
        variant={taskVariant}
        onClick={goToTasks}
      />
    </div>
  );
}
