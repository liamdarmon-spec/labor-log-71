import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign } from 'lucide-react';

interface WorkerPaymentHistoryV2Props {
  workerId: string;
}

export function WorkerPaymentHistoryV2({ workerId }: WorkerPaymentHistoryV2Props) {
  // Get unpaid amount
  const { data: unpaidAmount, isLoading: isLoadingUnpaid } = useQuery({
    queryKey: ['worker-unpaid', workerId],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('daily_logs')
        .select('*, workers(hourly_rate)')
        .eq('worker_id', workerId)
        .eq('payment_status', 'unpaid');

      if (error) throw error;

      const total = (logs || []).reduce((sum, log: any) => {
        return sum + (log.hours_worked || 0) * (log.workers?.hourly_rate || 0);
      }, 0);

      return total;
    },
  });

  // Get payment history
  const { data: paymentHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['worker-payment-history', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labor_pay_run_items')
        .select(`
          *,
          pay_runs:labor_pay_runs(
            id,
            date_range_start,
            date_range_end,
            payment_method,
            status,
            created_at
          )
        `)
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoadingUnpaid || isLoadingHistory) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-6">
      {/* Unpaid Summary */}
      <Card className="border-orange-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-500" />
            Unpaid Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-600">
            ${(unpaidAmount || 0).toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Outstanding from unpaid time logs
          </p>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {!paymentHistory || paymentHistory.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payment history yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {new Date(item.pay_runs.date_range_start).toLocaleDateString()} -{' '}
                      {new Date(item.pay_runs.date_range_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{item.pay_runs.payment_method || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={item.pay_runs.status === 'paid' ? 'default' : 'secondary'}>
                        {item.pay_runs.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{item.hours || 0}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${(item.amount || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
