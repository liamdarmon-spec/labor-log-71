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
      // Labor calculations
      const { data: allLogs } = await supabase
        .from('daily_logs')
        .select('hours_worked, payment_status, workers(hourly_rate)');

      const laborActual = (allLogs || []).reduce((sum, log: any) => 
        sum + (log.hours_worked * (log.workers?.hourly_rate || 0)), 0
      );

      const laborUnpaid = (allLogs || [])
        .filter((log: any) => log.payment_status === 'unpaid')
        .reduce((sum, log: any) => sum + (log.hours_worked * (log.workers?.hourly_rate || 0)), 0);

      // Sub calculations
      const { data: subPayments } = await supabase
        .from('sub_payments')
        .select('amount_paid, retention_released');

      const subsActual = (subPayments || []).reduce((sum, pay: any) => sum + pay.amount_paid, 0);

      const { data: unpaidSubInvoices } = await supabase
        .from('sub_invoices')
        .select('total, retention_amount')
        .eq('payment_status', 'unpaid');

      const subsUnpaid = (unpaidSubInvoices || []).reduce((sum, inv: any) => {
        const payable = inv.total - (inv.retention_amount || 0);
        return sum + payable;
      }, 0);

      const { data: allSubInvoices } = await supabase
        .from('sub_invoices')
        .select('retention_amount');

      const { data: retentionReleased } = await supabase
        .from('sub_payments')
        .select('retention_released');

      const totalRetentionHeld = (allSubInvoices || []).reduce((sum, inv: any) => 
        sum + (inv.retention_amount || 0), 0
      );

      const totalRetentionReleased = (retentionReleased || []).reduce((sum, pay: any) => 
        sum + (pay.retention_released || 0), 0
      );

      const retentionHeld = totalRetentionHeld - totalRetentionReleased;

      // Material calculations
      const { data: materials } = await supabase
        .from('material_receipts')
        .select('total');

      const materialsActual = (materials || []).reduce((sum, m: any) => sum + m.total, 0);

      // Revenue from estimates marked as accepted
      const { data: estimates } = await supabase
        .from('estimates')
        .select('total_amount')
        .eq('status', 'accepted');

      const revenue = (estimates || []).reduce((sum, est: any) => sum + (est.total_amount || 0), 0);

      const totalCosts = laborActual + subsActual + materialsActual;
      const profit = revenue - totalCosts;
      const totalOutstanding = laborUnpaid + subsUnpaid;

      const summary: FinancialSummary = {
        revenue,
        profit,
        laborActual,
        laborUnpaid,
        subsActual,
        subsUnpaid,
        materialsActual,
        materialsUnpaid: 0, // Not tracking unpaid materials yet
        retentionHeld,
        retentionPayable: retentionHeld, // Same for now
        totalOutstanding,
      };

      return summary;
    },
  });
}
