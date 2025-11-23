import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { SplitScheduleDialog } from '@/components/dashboard/SplitScheduleDialog';
import { TimeLogDetailDrawer } from '@/components/unified/TimeLogDetailDrawer';
import { useWorkersSimple } from '@/hooks/useWorkers';
import { useProjectsSimple } from '@/hooks/useProjects';
import { useTradesSimple } from '@/hooks/useTrades';

interface TimeLogsTableViewProps {
  initialWorkerId?: string;
  initialDate?: string;
  initialProjectId?: string;
}

export function TimeLogsTableView({ initialWorkerId, initialDate, initialProjectId }: TimeLogsTableViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<string>('7');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [workerFilter, setWorkerFilter] = useState<string>(initialWorkerId || 'all');
  const [projectFilter, setProjectFilter] = useState<string>(initialProjectId || 'all');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [scheduleToSplit, setScheduleToSplit] = useState<any>(null);

  const getDateRange = () => {
    const now = new Date();
    if (dateRange === 'this-week') {
      return { start: startOfWeek(now), end: endOfWeek(now) };
    } else if (dateRange === 'last-week') {
      const lastWeek = subDays(now, 7);
      return { start: startOfWeek(lastWeek), end: endOfWeek(lastWeek) };
    } else {
      return { start: subDays(now, parseInt(dateRange)), end: now };
    }
  };

  const { start, end } = getDateRange();

  // Fetch companies
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      return data || [];
    },
  });

  // Use centralized hooks with caching
  const { data: workers = [] } = useWorkersSimple();
  const { data: projects = [] } = useProjectsSimple(false);
  const { data: trades = [] } = useTradesSimple();

  // Fetch time logs
  const { data: timeLogs, isLoading, refetch } = useQuery({
    queryKey: ['time-logs-table', format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'), companyFilter, workerFilter, projectFilter, tradeFilter, paymentFilter, showUnpaidOnly],
    queryFn: async () => {
      let query = supabase
        .from('time_logs')
        .select(`
          *,
          workers(id, name, trade, hourly_rate),
          projects(id, project_name, company_id, companies(name)),
          trades(name),
          cost_codes(code, name),
          payments(id, payment_date, paid_by)
        `)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (showUnpaidOnly) {
        query = query.eq('payment_status', 'unpaid');
      }

      if (paymentFilter !== 'all') {
        query = query.eq('payment_status', paymentFilter);
      }

      if (workerFilter !== 'all') {
        query = query.eq('worker_id', workerFilter);
      }

      if (projectFilter !== 'all') {
        query = query.eq('project_id', projectFilter);
      }

      if (tradeFilter !== 'all') {
        query = query.eq('trade_id', tradeFilter);
      }

      const { data } = await query;

      if (!data) return [];

      // Filter by company
      let filtered = data;
      if (companyFilter !== 'all') {
        filtered = filtered.filter(log => log.projects?.company_id === companyFilter);
      }

      // Calculate cost for each log
      return filtered.map(log => ({
        ...log,
        cost: log.hours_worked * (log.hourly_rate || log.workers?.hourly_rate || 0),
      }));
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && timeLogs) {
      setSelectedLogs(new Set(timeLogs.map(log => log.id)));
    } else {
      setSelectedLogs(new Set());
    }
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

  const handleCreatePaymentRun = () => {
    if (selectedLogs.size === 0) {
      toast.error('Please select at least one time log');
      return;
    }

    const selectedLogsData = timeLogs?.filter(log => selectedLogs.has(log.id));
    const totalAmount = selectedLogsData?.reduce((sum, log) => sum + log.cost, 0) || 0;
    
    // Navigate to payment creation with selected logs
    navigate(`/financials/payments?action=create&logs=${Array.from(selectedLogs).join(',')}&amount=${totalAmount}`);
  };

  const handleMarkAsPaid = async () => {
    if (selectedLogs.size === 0) {
      toast.error('Please select at least one time log');
      return;
    }

    try {
      // Get the selected logs to calculate paid amounts
      const selectedLogsData = timeLogs?.filter(log => selectedLogs.has(log.id));
      
      // Update each log individually with its calculated paid amount
      const updates = selectedLogsData?.map(log => 
        supabase
          .from('time_logs')
          .update({ 
            payment_status: 'paid', 
            paid_amount: log.hours_worked * (log.workers?.hourly_rate || 0) 
          })
          .eq('id', log.id)
      );

      if (updates) {
        await Promise.all(updates);
      }

      toast.success(`Marked ${selectedLogs.size} log(s) as paid`);
      setSelectedLogs(new Set());
      refetch();
    } catch (error) {
      console.error('Error marking logs as paid:', error);
      toast.error('Failed to mark logs as paid');
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid</Badge>;
      case 'unpaid':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Unpaid</Badge>;
      default:
        return <Badge variant="outline">N/A</Badge>;
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  const totalSelected = selectedLogs.size;
  const totalAmount = timeLogs
    ?.filter(log => selectedLogs.has(log.id))
    .reduce((sum, log) => sum + log.cost, 0) || 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Time Logs</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUnpaidOnly(!showUnpaidOnly)}
                className={showUnpaidOnly ? 'border-primary' : ''}
              >
                Show Unpaid Only
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies?.map(company => (
                  <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={workerFilter} onValueChange={setWorkerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Workers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workers</SelectItem>
                {workers?.map(worker => (
                  <SelectItem key={worker.id} value={worker.id}>{worker.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tradeFilter} onValueChange={setTradeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Trades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                {trades?.map(trade => (
                  <SelectItem key={trade.id} value={trade.id}>{trade.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedLogs.size > 0 && (
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2">
                <span className="font-medium">{totalSelected} log(s) selected</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-semibold text-primary">${totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedLogs(new Set())}>
                  Clear Selection
                </Button>
                <Button variant="outline" size="sm" onClick={handleMarkAsPaid}>
                  Mark as Paid
                </Button>
                <Button size="sm" onClick={handleCreatePaymentRun}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Create Payment Run
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          {timeLogs && timeLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedLogs.size === timeLogs.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Pay Status</TableHead>
                  <TableHead>Cost Code</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeLogs.map((log) => (
                  <TableRow 
                    key={log.id} 
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => {
                      setSelectedLog(log);
                      setDrawerOpen(true);
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedLogs.has(log.id)}
                        onCheckedChange={(checked) => handleSelectLog(log.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>{format(new Date(log.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="font-medium">{log.workers?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.projects?.companies?.name}</Badge>
                    </TableCell>
                    <TableCell>{log.projects?.project_name}</TableCell>
                    <TableCell className="text-muted-foreground">{log.trades?.name || log.workers?.trade}</TableCell>
                    <TableCell className="text-right">{log.hours_worked}h</TableCell>
                    <TableCell className="text-right">${log.hourly_rate || log.workers?.hourly_rate}/hr</TableCell>
                    <TableCell className="text-right font-semibold">${log.cost.toLocaleString()}</TableCell>
                    <TableCell>{getPaymentStatusBadge(log.payment_status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {log.cost_codes ? `${log.cost_codes.code}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                          setDrawerOpen(true);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No time logs found for the selected filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <TimeLogDetailDrawer
        log={selectedLog}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setSelectedLog(null);
        }}
        onSplit={(log) => {
          if (log.source_schedule_id) {
            setScheduleToSplit({
              id: log.source_schedule_id,
              workerName: log.workers?.name,
              originalDate: log.date,
              originalHours: log.hours_worked,
              originalProjectId: log.project_id,
            });
            setSplitDialogOpen(true);
          } else {
            toast.error('Cannot split time log without linked schedule');
          }
        }}
      />

      {/* Split Schedule Dialog */}
      {scheduleToSplit && (
        <SplitScheduleDialog
          isOpen={splitDialogOpen}
          onClose={() => {
            setSplitDialogOpen(false);
            setScheduleToSplit(null);
          }}
          scheduleId={scheduleToSplit.id}
          workerName={scheduleToSplit.workerName}
          originalDate={scheduleToSplit.originalDate}
          originalHours={scheduleToSplit.originalHours}
          originalProjectId={scheduleToSplit.originalProjectId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['time-logs-table'] });
            setSplitDialogOpen(false);
            setScheduleToSplit(null);
            setDrawerOpen(false);
            setSelectedLog(null);
            toast.success('Time log split successfully');
          }}
        />
      )}
    </>
  );
}
