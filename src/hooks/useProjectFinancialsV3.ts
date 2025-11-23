import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Project-level financials that match the global Job Costing calculations.
 * This ensures consistency between /projects/:id and /financials Job Costing views.
 */
export function useProjectFinancialsV3(projectId: string) {
  return useQuery({
    queryKey: ['project-financials-v3', projectId],
    queryFn: async () => {
      // Fetch budget
      const { data: budget } = await supabase
        .from('project_budgets')
        .select('labor_budget, subs_budget, materials_budget, other_budget')
        .eq('project_id', projectId)
        .single();

      const totalBudget = (budget?.labor_budget || 0) + 
                         (budget?.subs_budget || 0) + 
                         (budget?.materials_budget || 0) + 
                         (budget?.other_budget || 0);

      // Fetch labor actuals (from daily_logs)
      const { data: laborLogs } = await supabase
        .from('daily_logs')
        .select('hours_worked, workers!inner(hourly_rate)')
        .eq('project_id', projectId);

      const laborActual = (laborLogs || []).reduce((sum, log: any) => 
        sum + (log.hours_worked * (log.workers?.hourly_rate || 0)), 0
      );

      // Fetch non-labor costs
      const { data: costs } = await supabase
        .from('costs')
        .select('category, amount, status')
        .eq('project_id', projectId);

      const subsActual = (costs || [])
        .filter(c => c.category === 'subs')
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      
      const materialsActual = (costs || [])
        .filter(c => c.category === 'materials')
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      
      const miscActual = (costs || [])
        .filter(c => c.category === 'misc')
        .reduce((sum, c) => sum + (c.amount || 0), 0);

      // Unpaid costs breakdown
      const subsUnpaid = (costs || [])
        .filter(c => c.category === 'subs' && c.status === 'unpaid')
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      
      const materialsUnpaid = (costs || [])
        .filter(c => c.category === 'materials' && c.status === 'unpaid')
        .reduce((sum, c) => sum + (c.amount || 0), 0);

      // Fetch invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, status, retention_amount')
        .eq('project_id', projectId)
        .neq('status', 'void');

      const billed = (invoices || []).reduce((sum, i) => sum + (i.total_amount || 0), 0);
      const retentionHeld = (invoices || []).reduce((sum, i) => sum + (i.retention_amount || 0), 0);

      const totalActual = laborActual + subsActual + materialsActual + miscActual;
      const variance = totalBudget - totalActual;
      const margin = billed - totalActual;

      return {
        budget: {
          labor: budget?.labor_budget || 0,
          subs: budget?.subs_budget || 0,
          materials: budget?.materials_budget || 0,
          other: budget?.other_budget || 0,
          total: totalBudget,
        },
        actuals: {
          labor: laborActual,
          subs: subsActual,
          materials: materialsActual,
          misc: miscActual,
          total: totalActual,
        },
        unpaid: {
          subs: subsUnpaid,
          materials: materialsUnpaid,
        },
        invoicing: {
          billed,
          retentionHeld,
        },
        variance,
        margin,
        percentComplete: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0,
      };
    },
  });
}
