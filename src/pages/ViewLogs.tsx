import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, Calendar, Download, Edit2, X, Plus, FileText, Files } from 'lucide-react';
import { SingleEntryTab } from '@/components/dashboard/SingleEntryTab';
import { BulkEntryTab } from '@/components/dashboard/BulkEntryTab';

interface LogEntry {
  id: string;
  date: string;
  hours_worked: number;
  notes: string | null;
  worker_id: string;
  project_id: string;
  trade_id: string | null;
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
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [isAddEntryDialogOpen, setIsAddEntryDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    date: '',
    worker_id: '',
    project_id: '',
    trade_id: '',
    hours_worked: '',
    notes: ''
  });
  
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
    if (filters.workerId && filters.workerId !== 'all') {
      const { data: workerLogs } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('worker_id', filters.workerId);
      const workerLogIds = new Set(workerLogs?.map(l => l.id) || []);
      filtered = filtered.filter(log => workerLogIds.has(log.id));
    }

    // Project filter
    if (filters.projectId && filters.projectId !== 'all') {
      const { data: projectLogs } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('project_id', filters.projectId);
      const projectLogIds = new Set(projectLogs?.map(l => l.id) || []);
      filtered = filtered.filter(log => projectLogIds.has(log.id));
    }

    // Trade filter
    if (filters.tradeId && filters.tradeId !== 'all') {
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
      workerId: 'all',
      projectId: 'all',
      tradeId: 'all',
      sortBy: 'date-desc',
    });
  };

  const handleEditLog = (log: LogEntry) => {
    setEditingLog(log);
    setEditForm({
      date: log.date,
      worker_id: log.worker_id,
      project_id: log.project_id,
      trade_id: log.trade_id || '',
      hours_worked: log.hours_worked.toString(),
      notes: log.notes || ''
    });
  };

  const handleUpdateLog = async () => {
    if (!editingLog) return;

    const { error } = await supabase
      .from('daily_logs')
      .update({
        date: editForm.date,
        worker_id: editForm.worker_id,
        project_id: editForm.project_id,
        trade_id: editForm.trade_id || null,
        hours_worked: parseFloat(editForm.hours_worked),
        notes: editForm.notes || null
      })
      .eq('id', editingLog.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update log entry',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Log entry updated successfully',
      });
      setEditingLog(null);
      fetchData();
    }
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
                    <SelectItem value="all">All workers</SelectItem>
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
                    <SelectItem value="all">All trades</SelectItem>
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
                    <SelectItem value="all">All projects</SelectItem>
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
            <div className="mt-4 flex justify-between items-center">
              <Button 
                onClick={() => setIsAddEntryDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Entry
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Add Entry Dialog */}
        <Dialog open={isAddEntryDialogOpen} onOpenChange={setIsAddEntryDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Time Entry</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="single" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Single Entry
                </TabsTrigger>
                <TabsTrigger value="bulk" className="gap-2">
                  <Files className="w-4 h-4" />
                  Bulk Entry
                </TabsTrigger>
              </TabsList>
              <TabsContent value="single" className="mt-6">
                <SingleEntryTab />
              </TabsContent>
              <TabsContent value="bulk" className="mt-6">
                <BulkEntryTab />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

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
                    <TableHead className="font-semibold text-right">Actions</TableHead>
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
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLog(log)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!editingLog} onOpenChange={() => setEditingLog(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Time Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-worker">Worker</Label>
                <Select value={editForm.worker_id} onValueChange={(value) => setEditForm({ ...editForm, worker_id: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {workers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-project">Project</Label>
                <Select value={editForm.project_id} onValueChange={(value) => setEditForm({ ...editForm, project_id: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-trade">Trade</Label>
                <Select value={editForm.trade_id} onValueChange={(value) => setEditForm({ ...editForm, trade_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trade" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {trades.map((trade) => (
                      <SelectItem key={trade.id} value={trade.id}>
                        {trade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-hours">Hours Worked</Label>
                <Input
                  id="edit-hours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={editForm.hours_worked}
                  onChange={(e) => setEditForm({ ...editForm, hours_worked: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingLog(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateLog}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ViewLogs;
