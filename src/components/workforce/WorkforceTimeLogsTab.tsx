/**
 * WorkforceTimeLogsTab - Unified time log display for Workforce OS
 *
 * READ-ONLY: queries time_logs_with_meta_view (pre-joined meta)
 * Still groups in JS as: one row per worker per day
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DatePickerWithPresets } from '@/components/ui/date-picker-with-presets';
import { format, subDays, startOfMonth } from 'date-fns';
import { UniversalTimeLogDrawer } from '@/components/unified/UniversalTimeLogDrawer';
import { SplitTimeLogDialog } from '@/components/unified/SplitTimeLogDialog';
import { EditTimeEntryDialog } from '@/components/workforce/EditTimeEntryDialog';
import { DaySummaryDialog } from '@/components/workforce/DaySummaryDialog';
import {
  GroupedTimeLogsTable,
} from '@/components/workforce/GroupedTimeLogsTable';
import {
  groupTimeLogsByWorkerAndDate,
  GroupedTimeLog,
  TimeLogEntry,
} from '@/lib/timeLogGrouping';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export function WorkforceTimeLogsTab() {
  const [dateRange, setDateRange] = useState('30'); // DEFAULT: last 30 days
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedWorker, setSelectedWorker] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<GroupedTimeLog | null>(
    null,
  );
  const [addTimeLogOpen, setAddTimeLogOpen] = useState(false);
  const [daySummaryGroup, setDaySummaryGroup] =
    useState<GroupedTimeLog | null>(null);
  const [splitTimeLogData, setSplitTimeLogData] = useState<{
    timeLogId: string;
    workerName: string;
    date: string;
    hours: number;
    projectId: string;
  } | null>(null);
  const [editingTimeLogId, setEditingTimeLogId] = useState<string | null>(null);

  // --------- FILTER DATA (companies / workers / projects) ----------

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  const { data: workers } = useQuery({
    queryKey: ['workers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, name, trade')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name');

      if (error) throw error;
      return data || [];
    },
  });

  // --------- DATE RANGE HELPERS ----------

  const getEffectiveDateRange = () => {
    if (dateRange === 'custom') {
      return {
        start: customStartDate
          ? format(customStartDate, 'yyyy-MM-dd')
          : format(subDays(new Date(), 7), 'yyyy-MM-dd'),
        end: customEndDate
          ? format(customEndDate, 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd'),
      };
    } else if (dateRange === 'month') {
      return {
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd'),
      };
    } else {
      const days = parseInt(dateRange, 10);
      return {
        start: format(subDays(new Date(), days), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd'),
      };
    }
  };

  // --------- TIME LOGS QUERY (via VIEW) ----------

  /**
   * We now read from time_logs_with_meta_view (pre-joined worker/project/company/cost code)
   * and normalize rows back into the same shape the grouping util expects.
   * This keeps existing UI + logic intact but makes the DB query cheaper.
   */
  const {
    data: rawTimeLogs,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      'workforce-time-logs',
      dateRange,
      customStartDate?.toISOString(),
      customEndDate?.toISOString(),
      selectedCompany,
      selectedWorker,
      selectedProject,
      paymentFilter,
    ],
    queryFn: async () => {
      const { start, end } = getEffectiveDateRange();

      let query = supabase
        .from('time_logs_with_meta_view')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })
        // hard cap to protect UI; later we can swap to pagination
        .limit(1000);

      if (selectedWorker !== 'all') {
        query = query.eq('worker_id', selectedWorker);
      }

      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      if (paymentFilter !== 'all') {
        query = query.eq('payment_status', paymentFilter);
      }

      if (selectedCompany !== 'all') {
        query = query.eq('company_id', selectedCompany);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = data || [];

      // Normalize each row into the same structure the old query returned.
      const normalized = rows.map((row: any) => {
        return {
          id: row.id,
          worker_id: row.worker_id,
          project_id: row.project_id,
          trade_id: row.trade_id,
          cost_code_id: row.cost_code_id,
          date: row.date,
          hours_worked: row.hours_worked,
          hourly_rate: row.hourly_rate,
          // keep labor_cost available even if the grouping util still derives it
          labor_cost: row.labor_cost,
          notes: row.notes,
          payment_status: row.payment_status,
          paid_amount: row.paid_amount,
          source_schedule_id: row.source_schedule_id,
          last_synced_at: row.last_synced_at,
          created_at: row.created_at,
          updated_at: row.updated_at,
          // nested relations to match previous shape
          workers: {
            id: row.worker_id,
            name: row.worker_name,
            trade: row.worker_trade_name,
            hourly_rate: row.hourly_rate,
          },
          projects: {
            id: row.project_id,
            project_name: row.project_name,
            client_name: null,
            company_id: row.company_id,
            companies: row.company_name
              ? { name: row.company_name }
              : null,
          },
          trades: row.worker_trade_name
            ? { name: row.worker_trade_name }
            : null,
          cost_codes: row.cost_code
            ? { code: row.cost_code, name: row.cost_code_name }
            : null,
        };
      });

      return normalized;
    },
  });

  // Treat normalized rows as TimeLogEntry[]
  const timeLogs = (rawTimeLogs || []) as TimeLogEntry[];

  // --------- GROUPING + TOTALS ----------

  const groupedLogs = timeLogs
    ? groupTimeLogsByWorkerAndDate(timeLogs)
    : [];

  const totalHours = groupedLogs.reduce(
    (sum, group) => sum + group.total_hours,
    0,
  );
  const totalAmount = groupedLogs.reduce(
    (sum, group) => sum + group.total_cost,
    0,
  );

  // --------- SELECTION HANDLERS ----------

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
      const allIds = groupedLogs.flatMap((g) => g.log_ids);
      setSelectedLogs(new Set(allIds));
    } else {
      setSelectedLogs(new Set());
    }
  };

  const handleSelectGroup = (group: GroupedTimeLog) => {
    const newSelected = new Set(selectedLogs);
    const allSelected = group.log_ids.every((id) => newSelected.has(id));

    if (allSelected) {
      group.log_ids.forEach((id) => newSelected.delete(id));
    } else {
      group.log_ids.forEach((id) => newSelected.add(id));
    }

    setSelectedLogs(newSelected);
  };

  const handleEditGroup = (group: GroupedTimeLog) => {
    setSelectedGroup(group);
  };

  // --------- SPLIT / DAY SUMMARY / EDIT FLOWS ----------

  const handleSplitGroup = (group: GroupedTimeLog) => {
    const firstProject = group.projects[0];
    if (!firstProject) {
      toast.error('No time log entries found');
      return;
    }

    setSplitTimeLogData({
      timeLogId: firstProject.id,
      workerName: group.worker_name,
      date: group.date,
      hours: firstProject.hours,
      projectId: firstProject.project_id,
    });
  };

  const handleRowClick = (group: GroupedTimeLog) => {
    setDaySummaryGroup(group);
  };

  const handleEditTimeLog = (timeLogId: string) => {
    setEditingTimeLogId(timeLogId);
    setDaySummaryGroup(null);
  };

  const handleSplitTimeLogFromDaySummary = (timeLogId: string) => {
    const tl = timeLogs.find((log) => log.id === timeLogId);
    if (!tl || !daySummaryGroup) {
      toast.error('Time log not found');
      return;
    }

    setSplitTimeLogData({
      timeLogId: tl.id,
      workerName: daySummaryGroup.worker_name,
      date: tl.date,
      hours: tl.hours_worked,
      projectId: tl.project_id,
    });
    setDaySummaryGroup(null);
  };

  const handleAddProjectFromDaySummary = () => {
    if (daySummaryGroup) {
      setSelectedGroup({
        ...daySummaryGroup,
        projects: [],
      });
      setDaySummaryGroup(null);
    }
  };

  // --------- RENDER ----------

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
          <Plus className="mr-2 h-4 w-4" />
          Add Time Log
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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

              <Select
                value={selectedCompany}
                onValueChange={setSelectedCompany}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies?.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedWorker}
                onValueChange={setSelectedWorker}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workers</SelectItem>
                  {workers?.map((worker: any) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedProject}
                onValueChange={setSelectedProject}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={paymentFilter}
                onValueChange={setPaymentFilter}
              >
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">Total Entries</p>
            <p className="text-2xl font-bold">{groupedLogs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">Total Hours</p>
            <p className="text-2xl font-bold text-blue-600">
              {totalHours.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="mb-1 text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold text-green-600">
              ${totalAmount.toLocaleString()}
            </p>
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
            onRowClick={handleRowClick}
            showSelection={false}
            showActions={true}
          />
        </CardContent>
      </Card>

      {/* Edit existing grouped entry */}
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

      {/* Add new time log */}
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
            earliest_log_id: 'new',
          }}
          onSuccess={() => {
            refetch();
            setAddTimeLogOpen(false);
            toast.success('Time log created successfully');
          }}
        />
      )}

      {/* Split Time Log */}
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

      {/* Day Summary Dialog */}
      {daySummaryGroup && (
        <DaySummaryDialog
          open={!!daySummaryGroup}
          onOpenChange={(open) => !open && setDaySummaryGroup(null)}
          group={daySummaryGroup}
          onRefresh={refetch}
          onEditTimeLog={handleEditTimeLog}
          onSplitTimeLog={handleSplitTimeLogFromDaySummary}
          onAddProject={handleAddProjectFromDaySummary}
        />
      )}

      {/* Edit single log from Day Summary */}
      {editingTimeLogId && (
        <EditTimeEntryDialog
          open={!!editingTimeLogId}
          onOpenChange={(open) => !open && setEditingTimeLogId(null)}
          group={
            groupedLogs.find((g) => g.log_ids.includes(editingTimeLogId)) ||
            null
          }
          onSuccess={() => {
            refetch();
            setEditingTimeLogId(null);
          }}
        />
      )}
    </div>
  );
}
