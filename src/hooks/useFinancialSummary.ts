import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FinancialSummary {
  revenue: number;
  profit: number;
  laborActual: number;
  laborUnpaid: number;
  subsActual: number;
  subsUnpaid: number;
  materialsActual: number;
  materialsUnpaid: number;
  retentionHeld: number;
  retentionPayable: number;
  totalOutstanding: number;
}

export function useFinancialSummary() {
  return useQuery({
    queryKey: ['financial-summary'],
    queryFn: async () => {
      // -------------------------------------------------------------------
      // 1) LABOR FROM CANONICAL time_logs
      // -------------------------------------------------------------------
      const { data: timeLogs, error: timeLogsError } = await supabase
        .from('time_logs')
        .select('labor_cost, payment_status');

      if (timeLogsError) throw timeLogsError;

      let laborActual = 0;
      let laborUnpaid = 0;

      (timeLogs || []).forEach((log: any) => {
        const cost = log.labor_cost || 0;
        laborActual += cost;
        if (log.payment_status === 'unpaid') {
          laborUnpaid += cost;
        }
      });

      // -------------------------------------------------------------------
      // 2) NON-LABOR COSTS FROM CANONICAL costs TABLE
      // -------------------------------------------------------------------
      const { data: costs, error: costsError } = await supabase
        .from('costs')
        .select('amount, category, status');

      if (costsError) throw costsError;

      let subsActual = 0;
      let subsUnpaid = 0;
      let materialsActual = 0;
      let materialsUnpaid = 0;
      let otherActual = 0;
      let otherUnpaid = 0;

      (costs || []).forEach((c: any) => {
        const amount = c.amount || 0;
        const isUnpaid = c.status === 'unpaid';

        switch (c.category) {
          case 'subs':
            subsActual += amount;
            if (isUnpaid) subsUnpaid += amount;
            break;
          case 'materials':
            materialsActual += amount;
            if (isUnpaid) materialsUnpaid += amount;
            break;
          default:
            // misc / other / anything else
            otherActual += amount;
            if (isUnpaid) otherUnpaid += amount;
            break;
        }
      });

      // -------------------------------------------------------------------
      // 3) RETENTION: STILL FROM sub_invoices + sub_payments (OK FOR NOW)
      // -------------------------------------------------------------------
      const { data: allSubInvoices, error: invoicesError } = await supabase
        .from('sub_invoices')
        .select('retention_amount');

      if (invoicesError) throw invoicesError;

      const { data: retentionPayments, error: retentionError } = await supabase
        .from('sub_payments')
        .select('retention_released');

      if (retentionError) throw retentionError;

      const totalRetentionHeld = (allSubInvoices || []).reduce(
        (sum: number, inv: any) => sum + (inv.retention_amount || 0),
        0
      );

      const totalRetentionReleased = (retentionPayments || []).reduce(
        (sum: number, pay: any) => sum + (pay.retention_released || 0),
        0
      );

      const retentionHeld = totalRetentionHeld - totalRetentionReleased;

      // -------------------------------------------------------------------
      // 4) REVENUE FROM ACCEPTED ESTIMATES
      // -------------------------------------------------------------------
      const { data: estimates, error: estimatesError } = await supabase
        .from('estimates')
        .select('total_amount')
        .eq('status', 'accepted');

      if (estimatesError) throw estimatesError;

      const revenue = (estimates || []).reduce(
        (sum: number, est: any) => sum + (est.total_amount || 0),
        0
      );

      // -------------------------------------------------------------------
      // 5) TOP-LINE PROFIT + OUTSTANDING
      // -------------------------------------------------------------------
      const totalCosts =
        laborActual + subsActual + materialsActual + otherActual;

      const profit = revenue - totalCosts;

      const totalOutstanding =
        laborUnpaid + subsUnpaid + materialsUnpaid + otherUnpaid;

      const summary: FinancialSummary = {
        revenue,
        profit,
        laborActual,
        laborUnpaid,
        subsActual,
        subsUnpaid,
        materialsActual,
        materialsUnpaid,
        retentionHeld,
        retentionPayable: retentionHeld,
        totalOutstanding,
      };

      return summary;
    },
  });
}
