import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectBudgetLine {
  id: string;
  project_id: string;
  cost_code_id: string | null;
  category: 'labor' | 'subs' | 'materials' | 'other';
  description: string | null;
  budget_amount: number;
  budget_hours: number | null;
  is_allowance: boolean;
  source_estimate_id: string | null;
  cost_codes?: {
    code: string;
    name: string;
  } | null;
}

export interface BudgetLineWithActuals extends ProjectBudgetLine {
  actual_hours: number;
  actual_cost: number;
}

export function useProjectBudgetLines(projectId: string) {
  return useQuery({
    queryKey: ['project_budget_lines', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_budget_lines')
        .select(`
          *,
          cost_codes (code, name)
        `)
        .eq('project_id', projectId)
        .order('category')
        .order('cost_code_id');
      
      if (error) throw error;
      return data as ProjectBudgetLine[];
    },
  });
}

export function useBudgetLinesWithActuals(projectId: string) {
  return useQuery({
    queryKey: ['budget_lines_actuals', projectId],
    queryFn: async () => {
      // Get ALL budget lines (not just labor)
      const { data: budgetLines, error: budgetError } = await supabase
        .from('project_budget_lines')
        .select(`
          *,
          cost_codes (code, name)
        `)
        .eq('project_id', projectId)
        .order('category')
        .order('cost_code_id');
      
      if (budgetError) throw budgetError;

      // Get actuals from labor_actuals_by_cost_code view (only labor has actuals tracked for now)
      const { data: actuals, error: actualsError } = await supabase
        .from('labor_actuals_by_cost_code')
        .select('*')
        .eq('project_id', projectId);
      
      if (actualsError) throw actualsError;

      // Merge budget and actuals
      const actualsMap = new Map(
        actuals?.map(a => [a.cost_code_id, { hours: a.actual_hours || 0, cost: a.actual_cost || 0 }]) || []
      );

      return (budgetLines || []).map(line => ({
        ...line,
        // Only labor category has actuals tracked; others show 0
        actual_hours: line.category === 'labor' ? (actualsMap.get(line.cost_code_id)?.hours || 0) : 0,
        actual_cost: line.category === 'labor' ? (actualsMap.get(line.cost_code_id)?.cost || 0) : 0,
      })) as BudgetLineWithActuals[];
    },
  });
}
