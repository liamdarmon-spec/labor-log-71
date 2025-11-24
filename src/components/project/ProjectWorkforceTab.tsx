import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectWorkforceTabProps {
  projectId: string;
}

export function ProjectWorkforceTab({ projectId }: ProjectWorkforceTabProps) {
  const [dateRange, setDateRange] = useState({
    start: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
    end: format(endOfWeek(new Date()), 'yyyy-MM-dd'),
  });

  const { data: workforceData, isLoading } = useQuery({
    queryKey: ['project-workforce', projectId, dateRange],
    queryFn: async () => {
      // Get all logs for this project in date range
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('worker_id, hours_worked, payment_status, paid_amount')
        .eq('project_id', projectId)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);

      // Get all scheduled shifts for this project in date range
      const { data: schedule } = await supabase
        .from('work_schedules')
        .select('worker_id, scheduled_hours')
        .eq('project_id', projectId)
        .gte('scheduled_date', dateRange.start)
        .lte('scheduled_date', dateRange.end);

      // Get unique worker IDs
      const workerIds = [...new Set([
        ...(logs?.map(l => l.worker_id) || []),
        ...(schedule?.map(s => s.worker_id) || []),
      ])];

      if (workerIds.length === 0) return [];

      // Get worker details
      const { data: workers } = await supabase
        .from('workers')
        .select('id, name, trade, hourly_rate')
        .in('id', workerIds);

      // Aggregate data per worker
      return workers?.map(worker => {
        const workerLogs = logs?.filter(l => l.worker_id === worker.id) || [];
        const workerSchedule = schedule?.filter(s => s.worker_id === worker.id) || [];

        const scheduledHours = workerSchedule.reduce((sum, s) => sum + (s.scheduled_hours || 0), 0);
        const loggedHours = workerLogs.reduce((sum, l) => sum + (l.hours_worked || 0), 0);
        const cost = loggedHours * worker.hourly_rate;

        const unpaidLogs = workerLogs.filter(l => l.payment_status === 'unpaid');
        const unpaidAmount = unpaidLogs.reduce((sum, l) => sum + (l.hours_worked * worker.hourly_rate), 0);

        const paidLogs = workerLogs.filter(l => l.payment_status === 'paid');
        const paymentStatus = unpaidLogs.length === 0 && workerLogs.length > 0
          ? 'paid'
          : unpaidLogs.length === workerLogs.length
          ? 'unpaid'
          : 'partial';

        return {
          worker,
          scheduledHours,
          loggedHours,
          cost,
          unpaidAmount,
          paymentStatus,
        };
      }) || [];
    },
  });

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">All Paid</Badge>;
      case 'unpaid':
        return <Badge variant="destructive">Unpaid</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Partially Paid</Badge>;
      default:
        return <Badge variant="outline">N/A</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Workforce Activity</CardTitle>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {format(new Date(dateRange.start), 'MMM d')} - {format(new Date(dateRange.end), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {workforceData && workforceData.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead className="text-right">Scheduled (hrs)</TableHead>
                <TableHead className="text-right">Logged (hrs)</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Unpaid</TableHead>
                <TableHead>Payment Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workforceData.map((item: any) => (
                <TableRow key={item.worker.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{item.worker.name}</TableCell>
                  <TableCell>{item.worker.trade}</TableCell>
                  <TableCell className="text-right">{item.scheduledHours.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{item.loggedHours.toFixed(1)}</TableCell>
                  <TableCell className="text-right">${item.cost.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {item.unpaidAmount > 0 ? (
                      <span className="text-orange-600 font-medium">
                        ${item.unpaidAmount.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">$0</span>
                    )}
                  </TableCell>
                  <TableCell>{getPaymentStatusBadge(item.paymentStatus)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No workforce activity in this period</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
