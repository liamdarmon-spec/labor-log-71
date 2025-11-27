import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProjectStats {
  budgetTotal: number;
  actualTotal: number;
  laborActual: number;
  totalLaborHours: number;
  unpaidLaborAmount: number;
  subsActual: number;
  materialsActual: number;
  miscActual: number;
}

export function useProjectStats(projectId: string) {
  return useQuery<ProjectStats>({
    queryKey: ['project-stats', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      // ---- BUDGET ----
      const { data: budgetRow, error: budgetError } = await supabase
        .from('project_budgets')
        .select('labor_budget, subs_budget, materials_budget, other_budget')
        .eq('project_id', projectId)
        .maybeSingle();

      if (budgetError) throw budgetError;

      const budgetTotal =
        (budgetRow?.labor_budget || 0) +
        (budgetRow?.subs_budget || 0) +
        (budgetRow?.materials_budget || 0) +
        (budgetRow?.other_budget || 0);

      // ---- LABOR (time_logs – canonical) ----
      const { data: laborLogs, error: laborError } = await supabase
        .from('time_logs')
        .select('hours_worked, labor_cost, hourly_rate, payment_status')
        .eq('project_id', projectId);

      if (laborError) throw laborError;

      const totalLaborHours =
        laborLogs?.reduce(
          (sum, log) => sum + Number(log.hours_worked || 0),
          0
        ) || 0;

      const laborActual =
        laborLogs?.reduce((sum, log) => {
          const cost =
            log.labor_cost ??
            (Number(log.hours_worked || 0) * Number(log.hourly_rate || 0));
          return sum + cost;
        }, 0) || 0;

      const unpaidLaborAmount =
        laborLogs?.reduce((sum, log) => {
          if (log.payment_status !== 'paid') {
            const cost =
              log.labor_cost ??
              (Number(log.hours_worked || 0) * Number(log.hourly_rate || 0));
            return sum + cost;
          }
          return sum;
        }, 0) || 0;

      // ---- NON-LABOR COSTS (costs – canonical) ----
      const { data: allCosts, error: costsError } = await supabase
        .from('costs')
        .select('amount, category')
        .eq('project_id', projectId);

      if (costsError) throw costsError;

      let subsActual = 0;
      let materialsActual = 0;
      let miscActual = 0;

      (allCosts || []).forEach((c) => {
        const amount = Number(c.amount || 0);
        const cat = (c.category || '').toLowerCase();

        if (cat === 'subs') subsActual += amount;
        else if (cat === 'materials') materialsActual += amount;
        else if (
          cat === 'misc' ||
          cat === 'equipment' ||
          cat === 'other' ||
          !cat
        ) {
          miscActual += amount;
        }
      });

      const actualTotal =
        laborActual + subsActual + materialsActual + miscActual;

      return {
        budgetTotal,
        actualTotal,
        laborActual,
        totalLaborHours,
        unpaidLaborAmount,
        subsActual,
        materialsActual,
        miscActual,
      };
    },
  });
}
