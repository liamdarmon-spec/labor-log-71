import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { KPICard } from '@/components/KPICard';
import { DollarSign, Users, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type DateRange = 'this-week' | 'last-week' | 'custom';

export function PayCenterTab() {
  const [dateRange, setDateRange] = useState<DateRange>('this-week');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(true);
  const navigate = useNavigate();

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    if (dateRange === 'this-week') {
      return { start: startOfWeek(now), end: endOfWeek(now) };
    } else if (dateRange === 'last-week') {
      const lastWeek = subWeeks(now, 1);
      return { start: startOfWeek(lastWeek), end: endOfWeek(lastWeek) };
    }
    return { start: startOfWeek(now), end: endOfWeek(now) };
  };

  const { start: startDate, end: endDate } = getDateRange();

  // Fetch companies
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      return data || [];
    },
  });

  // Fetch summary statistics
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['pay-center-summary', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'), selectedCompany],
    queryFn: async () => {
      let query = supabase
        .from('daily_logs')
        .select('worker_id, hours_worked, payment_status, workers(hourly_rate), projects(company_id)')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      if (selectedCompany !== 'all') {
        query = query.eq('projects.company_id', selectedCompany);
      }

      const { data: logs } = await query;

      const unpaidLogs = logs?.filter(l => l.payment_status === 'unpaid') || [];
      const uniqueUnpaidWorkers = new Set(unpaidLogs.map(l => l.worker_id)).size;
      const unpaidHours = unpaidLogs.reduce((sum, l) => sum + l.hours_worked, 0);
      const unpaidAmount = unpaidLogs.reduce(
        (sum, l) => sum + (l.hours_worked * (l.workers?.hourly_rate || 0)),
        0
      );

      // Fetch pending reimbursements
      const { data: reimbursements } = await supabase
        .from('payments')
        .select('amount, reimbursement_status')
        .eq('reimbursement_status', 'pending');

      const pendingReimbursementCount = reimbursements?.length || 0;
      const pendingReimbursementAmount = reimbursements?.reduce((sum, r) => sum + r.amount, 0) || 0;

      return {
        uniqueUnpaidWorkers,
        unpaidHours,
        unpaidAmount,
        pendingReimbursementCount,
        pendingReimbursementAmount,
      };
    },
  });

  // Fetch payable workers
  const { data: payableWorkers, isLoading: workersLoading } = useQuery({
    queryKey: ['payable-workers', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'), selectedCompany, showUnpaidOnly],
    queryFn: async () => {
      let query = supabase
        .from('daily_logs')
        .select('worker_id, hours_worked, date, payment_status, workers(name, trade, hourly_rate), projects(company_id, companies(name))')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      if (showUnpaidOnly) {
        query = query.eq('payment_status', 'unpaid');
      }

      if (selectedCompany !== 'all') {
        query = query.eq('projects.company_id', selectedCompany);
      }

      const { data: logs } = await query;

      // Group by worker and company
      const grouped = new Map<string, any>();

      logs?.forEach((log: any) => {
        const key = `${log.worker_id}-${log.projects?.company_id}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            worker_id: log.worker_id,
            worker_name: log.workers?.name,
            trade: log.workers?.trade,
            hourly_rate: log.workers?.hourly_rate,
            company_id: log.projects?.company_id,
            company_name: log.projects?.companies?.name,
            total_hours: 0,
            total_amount: 0,
            first_date: log.date,
            last_date: log.date,
            log_count: 0,
          });
        }

        const entry = grouped.get(key)!;
        entry.total_hours += log.hours_worked;
        entry.total_amount += log.hours_worked * (log.workers?.hourly_rate || 0);
        entry.log_count++;
        if (log.date < entry.first_date) entry.first_date = log.date;
        if (log.date > entry.last_date) entry.last_date = log.date;
      });

      return Array.from(grouped.values()).sort((a, b) => b.total_amount - a.total_amount);
    },
  });

  // Fetch pending reimbursements
  const { data: reimbursements, isLoading: reimbursementsLoading } = useQuery({
    queryKey: ['pending-reimbursements'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('id, payment_date, amount, paid_by, companies(name)')
        .eq('reimbursement_status', 'pending')
        .order('payment_date', { ascending: false });

      return data || [];
    },
  });

  const handleCreatePaymentBatch = (workerId: string, companyId: string, startDate: string, endDate: string, amount: number) => {
    const params = new URLSearchParams({
      worker_id: workerId,
      company: companyId,
      startDate,
      endDate,
      amount: amount.toString(),
    });
    navigate(`/payments?${params.toString()}`);
  };

  const handleMarkReimbursed = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          reimbursement_status: 'reimbursed',
          reimbursement_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', paymentId);

      if (error) throw error;
      toast.success('Payment marked as reimbursed');
    } catch (error) {
      console.error('Error marking as reimbursed:', error);
      toast.error('Failed to update reimbursement status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold mb-2">Pay Center</h3>
        <p className="text-muted-foreground">
          Manage labor payments, unpaid queue, and reimbursements
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies?.map(company => (
                  <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={showUnpaidOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowUnpaidOnly(!showUnpaidOnly)}
            >
              Show Unpaid Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Unpaid Workers"
            value={summary.uniqueUnpaidWorkers}
            icon={Users}
          />
          <KPICard
            title="Unpaid Hours"
            value={`${summary.unpaidHours.toFixed(1)}h`}
            icon={Clock}
          />
          <KPICard
            title="Unpaid Amount"
            value={`$${summary.unpaidAmount.toLocaleString()}`}
            icon={DollarSign}
          />
          <KPICard
            title="Pending Reimbursements"
            value={summary.pendingReimbursementCount}
            subtitle={`$${summary.pendingReimbursementAmount.toLocaleString()}`}
            icon={AlertTriangle}
          />
        </div>
      )}

      {/* Payable Workers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payable Workers</CardTitle>
        </CardHeader>
        <CardContent>
          {workersLoading ? (
            <Skeleton className="h-96" />
          ) : payableWorkers && payableWorkers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payableWorkers.map((worker, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{worker.worker_name}</TableCell>
                    <TableCell>{worker.trade}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{worker.company_name}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(worker.first_date), 'MMM d')} - {format(new Date(worker.last_date), 'MMM d')}
                    </TableCell>
                    <TableCell className="text-right">{worker.total_hours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${worker.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleCreatePaymentBatch(
                          worker.worker_id,
                          worker.company_id,
                          worker.first_date,
                          worker.last_date,
                          worker.total_amount
                        )}
                      >
                        Create Payment
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm mt-1">No unpaid workers in this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reimbursements */}
      {reimbursements && reimbursements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Pending Reimbursements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reimbursementsLoading ? (
              <Skeleton className="h-48" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Paid By</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reimbursements.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(new Date(payment.payment_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{payment.companies?.name || 'N/A'}</TableCell>
                      <TableCell>{payment.paid_by}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${payment.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                          Pending
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkReimbursed(payment.id)}
                        >
                          Mark Reimbursed
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
