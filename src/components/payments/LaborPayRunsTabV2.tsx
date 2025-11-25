/**
 * LABOR PAY RUN SYSTEM - DATA FLOW
 * 
 * Canonical labor payment flow using existing triggers:
 * 
 * 1. SOURCE OF TRUTH: time_logs table
 *    - hours_worked, labor_cost, payment_status ('unpaid' | 'paid')
 *    - Generated from work_schedules or created manually
 * 
 * 2. CREATE PAY RUN:
 *    - Query time_logs WHERE payment_status = 'unpaid'
 *    - User selects date range, company, worker filters
 *    - Creates labor_pay_runs record (status = 'draft')
 *    - Creates labor_pay_run_items for each selected time_log
 * 
 * 3. MARK AS PAID:
 *    - Update labor_pay_runs.status = 'paid'
 *    - Trigger: mark_time_logs_paid_on_pay_run() automatically updates:
 *      - time_logs.payment_status = 'paid'
 *      - time_logs.paid_amount = labor_cost
 * 
 * 4. EXCLUSION LOGIC:
 *    - Unpaid logs query excludes time_logs already linked to non-deleted pay runs
 *    - Prevents double-payment and ensures idempotency
 * 
 * DO NOT modify time_logs.payment_status directly in UI.
 * ONLY update labor_pay_runs.status and let trigger handle the rest.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, DollarSign } from 'lucide-react';
import { CreatePayRunDialog } from '@/components/workforce/CreatePayRunDialog';
import { PayRunDetailDrawer } from '@/components/workforce/PayRunDetailDrawer';

export function LaborPayRunsTabV2() {
  const [payRunDialogOpen, setPayRunDialogOpen] = useState(false);
  const [detailPayRunId, setDetailPayRunId] = useState<string | null>(null);

  const { data: payRuns, isLoading } = useQuery({
    queryKey: ['labor-pay-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labor_pay_runs')
        .select(`
          *,
          payee_company:companies!labor_pay_runs_payee_company_id_fkey(name)
        `)
        .order('date_range_end', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!payRuns || payRuns.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pay Runs</h3>
          <p className="text-muted-foreground mb-4">
            Create your first labor pay run from unpaid time logs.
          </p>
          <Button onClick={() => setPayRunDialogOpen(true)}>
            Create Pay Run
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'scheduled':
        return 'secondary';
      case 'draft':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle>Labor Pay Runs</CardTitle>
          <Button onClick={() => setPayRunDialogOpen(true)} size="sm" className="w-full sm:w-auto">
            Create Pay Run
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date Range</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payRuns.map((run: any) => (
              <TableRow key={run.id}>
                <TableCell>
                  {new Date(run.date_range_start).toLocaleDateString()} -{' '}
                  {new Date(run.date_range_end).toLocaleDateString()}
                </TableCell>
                <TableCell>{run.payee_company?.name || 'N/A'}</TableCell>
                <TableCell>{run.payment_method || 'Not specified'}</TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(run.status)}>
                    {run.status || 'draft'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${(run.total_amount || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDetailPayRunId(run.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Pay Run Creation Dialog */}
      <CreatePayRunDialog
        open={payRunDialogOpen}
        onOpenChange={setPayRunDialogOpen}
        onSuccess={() => setPayRunDialogOpen(false)}
      />

      {/* Pay Run Detail Drawer */}
      {detailPayRunId && (
        <PayRunDetailDrawer
          payRunId={detailPayRunId}
          open={!!detailPayRunId}
          onOpenChange={(open) => !open && setDetailPayRunId(null)}
          onSuccess={() => {}}
        />
      )}
    </Card>
  );
}
