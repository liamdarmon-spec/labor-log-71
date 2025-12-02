import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Clock, TrendingUp, AlertCircle, CalendarDays } from 'lucide-react';
import { useProjectStats } from '@/hooks/useProjectStats';
import { Skeleton } from '@/components/ui/skeleton';
import { FinancialOSLink } from './FinancialOSLink';
import { ProjectMetricCard } from './ProjectMetricCard';
import { useNavigate } from 'react-router-dom';

interface ProjectHeaderProps {
  projectId: string;
  projectName: string;
  clientName: string;
  address?: string | null;
  status: string;
  companyId?: string | null;
}

/** Safe number formatter - prevents NaN display */
function formatNumber(value: number | null | undefined, fallback = 0): string {
  const num = typeof value === 'number' && !isNaN(value) ? value : fallback;
  return num.toLocaleString();
}

function formatHours(value: number | null | undefined, fallback = 0): string {
  const num = typeof value === 'number' && !isNaN(value) ? value : fallback;
  return num.toFixed(1);
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    case 'on hold':
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
  }
}

export function ProjectHeader({ projectId, projectName, clientName, address, status }: ProjectHeaderProps) {
  const { data: stats, isLoading } = useProjectStats(projectId);
  const navigate = useNavigate();

  // Navigation handlers for clickable metric cards
  const goToBudgetTab = () => navigate(`/projects/${projectId}?tab=budget`);
  const goToLaborTab = () => navigate(`/projects/${projectId}?tab=labor`);
  const goToFinancialsTab = () => navigate(`/projects/${projectId}?tab=financials`);
  const goToPayCenter = () => navigate(`/financials/payments?projectId=${projectId}`);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">{projectName}</h1>
            <Badge className={getStatusColor(status)}>{status}</Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/schedule?projectId=${projectId}`)}
              className="gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">View Schedule</span>
              <span className="sm:hidden">Schedule</span>
            </Button>
            <FinancialOSLink projectId={projectId} />
          </div>
        </div>
        <div className="flex flex-col text-sm text-muted-foreground">
          <span className="font-medium">{clientName}</span>
          {address && <span>{address}</span>}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl border bg-card p-4">
                <Skeleton className="h-16" />
              </div>
            ))}
          </>
        ) : (
          <>
            <ProjectMetricCard
              label="Budget vs Actual"
              value={`$${formatNumber(stats?.budgetTotal)}`}
              subtext={`Actual: $${formatNumber(stats?.actualTotal)}`}
              icon={TrendingUp}
              onClick={goToBudgetTab}
            />

            <ProjectMetricCard
              label="Total Labor Hours"
              value={formatHours(stats?.totalLaborHours)}
              subtext="Logged hours"
              icon={Clock}
              onClick={goToLaborTab}
            />

            <ProjectMetricCard
              label="Total Labor Cost"
              value={`$${formatNumber(stats?.laborActual)}`}
              subtext="Incurred to date"
              icon={DollarSign}
              onClick={goToFinancialsTab}
            />

            <ProjectMetricCard
              label="Unpaid Labor"
              value={`$${formatNumber(stats?.unpaidLaborAmount)}`}
              subtext="Outstanding"
              icon={AlertCircle}
              onClick={goToPayCenter}
              variant={(stats?.unpaidLaborAmount ?? 0) > 0 ? 'warning' : 'default'}
            />
          </>
        )}
      </div>

      {/* Last updated indicator would show here if stats.refreshedAt were available */}
    </div>
  );
}
