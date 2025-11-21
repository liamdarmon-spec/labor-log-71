import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, TrendingDown, Clock, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ProjectCostsProps {
  projectId: string;
}

interface ProjectCostData {
  project_id: string;
  project_name: string;
  labor_total_hours: number;
  labor_total_cost: number;
  labor_paid_hours: number;
  labor_paid_cost: number;
  labor_unpaid_hours: number;
  labor_unpaid_cost: number;
  last_paid_at: string | null;
  labor_budget: number;
  subs_budget: number;
  materials_budget: number;
  other_budget: number;
  labor_budget_variance: number;
  labor_budget_remaining: number;
}

interface WorkerCost {
  worker_id: string;
  worker_name: string;
  trade: string;
  total_hours: number;
  total_cost: number;
  paid_cost: number;
  unpaid_cost: number;
}

interface Payment {
  id: string;
  start_date: string;
  end_date: string;
  payment_date: string;
  paid_by: string;
  amount: number;
  project_cost: number;
  log_count: number;
}

interface UnpaidLog {
  log_id: string;
  date: string;
  worker_name: string;
  hours_worked: number;
  cost: number;
}

export const ProjectCosts = ({ projectId }: ProjectCostsProps) => {
  const [costData, setCostData] = useState<ProjectCostData | null>(null);
  const [workerCosts, setWorkerCosts] = useState<WorkerCost[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unpaidLogs, setUnpaidLogs] = useState<UnpaidLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  useEffect(() => {
    fetchCostData();
  }, [projectId]);

  useEffect(() => {
    if (costData) {
      fetchWorkerCosts();
      fetchPayments();
      fetchUnpaidLogs();
    }
  }, [projectId, dateRange, selectedWorker]);

  const fetchCostData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_costs_view')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error) throw error;
      setCostData(data);
    } catch (error) {
      console.error('Error fetching cost data:', error);
      toast.error('Failed to load cost data');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkerCosts = async () => {
    try {
      let query = supabase
        .from('daily_logs')
        .select(`
          worker_id,
          hours_worked,
          date,
          workers (
            name,
            trade,
            hourly_rate
          )
        `)
        .eq('project_id', projectId);

      // Apply date range filter
      if (dateRange === 'last30') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('date', format(thirtyDaysAgo, 'yyyy-MM-dd'));
      }

      // Apply worker filter
      if (selectedWorker !== 'all') {
        query = query.eq('worker_id', selectedWorker);
      }

      const { data: logs, error } = await query;
      if (error) throw error;

      // Get all payments to determine paid vs unpaid
      const { data: allPayments } = await supabase
        .from('payments')
        .select('start_date, end_date');

      // Group by worker
      const workerMap = new Map<string, WorkerCost>();
      
      logs?.forEach((log: any) => {
        const workerId = log.worker_id;
        const workerName = log.workers?.name || 'Unknown';
        const trade = log.workers?.trade || 'N/A';
        const hours = Number(log.hours_worked);
        const rate = Number(log.workers?.hourly_rate || 0);
        const cost = hours * rate;

        // Check if this log is paid
        const isPaid = allPayments?.some(p => 
          log.date >= p.start_date && log.date <= p.end_date
        ) || false;

        if (!workerMap.has(workerId)) {
          workerMap.set(workerId, {
            worker_id: workerId,
            worker_name: workerName,
            trade,
            total_hours: 0,
            total_cost: 0,
            paid_cost: 0,
            unpaid_cost: 0,
          });
        }

        const worker = workerMap.get(workerId)!;
        worker.total_hours += hours;
        worker.total_cost += cost;
        if (isPaid) {
          worker.paid_cost += cost;
        } else {
          worker.unpaid_cost += cost;
        }
      });

      setWorkerCosts(Array.from(workerMap.values()));
    } catch (error) {
      console.error('Error fetching worker costs:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data: allPayments, error } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (error) throw error;

      // For each payment, calculate how much of it applies to this project
      const paymentsWithProjectData = await Promise.all(
        (allPayments || []).map(async (payment) => {
          const { data: logs } = await supabase
            .from('daily_logs')
            .select(`
              id,
              hours_worked,
              workers (hourly_rate)
            `)
            .eq('project_id', projectId)
            .gte('date', payment.start_date)
            .lte('date', payment.end_date);

          const projectCost = logs?.reduce((sum, log: any) => {
            return sum + (Number(log.hours_worked) * Number(log.workers?.hourly_rate || 0));
          }, 0) || 0;

          return {
            id: payment.id,
            start_date: payment.start_date,
            end_date: payment.end_date,
            payment_date: payment.payment_date,
            paid_by: payment.paid_by,
            amount: Number(payment.amount),
            project_cost: projectCost,
            log_count: logs?.length || 0,
          };
        })
      );

      // Filter to only payments that have logs for this project
      setPayments(paymentsWithProjectData.filter(p => p.log_count > 0));
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchUnpaidLogs = async () => {
    try {
      // Get all payments
      const { data: allPayments } = await supabase
        .from('payments')
        .select('start_date, end_date');

      let query = supabase
        .from('daily_logs')
        .select(`
          id,
          date,
          hours_worked,
          workers (
            name,
            hourly_rate
          )
        `)
        .eq('project_id', projectId);

      // Apply date range filter
      if (dateRange === 'last30') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('date', format(thirtyDaysAgo, 'yyyy-MM-dd'));
      }

      const { data: logs, error } = await query;
      if (error) throw error;

      // Filter to unpaid logs
      const unpaid = logs?.filter((log: any) => {
        return !allPayments?.some(p => 
          log.date >= p.start_date && log.date <= p.end_date
        );
      }).map((log: any) => ({
        log_id: log.id,
        date: log.date,
        worker_name: log.workers?.name || 'Unknown',
        hours_worked: Number(log.hours_worked),
        cost: Number(log.hours_worked) * Number(log.workers?.hourly_rate || 0),
      })) || [];

      setUnpaidLogs(unpaid);
    } catch (error) {
      console.error('Error fetching unpaid logs:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!costData) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No cost data available</p>
        </CardContent>
      </Card>
    );
  }

  const varianceColor = costData.labor_budget_variance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-6">
      {/* Budget vs Actual Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Labor Budget
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${costData.labor_budget.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Labor Actual Cost
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${costData.labor_total_cost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {costData.labor_total_hours.toFixed(1)} hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              {costData.labor_budget_variance >= 0 ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
              Labor Variance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${varianceColor}`}>
              {costData.labor_budget_variance >= 0 ? 'Under' : 'Over'} by ${Math.abs(costData.labor_budget_variance).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ${costData.labor_budget_remaining.toFixed(2)} remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Paid vs Unpaid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              ${costData.labor_paid_cost.toFixed(2)} paid
            </p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
              ${costData.labor_unpaid_cost.toFixed(2)} unpaid
            </p>
            {costData.last_paid_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Last paid: {format(new Date(costData.last_paid_at), 'MMM d, yyyy')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Future budget placeholders */}
      {(costData.subs_budget > 0 || costData.materials_budget > 0 || costData.other_budget > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Additional Budgets (Coming Soon)</CardTitle>
            <CardDescription>
              These budget categories are set up but actual cost tracking will be available in a future update
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {costData.subs_budget > 0 && (
                <div>
                  <p className="text-muted-foreground">Subs Budget</p>
                  <p className="font-semibold">${costData.subs_budget.toFixed(2)}</p>
                </div>
              )}
              {costData.materials_budget > 0 && (
                <div>
                  <p className="text-muted-foreground">Materials Budget</p>
                  <p className="font-semibold">${costData.materials_budget.toFixed(2)}</p>
                </div>
              )}
              {costData.other_budget > 0 && (
                <div>
                  <p className="text-muted-foreground">Other Budget</p>
                  <p className="font-semibold">${costData.other_budget.toFixed(2)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Tabs */}
      <Tabs defaultValue="breakdown" className="w-full">
        <TabsList>
          <TabsTrigger value="breakdown">Labor Cost Breakdown</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="unpaid">Unpaid Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="last30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedWorker} onValueChange={setSelectedWorker}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All workers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All workers</SelectItem>
                {workerCosts.map((w) => (
                  <SelectItem key={w.worker_id} value={w.worker_id}>
                    {w.worker_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Worker breakdown table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Unpaid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workerCosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No labor costs for selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  workerCosts.map((worker) => (
                    <TableRow key={worker.worker_id}>
                      <TableCell className="font-medium">{worker.worker_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{worker.trade}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{worker.total_hours.toFixed(1)}h</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${worker.total_cost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400">
                        ${worker.paid_cost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-orange-600 dark:text-orange-400">
                        ${worker.unpaid_cost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payments Including This Project</CardTitle>
              <CardDescription>
                All payments that include labor logs from this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pay Period</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Paid By</TableHead>
                    <TableHead className="text-right">Project Cost</TableHead>
                    <TableHead className="text-right">Log Count</TableHead>
                    <TableHead className="text-right">Total Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No payments found for this project
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.start_date), 'MMM d')} - {format(new Date(payment.end_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>{format(new Date(payment.payment_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{payment.paid_by}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ${payment.project_cost.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{payment.log_count}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ${payment.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unpaid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unpaid Labor Logs</CardTitle>
              <CardDescription>
                Labor logs not included in any payment for the selected date range
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unpaidLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No unpaid logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    unpaidLogs.map((log) => (
                      <TableRow key={log.log_id}>
                        <TableCell>{format(new Date(log.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{log.worker_name}</TableCell>
                        <TableCell className="text-right">{log.hours_worked.toFixed(1)}h</TableCell>
                        <TableCell className="text-right font-semibold text-orange-600 dark:text-orange-400">
                          ${log.cost.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};