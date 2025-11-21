import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useUnifiedProjectBudget, BudgetCategory } from '@/hooks/useUnifiedProjectBudget';
import { BudgetSummaryCards } from './BudgetSummaryCards';
import { CategorySummaryCards } from './CategorySummaryCards';
import { UnifiedCostCodeLedger } from './UnifiedCostCodeLedger';
import { LaborDetailTable } from './LaborDetailTable';
import { UnpaidLaborBills } from './UnpaidLaborBills';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface Payment {
  payment_date: string;
  paid_by: string;
  project_cost: number;
}

export const ProjectBudgetCosts = ({ projectId }: { projectId: string }) => {
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | 'all'>('all');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  
  const { data: budgetData, isLoading, refetch } = useUnifiedProjectBudget(projectId);

  useEffect(() => {
    fetchPayments();
    
    // Listen for budget updates from estimates
    const handleBudgetUpdate = () => {
      refetch();
    };
    window.addEventListener('budget-updated', handleBudgetUpdate);
    return () => window.removeEventListener('budget-updated', handleBudgetUpdate);
  }, [projectId, refetch]);

  const fetchPayments = async () => {
    try {
      setPaymentsLoading(true);
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
      console.error('Error fetching payments:', error);
    } finally {
      setPaymentsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!budgetData) return null;

  return (
    <div className="space-y-6">
      {/* Top Summary Row - Total Budget, Actual, Variance */}
      <BudgetSummaryCards summary={budgetData.summary} />

      {/* Category Summary Row - Labor, Subs, Materials, Misc */}
      <CategorySummaryCards
        summary={budgetData.summary}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />

      {/* Cost Code Ledger */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Cost Code Ledger</h3>
        <UnifiedCostCodeLedger
          costCodeLines={budgetData.costCodeLines}
          selectedCategory={selectedCategory}
        />
      </div>

      {/* Unpaid Labor as "Open Bills" */}
      <UnpaidLaborBills projectId={projectId} />

      {/* Labor Detail Table */}
      <LaborDetailTable projectId={projectId} />

      {/* Payments Section - Cash flow tracking only */}
      <Card>
        <CardHeader>
          <CardTitle>Payments Affecting This Project</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Payment records for cash flow tracking (does not affect budget totals)
          </p>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <Skeleton className="h-32" />
          ) : (
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
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};