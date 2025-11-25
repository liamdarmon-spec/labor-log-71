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
    queryFn: async (): Promise<FinancialSummary> => {
      //
      // 1) COSTS LEDGER – single source of truth for AP
      //
      const { data: costsData, error: costsError } = await supabase
        .from('costs')
        .select('amount, status, category');

      if (costsError) throw costsError;

      const costs = costsData || [];

      let laborActual = 0;
      let laborUnpaid = 0;

      let subsActual = 0;
      let subsUnpaid = 0;

      let materialsActual = 0;
      let materialsUnpaid = 0;

      let otherActual = 0;
      let otherUnpaid = 0;

      costs.forEach((c: any) => {
        const amount = c.amount || 0;
        const isUnpaid = c.status === 'unpaid';

        switch (c.category) {
          case 'labor':
            laborActual += amount;
            if (isUnpaid) laborUnpaid += amount;
            break;
          case 'subs':
            subsActual += amount;
            if (isUnpaid) subsUnpaid += amount;
            break;
          case 'materials':
            materialsActual += amount;
            if (isUnpaid) materialsUnpaid += amount;
            break;
          default:
            // misc / equipment / other etc.
            otherActual += amount;
            if (isUnpaid) otherUnpaid += amount;
            break;
        }
      });

      const totalCosts = laborActual + subsActual + materialsActual + otherActual;

      //
      // 2) REVENUE – AR from invoices (not estimates)
      //
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('total_amount, status');

      if (invoicesError) throw invoicesError;

      const invoices = invoicesData || [];
      let revenue = 0;

      invoices.forEach((inv: any) => {
        if (inv.status !== 'void') {
          revenue += inv.total_amount || 0;
        }
      });

      //
      // 3) RETENTION – held vs released on subs
      //
      const { data: subInvoicesData, error: subInvError } = await supabase
        .from('sub_invoices')
        .select('retention_amount');

      if (subInvError) throw subInvError;

      const { data: subPaymentsData, error: subPayError } = await supabase
        .from('sub_payments')
        .select('retention_released');

      if (subPayError) throw subPayError;

      const totalRetentionHeld = (subInvoicesData || []).reduce(
        (sum: number, inv: any) => sum + (inv.retention_amount || 0),
        0
      );

      const totalRetentionReleased = (subPaymentsData || []).reduce(
        (sum: number, pay: any) => sum + (pay.retention_released || 0),
        0
      );

      const retentionHeld = totalRetentionHeld - totalRetentionReleased;

      //
      // 4) OUTSTANDING AP – what you owe out
      //
      const totalOutstanding = laborUnpaid + subsUnpaid + materialsUnpaid + otherUnpaid;

      const profit = revenue - totalCosts;

      return {
        revenue,
        profit,
        laborActual,
        laborUnpaid,
        subsActual,
        subsUnpaid,
        materialsActual,
        materialsUnpaid,
        retentionHeld,
        retentionPayable: retentionHeld, // same bucket for now
        totalOutstanding,
      };
    },
  });
}
