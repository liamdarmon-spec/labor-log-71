import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Filter, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ViewLogsTabMobile } from './ViewLogsTabMobile';

interface LogEntry {
  id: string;
  date: string;
  hours_worked: number;
  notes: string | null;
  cost_code_id: string | null;
  workers: { 
    name: string; 
    trades: { name: string } | null;
  };
  projects: { project_name: string; client_name: string };
  cost_codes: { code: string; name: string } | null;
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

export const ViewLogsTab = () => {
  const isMobile = useIsMobile();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    workerId: 'all',
    projectId: 'all',
    tradeId: 'all',
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
    const { data: logsData, error: logsError } = await supabase
      .from('time_logs')
      .select(`
        *,
        workers (
          name,
          trades (name)
        ),
        projects (project_name, client_name),
        cost_codes (code, name)
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

    const { data: workersData } = await supabase
      .from('workers')
      .select('id, name')
      .eq('active', true)
      .order('name');
    setWorkers(workersData || []);

    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, project_name')
      .eq('status', 'Active')
      .order('project_name');
    setProjects(projectsData || []);

    const { data: tradesData } = await supabase
      .from('trades')
      .select('id, name')
      .order('name');
    setTrades(tradesData || []);
  };

  const applyFilters = async () => {
    let filtered = [...logs];

    if (filters.startDate) {
      filtered = filtered.filter(log => log.date >= filters.startDate);
    }
    if (filters.endDate) {
      filtered = filtered.filter(log => log.date <= filters.endDate);
    }

    if (filters.workerId && filters.workerId !== 'all') {
      const { data: workerLogs } = await supabase
        .from('time_logs')
        .select('id')
        .eq('worker_id', filters.workerId);
      const workerLogIds = new Set(workerLogs?.map(l => l.id) || []);
      filtered = filtered.filter(log => workerLogIds.has(log.id));
    }

    if (filters.projectId && filters.projectId !== 'all') {
      const { data: projectLogs } = await supabase
        .from('time_logs')
        .select('id')
        .eq('project_id', filters.projectId);
      const projectLogIds = new Set(projectLogs?.map(l => l.id) || []);
      filtered = filtered.filter(log => projectLogIds.has(log.id));
    }

    if (filters.tradeId && filters.tradeId !== 'all') {
      const { data: workerIds } = await supabase
        .from('workers')
        .select('id')
        .eq('trade_id', filters.tradeId);
      const tradeWorkerIds = new Set(workerIds?.map(w => w.id) || []);
      const { data: tradeLogs } = await supabase
        .from('time_logs')
        .select('id, worker_id');
      const tradeLogIds = new Set(
        tradeLogs?.filter(l => tradeWorkerIds.has(l.worker_id))?.map(l => l.id) || []
      );
      filtered = filtered.filter(log => tradeLogIds.has(log.id));
    }

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
      workerId: 'all',
      projectId: 'all',
      tradeId: 'all',
      sortBy: 'date-desc',
    });
  };

  const totalHours = filteredLogs.reduce((sum, log) => sum + parseFloat(log.hours_worked.toString()), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">View Time Logs</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Filter and view all time entries
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs sm:text-sm text-muted-foreground">Total Hours</p>
          <p className="text-xl sm:text-2xl font-bold text-primary">{totalHours.toFixed(2)}h</p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
              Filters
            </CardTitle>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
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
                  <SelectValue placeholder="All Workers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workers</SelectItem>
                  {workers.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project" className="text-sm">Project</Label>
              <Select value={filters.projectId} onValueChange={(value) => setFilters({ ...filters, projectId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade" className="text-sm">Trade</Label>
              <Select value={filters.tradeId} onValueChange={(value) => setFilters({ ...filters, tradeId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Trades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trades</SelectItem>
                  {trades.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort" className="text-sm">Sort By</Label>
              <Select value={filters.sortBy} onValueChange={(value) => setFilters({ ...filters, sortBy: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (Newest)</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                  <SelectItem value="worker">Worker Name</SelectItem>
                  <SelectItem value="project">Project Name</SelectItem>
                  <SelectItem value="hours">Hours (High to Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Time Entries ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {isMobile ? (
            <ViewLogsTabMobile logs={filteredLogs} />
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Cost Code</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No logs found matching the filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{log.workers.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.workers.trades?.name || 'N/A'}
                        </TableCell>
                        <TableCell>{log.projects.project_name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.projects.client_name}
                        </TableCell>
                        <TableCell>
                          {log.cost_codes ? (
                            <span className="text-xs font-mono">
                              {log.cost_codes.code} – {log.cost_codes.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {parseFloat(log.hours_worked.toString()).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {log.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
