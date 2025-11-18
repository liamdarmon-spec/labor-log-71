import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  DollarSign, 
  Clock, 
  TrendingUp,
  Users,
  Briefcase
} from 'lucide-react';

interface DashboardData {
  totalHours: number;
  totalCost: number;
  avgHourlyRate: number;
  topWorker: { name: string; hours: number } | null;
  topProject: { name: string; cost: number } | null;
  costByProject: Array<{ project: string; cost: number; hours: number }>;
  costByDay: Array<{ day: string; cost: number; hours: number }>;
  costByWeek: Array<{ week: string; cost: number; hours: number }>;
  costByMonth: Array<{ month: string; cost: number; hours: number }>;
  costByTrade: Array<{ trade: string; cost: number; hours: number }>;
}

export const AnalyticsTab = () => {
  const [viewType, setViewType] = useState<'project' | 'day' | 'week' | 'month' | 'trade'>('project');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [data, setData] = useState<DashboardData>({
    totalHours: 0,
    totalCost: 0,
    avgHourlyRate: 0,
    topWorker: null,
    topProject: null,
    costByProject: [],
    costByDay: [],
    costByWeek: [],
    costByMonth: [],
    costByTrade: [],
  });
  const [projects, setProjects] = useState<Array<{ id: string; project_name: string }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
    generateReport();
  }, []);

  useEffect(() => {
    generateReport();
  }, [viewType, startDate, endDate, projectFilter]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, project_name')
      .order('project_name');
    setProjects(data || []);
  };

  const generateReport = async () => {
    try {
      let query = supabase
        .from('daily_logs')
        .select(`
          *,
          workers (name, hourly_rate, trades(name)),
          projects (project_name, client_name)
        `);

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);
      if (projectFilter !== 'all') query = query.eq('project_id', projectFilter);

      const { data: logs, error } = await query;
      if (error) throw error;

      if (!logs || logs.length === 0) {
        setData({
          totalHours: 0,
          totalCost: 0,
          avgHourlyRate: 0,
          topWorker: null,
          topProject: null,
          costByProject: [],
          costByDay: [],
          costByWeek: [],
          costByMonth: [],
          costByTrade: [],
        });
        return;
      }

      // Calculate totals
      const totalHours = logs.reduce((sum, log) => sum + parseFloat(log.hours_worked.toString()), 0);
      const totalCost = logs.reduce((sum, log) => {
        const rate = (log.workers as any).hourly_rate;
        return sum + (parseFloat(log.hours_worked.toString()) * rate);
      }, 0);

      // Top worker
      const workerHours = logs.reduce((acc: any, log) => {
        const name = (log.workers as any).name;
        acc[name] = (acc[name] || 0) + parseFloat(log.hours_worked.toString());
        return acc;
      }, {});
      const topWorker = Object.entries(workerHours).reduce(
        (max: any, [name, hours]) => (!max || hours > max.hours ? { name, hours } : max),
        null
      );

      // Top project
      const projectCosts = logs.reduce((acc: any, log) => {
        const name = (log.projects as any).project_name;
        const cost = parseFloat(log.hours_worked.toString()) * (log.workers as any).hourly_rate;
        acc[name] = (acc[name] || 0) + cost;
        return acc;
      }, {});
      const topProject = Object.entries(projectCosts).reduce(
        (max: any, [name, cost]) => (!max || cost > max.cost ? { name, cost } : max),
        null
      );

      // Cost by project
      const costByProject = Object.entries(
        logs.reduce((acc: any, log) => {
          const name = (log.projects as any).project_name;
          const hours = parseFloat(log.hours_worked.toString());
          const cost = hours * (log.workers as any).hourly_rate;
          if (!acc[name]) acc[name] = { hours: 0, cost: 0 };
          acc[name].hours += hours;
          acc[name].cost += cost;
          return acc;
        }, {})
      ).map(([project, data]: any) => ({ project, ...data }))
        .sort((a, b) => b.cost - a.cost);

      // Cost by day
      const costByDay = Object.entries(
        logs.reduce((acc: any, log) => {
          const day = log.date;
          const hours = parseFloat(log.hours_worked.toString());
          const cost = hours * (log.workers as any).hourly_rate;
          if (!acc[day]) acc[day] = { hours: 0, cost: 0 };
          acc[day].hours += hours;
          acc[day].cost += cost;
          return acc;
        }, {})
      ).map(([day, data]: any) => ({ day, ...data }))
        .sort((a, b) => b.day.localeCompare(a.day));

      // Cost by week
      const costByWeek = Object.entries(
        logs.reduce((acc: any, log) => {
          const date = new Date(log.date);
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          const week = weekStart.toISOString().split('T')[0];
          const hours = parseFloat(log.hours_worked.toString());
          const cost = hours * (log.workers as any).hourly_rate;
          if (!acc[week]) acc[week] = { hours: 0, cost: 0 };
          acc[week].hours += hours;
          acc[week].cost += cost;
          return acc;
        }, {})
      ).map(([week, data]: any) => ({ week, ...data }))
        .sort((a, b) => b.week.localeCompare(a.week));

      // Cost by month
      const costByMonth = Object.entries(
        logs.reduce((acc: any, log) => {
          const date = new Date(log.date);
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const hours = parseFloat(log.hours_worked.toString());
          const cost = hours * (log.workers as any).hourly_rate;
          if (!acc[month]) acc[month] = { hours: 0, cost: 0 };
          acc[month].hours += hours;
          acc[month].cost += cost;
          return acc;
        }, {})
      ).map(([month, data]: any) => ({ month, ...data }))
        .sort((a, b) => b.month.localeCompare(a.month));

      // Cost by trade
      const costByTrade = Object.entries(
        logs.reduce((acc: any, log) => {
          const name = (log.workers as any).trades?.name || 'Unknown';
          const hours = parseFloat(log.hours_worked.toString());
          const cost = hours * (log.workers as any).hourly_rate;
          if (!acc[name]) acc[name] = { hours: 0, cost: 0 };
          acc[name].hours += hours;
          acc[name].cost += cost;
          return acc;
        }, {})
      ).map(([trade, data]: any) => ({ trade, ...data }))
        .sort((a, b) => b.cost - a.cost);

      setData({
        totalHours,
        totalCost,
        avgHourlyRate: totalHours > 0 ? totalCost / totalHours : 0,
        topWorker,
        topProject,
        costByProject,
        costByDay,
        costByWeek,
        costByMonth,
        costByTrade,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="view-type">View By</Label>
            <Select value={viewType} onValueChange={(value: any) => setViewType(value)}>
              <SelectTrigger id="view-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="project">By Project</SelectItem>
                <SelectItem value="day">By Day</SelectItem>
                <SelectItem value="week">By Week</SelectItem>
                <SelectItem value="month">By Month</SelectItem>
                <SelectItem value="trade">By Trade</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-filter">Project</Label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger id="project-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-medium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Hours
            </CardTitle>
            <Clock className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all projects
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-medium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Labor Cost
            </CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total expenditure
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-medium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Hourly Rate
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.avgHourlyRate.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Per hour worked
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-medium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Worker
            </CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {data.topWorker?.name || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.topWorker ? `${data.topWorker.hours.toFixed(1)}h logged` : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost by Project/Week/Trade Table */}
      <Card className="shadow-medium">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Labor Cost by {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{viewType.charAt(0).toUpperCase() + viewType.slice(1)}</TableHead>
                  <TableHead className="text-right">Hours Worked</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  let currentData;
                  switch(viewType) {
                    case 'project': currentData = data.costByProject; break;
                    case 'day': currentData = data.costByDay; break;
                    case 'week': currentData = data.costByWeek; break;
                    case 'month': currentData = data.costByMonth; break;
                    case 'trade': currentData = data.costByTrade; break;
                    default: currentData = data.costByProject;
                  }
                  
                  if (currentData.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No data available for the selected filters
                        </TableCell>
                      </TableRow>
                    );
                  }
                  
                  return currentData.map((item: any, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {item.project || item.day || item.week || item.month || item.trade}
                      </TableCell>
                      <TableCell className="text-right">{item.hours.toFixed(1)}h</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        ${item.cost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {data.totalCost > 0 ? ((item.cost / data.totalCost) * 100).toFixed(1) : 0}%
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
