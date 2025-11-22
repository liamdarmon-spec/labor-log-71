import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { format, subWeeks } from 'date-fns';
import { DatePickerWithPresets } from '@/components/ui/date-picker-with-presets';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface LeoSchedulerHistoryViewProps {
  companyFilter: string;
  projectFilter: string;
}

export function LeoSchedulerHistoryView({ companyFilter, projectFilter }: LeoSchedulerHistoryViewProps) {
  const [startDate, setStartDate] = useState<Date>(subWeeks(new Date(), 2));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);

  // Fetch workers for filter
  const { data: workers } = useQuery({
    queryKey: ['workers-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('workers')
        .select('id, name')
        .eq('active', true)
        .order('name');
      return data || [];
    },
  });

  // Fetch projects for filter
  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, project_name')
        .eq('status', 'Active')
        .order('project_name');
      return data || [];
    },
  });

  // Fetch time logs
  const { data: logs, isLoading } = useQuery({
    queryKey: [
      'leo-history-logs',
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
      companyFilter,
      projectFilter,
      workerFilter,
      showUnpaidOnly
    ],
    queryFn: async () => {
      let query = supabase
        .from('daily_logs')
        .select(`
          *,
          workers(name, trade, hourly_rate),
          projects(project_name, company_id, companies(name)),
          cost_codes(code, name),
          payments(id, paid_by, payment_date)
        `)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      const { data } = await query;
      if (!data) return [];

      // Apply filters
      let filtered = data;

      if (companyFilter !== 'all') {
        filtered = filtered.filter(log => log.projects?.company_id === companyFilter);
      }

      if (projectFilter !== 'all') {
        filtered = filtered.filter(log => log.project_id === projectFilter);
      }

      if (workerFilter !== 'all') {
        filtered = filtered.filter(log => log.worker_id === workerFilter);
      }

      if (showUnpaidOnly) {
        filtered = filtered.filter(log => log.payment_status === 'unpaid');
      }

      return filtered;
    },
  });

  // Calculate summary
  const totalHours = logs?.reduce((sum, log) => sum + log.hours_worked, 0) || 0;
  const totalCost = logs?.reduce((sum, log) => {
    const rate = log.workers?.hourly_rate || 0;
    return sum + (log.hours_worked * rate);
  }, 0) || 0;
  const unpaidHours = logs?.filter(log => log.payment_status === 'unpaid')
    .reduce((sum, log) => sum + log.hours_worked, 0) || 0;
  const unpaidCost = logs?.filter(log => log.payment_status === 'unpaid')
    .reduce((sum, log) => {
      const rate = log.workers?.hourly_rate || 0;
      return sum + (log.hours_worked * rate);
    }, 0) || 0;

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Unpaid</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>From:</Label>
              <DatePickerWithPresets date={startDate} onDateChange={setStartDate} />
            </div>
            <div className="flex items-center gap-2">
              <Label>To:</Label>
              <DatePickerWithPresets date={endDate} onDateChange={setEndDate} />
            </div>

            <Select value={workerFilter} onValueChange={setWorkerFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Workers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workers</SelectItem>
                {workers?.map(worker => (
                  <SelectItem key={worker.id} value={worker.id}>{worker.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={() => {}}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Switch
                id="unpaid-only"
                checked={showUnpaidOnly}
                onCheckedChange={setShowUnpaidOnly}
              />
              <Label htmlFor="unpaid-only">Show unpaid only</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Hours</p>
            <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Cost</p>
            <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Unpaid Hours</p>
            <p className="text-2xl font-bold text-red-600">{unpaidHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Unpaid Cost</p>
            <p className="text-2xl font-bold text-red-600">${unpaidCost.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Work History</CardTitle>
        </CardHeader>
        <CardContent>
          {logs && logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead>Cost Code</TableHead>
                  <TableHead>Pay Status</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="font-medium">{log.workers?.name}</TableCell>
                    <TableCell>{log.projects?.project_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.projects?.companies?.name}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{log.hours_worked}h</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.cost_codes ? `${log.cost_codes.code} - ${log.cost_codes.name}` : '—'}
                    </TableCell>
                    <TableCell>{getPaymentStatusBadge(log.payment_status || 'unpaid')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.payments ? (
                        <div>
                          <div>{log.payments.paid_by}</div>
                          <div className="text-xs">{format(new Date(log.payments.payment_date), 'MMM d')}</div>
                        </div>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No work history found for the selected period</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
