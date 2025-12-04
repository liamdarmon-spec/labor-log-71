import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectOverviewStats {
  totalBudget: number;
  actualCost: number;
  grossProfit: number;
  profitMargin: number | null;
  tasksOpen: number;
  tasksOverdue: number;
}

export function useProjectOverviewStats(projectId: string) {
  return useQuery<ProjectOverviewStats>({
    queryKey: ['project-overview-stats', projectId],
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
    queryFn: async () => {
      // Fetch all data in parallel for performance
      const [budgetRes, laborRes, costsRes, tasksRes] = await Promise.all([
        // Budget totals
        supabase
          .from('project_budgets')
          .select('labor_budget, subs_budget, materials_budget, other_budget')
          .eq('project_id', projectId)
          .maybeSingle(),
        // Labor actuals from time_logs
        supabase
          .from('time_logs')
          .select('labor_cost')
          .eq('project_id', projectId),
        // Non-labor costs
        supabase
          .from('costs')
          .select('amount, category')
          .eq('project_id', projectId),
        // Tasks
        supabase
          .from('project_todos')
          .select('id, status, due_date')
          .eq('project_id', projectId),
      ]);

      // Calculate total budget
      const totalBudget = 
        (budgetRes.data?.labor_budget || 0) +
        (budgetRes.data?.subs_budget || 0) +
        (budgetRes.data?.materials_budget || 0) +
        (budgetRes.data?.other_budget || 0);

      // Calculate labor actuals
      const laborActual = laborRes.data?.reduce((sum, l) => sum + (l.labor_cost || 0), 0) || 0;

      // Calculate non-labor actuals by category
      const subsActual = costsRes.data?.filter(c => c.category === 'subs').reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
      const materialsActual = costsRes.data?.filter(c => c.category === 'materials').reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
      const otherActual = costsRes.data?.filter(c => 
        c.category === 'misc' || c.category === 'equipment' || c.category === 'other' || !c.category
      ).reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      // Total actual cost
      const actualCost = laborActual + subsActual + materialsActual + otherActual;

      // Gross profit
      const grossProfit = totalBudget - actualCost;

      // Profit margin (null if no budget)
      const profitMargin = totalBudget > 0 ? (grossProfit / totalBudget) * 100 : null;

      // Task counts
      const today = new Date().toISOString().split('T')[0];
      const tasksOpen = tasksRes.data?.filter(t => t.status === 'open' || t.status === 'in_progress').length || 0;
      const tasksOverdue = tasksRes.data?.filter(t => 
        t.due_date && t.due_date < today && t.status !== 'done'
      ).length || 0;

      return {
        totalBudget,
        actualCost,
        grossProfit,
        profitMargin,
        tasksOpen,
        tasksOverdue,
      };
    },
  });
}
