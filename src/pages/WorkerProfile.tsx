import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, DollarSign, Briefcase, Calendar } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { WorkerPaymentHistoryLink } from '@/components/workforce/WorkerPaymentHistoryLink';

const WorkerProfile = () => {
  const { workerId } = useParams<{ workerId: string }>();
  const navigate = useNavigate();

  const { data: workerData, isLoading } = useQuery({
    queryKey: ['worker-profile', workerId],
    queryFn: async () => {
      if (!workerId) return null;

      // Fetch worker details
      const { data: worker } = await supabase
        .from('workers')
        .select('*, trades(name)')
        .eq('id', workerId)
        .single();

      if (!worker) return null;

      // Fetch this month's hours
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthEnd = new Date();
      monthEnd.setMonth(monthEnd.getMonth() + 1, 0);

      const { data: monthLogs } = await supabase
        .from('daily_logs')
        .select('hours_worked')
        .eq('worker_id', workerId)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'));

      const monthHours = monthLogs?.reduce((sum, log) => sum + (log.hours_worked || 0), 0) || 0;

      // Fetch unpaid amount
      const { data: unpaidLogs } = await supabase
        .from('daily_logs')
        .select('hours_worked')
        .eq('worker_id', workerId)
        .eq('payment_status', 'unpaid');

      const unpaidAmount = unpaidLogs?.reduce(
        (sum, log) => sum + ((log.hours_worked || 0) * worker.hourly_rate),
        0
      ) || 0;

      // Fetch active projects
      const { data: activeProjects } = await supabase
        .from('daily_logs')
        .select('project_id, projects(project_name)')
        .eq('worker_id', workerId)
        .gte('date', format(monthStart, 'yyyy-MM-dd'));

      const uniqueProjects = [...new Set(activeProjects?.map(p => p.projects?.project_name))].filter(Boolean);

      // Fetch recent time logs
      const { data: recentLogs } = await supabase
        .from('daily_logs')
        .select('*, projects(project_name)')
        .eq('worker_id', workerId)
        .order('date', { ascending: false })
        .limit(30);

      // Fetch pay history
      const { data: payments } = await supabase
        .from('payments')
        .select('*, daily_logs!inner(worker_id, hours_worked)')
        .eq('daily_logs.worker_id', workerId)
        .order('payment_date', { ascending: false })
        .limit(20);

      // Calculate average daily hours
      const avgDailyHours = monthLogs && monthLogs.length > 0
        ? monthHours / monthLogs.length
        : 0;

      return {
        worker,
        monthHours,
        unpaidAmount,
        activeProjects: uniqueProjects,
        avgDailyHours,
        recentLogs,
        payments,
      };
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate('/workforce')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roster
          </Button>
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

  if (!workerData || !workerData.worker) {
    return (
      <Layout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate('/workforce')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roster
          </Button>
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Worker not found</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const { worker, monthHours, unpaidAmount, activeProjects, avgDailyHours, recentLogs, payments } = workerData;

  return (
    <Layout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/workforce')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Roster
        </Button>

        {/* Worker Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                  {worker.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h1 className="text-3xl font-bold">{worker.name}</h1>
                    <p className="text-lg text-muted-foreground">{worker.trades?.name || worker.trade}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={worker.active ? 'default' : 'secondary'}>
                      {worker.active ? 'Active' : 'Inactive'}
                    </Badge>
                    <WorkerPaymentHistoryLink workerId={workerId!} />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Hourly Rate</p>
                    <p className="text-xl font-bold">${worker.hourly_rate}/hr</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-xl font-bold">{monthHours.toFixed(1)}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Daily Hours</p>
                    <p className="text-xl font-bold">{avgDailyHours.toFixed(1)}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unpaid</p>
                    <p className="text-xl font-bold text-orange-600">${unpaidAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="logs">Time Logs</TabsTrigger>
            <TabsTrigger value="payments">Pay History</TabsTrigger>
            <TabsTrigger value="costs">Cost Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Active Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeProjects.length > 0 ? (
                    <ul className="space-y-2">
                      {activeProjects.map((project, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          <span>{project}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm">No active projects</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Hours (Month)</span>
                      <span className="font-semibold">{monthHours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Earnings (Month)</span>
                      <span className="font-semibold">${(monthHours * worker.hourly_rate).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-3">
                      <span className="text-orange-600">Unpaid Balance</span>
                      <span className="font-bold text-orange-600">${unpaidAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Worker Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-12">
                  Worker-specific schedule calendar coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Recent Time Logs</CardTitle>
              </CardHeader>
              <CardContent>
                {recentLogs && recentLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell>{format(new Date(log.date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{log.projects?.project_name}</TableCell>
                          <TableCell className="text-right">{log.hours_worked}h</TableCell>
                          <TableCell className="text-right">
                            ${((log.hours_worked || 0) * worker.hourly_rate).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.payment_status === 'paid' ? 'default' : 'secondary'}>
                              {log.payment_status || 'unpaid'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-12">No time logs yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {payments && payments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Paid By</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map(payment => (
                        <TableRow key={payment.id}>
                          <TableCell>{format(new Date(payment.payment_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{payment.paid_by}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(payment.start_date), 'MMM d')} - {format(new Date(payment.end_date), 'MMM d')}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ${payment.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={payment.reimbursement_status === 'reimbursed' ? 'default' : 'secondary'}>
                              {payment.reimbursement_status || 'standard'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-12">No payment history yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs">
            <Card>
              <CardHeader>
                <CardTitle>Cost Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-12">
                  Cost breakdown by project coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default WorkerProfile;
