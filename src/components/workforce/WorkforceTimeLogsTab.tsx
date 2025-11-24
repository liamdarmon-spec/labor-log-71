/**
 * WorkforceTimeLogsTab - Unified time log display for Workforce OS
 * 
 * CANONICAL: Queries time_logs table only
 * Uses grouped display: one row per worker per day
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DatePickerWithPresets } from '@/components/ui/date-picker-with-presets';
import { format, subDays, startOfMonth } from 'date-fns';
import { UniversalTimeLogDrawer } from '@/components/unified/UniversalTimeLogDrawer';
import { SplitTimeLogDialog } from '@/components/unified/SplitTimeLogDialog';
import { EditTimeEntryDialog } from '@/components/workforce/EditTimeEntryDialog';
import { GroupedTimeLogsTable } from '@/components/workforce/GroupedTimeLogsTable';
import { groupTimeLogsByWorkerAndDate, GroupedTimeLog, TimeLogEntry } from '@/lib/timeLogGrouping';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export function WorkforceTimeLogsTab() {
  const [dateRange, setDateRange] = useState('7'); // preset values: '7', '30', 'month', 'custom'
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedWorker, setSelectedWorker] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<GroupedTimeLog | null>(null);
  const [addTimeLogOpen, setAddTimeLogOpen] = useState(false);
  const [splitTimeLogData, setSplitTimeLogData] = useState<{
    timeLogId: string;
    workerName: string;
    date: string;
    hours: number;
    projectId: string;
  } | null>(null);

  // Fetch companies
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      return data || [];
    },
  });

  // Fetch workers
  const { data: workers } = useQuery({
    queryKey: ['workers-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('workers')
        .select('id, name, trade')
        .eq('active', true)
        .order('name');
      return data || [];
    },
  });

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name');
      return data || [];
    },
  });

  // Compute effective date range
  const getEffectiveDateRange = () => {
    if (dateRange === 'custom') {
      return {
        start: customStartDate ? format(customStartDate, 'yyyy-MM-dd') : format(subDays(new Date(), 7), 'yyyy-MM-dd'),
        end: customEndDate ? format(customEndDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
      };
    } else if (dateRange === 'month') {
      return {
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
      };
    } else {
      const days = parseInt(dateRange);
      return {
        start: format(subDays(new Date(), days), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
      };
    }
  };

  // Fetch time logs (CANONICAL: from time_logs table)
  const { data: timeLogs, isLoading, refetch } = useQuery({
    queryKey: ['workforce-time-logs', dateRange, customStartDate, customEndDate, selectedCompany, selectedWorker, selectedProject, paymentFilter],
    queryFn: async () => {
      const { start, end } = getEffectiveDateRange();
      
      let query = supabase
        .from('time_logs')
        .select(`
          id,
          worker_id,
          project_id,
          trade_id,
          cost_code_id,
          date,
          hours_worked,
          hourly_rate,
          notes,
          payment_status,
          paid_amount,
          source_schedule_id,
          workers!inner(id, name, trade, hourly_rate),
          projects!inner(id, project_name, client_name, company_id, companies(name)),
          trades(name),
          cost_codes(code, name)
        `)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })
        .limit(500);

      // Apply filters at DB level
      if (selectedWorker !== 'all') {
        query = query.eq('worker_id', selectedWorker);
      }

      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      if (paymentFilter !== 'all') {
        query = query.eq('payment_status', paymentFilter);
      }

      // Company filter via projects join
      if (selectedCompany !== 'all') {
        query = query.eq('projects.company_id', selectedCompany);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TimeLogEntry[];
    },
  });

  // Group time logs by worker + date
  const groupedLogs = timeLogs ? groupTimeLogsByWorkerAndDate(timeLogs) : [];

  // Calculate totals
  const totalHours = groupedLogs.reduce((sum, group) => sum + group.total_hours, 0);
  const totalAmount = groupedLogs.reduce((sum, group) => sum + group.total_cost, 0);

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

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Time Logs</h3>
          <p className="text-sm text-muted-foreground">
            View and manage actual hours worked
          </p>
        </div>
        <Button onClick={() => setAddTimeLogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Time Log
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>

              {dateRange === 'custom' && (
                <>
                  <DatePickerWithPresets
                    date={customStartDate || new Date()}
                    onDateChange={setCustomStartDate}
                  />
                  <DatePickerWithPresets
                    date={customEndDate || new Date()}
                    onDateChange={setCustomEndDate}
                  />
                </>
              )}

              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies?.map(company => (
                    <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workers</SelectItem>
                  {workers?.map(worker => (
                    <SelectItem key={worker.id} value={worker.id}>{worker.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Entries</p>
            <p className="text-2xl font-bold">{groupedLogs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Hours</p>
            <p className="text-2xl font-bold text-blue-600">{totalHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
            <p className="text-2xl font-bold text-green-600">${totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Grouped Table */}
      <Card>
        <CardContent className="p-0">
          <GroupedTimeLogsTable
            groups={groupedLogs}
            selectedLogs={selectedLogs}
            onSelectLog={handleSelectLog}
            onSelectAll={handleSelectAll}
            onSelectGroup={handleSelectGroup}
            onEditGroup={handleEditGroup}
            onSplitGroup={handleSplitGroup}
            showSelection={false}
            showActions={true}
          />
        </CardContent>
      </Card>

      {/* Edit Time Entry Dialog (for viewing existing entries) */}
      {selectedGroup && (
        <EditTimeEntryDialog
          open={!!selectedGroup}
          onOpenChange={(open) => !open && setSelectedGroup(null)}
          group={selectedGroup}
          onSuccess={() => {
            refetch();
            setSelectedGroup(null);
          }}
        />
      )}

      {/* Add New Time Log Dialog */}
      {addTimeLogOpen && (
        <EditTimeEntryDialog
          open={addTimeLogOpen}
          onOpenChange={setAddTimeLogOpen}
          group={{
            worker_id: '',
            worker_name: '',
            worker_trade: null,
            company_id: '',
            company_name: '',
            date: format(new Date(), 'yyyy-MM-dd'),
            total_hours: 0,
            total_cost: 0,
            payment_status: 'unpaid',
            log_ids: [],
            projects: [],
            earliest_log_id: 'new'
          }}
          onSuccess={() => {
            refetch();
            setAddTimeLogOpen(false);
            toast.success('Time log created successfully');
          }}
        />
      )}

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
            refetch();
            setSplitTimeLogData(null);
            toast.success('Time log split successfully');
          }}
        />
      )}
    </div>
  );
}
