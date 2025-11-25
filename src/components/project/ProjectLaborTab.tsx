import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface ProjectLaborTabProps {
  projectId: string;
}

type DateRangeFilter = 'last7' | 'last30' | 'last90' | 'custom';
type PaymentStatusFilter = 'all' | 'paid' | 'unpaid';

export function ProjectLaborTab({ projectId }: ProjectLaborTabProps) {
  const [dateRange, setDateRange] = useState<DateRangeFilter>('last30');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('all');

  const getDateRangeDates = () => {
    const end = new Date();
    let start = new Date();
    
    switch (dateRange) {
      case 'last7':
        start = subDays(end, 7);
        break;
      case 'last30':
        start = subDays(end, 30);
        break;
      case 'last90':
        start = subDays(end, 90);
        break;
      default:
        start = subDays(end, 30);
    }
    
    return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
  };

  const dates = getDateRangeDates();

  // Fetch time logs for this project with pay run info
  const { data: timeLogs, isLoading } = useQuery({
    queryKey: ['project-time-logs', projectId, dates.start, dates.end, paymentStatusFilter],
    queryFn: async () => {
      let query = supabase
        .from('time_logs')
        .select(`
          *,
          worker:workers(name),
          trade:trades(name),
          cost_code:cost_codes(code, name),
          pay_run_item:labor_pay_run_items(
            pay_run_id,
            pay_run:labor_pay_runs(id, payment_date, payment_method)
          )
        `)
        .eq('project_id', projectId)
        .gte('date', dates.start)
        .lte('date', dates.end)
        .order('date', { ascending: false });

      if (paymentStatusFilter !== 'all') {
        query = query.eq('payment_status', paymentStatusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Calculate summary stats
  const stats = timeLogs ? {
    totalHours: timeLogs.reduce((sum, log) => sum + (log.hours_worked ?? 0), 0),
    totalCost: timeLogs.reduce((sum, log) => sum + (log.labor_cost ?? 0), 0),
    unpaidHours: timeLogs.filter(log => log.payment_status === 'unpaid').reduce((sum, log) => sum + (log.hours_worked ?? 0), 0),
    unpaidCost: timeLogs.filter(log => log.payment_status === 'unpaid').reduce((sum, log) => sum + (log.labor_cost ?? 0), 0),
    paidHours: timeLogs.filter(log => log.payment_status === 'paid').reduce((sum, log) => sum + (log.hours_worked ?? 0), 0),
    paidCost: timeLogs.filter(log => log.payment_status === 'paid').reduce((sum, log) => sum + (log.labor_cost ?? 0), 0),
  } : null;

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeFilter)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last7">Last 7 days</SelectItem>
            <SelectItem value="last30">Last 30 days</SelectItem>
            <SelectItem value="last90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={paymentStatusFilter} onValueChange={(v) => setPaymentStatusFilter(v as PaymentStatusFilter)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="unpaid">Unpaid Only</SelectItem>
            <SelectItem value="paid">Paid Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Labor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{stats.totalHours.toFixed(1)}h</div>
                  <div className="text-xs text-muted-foreground">${stats.totalCost.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unpaid Labor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.unpaidHours.toFixed(1)}h</div>
                  <div className="text-xs text-muted-foreground">${stats.unpaidCost.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Paid Labor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.paidHours.toFixed(1)}h</div>
                  <div className="text-xs text-muted-foreground">${stats.paidCost.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Time Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{timeLogs?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">entries</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Time Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Time Log Details</CardTitle>
        </CardHeader>
        <CardContent>
          {!timeLogs || timeLogs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No time logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead>Cost Code</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeLogs.map((log: any) => {
                    const hours = log.hours_worked ?? 0;
                    const cost = log.labor_cost ?? 0;
                    const rate = hours > 0 ? cost / hours : 0;
                    
                    return (
                      <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          {format(new Date(log.date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {log.worker?.name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {log.trade?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.cost_code ? `${log.cost_code.code} - ${log.cost_code.name}` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          {hours.toFixed(1)}h
                        </TableCell>
                        <TableCell className="text-right">
                          ${rate.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${cost.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={log.payment_status === 'paid' ? 'default' : 'outline'}>
                              {log.payment_status}
                            </Badge>
                            {log.payment_status === 'paid' && log.pay_run_item?.[0]?.pay_run?.id && (
                              <span className="text-xs text-muted-foreground">
                                Pay Run #{log.pay_run_item[0].pay_run.id.slice(0, 8)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
