// src/hooks/useUpdateBudgetLine.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UpdateBudgetLinePayload {
  id: string;
  description_internal?: string | null;
  description_client?: string | null;
  qty?: number;
  unit?: string | null;
  unit_cost?: number;
  line_type?: 'labor' | 'subs' | 'materials' | 'other' | null;
  scope_type?: 'base' | 'change_order' | 'allowance' | 'option';
  is_optional?: boolean;
  client_visible?: boolean;
}

export function useUpdateBudgetLine(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateBudgetLinePayload) => {
      const { id, ...fields } = payload;

      const { data, error } = await supabase
        .from('project_budget_lines')
        .update(fields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Refresh canonical structure + any other budget views
      queryClient.invalidateQueries({ queryKey: ['project-budget-structure', projectId] });
      queryClient.invalidateQueries({ queryKey: ['unified-project-budget', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-budget-ledger', projectId] });
    },
  });
}
