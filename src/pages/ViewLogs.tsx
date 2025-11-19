import { useState, useEffect, useMemo } from 'react';
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
import { Search, Filter, Calendar, Download, Edit2, X, Plus, FileText, Files, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
  schedule_id: string | null;
  workers: { 
    name: string; 
    hourly_rate: number;
    trades: { name: string } | null;
  };
  projects: { 
    project_name: string; 
    client_name: string;
    company_id: string | null;
  };
}

interface Payment {
  id: string;
  start_date: string;
  end_date: string;
  company_id: string | null;
}

interface GroupedLogEntry {
  date: string;
  worker_id: string;
  worker_name: string;
  trade_name: string;
  total_hours: number;
  total_cost: number;
  entries: LogEntry[];
  log_ids: string[];
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
  const [groupedLogs, setGroupedLogs] = useState<GroupedLogEntry[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [isAddEntryDialogOpen, setIsAddEntryDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleDefaultDate, setScheduleDefaultDate] = useState<Date>();
  const [scheduleRefresh, setScheduleRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState("logs");
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<GroupedLogEntry | null>(null);
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
    paymentStatus: 'all',
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();

    // Set up realtime subscription for new entries
    const channel = supabase
      .channel('daily-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'daily_logs'
        },
        (payload) => {
          console.log('New entry detected:', payload);
          toast({
            title: 'New Entry Added',
            description: 'Time entries refreshed automatically',
          });
          fetchData(); // Refresh the data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, filters]);

  useEffect(() => {
    groupLogsByDateAndWorker();
  }, [filteredLogs, filters.paymentStatus]);

  const groupLogsByDateAndWorker = () => {
    const grouped = new Map<string, GroupedLogEntry>();

    let logsToGroup = filteredLogs;
    
    // Apply payment status filter
    if (filters.paymentStatus !== 'all') {
      logsToGroup = filteredLogs.filter(log => {
        const isPaid = isLogPaid(log);
        if (filters.paymentStatus === 'paid') return isPaid;
        if (filters.paymentStatus === 'unpaid') return !isPaid;
        return false;
      });
    }

    logsToGroup.forEach((log) => {
      const key = `${log.date}-${log.worker_id}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          date: log.date,
          worker_id: log.worker_id,
          worker_name: log.workers.name,
          trade_name: log.workers.trades?.name || 'N/A',
          total_hours: 0,
          total_cost: 0,
          entries: [],
          log_ids: [],
        });
      }

      const group = grouped.get(key)!;
      const cost = parseFloat(log.hours_worked.toString()) * parseFloat(log.workers.hourly_rate.toString());
      group.entries.push(log);
      group.log_ids.push(log.id);
      group.total_hours += parseFloat(log.hours_worked.toString());
      group.total_cost += cost;
    });

    setGroupedLogs(Array.from(grouped.values()));
  };

  const fetchData = async () => {
    // Fetch logs with relationships
    const { data: logsData, error: logsError } = await supabase
      .from('daily_logs')
      .select(`
        *,
        workers (
          name,
          hourly_rate,
          trades (name)
        ),
        projects (
          project_name, 
          client_name,
          company_id
        )
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

    // Fetch payments
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('id, start_date, end_date, company_id');
    setPayments(paymentsData || []);
  };

  // Memoize payment status to avoid recalculating on every render
  const paymentStatusMap = useMemo(() => {
    const statusMap = new Map<string, boolean>();
    
    logs.forEach(log => {
      if (!log.projects.company_id) {
        statusMap.set(log.id, false);
        return;
      }
      
      const isPaid = payments.some(payment => {
        if (payment.company_id !== log.projects.company_id) return false;
        const logDate = new Date(log.date);
        const startDate = new Date(payment.start_date);
        const endDate = new Date(payment.end_date);
        return logDate >= startDate && logDate <= endDate;
      });
      
      statusMap.set(log.id, isPaid);
    });
    
    return statusMap;
  }, [logs, payments]);

  const isLogPaid = (log: LogEntry): boolean => {
    return paymentStatusMap.get(log.id) || false;
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
      paymentStatus: 'all',
    });
  };

  const toggleSelectLog = (logId: string) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(logId)) {
      newSelected.delete(logId);
    } else {
      newSelected.add(logId);
    }
    setSelectedLogs(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedLogs.size === filteredLogs.length) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(filteredLogs.map(log => log.id)));
    }
  };

  const toggleSelectGroup = (group: GroupedLogEntry) => {
    const newSelected = new Set(selectedLogs);
    const allSelected = group.log_ids.every(id => newSelected.has(id));

    if (allSelected) {
      group.log_ids.forEach(id => newSelected.delete(id));
    } else {
      group.log_ids.forEach(id => newSelected.add(id));
    }
    
    setSelectedLogs(newSelected);
  };

  const isGroupSelected = (group: GroupedLogEntry) => {
    return group.log_ids.every(id => selectedLogs.has(id));
  };

  const isGroupPartiallySelected = (group: GroupedLogEntry) => {
    const selectedCount = group.log_ids.filter(id => selectedLogs.has(id)).length;
    return selectedCount > 0 && selectedCount < group.log_ids.length;
  };

  const handleMassDelete = async () => {
    if (selectedLogs.size === 0) return;

    // Check if any of the selected logs are linked to schedules
    const { data: logsWithSchedules } = await supabase
      .from('daily_logs')
      .select('id, schedule_id')
      .in('id', Array.from(selectedLogs))
      .not('schedule_id', 'is', null);

    const linkedCount = logsWithSchedules?.length || 0;
    
    let confirmMessage = `Are you sure you want to delete ${selectedLogs.size} time ${selectedLogs.size === 1 ? 'entry' : 'entries'}?`;
    if (linkedCount > 0) {
      confirmMessage += `\n\n${linkedCount} of these ${linkedCount === 1 ? 'entry is' : 'entries are'} linked to schedule${linkedCount === 1 ? '' : 's'}. The linked schedule${linkedCount === 1 ? '' : 's'} will also be deleted.`;
    }

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    // Delete linked schedules first if they exist
    if (linkedCount > 0) {
      const scheduleIds = logsWithSchedules?.map(log => log.schedule_id).filter(Boolean) || [];
      if (scheduleIds.length > 0) {
        const { error: scheduleError } = await supabase
          .from('scheduled_shifts')
          .delete()
          .in('id', scheduleIds);

        if (scheduleError) {
          toast({
            title: 'Error',
            description: 'Failed to delete linked schedules',
            variant: 'destructive',
          });
          return;
        }
      }
    }

    const { error } = await supabase
      .from('daily_logs')
      .delete()
      .in('id', Array.from(selectedLogs));

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete entries',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Successfully deleted ${selectedLogs.size} ${selectedLogs.size === 1 ? 'entry' : 'entries'}${linkedCount > 0 ? ' and linked schedules' : ''}`,
      });
      setSelectedLogs(new Set());
      fetchData();
    }
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

  const handleEditGroup = (group: GroupedLogEntry) => {
    setSelectedGroup(group);
  };

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

        {/* Add Entry Dialog */}
        <Dialog open={isAddEntryDialogOpen} onOpenChange={setIsAddEntryDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Time Entry</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="bulk" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bulk" className="gap-2">
                  <Files className="w-4 h-4" />
                  Bulk Entry
                </TabsTrigger>
                <TabsTrigger value="single" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Single Entry
                </TabsTrigger>
              </TabsList>
              <TabsContent value="bulk" className="mt-6">
                <BulkEntryTab onSuccess={() => setIsAddEntryDialogOpen(false)} />
              </TabsContent>
              <TabsContent value="single" className="mt-6">
                <SingleEntryTab />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        <Card className="shadow-medium">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle>Time Entries ({groupedLogs.length} entries, {filteredLogs.length} total logs)</CardTitle>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, paymentStatus: 'all' }))}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filters.paymentStatus === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, paymentStatus: 'paid' }))}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filters.paymentStatus === 'paid'
                      ? 'bg-green-600 text-white'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Paid
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, paymentStatus: 'unpaid' }))}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filters.paymentStatus === 'unpaid'
                      ? 'bg-muted-foreground/20 text-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Unpaid
                </button>
                {selectedLogs.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleMassDelete}
                    className="gap-2 ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected ({selectedLogs.size})
                  </Button>
                )}
              </div>
            </div>
            
            {/* Filters Section */}
            <div className="mt-6 pt-6 border-t border-border">
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
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedLogs.size === filteredLogs.length && filteredLogs.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Worker</TableHead>
                    <TableHead className="font-semibold">Trade</TableHead>
                    <TableHead className="font-semibold">Projects & Hours</TableHead>
                    <TableHead className="font-semibold text-right">Total Cost</TableHead>
                    <TableHead className="font-semibold">Payment Status</TableHead>
                    <TableHead className="font-semibold">Notes</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedLogs.map((group, idx) => (
                    <TableRow key={`${group.date}_${group.worker_id}_${idx}`} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={isGroupSelected(group)}
                          onCheckedChange={() => toggleSelectGroup(group)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {new Date(group.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </TableCell>
                      <TableCell>{group.worker_name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {group.trade_name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {(() => {
                            const pairs = [];
                            for (let i = 0; i < group.entries.length; i += 2) {
                              pairs.push(group.entries.slice(i, i + 2));
                            }
                            return pairs.map((pair, pairIdx) => (
                              <div key={pairIdx} className="flex gap-2">
                                {pair.map((entry) => (
                                  <div 
                                    key={entry.id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-accent/50 border border-border whitespace-nowrap"
                                  >
                                    <span className="font-medium">{entry.projects.project_name}</span>
                                    <span className="text-muted-foreground">·</span>
                                    <span className="font-semibold text-primary">{entry.hours_worked}h</span>
                                  </div>
                                ))}
                              </div>
                            ));
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg text-primary">
                        ${group.total_cost.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {group.entries.every(log => isLogPaid(log)) ? (
                          <div className="flex items-center gap-1.5 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm font-medium">Paid</span>
                          </div>
                        ) : group.entries.some(log => isLogPaid(log)) ? (
                          <div className="flex items-center gap-1.5 text-amber-600">
                            <Circle className="h-4 w-4" />
                            <span className="text-sm font-medium">Partial</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Circle className="h-4 w-4" />
                            <span className="text-sm font-medium">Unpaid</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {group.entries.length === 1 && group.entries[0].notes ? (
                          <span className="text-muted-foreground text-sm truncate block">
                            {group.entries[0].notes}
                          </span>
                        ) : group.entries.some(e => e.notes) ? (
                          <span className="text-muted-foreground text-sm italic">Multiple notes</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditGroup(group)}
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

        {/* Edit Group Dialog - Select which entry to edit */}
        <Dialog open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Time Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Select which entry you want to edit for <strong>{selectedGroup?.worker_name}</strong> on{' '}
                <strong>
                  {selectedGroup && new Date(selectedGroup.date).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </strong>:
              </p>
              <div className="space-y-2">
                {selectedGroup?.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2"
                  >
                    <Button
                      variant="outline"
                      className="flex-1 justify-between h-auto py-4"
                      onClick={() => {
                        handleEditLog(entry);
                        setSelectedGroup(null);
                      }}
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-semibold">{entry.projects.project_name}</span>
                        <span className="text-xs text-muted-foreground">{entry.projects.client_name}</span>
                        {entry.notes && (
                          <span className="text-xs text-muted-foreground italic">Note: {entry.notes}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">{entry.hours_worked}h</span>
                        <Edit2 className="w-4 h-4" />
                      </div>
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={async () => {
                        // Check if this log is linked to a schedule
                        const logWithSchedule = logs.find(log => log.id === entry.id);
                        let confirmMessage = 'Are you sure you want to delete this entry?';
                        
                        if (logWithSchedule?.schedule_id) {
                          confirmMessage += '\n\nThis entry is linked to a schedule. The linked schedule will also be deleted.';
                        }
                        
                        if (!confirm(confirmMessage)) return;

                        // Delete linked schedule first if it exists
                        if (logWithSchedule?.schedule_id) {
                          const { error: scheduleError } = await supabase
                            .from('scheduled_shifts')
                            .delete()
                            .eq('id', logWithSchedule.schedule_id);

                          if (scheduleError) {
                            toast({
                              title: 'Error',
                              description: 'Failed to delete linked schedule',
                              variant: 'destructive',
                            });
                            return;
                          }
                        }
                        
                        const { error } = await supabase
                          .from('daily_logs')
                          .delete()
                          .eq('id', entry.id);

                        if (error) {
                          toast({
                            title: 'Error',
                            description: 'Failed to delete entry',
                            variant: 'destructive',
                          });
                        } else {
                          toast({
                            title: 'Success',
                            description: `Entry deleted successfully${logWithSchedule?.schedule_id ? ' and linked schedule removed' : ''}`,
                          });
                          setSelectedGroup(null);
                          fetchData();
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedGroup(null)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
