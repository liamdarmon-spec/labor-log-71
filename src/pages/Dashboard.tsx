import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BulkEntryTab } from '@/components/dashboard/BulkEntryTab';
import { 
  BarChart3, 
  DollarSign, 
  Clock, 
  TrendingUp,
  Calendar,
  Users,
  Briefcase,
  CalendarPlus
} from 'lucide-react';

interface DashboardData {
  totalHours: number;
  totalCost: number;
  avgHourlyRate: number;
  topWorker: { name: string; hours: number } | null;
  topProject: { name: string; cost: number } | null;
  costByProject: Array<{ project: string; cost: number; hours: number }>;
  costByWeek: Array<{ week: string; cost: number; hours: number }>;
  costByTrade: Array<{ trade: string; cost: number; hours: number }>;
}

const Dashboard = () => {
  const [viewType, setViewType] = useState<'project' | 'week' | 'month' | 'trade'>('project');
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
    costByWeek: [],
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
          costByWeek: [],
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
        (top: any, [name, hours]: any) => (!top || hours > top.hours ? { name, hours } : top),
        null
      );

      // Cost by project
      const projectCosts = logs.reduce((acc: any, log) => {
        const project = (log.projects as any).project_name;
        const cost = parseFloat(log.hours_worked.toString()) * (log.workers as any).hourly_rate;
        const hours = parseFloat(log.hours_worked.toString());
        
        if (!acc[project]) {
          acc[project] = { cost: 0, hours: 0 };
        }
        acc[project].cost += cost;
        acc[project].hours += hours;
        return acc;
      }, {});

      const costByProject = Object.entries(projectCosts)
        .map(([project, data]: any) => ({ project, cost: data.cost, hours: data.hours }))
        .sort((a, b) => b.cost - a.cost);

      const topProject = costByProject[0] || null;

      // Cost by trade
      const tradeCosts = logs.reduce((acc: any, log) => {
        const trade = (log.workers as any).trades?.name || 'No Trade';
        const cost = parseFloat(log.hours_worked.toString()) * (log.workers as any).hourly_rate;
        const hours = parseFloat(log.hours_worked.toString());
        
        if (!acc[trade]) {
          acc[trade] = { cost: 0, hours: 0 };
        }
        acc[trade].cost += cost;
        acc[trade].hours += hours;
        return acc;
      }, {});

      const costByTrade = Object.entries(tradeCosts)
        .map(([trade, data]: any) => ({ trade, cost: data.cost, hours: data.hours }))
        .sort((a, b) => b.cost - a.cost);

      // Cost by week
      const weekCosts = logs.reduce((acc: any, log) => {
        const date = new Date(log.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        const cost = parseFloat(log.hours_worked.toString()) * (log.workers as any).hourly_rate;
        const hours = parseFloat(log.hours_worked.toString());
        
        if (!acc[weekKey]) {
          acc[weekKey] = { cost: 0, hours: 0 };
        }
        acc[weekKey].cost += cost;
        acc[weekKey].hours += hours;
        return acc;
      }, {});

      const costByWeek = Object.entries(weekCosts)
        .map(([week, data]: any) => ({ 
          week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
          cost: data.cost, 
          hours: data.hours 
        }))
        .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());

      setData({
        totalHours,
        totalCost,
        avgHourlyRate: totalCost / totalHours,
        topWorker,
        topProject: topProject ? { name: topProject.project, cost: topProject.cost } : null,
        costByProject,
        costByWeek,
        costByTrade,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      });
    }
  };

  const renderViewData = () => {
    switch (viewType) {
      case 'project':
        return data.costByProject;
      case 'week':
        return data.costByWeek.map(w => ({ project: w.week, cost: w.cost, hours: w.hours }));
      case 'trade':
        return data.costByTrade.map(t => ({ project: t.trade, cost: t.cost, hours: t.hours }));
      default:
        return data.costByProject;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Labor Management</h1>
          <p className="text-muted-foreground mt-2">
            Track time entries and analyze labor costs
          </p>
        </div>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="entry" className="gap-2">
              <CalendarPlus className="w-4 h-4" />
              <span>Daily Entry</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-6 space-y-6">

        {/* Filters */}
        <Card className="shadow-medium">
          <CardHeader className="border-b border-border">
            <CardTitle>Filters & View Options</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>View By</Label>
                <Select value={viewType} onValueChange={(v: any) => setViewType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="project">By Project</SelectItem>
                    <SelectItem value="week">By Week</SelectItem>
                    <SelectItem value="trade">By Trade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Project Filter</Label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Labor Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">${data.totalCost.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{data.totalHours.toFixed(1)}h</div>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Top Worker</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{data.topWorker?.name || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">
                {data.topWorker ? `${data.topWorker.hours.toFixed(1)}h` : '-'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Highest Cost Project</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">{data.topProject?.name || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">
                {data.topProject ? `$${data.topProject.cost.toFixed(2)}` : '-'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Chart/Table */}
        <Card className="shadow-medium">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              {viewType === 'project' && 'Labor Cost by Project'}
              {viewType === 'week' && 'Labor Cost by Week'}
              {viewType === 'trade' && 'Labor Cost by Trade'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {renderViewData().map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.project}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">{item.hours.toFixed(1)}h</span>
                      <span className="font-bold text-primary">${item.cost.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{
                        width: `${(item.cost / data.totalCost) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="entry" className="mt-6">
            <BulkEntryTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Dashboard;
