import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, DollarSign, Clock, TrendingUp, CheckCircle2, FileCheck } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { CreatePayRunDialog } from './CreatePayRunDialog';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface UnpaidSummary {
  id: string;
  name: string;
  company_id: string;
  company_name: string;
  total_hours: number;
  total_amount: number;
  item_count: number;
}

export function WorkforcePayCenterTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [dateRange, setDateRange] = useState('7');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'worker' | 'project'>('worker');
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'paid' | 'all'>('unpaid');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payRunDialogOpen, setPayRunDialogOpen] = useState(false);
  const [payRunWorkerFilter, setPayRunWorkerFilter] = useState<string | undefined>();

  // ==============
  // Mutations
  // ==============
  const markPayRunPaid = useMutation({
    mutationFn: async (payRunId: string) => {
      const today = new Date();
      const paymentDate = format(today, 'yyyy-MM-dd');

      const { error } = await supabase
        .from('labor_pay_runs')
        .update({
          status: 'paid',
          payment_date: paymentDate,
        })
        .eq('id', payRunId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Trigger DB trigger that flips time_logs.payment_status → already handled.
      // Here we just refresh the UI.
      queryClient.invalidateQueries({ queryKey: ['workforce-recent-pay-runs'] });
      queryClient.invalidateQueries({ queryKey: ['workforce-paid-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['workforce-labor-summary'] });
      toast.success('Pay run marked as paid');
    },
    onError: (err: any) => {
      console.error('Error marking pay run as paid:', err);
      toast.error(err?.message || 'Failed to mark pay run as paid');
    },
  });

  // ==============
  // Companies
  // ==============
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      return data || [];
    },
  });

  // ==============
  // Labor Summary (unpaid/paid/all)
  // ==============
  const { data: laborSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['workforce-labor-summary', dateRange, selectedCompany, groupBy, paymentStatus],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      if (groupBy === 'worker') {
        let query = supabase
          .from('time_logs')
          .select(`
            worker_id,
            workers!inner(name, hourly_rate),
            projects!inner(company_id, companies(name)),
            hours_worked,
            labor_cost,
            payment_status
          `)
          .gte('date', startDate)
          .lte('date', endDate);

        if (paymentStatus !== 'all') {
          query = query.eq('payment_status', paymentStatus);
        }

        if (selectedCompany !== 'all') {
          query = query.eq('projects.company_id', selectedCompany);
        }

        const { data: logs, error } = await query;
        if (error) throw error;

        const grouped = logs?.reduce((acc: any, log: any) => {
          const workerId = log.worker_id;
          if (!acc[workerId]) {
            acc[workerId] = {
              id: workerId,
              name: log.workers?.name || 'Unknown',
              company_id: log.projects?.company_id || '',
              company_name: log.projects?.companies?.name || 'Unknown',
              total_hours: 0,
              total_amount: 0,
              item_count: 0,
            };
          }
          acc[workerId].total_hours += log.hours_worked || 0;
          acc[workerId].total_amount += log.labor_cost || 0;
          acc[workerId].item_count += 1;
          return acc;
        }, {});

        return Object.values(grouped || {}) as UnpaidSummary[];
      } else {
        let query = supabase
          .from('time_logs')
          .select(`
            project_id,
            projects!inner(project_name, company_id, companies(name)),
            workers!inner(hourly_rate),
            hours_worked,
            labor_cost,
            payment_status
          `)
          .gte('date', startDate)
          .lte('date', endDate);

        if (paymentStatus !== 'all') {
          query = query.eq('payment_status', paymentStatus);
        }

        if (selectedCompany !== 'all') {
          query = query.eq('projects.company_id', selectedCompany);
        }

        const { data: logs, error } = await query;
        if (error) throw error;

        const grouped = logs?.reduce((acc: any, log: any) => {
          const projectId = log.project_id;
          if (!acc[projectId]) {
            acc[projectId] = {
              id: projectId,
              name: log.projects?.project_name || 'Unknown',
              company_id: log.projects?.company_id || '',
              company_name: log.projects?.companies?.name || 'Unknown',
              total_hours: 0,
              total_amount: 0,
              item_count: 0,
            };
          }
          acc[projectId].total_hours += log.hours_worked || 0;
          acc[projectId].total_amount += log.labor_cost || 0;
          acc[projectId].item_count += 1;
          return acc;
        }, {});

        return Object.values(grouped || {}) as UnpaidSummary[];
      }
    },
  });

  // ==============
  // Recent Pay Runs
  // ==============
  const { data: recentPayRuns } = useQuery({
    queryKey: ['workforce-recent-pay-runs', dateRange, selectedCompany],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      let query = supabase
        .from('labor_pay_runs')
        .select('id, created_at, payment_date, status, total_amount, total_hours')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })
        .limit(5);

      if (selectedCompany !== 'all') {
        query = query.eq('payer_company_id', selectedCompany);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // ==============
  // Detail Logs Drawer
  // ==============
  const { data: detailLogs } = useQuery({
    queryKey: ['workforce-detail-logs', selectedId, groupBy, dateRange, selectedCompany, paymentStatus],
    queryFn: async () => {
      if (!selectedId) return [];

      const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      let query = supabase
        .from('time_logs')
        .select(`
          id,
          date,
          hours_worked,
          labor_cost,
          payment_status,
          notes,
          workers(name, hourly_rate),
          projects(project_name, companies(name))
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (paymentStatus !== 'all') {
        query = query.eq('payment_status', paymentStatus);
      }

      if (groupBy === 'worker') {
        query = query.eq('worker_id', selectedId);
      } else {
        query = query.eq('project_id', selectedId);
      }

      if (selectedCompany !== 'all') {
        query = query.eq('projects.company_id', selectedCompany);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedId && drawerOpen,
  });

  // ==============
  // Paid metrics
  // ==============
  const { data: paidMetrics } = useQuery({
    queryKey: ['workforce-paid-metrics', dateRange, selectedCompany],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      let logsQuery = supabase
        .from('time_logs')
        .select('hours_worked, labor_cost, projects!inner(company_id)')
        .eq('payment_status', 'paid')
        .gte('date', startDate)
        .lte('date', endDate);

      if (selectedCompany !== 'all') {
        logsQuery = logsQuery.eq('projects.company_id', selectedCompany);
      }

      const { data: paidLogs, error: logsError } = await logsQuery;
      if (logsError) throw logsError;

      const paidHours = paidLogs?.reduce((sum, log) => sum + (log.hours_worked || 0), 0) || 0;
      const paidAmount = paidLogs?.reduce((sum, log) => sum + (log.labor_cost || 0), 0) || 0;

      let payRunsQuery = supabase
        .from('labor_pay_runs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'paid')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      if (selectedCompany !== 'all') {
        payRunsQuery = payRunsQuery.eq('payer_company_id', selectedCompany);
      }

      const { count: payRunCount, error: payRunError } = await payRunsQuery;
      if (payRunError) throw payRunError;

      return {
        paidHours,
        paidAmount,
        payRunCount: payRunCount || 0,
      };
    },
  });

  // ==============
  // Totals / derived
  // ==============
  const totalHours = laborSummary?.reduce((sum, item) => sum + item.total_hours, 0) || 0;
  const totalAmount = laborSummary?.reduce((sum, item) => sum + item.total_amount, 0) || 0;
  const totalLogs = laborSummary?.reduce((sum, item) => sum + item.item_count, 0) || 0;
  const totalWorkers = new Set(laborSummary?.map(item => item.id) || []).size;

  const totalUnpaidHours =
    laborSummary?.filter(() => paymentStatus === 'unpaid' || paymentStatus === 'all')
      .reduce((sum, item) => sum + item.total_hours, 0) || 0;

  const totalUnpaidAmount =
    laborSummary?.filter(() => paymentStatus === 'unpaid' || paymentStatus === 'all')
      .reduce((sum, item) => sum + item.total_amount, 0) || 0;

  const totalUnpaidLogs =
    laborSummary?.filter(() => paymentStatus === 'unpaid' || paymentStatus === 'all')
      .reduce((sum, item) => sum + item.item_count, 0) || 0;

  const totalUnpaidWorkers =
    paymentStatus === 'unpaid' || paymentStatus === 'all'
      ? new Set(laborSummary?.map(item => item.id) || []).size
      : 0;

  const selectedSummary = laborSummary?.find(s => s.id === selectedId);

  const handleViewDetails = (id: string) => {
    setSelectedId(id);
    setDrawerOpen(true);
  };

  const handleOpenPaymentDialog = (workerId?: string) => {
    setPayRunWorkerFilter(workerId);
    setPayRunDialogOpen(true);
  };

  const handlePayRunSuccess = () => {
    setPayRunDialogOpen(false);
    setPayRunWorkerFilter(undefined);
    setDrawerOpen(false);
    // Pay runs created as draft – metrics stay "unpaid" until we mark paid.
    queryClient.invalidateQueries({ queryKey: ['workforce-recent-pay-runs'] });
  };

  if (summaryLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold">Pay Center</h3>
        <p className="text-sm text-muted-foreground">
          Track unpaid labor and manage payments
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies?.map(company => (
                  <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
              <TabsList>
                <TabsTrigger value="worker">By Worker</TabsTrigger>
                <TabsTrigger value="project">By Project</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Recent Pay Runs */}
      {recentPayRuns && recentPayRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Pay Runs in this period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentPayRuns.map((run: any) => {
                const hours = run.total_hours ?? 0;
                const isPaid = run.status === 'paid';
                return (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                    onClick={() => navigate('/workforce?tab=pay-runs')}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={isPaid ? 'default' : 'secondary'}>
                        {run.status}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">
                          {run.payment_date
                            ? format(new Date(run.payment_date), 'MMM d, yyyy')
                            : 'Draft'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {hours.toFixed(1)}h
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold">
                        ${(run.total_amount || 0).toLocaleString()}
                      </p>
                      {!isPaid && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!markPayRunPaid.isPending) {
                              markPayRunPaid.mutate(run.id);
                            }
                          }}
                        >
                          {markPayRunPaid.isPending ? 'Marking…' : 'Mark paid'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Unpaid */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Unpaid Logs</span>
            </div>
            <p className="text-2xl font-bold">{totalUnpaidLogs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Hours (Unpaid)</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {totalUnpaidHours.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Total Unpaid</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              ${totalUnpaidAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">Workers With Unpaid</span>
            </div>
            <p className="text-2xl font-bold">{totalUnpaidWorkers}</p>
          </CardContent>
        </Card>

        {/* Paid */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Paid Hours</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {(paidMetrics?.paidHours || 0).toFixed(1)}h
            </p>
            <p className="text-xs text-muted-foreground mt-1">this period</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileCheck className="h-4 w-4" />
              <span className="text-sm">Paid Amount</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              ${(paidMetrics?.paidAmount || 0).toLocaleString()}
            </p>
            {paidMetrics && paidMetrics.payRunCount > 0 && (
              <button
                onClick={() => navigate('/workforce?tab=pay-runs')}
                className="text-xs text-primary hover:underline mt-1 cursor-pointer"
              >
                via {paidMetrics.payRunCount} pay run{paidMetrics.payRunCount !== 1 ? 's' : ''}
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Labor Summary Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>Labor Summary</CardTitle>
              <Tabs value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as any)}>
                <TabsList>
                  <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
                  <TabsTrigger value="paid">Paid</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {laborSummary && laborSummary.length > 0 && paymentStatus === 'unpaid' && (
              <Button onClick={() => handleOpenPaymentDialog()}>
                Create Payment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {laborSummary && laborSummary.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{groupBy === 'worker' ? 'Worker' : 'Project'}</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Logs</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {laborSummary.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.company_name}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.total_hours.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${item.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{item.item_count}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(item.id)}
                        >
                          View Details
                        </Button>
                        {groupBy === 'worker' && paymentStatus === 'unpaid' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPaymentDialog(item.id)}
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            Pay
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {paymentStatus === 'unpaid' ? 'All caught up!' : 'No records found'}
              </p>
              <p className="text-sm">
                {paymentStatus === 'unpaid'
                  ? 'No unpaid labor for this period'
                  : `No ${paymentStatus} labor for this period`}
              </p>
            </div>
          )}
          <div className="mt-4 pt-4 border-t text-center">
            <button
              onClick={() => navigate('/workforce?tab=pay-runs')}
              className="text-sm text-primary hover:underline"
            >
              Want to see paid history? View pay runs →
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Worker/Project Details Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {groupBy === 'worker' ? 'Worker' : 'Project'} Details - {selectedSummary?.name}
            </SheetTitle>
          </SheetHeader>

          {selectedSummary && (
            <div className="mt-6 space-y-6">
              {/* Summary */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Logs</p>
                      <p className="text-xl font-bold">{selectedSummary.item_count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Hours</p>
                      <p className="text-xl font-bold text-blue-600">
                        {selectedSummary.total_hours.toFixed(1)}h
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="text-xl font-bold text-orange-600">
                        ${selectedSummary.total_amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Individual Logs */}
              <div className="space-y-3">
                <h4 className="font-semibold">Individual Time Logs</h4>
                {detailLogs?.map((log: any) => {
                  const amount = log.labor_cost || 0;
                  return (
                    <Card key={log.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">
                              {format(new Date(log.date), 'MMM d, yyyy')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {groupBy === 'worker'
                                ? log.projects?.project_name
                                : log.workers?.name}
                            </p>
                            <Badge
                              variant={log.payment_status === 'paid' ? 'default' : 'secondary'}
                              className="mt-1"
                            >
                              {log.payment_status}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${amount.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">
                              {log.hours_worked}h
                            </p>
                          </div>
                        </div>
                        {log.notes && (
                          <p className="text-xs text-muted-foreground mt-2">{log.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Action Button */}
              {groupBy === 'worker' && paymentStatus === 'unpaid' && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleOpenPaymentDialog(selectedId || undefined)}
                >
                  Create Payment for {selectedSummary.name}
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Pay Run Creation Dialog */}
      <CreatePayRunDialog
        open={payRunDialogOpen}
        onOpenChange={setPayRunDialogOpen}
        onSuccess={handlePayRunSuccess}
        defaultDateRangeStart={format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd')}
        defaultDateRangeEnd={format(new Date(), 'yyyy-MM-dd')}
        defaultCompanyId={selectedCompany !== 'all' ? selectedCompany : undefined}
        defaultWorkerId={payRunWorkerFilter}
      />
    </div>
  );
}
