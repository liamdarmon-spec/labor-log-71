import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, Calendar, Download } from 'lucide-react';

interface LogEntry {
  id: string;
  date: string;
  hours_worked: number;
  notes: string | null;
  workers: { 
    name: string; 
    trades: { name: string } | null;
  };
  projects: { project_name: string; client_name: string };
}

interface Worker {
  id: string;
  name: string;
}

interface Project {
  id: string;
  project_name: string;
}

interface Trade {
  id: string;
  name: string;
}

const ViewLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    workerId: '',
    projectId: '',
    tradeId: '',
    sortBy: 'date-desc',
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, filters]);

  const fetchData = async () => {
    // Fetch logs with relationships
    const { data: logsData, error: logsError } = await supabase
      .from('daily_logs')
      .select(`
        *,
        workers (
          name,
          trades (name)
        ),
        projects (project_name, client_name)
      `)
      .order('date', { ascending: false });

    if (logsError) {
      toast({
        title: 'Error',
        description: 'Failed to load logs',
        variant: 'destructive',
      });
    } else {
      setLogs(logsData || []);
    }

    // Fetch workers
    const { data: workersData } = await supabase
      .from('workers')
      .select('id, name')
      .eq('active', true)
      .order('name');
    setWorkers(workersData || []);

    // Fetch projects
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, project_name')
      .eq('status', 'Active')
      .order('project_name');
    setProjects(projectsData || []);

    // Fetch trades
    const { data: tradesData } = await supabase
      .from('trades')
      .select('id, name')
      .order('name');
    setTrades(tradesData || []);
  };

  const applyFilters = async () => {
    let filtered = [...logs];

    // Date range filter
    if (filters.startDate) {
      filtered = filtered.filter(log => log.date >= filters.startDate);
    }
    if (filters.endDate) {
      filtered = filtered.filter(log => log.date <= filters.endDate);
    }

    // Worker filter
    if (filters.workerId) {
      const { data: workerLogs } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('worker_id', filters.workerId);
      const workerLogIds = new Set(workerLogs?.map(l => l.id) || []);
      filtered = filtered.filter(log => workerLogIds.has(log.id));
    }

    // Project filter
    if (filters.projectId) {
      const { data: projectLogs } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('project_id', filters.projectId);
      const projectLogIds = new Set(projectLogs?.map(l => l.id) || []);
      filtered = filtered.filter(log => projectLogIds.has(log.id));
    }

    // Trade filter
    if (filters.tradeId) {
      const { data: workerIds } = await supabase
        .from('workers')
        .select('id')
        .eq('trade_id', filters.tradeId);
      const tradeWorkerIds = new Set(workerIds?.map(w => w.id) || []);
      const { data: tradeLogs } = await supabase
        .from('daily_logs')
        .select('id, worker_id');
      const tradeLogIds = new Set(
        tradeLogs?.filter(l => tradeWorkerIds.has(l.worker_id))?.map(l => l.id) || []
      );
      filtered = filtered.filter(log => tradeLogIds.has(log.id));
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'worker':
          return a.workers.name.localeCompare(b.workers.name);
        case 'project':
          return a.projects.project_name.localeCompare(b.projects.project_name);
        case 'hours':
          return b.hours_worked - a.hours_worked;
        default:
          return 0;
      }
    });

    setFilteredLogs(filtered);
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      workerId: '',
      projectId: '',
      tradeId: '',
      sortBy: 'date-desc',
    });
  };

  const totalHours = filteredLogs.reduce((sum, log) => sum + parseFloat(log.hours_worked.toString()), 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">View Time Logs</h1>
            <p className="text-muted-foreground mt-2">
              Filter and view all time entries
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Hours</p>
              <p className="text-2xl font-bold text-primary">{totalHours.toFixed(2)}h</p>
            </div>
          </div>
        </div>

        <Card className="shadow-medium">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Filters & Sort
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-sm">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-sm">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="worker" className="text-sm">Worker</Label>
                <Select value={filters.workerId} onValueChange={(value) => setFilters({ ...filters, workerId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All workers" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="">All workers</SelectItem>
                    {workers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trade" className="text-sm">Trade</Label>
                <Select value={filters.tradeId} onValueChange={(value) => setFilters({ ...filters, tradeId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All trades" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="">All trades</SelectItem>
                    {trades.map((trade) => (
                      <SelectItem key={trade.id} value={trade.id}>
                        {trade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project" className="text-sm">Project</Label>
                <Select value={filters.projectId} onValueChange={(value) => setFilters({ ...filters, projectId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="">All projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortBy" className="text-sm">Sort By</Label>
                <Select value={filters.sortBy} onValueChange={(value) => setFilters({ ...filters, sortBy: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="date-desc">Date (Newest)</SelectItem>
                    <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                    <SelectItem value="worker">Worker (A-Z)</SelectItem>
                    <SelectItem value="project">Project (A-Z)</SelectItem>
                    <SelectItem value="hours">Hours (High-Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-medium">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle>Time Entries ({filteredLogs.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Worker</TableHead>
                    <TableHead className="font-semibold">Trade</TableHead>
                    <TableHead className="font-semibold">Project</TableHead>
                    <TableHead className="font-semibold">Client</TableHead>
                    <TableHead className="font-semibold text-right">Hours</TableHead>
                    <TableHead className="font-semibold">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        {new Date(log.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </TableCell>
                      <TableCell>{log.workers.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {log.workers.trades?.name || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>{log.projects.project_name}</TableCell>
                      <TableCell className="text-muted-foreground">{log.projects.client_name}</TableCell>
                      <TableCell className="text-right font-semibold">{log.hours_worked}h</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {log.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ViewLogs;
