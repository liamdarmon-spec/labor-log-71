import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, CheckCircle, Clock, DollarSign, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function PayCenterTabV2() {
  const [activeTab, setActiveTab] = useState<'unlogged' | 'unpaid' | 'history'>('unpaid');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);
  const navigate = useNavigate();

  // Fetch companies
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      return data || [];
    },
  });

  // Fetch UNLOGGED schedules (past schedules with no time log)
  const { data: unloggedSchedules, isLoading: unloggedLoading } = useQuery({
    queryKey: ['unlogged-schedules', selectedCompany],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let query = supabase
        .from('scheduled_shifts')
        .select(`
          *,
          workers(name, trade, hourly_rate),
          projects(project_name, company_id, companies(name)),
          trades(name)
        `)
        .lt('scheduled_date', today.toISOString().split('T')[0])
        .is('converted_to_timelog', false);

      if (selectedCompany !== 'all') {
        query = query.eq('projects.company_id', selectedCompany);
      }

      const { data: schedules } = await query.order('scheduled_date', { ascending: false });
      
      // Filter out those that have time logs via schedule_id
      const schedulesWithLogs = await Promise.all(
        (schedules || []).map(async (schedule) => {
          const { data: log } = await supabase
            .from('daily_logs')
            .select('id')
            .eq('schedule_id', schedule.id)
            .maybeSingle();
          
          return log ? null : schedule;
        })
      );

      return schedulesWithLogs.filter(s => s !== null);
    },
    enabled: activeTab === 'unlogged',
  });

  // Fetch UNPAID time logs
  const { data: unpaidLogs, isLoading: unpaidLoading } = useQuery({
    queryKey: ['unpaid-logs', selectedCompany],
    queryFn: async () => {
      let query = supabase
        .from('daily_logs')
        .select(`
          *,
          workers(name, trade, hourly_rate),
          projects(project_name, company_id, companies(name)),
          trades(name)
        `)
        .eq('payment_status', 'unpaid');

      if (selectedCompany !== 'all') {
        query = query.eq('projects.company_id', selectedCompany);
      }

      const { data } = await query.order('date', { ascending: false });
      return data || [];
    },
    enabled: activeTab === 'unpaid',
  });

  // Fetch PAYMENT HISTORY
  const { data: paymentHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['payment-history', selectedCompany],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('*, companies(name)')
        .order('payment_date', { ascending: false });

      if (selectedCompany !== 'all') {
        query = query.eq('company_id', selectedCompany);
      }

      const { data: payments } = await query.limit(50);

      // For each payment, fetch related logs to get worker count
      const enriched = await Promise.all(
        (payments || []).map(async (payment) => {
          const { data: logs } = await supabase
            .from('daily_logs')
            .select('worker_id')
            .eq('payment_id', payment.id);

          const uniqueWorkers = new Set(logs?.map(l => l.worker_id)).size;

          return { ...payment, worker_count: uniqueWorkers };
        })
      );

      return enriched;
    },
    enabled: activeTab === 'history',
  });

  const handleConvertSelected = async () => {
    try {
      const { error } = await supabase
        .from('scheduled_shifts')
        .update({ converted_to_timelog: true })
        .in('id', selectedSchedules);

      if (error) throw error;

      toast.success(`Converted ${selectedSchedules.length} schedule(s) to time logs`);
      setSelectedSchedules([]);
    } catch (error) {
      console.error('Error converting:', error);
      toast.error('Failed to convert schedules');
    }
  };

  const handleCreatePaymentBatch = () => {
    if (selectedLogs.length === 0) {
      toast.error('Please select time logs to pay');
      return;
    }
    
    const params = new URLSearchParams({
      logs: selectedLogs.join(','),
    });
    navigate(`/financials/payments?${params.toString()}`);
  };

  const unloggedCount = unloggedSchedules?.length || 0;
  const unpaidCount = unpaidLogs?.length || 0;
  const unpaidAmount = unpaidLogs?.reduce((sum, log) => sum + (log.hours_worked * (log.workers?.hourly_rate || 0)), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Pay Center</h3>
        <p className="text-muted-foreground">
          Complete loop: Unlogged → Unpaid → Payment History
        </p>
      </div>

      {/* Company Filter */}
      <Card>
        <CardContent className="p-4">
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
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Unlogged</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{unloggedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Unpaid Logs</span>
            </div>
            <p className="text-3xl font-bold text-orange-600">{unpaidCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Unpaid Amount</span>
            </div>
            <p className="text-3xl font-bold">${unpaidAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* 3 Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="unlogged">
            Unlogged {unloggedCount > 0 && `(${unloggedCount})`}
          </TabsTrigger>
          <TabsTrigger value="unpaid">
            Unpaid {unpaidCount > 0 && `(${unpaidCount})`}
          </TabsTrigger>
          <TabsTrigger value="history">
            History
          </TabsTrigger>
        </TabsList>

        {/* UNLOGGED TAB */}
        <TabsContent value="unlogged" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Unlogged Schedules</CardTitle>
                {selectedSchedules.length > 0 && (
                  <Button onClick={handleConvertSelected}>
                    Convert Selected ({selectedSchedules.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {unloggedLoading ? (
                <Skeleton className="h-96" />
              ) : unloggedSchedules && unloggedSchedules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Worker</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unloggedSchedules.map((schedule: any) => (
                      <TableRow key={schedule.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedSchedules.includes(schedule.id)}
                            onCheckedChange={(checked) => {
                              setSelectedSchedules(prev =>
                                checked
                                  ? [...prev, schedule.id]
                                  : prev.filter(id => id !== schedule.id)
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>{format(new Date(schedule.scheduled_date), 'MMM d')}</TableCell>
                        <TableCell className="font-medium">{schedule.workers?.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{schedule.projects?.companies?.name}</Badge>
                        </TableCell>
                        <TableCell>{schedule.projects?.project_name}</TableCell>
                        <TableCell className="text-right">{schedule.scheduled_hours}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">All schedules logged!</p>
                  <p className="text-sm text-muted-foreground mt-1">No unlogged past schedules</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* UNPAID TAB */}
        <TabsContent value="unpaid" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Unpaid Time Logs</CardTitle>
                {selectedLogs.length > 0 && (
                  <Button onClick={handleCreatePaymentBatch}>
                    Create Payment ({selectedLogs.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {unpaidLoading ? (
                <Skeleton className="h-96" />
              ) : unpaidLogs && unpaidLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Worker</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidLogs.map((log: any) => {
                      const amount = log.hours_worked * (log.workers?.hourly_rate || 0);
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedLogs.includes(log.id)}
                              onCheckedChange={(checked) => {
                                setSelectedLogs(prev =>
                                  checked
                                    ? [...prev, log.id]
                                    : prev.filter(id => id !== log.id)
                                );
                              }}
                            />
                          </TableCell>
                          <TableCell>{format(new Date(log.date), 'MMM d')}</TableCell>
                          <TableCell className="font-medium">{log.workers?.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.projects?.companies?.name}</Badge>
                          </TableCell>
                          <TableCell>{log.projects?.project_name}</TableCell>
                          <TableCell className="text-right">{log.hours_worked}h</TableCell>
                          <TableCell className="text-right font-semibold">${amount.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">All caught up!</p>
                  <p className="text-sm text-muted-foreground mt-1">No unpaid time logs</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <Skeleton className="h-96" />
              ) : paymentHistory && paymentHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Date Range</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Workers</TableHead>
                      <TableHead>Paid By</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment: any) => (
                      <TableRow key={payment.id} className="cursor-pointer hover:bg-accent">
                        <TableCell>{format(new Date(payment.payment_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(payment.start_date), 'MMM d')} - {format(new Date(payment.end_date), 'MMM d')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.companies?.name || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {payment.worker_count}
                          </div>
                        </TableCell>
                        <TableCell>{payment.paid_by}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ${payment.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No payment history</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
