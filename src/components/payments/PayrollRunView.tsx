import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Users, DollarSign, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { safeFormat, formatShortDate } from '@/lib/utils/safeDate';

interface PaymentWithBreakdown {
  id: string;
  start_date: string;
  end_date: string;
  paid_by: string;
  payment_date: string;
  amount: number;
  total_hours: number;
  worker_count: number;
  workers: {
    worker_id: string;
    worker_name: string;
    worker_trade: string;
    total_hours: number;
    labor_cost: number;
  }[];
}

interface PayrollRunViewProps {
  paymentId: string;
  onClose: () => void;
}

export function PayrollRunView({ paymentId, onClose }: PayrollRunViewProps) {
  const [payment, setPayment] = useState<PaymentWithBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentDetails();
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);

      // Get payment details
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (paymentError) throw paymentError;

      // Get worker breakdown from payment_labor_summary view
      const { data: workerData, error: workerError } = await supabase
        .from('payment_labor_summary')
        .select('*')
        .eq('payment_id', paymentId)
        .order('labor_cost', { ascending: false });

      if (workerError) throw workerError;

      // Group by worker
      const workerMap = new Map<string, any>();
      workerData?.forEach((entry: any) => {
        if (!workerMap.has(entry.worker_id)) {
          workerMap.set(entry.worker_id, {
            worker_id: entry.worker_id,
            worker_name: entry.worker_name,
            worker_trade: entry.worker_trade,
            total_hours: 0,
            labor_cost: 0
          });
        }
        const worker = workerMap.get(entry.worker_id);
        worker.total_hours += Number(entry.total_hours);
        worker.labor_cost += Number(entry.labor_cost);
      });

      const workers = Array.from(workerMap.values());
      const totalHours = workers.reduce((sum, w) => sum + w.total_hours, 0);

      setPayment({
        ...paymentData,
        total_hours: totalHours,
        worker_count: workers.length,
        workers
      });
    } catch (error) {
      console.error('Error fetching payment details:', error);
      toast.error('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!payment) return;

    const csvRows = [
      ['Worker', 'Trade', 'Hours', 'Cost'],
      ...payment.workers.map(w => [
        w.worker_name,
        w.worker_trade,
        w.total_hours.toFixed(2),
        w.labor_cost.toFixed(2)
      ]),
      ['', '', '', ''],
      ['Total', '', payment.total_hours.toFixed(2), payment.workers.reduce((sum, w) => sum + w.labor_cost, 0).toFixed(2)]
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${safeFormat(payment.payment_date, 'yyyy-MM-dd', 'unknown-date')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('CSV exported successfully');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center text-muted-foreground">Loading payment details...</div>
        </CardContent>
      </Card>
    );
  }

  if (!payment) return null;

  const totalLaborCost = payment.workers.reduce((sum, w) => sum + w.labor_cost, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payroll Run</h2>
          <p className="text-muted-foreground">
            {safeFormat(payment.start_date, 'MMM d')} - {formatShortDate(payment.end_date)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Workers Paid</p>
                <p className="text-3xl font-bold mt-1">{payment.worker_count}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Hours</p>
                <p className="text-3xl font-bold mt-1">{payment.total_hours.toFixed(1)}h</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Labor Cost</p>
                <p className="text-3xl font-bold mt-1">${totalLaborCost.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Worker Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Worker Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Labor Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payment.workers.map((worker) => (
                <TableRow key={worker.worker_id}>
                  <TableCell className="font-medium">{worker.worker_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{worker.worker_trade}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{worker.total_hours.toFixed(1)}h</TableCell>
                  <TableCell className="text-right font-semibold">
                    ${worker.labor_cost.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right">{payment.total_hours.toFixed(1)}h</TableCell>
                <TableCell className="text-right">${totalLaborCost.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid By</span>
            <span className="font-medium">{payment.paid_by}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment Date</span>
            <span className="font-medium">{formatShortDate(payment.payment_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Payment</span>
            <span className="font-medium text-lg">${payment.amount.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
