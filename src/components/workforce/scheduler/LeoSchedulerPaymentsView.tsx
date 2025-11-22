import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { DatePickerWithPresets } from '@/components/ui/date-picker-with-presets';
import { Label } from '@/components/ui/label';
import { DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LeoSchedulerPaymentsViewProps {
  companyFilter: string;
}

export function LeoSchedulerPaymentsView({ companyFilter }: LeoSchedulerPaymentsViewProps) {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date>(startOfWeek(subWeeks(new Date(), 1)));
  const [endDate, setEndDate] = useState<Date>(endOfWeek(new Date()));
  const [selectedCompany, setSelectedCompany] = useState<string>(companyFilter);

  // Fetch companies
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      return data || [];
    },
  });

  // Fetch unpaid logs grouped by worker
  const { data: workerPaymentSummary, isLoading } = useQuery({
    queryKey: [
      'leo-payment-summary',
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
      selectedCompany
    ],
    queryFn: async () => {
      let query = supabase
        .from('daily_logs')
        .select(`
          *,
          workers(id, name, trade, hourly_rate),
          projects(project_name, company_id, companies(name))
        `)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      const { data: logs } = await query;
      if (!logs) return [];

      // Apply company filter
      let filtered = logs;
      if (selectedCompany !== 'all') {
        filtered = filtered.filter(log => log.projects?.company_id === selectedCompany);
      }

      // Group by worker
      const workerMap = new Map<string, {
        worker: any;
        gaHours: number;
        gaCost: number;
        formaHours: number;
        formaCost: number;
        totalUnpaidHours: number;
        totalUnpaidCost: number;
        status: 'unpaid' | 'partial' | 'paid';
      }>();

      filtered.forEach(log => {
        const workerId = log.worker_id;
        const workerName = log.workers?.name || 'Unknown';
        const rate = log.workers?.hourly_rate || 0;
        const hours = log.hours_worked;
        const cost = hours * rate;
        const companyName = log.projects?.companies?.name || '';
        const isPaid = log.payment_status === 'paid';

        if (!workerMap.has(workerId)) {
          workerMap.set(workerId, {
            worker: log.workers,
            gaHours: 0,
            gaCost: 0,
            formaHours: 0,
            formaCost: 0,
            totalUnpaidHours: 0,
            totalUnpaidCost: 0,
            status: 'paid'
          });
        }

        const entry = workerMap.get(workerId)!;

        // Categorize by company
        if (companyName === 'GA') {
          entry.gaHours += hours;
          entry.gaCost += cost;
        } else if (companyName === 'Forma') {
          entry.formaHours += hours;
          entry.formaCost += cost;
        }

        // Track unpaid
        if (!isPaid) {
          entry.totalUnpaidHours += hours;
          entry.totalUnpaidCost += cost;
          entry.status = entry.totalUnpaidCost > 0 ? 'unpaid' : entry.status;
        } else if (entry.totalUnpaidHours > 0) {
          entry.status = 'partial';
        }
      });

      return Array.from(workerMap.values());
    },
  });

  // Calculate overall summary
  const totalUnpaidHours = workerPaymentSummary?.reduce((sum, w) => sum + w.totalUnpaidHours, 0) || 0;
  const totalUnpaidCost = workerPaymentSummary?.reduce((sum, w) => sum + w.totalUnpaidCost, 0) || 0;
  const totalPaidHours = workerPaymentSummary?.reduce((sum, w) => {
    const totalHours = w.gaHours + w.formaHours;
    return sum + (totalHours - w.totalUnpaidHours);
  }, 0) || 0;
  const totalPaidCost = workerPaymentSummary?.reduce((sum, w) => {
    const totalCost = w.gaCost + w.formaCost;
    return sum + (totalCost - w.totalUnpaidCost);
  }, 0) || 0;

  const handlePayPeriod = () => {
    // Navigate to the existing payment flow with pre-filled date range
    navigate(`/financials/payments?start=${format(startDate, 'yyyy-MM-dd')}&end=${format(endDate, 'yyyy-MM-dd')}&company=${selectedCompany}`);
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-4">
      {/* Period Selector */}
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
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Unpaid Hours</p>
            <p className="text-2xl font-bold text-red-600">{totalUnpaidHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Unpaid Cost</p>
            <p className="text-2xl font-bold text-red-600">${totalUnpaidCost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Paid Hours</p>
            <p className="text-2xl font-bold text-green-600">{totalPaidHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Paid Cost</p>
            <p className="text-2xl font-bold text-green-600">${totalPaidCost.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Worker Payment Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Worker Payment Breakdown</CardTitle>
            <Button onClick={handlePayPeriod}>
              <DollarSign className="h-4 w-4 mr-2" />
              Start Pay Run
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {workerPaymentSummary && workerPaymentSummary.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead className="text-right">GA Hours</TableHead>
                  <TableHead className="text-right">GA Cost</TableHead>
                  <TableHead className="text-right">Forma Hours</TableHead>
                  <TableHead className="text-right">Forma Cost</TableHead>
                  <TableHead className="text-right">Total Unpaid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workerPaymentSummary.map((item) => (
                  <TableRow key={item.worker.id}>
                    <TableCell className="font-medium">{item.worker.name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.worker.trade}</TableCell>
                    <TableCell className="text-right">{item.gaHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right">${item.gaCost.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{item.formaHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right">${item.formaCost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      ${item.totalUnpaidCost.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {item.status === 'unpaid' && (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Unpaid</Badge>
                      )}
                      {item.status === 'partial' && (
                        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Partially Paid</Badge>
                      )}
                      {item.status === 'paid' && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No payment data for the selected period</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
