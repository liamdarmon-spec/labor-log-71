import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  const [dateRange, setDateRange] = useState('7');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'worker' | 'project'>('worker');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payRunDialogOpen, setPayRunDialogOpen] = useState(false);
  const [payRunWorkerFilter, setPayRunWorkerFilter] = useState<string | undefined>();

  // Fetch companies
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      return data || [];
    },
  });

  // Fetch aggregated unpaid summary using SQL
  const { data: unpaidSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['workforce-unpaid-summary', dateRange, selectedCompany, groupBy],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      if (groupBy === 'worker') {
        // Aggregate by worker using RPC or view
        let query = supabase
          .from('time_logs')
          .select(`
            worker_id,
            workers!inner(name, hourly_rate),
            projects!inner(company_id, companies(name)),
            hours_worked
          `)
          .eq('payment_status', 'unpaid')
          .gte('date', startDate)
          .lte('date', endDate);

        if (selectedCompany !== 'all') {
          query = query.eq('projects.company_id', selectedCompany);
        }

        const { data: logs, error } = await query;
        if (error) throw error;

        // Group by worker in application (since complex aggregation with joins is tricky in Supabase)
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
          const rate = log.workers?.hourly_rate || 0;
          acc[workerId].total_hours += log.hours_worked;
          acc[workerId].total_amount += log.hours_worked * rate;
          acc[workerId].item_count += 1;
          return acc;
        }, {});

        return Object.values(grouped || {}) as UnpaidSummary[];
      } else {
        // Aggregate by project
        let query = supabase
          .from('time_logs')
          .select(`
            project_id,
            projects!inner(project_name, company_id, companies(name)),
            workers!inner(hourly_rate),
            hours_worked
          `)
          .eq('payment_status', 'unpaid')
          .gte('date', startDate)
          .lte('date', endDate);

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
          const rate = log.workers?.hourly_rate || 0;
          acc[projectId].total_hours += log.hours_worked;
          acc[projectId].total_amount += log.hours_worked * rate;
          acc[projectId].item_count += 1;
          return acc;
        }, {});

        return Object.values(grouped || {}) as UnpaidSummary[];
      }
    },
  });

  // Fetch detail logs for selected worker/project
  const { data: detailLogs } = useQuery({
    queryKey: ['workforce-unpaid-details', selectedId, groupBy, dateRange, selectedCompany],
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
          notes,
          workers(name, hourly_rate),
          projects(project_name, companies(name))
        `)
        .eq('payment_status', 'unpaid')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

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

  // Fetch paid metrics for the same period
  const { data: paidMetrics } = useQuery({
    queryKey: ['workforce-paid-metrics', dateRange, selectedCompany],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      // Query paid time_logs
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

      // Count pay runs with payment_date in range and status = 'paid'
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

  // Calculate global unpaid totals
  const totalUnpaidHours = unpaidSummary?.reduce((sum, item) => sum + item.total_hours, 0) || 0;
  const totalUnpaidAmount = unpaidSummary?.reduce((sum, item) => sum + item.total_amount, 0) || 0;
  const totalUnpaidLogs = unpaidSummary?.reduce((sum, item) => sum + item.item_count, 0) || 0;
  const totalUnpaidWorkers = new Set(unpaidSummary?.map(item => item.id) || []).size;

  const selectedSummary = unpaidSummary?.find(s => s.id === selectedId);

  const handleViewDetails = (id: string) => {
    setSelectedId(id);
    setDrawerOpen(true);
  };

  const handleOpenPaymentDialog = (workerId?: string) => {
    setPayRunWorkerFilter(workerId);
    setPayRunDialogOpen(true);
  };

  const handlePayRunSuccess = () => {
    // Reset state and close drawer
    setPayRunDialogOpen(false);
    setPayRunWorkerFilter(undefined);
    setDrawerOpen(false);
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

      {/* Summary Stats - 6 Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* UNPAID METRICS */}
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
            <p className="text-2xl font-bold text-blue-600">{totalUnpaidHours.toFixed(1)}h</p>
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

        {/* PAID METRICS */}
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

      {/* Unpaid Summary Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Unpaid Labor Summary</CardTitle>
            {unpaidSummary && unpaidSummary.length > 0 && (
              <Button onClick={() => handleOpenPaymentDialog()}>
                Create Payment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {unpaidSummary && unpaidSummary.length > 0 ? (
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
                {unpaidSummary.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.company_name}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{item.total_hours.toFixed(1)}h</TableCell>
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
                        {groupBy === 'worker' && (
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
              <p className="text-lg font-medium mb-2">All caught up!</p>
              <p className="text-sm">No unpaid labor for this period</p>
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

      {/* Details Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Unpaid Logs - {selectedSummary?.name}</SheetTitle>
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
                <h4 className="font-semibold">Individual Logs</h4>
                {detailLogs?.map((log: any) => {
                  const rate = log.workers?.hourly_rate || 0;
                  const amount = log.hours_worked * rate;
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
              {groupBy === 'worker' && (
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
