/**
 * Hook to get the active budget for a project
 * 
 * Enforces ONE active budget per project rule:
 * - Returns the budget with status = 'active'
 * - If no active budget exists, returns null
 * - If multiple active budgets exist (shouldn't happen), returns the first one
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectBudgetHeader } from './useProjectBudgetStructure';

export function useActiveBudget(projectId: string | undefined) {
  return useQuery<ProjectBudgetHeader | null>({
    queryKey: ['active-budget', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) return null;

      // Get the active budget for this project
      const { data, error } = await supabase
        .from('project_budgets')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      return data as ProjectBudgetHeader | null;
    },
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Helper to ensure/activate a budget for a project
 * If no budget exists, creates one with status='active'
 * If budget exists but is not active, activates it
 */
export async function ensureActiveBudget(projectId: string): Promise<string> {
  // Check for existing active budget
  const { data: activeBudget } = await supabase
    .from('project_budgets')
    .select('id')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .maybeSingle();

  if (activeBudget) {
    return activeBudget.id;
  }

  // Check for any existing budget (draft/archived)
  const { data: existingBudget } = await supabase
    .from('project_budgets')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle();

  if (existingBudget) {
    // Activate the existing budget
    const { error } = await supabase
      .from('project_budgets')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', existingBudget.id);

    if (error) throw error;
    return existingBudget.id;
  }

  // Create new active budget
  const { data: newBudget, error } = await supabase
    .from('project_budgets')
    .insert({
      project_id: projectId,
      name: 'Main Budget',
      status: 'active',
    })
    .select('id')
    .single();

  if (error) throw error;
  if (!newBudget) throw new Error('Failed to create budget');

  return newBudget.id;
}
