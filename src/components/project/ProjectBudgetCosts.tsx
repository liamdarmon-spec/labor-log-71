import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, TrendingDown, Edit, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ProjectCostData {
  labor_total_hours: number;
  labor_total_cost: number;
  labor_paid_cost: number;
  labor_unpaid_cost: number;
  last_paid_at: string | null;
  labor_budget: number;
  subs_budget: number;
  materials_budget: number;
  other_budget: number;
  labor_budget_variance: number;
}

interface WorkerCost {
  worker_name: string;
  total_hours: number;
  total_cost: number;
}

interface Payment {
  payment_date: string;
  paid_by: string;
  project_cost: number;
}

export const ProjectBudgetCosts = ({ projectId }: { projectId: string }) => {
  const [costData, setCostData] = useState<ProjectCostData | null>(null);
  const [workerCosts, setWorkerCosts] = useState<WorkerCost[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    labor_budget: '0',
    subs_budget: '0',
    materials_budget: '0',
    other_budget: '0',
  });

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch cost data
      const { data: costs } = await supabase
        .from('project_costs_view')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (costs) {
        setCostData(costs);
        setBudgetForm({
          labor_budget: costs.labor_budget.toString(),
          subs_budget: costs.subs_budget.toString(),
          materials_budget: costs.materials_budget.toString(),
          other_budget: costs.other_budget.toString(),
        });
      }

      // Fetch worker costs
      const { data: logs } = await supabase
        .from('daily_logs')
        .select(`
          hours_worked,
          workers (name, hourly_rate)
        `)
        .eq('project_id', projectId);

      const workerMap = new Map<string, WorkerCost>();
      logs?.forEach((log: any) => {
        const name = log.workers?.name || 'Unknown';
        const hours = Number(log.hours_worked);
        const cost = hours * Number(log.workers?.hourly_rate || 0);

        if (!workerMap.has(name)) {
          workerMap.set(name, { worker_name: name, total_hours: 0, total_cost: 0 });
        }
        const worker = workerMap.get(name)!;
        worker.total_hours += hours;
        worker.total_cost += cost;
      });
      setWorkerCosts(Array.from(workerMap.values()));

      // Fetch payments
      const { data: allPayments } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });

      const paymentsWithProjectData = await Promise.all(
        (allPayments || []).map(async (payment) => {
          const { data: paymentLogs } = await supabase
            .from('daily_logs')
            .select('hours_worked, workers(hourly_rate)')
            .eq('project_id', projectId)
            .gte('date', payment.start_date)
            .lte('date', payment.end_date);

          const projectCost = paymentLogs?.reduce((sum, log: any) => {
            return sum + (Number(log.hours_worked) * Number(log.workers?.hourly_rate || 0));
          }, 0) || 0;

          return {
            payment_date: payment.payment_date,
            paid_by: payment.paid_by,
            project_cost: projectCost,
          };
        })
      );

      setPayments(paymentsWithProjectData.filter(p => p.project_cost > 0));
    } catch (error) {
      console.error('Error fetching cost data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('project_budgets')
        .upsert({
          project_id: projectId,
          labor_budget: parseFloat(budgetForm.labor_budget),
          subs_budget: parseFloat(budgetForm.subs_budget),
          materials_budget: parseFloat(budgetForm.materials_budget),
          other_budget: parseFloat(budgetForm.other_budget),
        }, {
          onConflict: 'project_id'
        });

      if (error) throw error;
      
      toast.success('Budget updated successfully');
      setIsBudgetDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('Failed to update budget');
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader><div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div></CardHeader>
            <CardContent><div className="h-8 bg-muted rounded animate-pulse"></div></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!costData) return null;

  const laborVarianceColor = costData.labor_budget_variance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Budget & Cost Analysis</h3>
        <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Project Budget</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleBudgetSubmit} className="space-y-4">
              <div>
                <Label htmlFor="labor_budget">Labor Budget ($)</Label>
                <Input
                  id="labor_budget"
                  type="number"
                  step="0.01"
                  min="0"
                  value={budgetForm.labor_budget}
                  onChange={(e) => setBudgetForm({ ...budgetForm, labor_budget: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="subs_budget">Subcontractors Budget ($)</Label>
                <Input
                  id="subs_budget"
                  type="number"
                  step="0.01"
                  min="0"
                  value={budgetForm.subs_budget}
                  onChange={(e) => setBudgetForm({ ...budgetForm, subs_budget: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="materials_budget">Materials Budget ($)</Label>
                <Input
                  id="materials_budget"
                  type="number"
                  step="0.01"
                  min="0"
                  value={budgetForm.materials_budget}
                  onChange={(e) => setBudgetForm({ ...budgetForm, materials_budget: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="other_budget">Other Budget ($)</Label>
                <Input
                  id="other_budget"
                  type="number"
                  step="0.01"
                  min="0"
                  value={budgetForm.other_budget}
                  onChange={(e) => setBudgetForm({ ...budgetForm, other_budget: e.target.value })}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsBudgetDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Budget</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              Labor Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${costData.labor_budget.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              Labor Actual Cost
            </CardTitle>
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
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              {costData.labor_budget_variance >= 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              Labor Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${laborVarianceColor}`}>
              {costData.labor_budget_variance >= 0 ? 'Under' : 'Over'} by ${Math.abs(costData.labor_budget_variance).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Labor Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Labor Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead className="text-right">Total Hours</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workerCosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No labor costs recorded
                  </TableCell>
                </TableRow>
              ) : (
                workerCosts.map((worker, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      {worker.worker_name}
                    </TableCell>
                    <TableCell className="text-right">{worker.total_hours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${worker.total_cost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Payments Affecting This Project</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Date</TableHead>
                <TableHead>Paid By</TableHead>
                <TableHead className="text-right">Project Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No payments found for this project
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{format(new Date(payment.payment_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{payment.paid_by}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${payment.project_cost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};