import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calculator, DollarSign, Clock } from 'lucide-react';

interface CostData {
  totalHours: number;
  totalCost: number;
  avgHourlyRate: number;
  costByDay: Array<{ day: string; cost: number; hours: number }>;
  costByWeek: Array<{ week: string; cost: number; hours: number }>;
  costByMonth: Array<{ month: string; cost: number; hours: number }>;
  costByTrade: Array<{ trade: string; cost: number; hours: number }>;
  costByProject: Array<{ project: string; cost: number; hours: number }>;
  costByWorker: Array<{ worker: string; cost: number; hours: number }>;
}

export const CostCalculatorTab = () => {
  const [viewType, setViewType] = useState<'day' | 'week' | 'month' | 'trade' | 'project' | 'worker'>('day');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [tradeFilter, setTradeFilter] = useState('all');
  const [data, setData] = useState<CostData>({
    totalHours: 0,
    totalCost: 0,
    avgHourlyRate: 0,
    costByDay: [],
    costByWeek: [],
    costByMonth: [],
    costByTrade: [],
    costByProject: [],
    costByWorker: [],
  });
  const [projects, setProjects] = useState<Array<{ id: string; project_name: string }>>([]);
  const [trades, setTrades] = useState<Array<{ id: string; name: string }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
    fetchTrades();
    calculateCosts();
  }, []);

  useEffect(() => {
    calculateCosts();
  }, [viewType, startDate, endDate, projectFilter, tradeFilter]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, project_name')
      .order('project_name');
    setProjects(data || []);
  };

  const fetchTrades = async () => {
    const { data } = await supabase
      .from('trades')
      .select('id, name')
      .order('name');
    setTrades(data || []);
  };

  const calculateCosts = async () => {
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
      if (tradeFilter !== 'all') query = query.eq('trade_id', tradeFilter);

      const { data: logs, error } = await query;
      if (error) throw error;

      if (!logs || logs.length === 0) {
        setData({
          totalHours: 0,
          totalCost: 0,
          avgHourlyRate: 0,
          costByDay: [],
          costByWeek: [],
          costByMonth: [],
          costByTrade: [],
          costByProject: [],
          costByWorker: [],
        });
        return;
      }

      // Calculate totals
      const totalHours = logs.reduce((sum, log) => sum + parseFloat(log.hours_worked.toString()), 0);
      const totalCost = logs.reduce((sum, log) => {
        const rate = (log.workers as any).hourly_rate;
        return sum + (parseFloat(log.hours_worked.toString()) * rate);
      }, 0);

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

      // Cost by worker
      const costByWorker = Object.entries(
        logs.reduce((acc: any, log) => {
          const name = (log.workers as any).name;
          const hours = parseFloat(log.hours_worked.toString());
          const cost = hours * (log.workers as any).hourly_rate;
          if (!acc[name]) acc[name] = { hours: 0, cost: 0 };
          acc[name].hours += hours;
          acc[name].cost += cost;
          return acc;
        }, {})
      ).map(([worker, data]: any) => ({ worker, ...data }))
        .sort((a, b) => b.cost - a.cost);

      setData({
        totalHours,
        totalCost,
        avgHourlyRate: totalHours > 0 ? totalCost / totalHours : 0,
        costByDay,
        costByWeek,
        costByMonth,
        costByTrade,
        costByProject,
        costByWorker,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getCurrentData = () => {
    switch(viewType) {
      case 'day': return data.costByDay;
      case 'week': return data.costByWeek;
      case 'month': return data.costByMonth;
      case 'trade': return data.costByTrade;
      case 'project': return data.costByProject;
      case 'worker': return data.costByWorker;
      default: return data.costByDay;
    }
  };

  const getLabel = (item: any) => {
    return item.day || item.week || item.month || item.trade || item.project || item.worker;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${data.totalCost.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
            <Clock className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalHours.toFixed(1)}h</div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Rate</CardTitle>
            <Calculator className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.avgHourlyRate.toFixed(2)}/hr</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Cost Calculator Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label htmlFor="view-type">Calculate By</Label>
            <Select value={viewType} onValueChange={(value: any) => setViewType(value)}>
              <SelectTrigger id="view-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="trade">Trade</SelectItem>
                <SelectItem value="worker">Worker</SelectItem>
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
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trade-filter">Trade</Label>
            <Select value={tradeFilter} onValueChange={setTradeFilter}>
              <SelectTrigger id="trade-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Trades</SelectItem>
                {trades.map((trade) => (
                  <SelectItem key={trade.id} value={trade.id}>
                    {trade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="shadow-medium">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Cost Breakdown by {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">{viewType.charAt(0).toUpperCase() + viewType.slice(1)}</TableHead>
                  <TableHead className="text-right font-semibold">Hours</TableHead>
                  <TableHead className="text-right font-semibold">Total Cost</TableHead>
                  <TableHead className="text-right font-semibold">Avg Rate</TableHead>
                  <TableHead className="text-right font-semibold">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getCurrentData().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No data available for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  getCurrentData().map((item: any, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        {getLabel(item)}
                      </TableCell>
                      <TableCell className="text-right">{item.hours.toFixed(1)}h</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        ${item.cost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${item.hours > 0 ? (item.cost / item.hours).toFixed(2) : '0.00'}/hr
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {data.totalCost > 0 ? ((item.cost / data.totalCost) * 100).toFixed(1) : 0}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
