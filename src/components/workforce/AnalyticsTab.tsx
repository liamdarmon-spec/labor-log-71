import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { KPICard } from '@/components/KPICard';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Users, DollarSign, Clock, AlertCircle, ArrowUpRight } from 'lucide-react';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { useNavigate } from 'react-router-dom';

type DateRangeOption = 'last-4-weeks' | 'last-8-weeks' | 'last-12-weeks';

export function AnalyticsTab() {
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>('last-4-weeks');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedTrade, setSelectedTrade] = useState<string>('all');
  const navigate = useNavigate();

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    const weeksAgo = dateRangeOption === 'last-4-weeks' ? 4 : dateRangeOption === 'last-8-weeks' ? 8 : 12;
    const start = startOfWeek(subWeeks(now, weeksAgo));
    const end = endOfWeek(now);
    return { start, end };
  };

  const { start: startDate, end: endDate } = getDateRange();

  // Fetch companies and trades
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      return data || [];
    },
  });

  const { data: trades } = useQuery({
    queryKey: ['trades'],
    queryFn: async () => {
      const { data } = await supabase.from('trades').select('id, name').order('name');
      return data || [];
    },
  });

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['workforce-analytics-enhanced', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'), selectedCompany, selectedTrade],
    queryFn: async () => {
      let query = supabase
        .from('daily_logs')
        .select('worker_id, project_id, hours_worked, date, workers(name, trade, trade_id, hourly_rate), projects(project_name, company_id, companies(name))')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      if (selectedCompany !== 'all') {
        query = query.eq('projects.company_id', selectedCompany);
      }

      if (selectedTrade !== 'all') {
        query = query.eq('workers.trade_id', selectedTrade);
      }

      const { data: logs } = await query;

      // Calculate KPIs
      const totalHours = logs?.reduce((sum, l) => sum + l.hours_worked, 0) || 0;
      const laborCost = logs?.reduce(
        (sum, l) => sum + (l.hours_worked * (l.workers?.hourly_rate || 0)),
        0
      ) || 0;
      const avgHourlyCost = totalHours > 0 ? laborCost / totalHours : 0;

      // Workers leaderboard
      const workerMap = new Map<string, any>();
      const projectSet = new Map<string, Set<string>>(); // worker_id -> Set of project_ids

      logs?.forEach((log: any) => {
        const workerId = log.worker_id;
        if (!workerMap.has(workerId)) {
          workerMap.set(workerId, {
            worker_id: workerId,
            worker_name: log.workers?.name,
            trade: log.workers?.trade,
            hourly_rate: log.workers?.hourly_rate,
            total_hours: 0,
            labor_cost: 0,
            projects: new Set(),
            earliest_unpaid: null,
          });
          projectSet.set(workerId, new Set());
        }

        const worker = workerMap.get(workerId)!;
        worker.total_hours += log.hours_worked;
        worker.labor_cost += log.hours_worked * (log.workers?.hourly_rate || 0);
        if (log.project_id) {
          projectSet.get(workerId)!.add(log.project_id);
        }
      });

      // Check for unpaid logs older than 14 days
      const { data: unpaidLogs } = await supabase
        .from('daily_logs')
        .select('worker_id, date')
        .eq('payment_status', 'unpaid')
        .lte('date', format(subWeeks(new Date(), 2), 'yyyy-MM-dd'));

      unpaidLogs?.forEach((log: any) => {
        const worker = workerMap.get(log.worker_id);
        if (worker) {
          if (!worker.earliest_unpaid || log.date < worker.earliest_unpaid) {
            worker.earliest_unpaid = log.date;
          }
        }
      });

      const workersLeaderboard = Array.from(workerMap.values())
        .map(w => ({
          ...w,
          project_count: projectSet.get(w.worker_id)?.size || 0,
          high_risk: !!w.earliest_unpaid,
        }))
        .sort((a, b) => b.labor_cost - a.labor_cost);

      // Project labor snapshot
      const projectMap = new Map<string, any>();

      logs?.forEach((log: any) => {
        const projectId = log.project_id;
        if (!projectId) return;

        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, {
            project_id: projectId,
            project_name: log.projects?.project_name,
            company_name: log.projects?.companies?.name,
            total_hours: 0,
            labor_cost: 0,
          });
        }

        const project = projectMap.get(projectId)!;
        project.total_hours += log.hours_worked;
        project.labor_cost += log.hours_worked * (log.workers?.hourly_rate || 0);
      });

      const projectSnapshot = Array.from(projectMap.values()).sort((a, b) => b.labor_cost - a.labor_cost);

      return {
        totalHours,
        laborCost,
        avgHourlyCost,
        workersLeaderboard,
        projectSnapshot,
      };
    },
  });

  const handleViewProject = (projectId: string) => {
    navigate(`/projects/${projectId}?tab=workforce`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold mb-2">Workforce Analytics</h3>
        <p className="text-muted-foreground">
          Performance insights, labor costs, and utilization trends
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={dateRangeOption} onValueChange={(v) => setDateRangeOption(v as DateRangeOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-4-weeks">Last 4 Weeks</SelectItem>
                <SelectItem value="last-8-weeks">Last 8 Weeks</SelectItem>
                <SelectItem value="last-12-weeks">Last 12 Weeks</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies?.map(company => (
                  <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTrade} onValueChange={setSelectedTrade}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                {trades?.map(trade => (
                  <SelectItem key={trade.id} value={trade.id}>{trade.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard
            title="Total Hours"
            value={`${analytics.totalHours.toFixed(1)}h`}
            icon={Clock}
          />
          <KPICard
            title="Labor Cost"
            value={`$${analytics.laborCost.toLocaleString()}`}
            icon={DollarSign}
          />
          <KPICard
            title="Avg Hourly Cost"
            value={`$${analytics.avgHourlyCost.toFixed(2)}`}
            icon={TrendingUp}
          />
        </div>
      )}

      {/* Workers Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Workers Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : analytics && analytics.workersLeaderboard.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Labor Cost</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.workersLeaderboard.map(worker => (
                  <TableRow key={worker.worker_id}>
                    <TableCell className="font-medium">{worker.worker_name}</TableCell>
                    <TableCell>{worker.trade}</TableCell>
                    <TableCell className="text-right">{worker.total_hours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${worker.labor_cost.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{worker.project_count}</TableCell>
                    <TableCell>
                      {worker.high_risk && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 gap-1">
                          <AlertCircle className="h-3 w-3" />
                          High Risk
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-12 text-muted-foreground">No data for this period</p>
          )}
        </CardContent>
      </Card>

      {/* Project Labor Snapshot */}
      <Card>
        <CardHeader>
          <CardTitle>Project Labor Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : analytics && analytics.projectSnapshot.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Labor Cost</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.projectSnapshot.map(project => (
                  <TableRow key={project.project_id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{project.project_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{project.company_name}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{project.total_hours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${project.labor_cost.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <ArrowUpRight
                        className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer"
                        onClick={() => handleViewProject(project.project_id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-12 text-muted-foreground">No projects in this period</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
