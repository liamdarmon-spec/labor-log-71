import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectStats {
  totalLaborHours: number;
  totalLaborCost: number;
  unpaidLaborAmount: number;
  budgetTotal: number;
  actualTotal: number;
  variance: number;
}

export function useProjectStats(projectId: string) {
  return useQuery({
    queryKey: ['project-stats', projectId],
    queryFn: async () => {
      // Get budget data
      const { data: budget } = await supabase
        .from('project_budgets')
        .select('labor_budget, subs_budget, materials_budget, other_budget')
        .eq('project_id', projectId)
        .single();

      // Get labor actuals
      const { data: laborLogs } = await supabase
        .from('daily_logs')
        .select('hours_worked, worker_id, paid_amount, payment_status')
        .eq('project_id', projectId);

      // Get worker rates for cost calculation
      const workerIds = [...new Set(laborLogs?.map(log => log.worker_id) || [])];
      const { data: workers } = await supabase
        .from('workers')
        .select('id, hourly_rate')
        .in('id', workerIds);

      const workerRateMap = new Map(workers?.map(w => [w.id, w.hourly_rate]) || []);

      const totalLaborHours = laborLogs?.reduce((sum, log) => sum + (log.hours_worked || 0), 0) || 0;
      const totalLaborCost = laborLogs?.reduce((sum, log) => {
        const rate = workerRateMap.get(log.worker_id) || 0;
        return sum + ((log.hours_worked || 0) * rate);
      }, 0) || 0;

      const unpaidLaborAmount = laborLogs?.reduce((sum, log) => {
        if (log.payment_status === 'unpaid') {
          const rate = workerRateMap.get(log.worker_id) || 0;
          return sum + ((log.hours_worked || 0) * rate);
        }
        return sum;
      }, 0) || 0;

      const budgetTotal = (budget?.labor_budget || 0) + 
                         (budget?.subs_budget || 0) + 
                         (budget?.materials_budget || 0) + 
                         (budget?.other_budget || 0);

      const actualTotal = totalLaborCost; // For now, just labor. Will expand in future phases
      const variance = budgetTotal - actualTotal;

      return {
        totalLaborHours,
        totalLaborCost,
        unpaidLaborAmount,
        budgetTotal,
        actualTotal,
        variance,
      } as ProjectStats;
    },
  });
}
