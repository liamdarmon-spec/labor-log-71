import { Layout } from '@/components/Layout';
import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Search,
  MapPin,
  User,
  Building2,
  Calendar,
  DollarSign,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  TrendingDown,
  FileText,
  HardHat,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AddProjectDialog } from '@/components/dashboard/AddProjectDialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useProjectsHub, HealthStatus, EnhancedProject, ProjectHealthStats } from '@/hooks/useProjectsHub';

type StatusFilter = 'all' | 'active' | 'on_hold' | 'completed';

const formatCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
};

// Portfolio Summary Component
function PortfolioSummary({
  activeProjectCount,
  totalBudget,
  totalSpent,
  totalUnpaidLabor,
  totalArOutstanding,
  projectsOverBudget,
  totalOverduesTasks,
  todayTotalCrew,
}: {
  activeProjectCount: number;
  totalBudget: number;
  totalSpent: number;
  totalUnpaidLabor: number;
  totalArOutstanding: number;
  projectsOverBudget: number;
  totalOverduesTasks: number;
  todayTotalCrew: number;
}) {
  const remaining = totalBudget - totalSpent;
  const hasIssues = projectsOverBudget > 0 || totalUnpaidLabor > 5000 || totalOverduesTasks > 0;

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Portfolio Health
          </h2>
          <Badge variant="secondary" className="text-xs">
            {activeProjectCount} active project{activeProjectCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
            <p className="text-xs text-muted-foreground">Total Budget</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
            <p className="text-xs text-muted-foreground">Total Spent</p>
          </div>
          <div>
            <p className={cn(
              "text-2xl font-bold",
              remaining < 0 ? "text-red-600" : "text-green-600"
            )}>
              {formatCurrency(remaining)}
            </p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
          <div>
            <p className="text-2xl font-bold flex items-center gap-1">
              <HardHat className="w-5 h-5 text-muted-foreground" />
              {todayTotalCrew}
            </p>
            <p className="text-xs text-muted-foreground">On Site Today</p>
          </div>
        </div>

        {/* Alert Row */}
        {hasIssues && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-sm">
            {projectsOverBudget > 0 && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                {projectsOverBudget} over budget
              </span>
            )}
            {totalUnpaidLabor > 0 && (
              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <DollarSign className="w-3.5 h-3.5" />
                {formatCurrency(totalUnpaidLabor)} unpaid labor
              </span>
            )}
            {totalOverduesTasks > 0 && (
              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <Clock className="w-3.5 h-3.5" />
                {totalOverduesTasks} overdue task{totalOverduesTasks !== 1 ? 's' : ''}
              </span>
            )}
            {totalArOutstanding > 0 && (
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <FileText className="w-3.5 h-3.5" />
                {formatCurrency(totalArOutstanding)} AR outstanding
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Today's Activity Component
function TodayActivity({
  activities,
  onProjectClick,
}: {
  activities: { projectId: string; projectName: string; crewCount: number; scheduledHours: number }[];
  onProjectClick: (projectId: string) => void;
}) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-primary" />
          <h3 className="font-medium text-sm">
            Today: {format(new Date(), 'EEEE, MMM d')}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {activities.map((activity) => (
            <button
              key={activity.projectId}
              onClick={() => onProjectClick(activity.projectId)}
              className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-full border hover:border-primary/50 transition-colors text-sm"
            >
              <span className="font-medium">{activity.projectName}</span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-3 h-3" />
                {activity.crewCount}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Status Filter Pills
function StatusFilters({
  activeFilter,
  onFilterChange,
  counts,
}: {
  activeFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  counts: { all: number; active: number; on_hold: number; completed: number };
}) {
  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'on_hold', label: 'On Hold' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map(({ key, label }) => (
        <Button
          key={key}
          variant={activeFilter === key ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange(key)}
          className="gap-1.5"
        >
          {label}
          <Badge
            variant="secondary"
            className={cn(
              "ml-1 h-5 min-w-[20px] px-1.5",
              activeFilter === key && "bg-primary-foreground/20 text-primary-foreground"
            )}
          >
            {counts[key]}
          </Badge>
        </Button>
      ))}
    </div>
  );
}

// Health Status Indicator
function HealthIndicator({ status }: { status: HealthStatus }) {
  const config = {
    critical: { color: 'bg-red-500', icon: AlertTriangle, label: 'Needs Attention' },
    warning: { color: 'bg-orange-400', icon: Clock, label: 'Warning' },
    healthy: { color: 'bg-green-500', icon: CheckCircle2, label: 'On Track' },
  };

  const { color } = config[status];

  return (
    <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", color)} />
  );
}

// Project Card Component
function ProjectCard({
  project,
  stats,
  onClick,
}: {
  project: EnhancedProject;
  stats: ProjectHealthStats | undefined;
  onClick: () => void;
}) {
  const navigate = useNavigate();

  const getStatusBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'completed':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'on hold':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800';
    }
  };

  const getCardBorderStyle = (healthStatus: HealthStatus | undefined) => {
    if (!healthStatus || healthStatus === 'healthy') return '';
    if (healthStatus === 'critical') return 'border-l-4 border-l-red-500';
    if (healthStatus === 'warning') return 'border-l-4 border-l-orange-400';
    return '';
  };

  const progressColor = (percent: number) => {
    if (percent > 100) return 'bg-red-500';
    if (percent >= 90) return 'bg-orange-400';
    return 'bg-green-500';
  };

  return (
    <Card
      className={cn(
        "hover:shadow-lg transition-all cursor-pointer group",
        getCardBorderStyle(stats?.healthStatus)
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          {stats && <HealthIndicator status={stats.healthStatus} />}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
              {project.project_name}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" />
              {project.client_name}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn("text-xs flex-shrink-0", getStatusBadgeStyle(project.status))}
          >
            {project.status}
          </Badge>
        </div>

        {/* Budget Progress */}
        {stats && stats.budgetTotal > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Budget</span>
              <span className={cn(
                "font-medium",
                stats.percentUsed > 100 && "text-red-600",
                stats.percentUsed >= 90 && stats.percentUsed <= 100 && "text-orange-600"
              )}>
                {Math.round(stats.percentUsed)}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", progressColor(stats.percentUsed))}
                style={{ width: `${Math.min(stats.percentUsed, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(stats.actualTotal)} spent</span>
              <span>{formatCurrency(stats.budgetTotal)} budget</span>
            </div>
          </div>
        )}

        {/* Health Reason or Key Metric */}
        {stats && (
          <div className="flex items-center justify-between text-sm">
            {stats.healthStatus !== 'healthy' ? (
              <span className={cn(
                "flex items-center gap-1",
                stats.healthStatus === 'critical' && "text-red-600",
                stats.healthStatus === 'warning' && "text-orange-600"
              )}>
                <AlertTriangle className="w-3.5 h-3.5" />
                {stats.healthReasons[0]}
              </span>
            ) : stats.variance !== 0 ? (
              <span className={cn(
                "flex items-center gap-1",
                stats.variance > 0 ? "text-green-600" : "text-red-600"
              )}>
                {stats.variance > 0 ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {formatCurrency(stats.variance)} under budget
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3.5 h-3.5" />
                    {formatCurrency(Math.abs(stats.variance))} over budget
                  </>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">No budget set</span>
            )}

            {/* Today's crew */}
            {stats.todayCrewCount > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <HardHat className="w-3.5 h-3.5" />
                {stats.todayCrewCount} today
              </span>
            )}
          </div>
        )}

        {/* Secondary Info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          {project.address && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{project.address}</span>
            </span>
          )}
          {!project.address && project.company_name && (
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {project.company_name}
            </span>
          )}
          {stats?.lastActivityDate && (
            <span className="flex items-center gap-1 ml-auto flex-shrink-0">
              <Calendar className="w-3 h-3" />
              {format(new Date(stats.lastActivityDate), 'MMM d')}
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {stats && stats.openTaskCount > 0 && (
              <span>{stats.openTaskCount} open tasks</span>
            )}
            {stats && stats.arOutstanding > 0 && (
              <span className="text-blue-600">{formatCurrency(stats.arOutstanding)} AR</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/projects/${project.id}`);
            }}
          >
            Open
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function ProjectCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Skeleton className="w-2.5 h-2.5 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}

// Main Projects Page
const Projects = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isLoading, refetch } = useProjectsHub();

  // Filter and search projects
  const filteredProjects = useMemo(() => {
    if (!data?.projects) return [];

    return data.projects.filter((project) => {
      // Status filter
      if (statusFilter !== 'all') {
        const normalizedStatus = project.status.toLowerCase().replace(' ', '_');
        if (normalizedStatus !== statusFilter) return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          project.project_name.toLowerCase().includes(search) ||
          project.client_name.toLowerCase().includes(search) ||
          (project.address && project.address.toLowerCase().includes(search))
        );
      }

      return true;
    });
  }, [data?.projects, statusFilter, searchTerm]);

  // Sort: critical first, then warning, then healthy
  const sortedProjects = useMemo(() => {
    if (!data?.stats) return filteredProjects;

    const healthPriority: Record<HealthStatus, number> = {
      critical: 0,
      warning: 1,
      healthy: 2,
    };

    return [...filteredProjects].sort((a, b) => {
      const aHealth = data.stats[a.id]?.healthStatus || 'healthy';
      const bHealth = data.stats[b.id]?.healthStatus || 'healthy';
      return healthPriority[aHealth] - healthPriority[bHealth];
    });
  }, [filteredProjects, data?.stats]);

  // Calculate counts for filter pills
  const filterCounts = useMemo(() => {
    if (!data?.projects) return { all: 0, active: 0, on_hold: 0, completed: 0 };

    const counts = { all: 0, active: 0, on_hold: 0, completed: 0 };
    for (const project of data.projects) {
      counts.all++;
      const status = project.status.toLowerCase().replace(' ', '_') as keyof typeof counts;
      if (status in counts) {
        counts[status]++;
      }
    }
    return counts;
  }, [data?.projects]);

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Project Hub</h1>
            <p className="text-muted-foreground">Manage and monitor all your projects</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        {/* Portfolio Summary */}
        {isLoading ? (
          <Skeleton className="h-36" />
        ) : data?.portfolio && (
          <PortfolioSummary {...data.portfolio} />
        )}

        {/* Today's Activity */}
        {!isLoading && data?.todayActivity && data.todayActivity.length > 0 && (
          <TodayActivity
            activities={data.todayActivity}
            onProjectClick={(id) => navigate(`/projects/${id}?tab=schedule`)}
          />
        )}

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <StatusFilters
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
            counts={filterCounts}
          />
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Project Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : sortedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                stats={data?.stats[project.id]}
                onClick={() => navigate(`/projects/${project.id}`)}
              />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <Building2 className="w-12 h-12 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">No projects found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first project to get started'}
                </p>
              </div>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Project
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>

      <AddProjectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onProjectAdded={() => refetch()}
      />
    </Layout>
  );
};

export default Projects;
