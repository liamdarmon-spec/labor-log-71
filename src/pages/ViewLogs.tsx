/**
 * ViewLogs - Legacy time log viewer (now unified with Workforce Time Logs)
 * 
 * CANONICAL: Queries time_logs table only
 * Uses grouped display: one row per worker per day
 */

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2 } from 'lucide-react';
import { GroupedTimeLogsTable } from '@/components/workforce/GroupedTimeLogsTable';
import { groupTimeLogsByWorkerAndDate, GroupedTimeLog, TimeLogEntry } from '@/lib/timeLogGrouping';
import { SplitTimeLogDialog } from '@/components/unified/SplitTimeLogDialog';
import { toast } from 'sonner';

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
  const [logs, setLogs] = useState<TimeLogEntry[]>([]);
  const [groupedLogs, setGroupedLogs] = useState<GroupedTimeLog[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<GroupedTimeLog | null>(null);
  const [splitTimeLogData, setSplitTimeLogData] = useState<{
    timeLogId: string;
    workerName: string;
    date: string;
    hours: number;
    projectId: string;
  } | null>(null);
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    workerId: 'all',
    projectId: 'all',
    tradeId: 'all',
    sortBy: 'date-desc',
    paymentStatus: 'all',
  });

  useEffect(() => {
    fetchData();

    // Set up realtime subscription
    const channel = supabase
      .channel('time-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_logs'
        },
        () => {
          fetchData();
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

  const fetchData = async () => {
    // Fetch from time_logs (canonical table)
    const { data: logsData, error: logsError } = await supabase
      .from('time_logs')
      .select(`
        *,
        workers (
          id,
          name,
          hourly_rate,
          trade
        ),
        projects (
          id,
          project_name,
          client_name,
          company_id,
          companies (
            name
          )
        ),
        trades (
          name
        ),
        cost_codes (
          code,
          name
        )
      `)
      .order('date', { ascending: false });

    if (logsError) {
      toast.error('Failed to load time logs');
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

  const applyFilters = () => {
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
      filtered = filtered.filter(log => log.worker_id === filters.workerId);
    }

    // Project filter
    if (filters.projectId && filters.projectId !== 'all') {
      filtered = filtered.filter(log => log.project_id === filters.projectId);
    }

    // Trade filter
    if (filters.tradeId && filters.tradeId !== 'all') {
      filtered = filtered.filter(log => log.trade_id === filters.tradeId);
    }

    // Payment status filter
    if (filters.paymentStatus !== 'all') {
      filtered = filtered.filter(log => log.payment_status === filters.paymentStatus);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'worker':
          return (a.workers?.name || '').localeCompare(b.workers?.name || '');
        case 'project':
          return (a.projects?.project_name || '').localeCompare(b.projects?.project_name || '');
        case 'hours':
          return b.hours_worked - a.hours_worked;
        default:
          return 0;
      }
    });

    // Group the filtered logs
    const grouped = groupTimeLogsByWorkerAndDate(filtered);
    setGroupedLogs(grouped);
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

  const handleSelectLog = (logId: string, checked: boolean) => {
    const newSelected = new Set(selectedLogs);
    if (checked) {
      newSelected.add(logId);
    } else {
      newSelected.delete(logId);
    }
    setSelectedLogs(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = groupedLogs.flatMap(g => g.log_ids);
      setSelectedLogs(new Set(allIds));
    } else {
      setSelectedLogs(new Set());
    }
  };

  const handleSelectGroup = (group: GroupedTimeLog) => {
    const newSelected = new Set(selectedLogs);
    const allSelected = group.log_ids.every(id => newSelected.has(id));

    if (allSelected) {
      group.log_ids.forEach(id => newSelected.delete(id));
    } else {
      group.log_ids.forEach(id => newSelected.add(id));
    }
    
    setSelectedLogs(newSelected);
  };

  const handleMassDelete = async () => {
    if (selectedLogs.size === 0) return;

    // Check if any logs have linked schedules
    const { data: logsWithSchedules } = await supabase
      .from('time_logs')
      .select('id, source_schedule_id')
      .in('id', Array.from(selectedLogs))
      .not('source_schedule_id', 'is', null);

    const linkedCount = logsWithSchedules?.length || 0;
    
    let confirmMessage = `Delete ${selectedLogs.size} time ${selectedLogs.size === 1 ? 'entry' : 'entries'}?`;
    if (linkedCount > 0) {
      confirmMessage += `\n\n${linkedCount} ${linkedCount === 1 ? 'entry is' : 'entries are'} linked to schedules.`;
    }

    if (!window.confirm(confirmMessage)) return;

    // Delete linked schedules first
    if (linkedCount > 0) {
      const scheduleIds = logsWithSchedules?.map(log => log.source_schedule_id).filter(Boolean) || [];
      if (scheduleIds.length > 0) {
        const { error: scheduleError } = await supabase
          .from('work_schedules')
          .delete()
          .in('id', scheduleIds);

        if (scheduleError) {
          toast.error('Failed to delete linked schedules');
          return;
        }
      }
    }

    // Delete time logs
    const { error } = await supabase
      .from('time_logs')
      .delete()
      .in('id', Array.from(selectedLogs));

    if (error) {
      toast.error('Failed to delete entries');
    } else {
      toast.success(`Deleted ${selectedLogs.size} ${selectedLogs.size === 1 ? 'entry' : 'entries'}`);
      setSelectedLogs(new Set());
      fetchData();
    }
  };

  const handleEditGroup = (group: GroupedTimeLog) => {
    setSelectedGroup(group);
  };

  const handleSplitGroup = (group: GroupedTimeLog) => {
    if (group.projects.length !== 1) {
      toast.error('Can only split entries with a single project');
      return;
    }

    const project = group.projects[0];
    setSplitTimeLogData({
      timeLogId: project.id,
      workerName: group.worker_name,
      date: group.date,
      hours: project.hours,
      projectId: project.project_id,
    });
  };

  const totalHours = groupedLogs.reduce((sum, group) => sum + group.total_hours, 0);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Time Logs</h1>
        <p className="text-muted-foreground mt-1">View and manage all time entries</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Hours</p>
            <p className="text-2xl font-bold text-primary">{totalHours.toFixed(2)}h</p>
          </div>
        </div>

        <Card className="shadow-medium">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle>Time Entries ({groupedLogs.length} entries)</CardTitle>
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
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <GroupedTimeLogsTable
              groups={groupedLogs}
              selectedLogs={selectedLogs}
              onSelectLog={handleSelectLog}
              onSelectAll={handleSelectAll}
              onSelectGroup={handleSelectGroup}
              onEditGroup={handleEditGroup}
              onSplitGroup={handleSplitGroup}
              showSelection={true}
              showActions={true}
            />
          </CardContent>
        </Card>

        {/* Split Time Log Dialog */}
        {splitTimeLogData && (
          <SplitTimeLogDialog
            isOpen={!!splitTimeLogData}
            onClose={() => setSplitTimeLogData(null)}
            timeLogId={splitTimeLogData.timeLogId}
            workerName={splitTimeLogData.workerName}
            originalDate={splitTimeLogData.date}
            originalHours={splitTimeLogData.hours}
            originalProjectId={splitTimeLogData.projectId}
            onSuccess={() => {
              fetchData();
              setSplitTimeLogData(null);
              toast.success('Time log split successfully');
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default ViewLogs;
