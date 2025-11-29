import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type BudgetCategory = 'labor' | 'subs' | 'materials' | 'other';

export interface ProjectBudgetHeader {
  id: string;
  project_id: string;
  name: string;
  status: 'draft' | 'active' | 'archived';
  labor_budget: number;
  subs_budget: number;
  materials_budget: number;
  other_budget: number;
  default_markup_pct: number | null;
  default_tax_pct: number | null;
  notes: string | null;
}

export interface ProjectBudgetGroup {
  id: string;
  project_budget_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  client_visible: boolean;
}

export interface ProjectBudgetLine {
  id: string;
  project_id: string;
  project_budget_id: string | null;
  group_id: string | null;
  cost_code_id: string | null;
  scope_type: 'base' | 'change_order' | 'allowance' | 'option';
  line_type: BudgetCategory | null;
  description_internal: string | null;
  description_client: string | null;
  qty: number;
  unit: string | null;
  unit_cost: number;
  budget_amount: number;
  markup_pct: number | null;
  tax_pct: number | null;
  allowance_cap: number | null;
  is_optional: boolean;
  client_visible: boolean;
  sort_order: number;
  internal_notes: string | null;
  is_allowance: boolean | null; // legacy field still exists
}

export interface ProjectBudgetStructure {
  budget: ProjectBudgetHeader | null;
  groups: ProjectBudgetGroup[];
  lines: ProjectBudgetLine[];
  linesByGroup: Record<string, ProjectBudgetLine[]>; // group_id or 'ungrouped'
}

export function useProjectBudgetStructure(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery<ProjectBudgetStructure>({
    queryKey: ['project-budget-structure', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) {
        return {
          budget: null,
          groups: [],
          lines: [],
          linesByGroup: {},
        };
      }

      // 1) Header
      const { data: budget, error: budgetError } = await supabase
        .from('project_budgets')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (budgetError) throw budgetError;

      let budgetId = budget?.id as string | undefined;

      // If no budget exists yet, create a default one on the fly
      if (!budgetId) {
        const { data: created, error: createError } = await supabase
          .from('project_budgets')
          .insert({
            project_id: projectId,
            name: 'Main Budget',
            status: 'draft',
          })
          .select('*')
          .single();

        if (createError) throw createError;
        budgetId = created.id;
      }

      // 2) Groups
      const { data: groups, error: groupsError } = await supabase
        .from('project_budget_groups')
        .select('*')
        .eq('project_budget_id', budgetId)
        .order('sort_order', { ascending: true });

      if (groupsError) throw groupsError;

      // 3) Lines
      const { data: lines, error: linesError } = await supabase
        .from('project_budget_lines')
        .select('*')
        .eq('project_id', projectId)
        .eq('project_budget_id', budgetId)
        .order('group_id', { ascending: true })
        .order('sort_order', { ascending: true });

      if (linesError) throw linesError;

      const safeGroups = (groups || []) as ProjectBudgetGroup[];
      const safeLines = (lines || []) as ProjectBudgetLine[];

      // 4) Group lines by group_id (use 'ungrouped' key)
      const linesByGroup: Record<string, ProjectBudgetLine[]> = {};

      safeLines.forEach((line) => {
        const key = line.group_id || 'ungrouped';
        if (!linesByGroup[key]) linesByGroup[key] = [];
        linesByGroup[key].push(line);
      });

      return {
        budget: (budget || budgetId ? { ...(budget || {}), id: budgetId } : null) as ProjectBudgetHeader | null,
        groups: safeGroups,
        lines: safeLines,
        linesByGroup,
      };
    },
  });

  // ---------- Mutations ----------

  const invalidate = () => {
    if (!projectId) return;
    queryClient.invalidateQueries({ queryKey: ['project-budget-structure', projectId] });
  };

  // Groups
  const createGroup = useMutation({
    mutationFn: async (payload: { project_budget_id: string; name: string }) => {
      const { data, error } = await supabase
        .from('project_budget_groups')
        .insert({
          project_budget_id: payload.project_budget_id,
          name: payload.name,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as ProjectBudgetGroup;
    },
    onSuccess: invalidate,
  });

  const updateGroup = useMutation({
    mutationFn: async (payload: { id: string; patch: Partial<ProjectBudgetGroup> }) => {
      const { data, error } = await supabase
        .from('project_budget_groups')
        .update(payload.patch)
        .eq('id', payload.id)
        .select('*')
        .single();

      if (error) throw error;
      return data as ProjectBudgetGroup;
    },
    onSuccess: invalidate,
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_budget_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reorderGroups = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('project_budget_groups')
          .update({ sort_order: index })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      const error = results.find((r) => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // Lines
  const createLine = useMutation({
    mutationFn: async (payload: {
      project_id: string;
      project_budget_id: string;
      group_id: string | null;
      line_type: BudgetCategory;
    }) => {
      const { data, error } = await supabase
        .from('project_budget_lines')
        .insert({
          project_id: payload.project_id,
          project_budget_id: payload.project_budget_id,
          group_id: payload.group_id,
          scope_type: 'base',
          line_type: payload.line_type,
          qty: 1,
          unit_cost: 0,
          budget_amount: 0,
          description_internal: '',
          description_client: '',
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as ProjectBudgetLine;
    },
    onSuccess: invalidate,
  });

  const updateLine = useMutation({
    mutationFn: async (payload: { id: string; patch: Partial<ProjectBudgetLine> }) => {
      const { data, error } = await supabase
        .from('project_budget_lines')
        .update(payload.patch)
        .eq('id', payload.id)
        .select('*')
        .single();

      if (error) throw error;
      return data as ProjectBudgetLine;
    },
    onSuccess: invalidate,
  });

  const deleteLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_budget_lines')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const moveLine = useMutation({
    mutationFn: async (payload: { id: string; newGroupId: string | null; newSortOrder?: number }) => {
      const { data, error } = await supabase
        .from('project_budget_lines')
        .update({
          group_id: payload.newGroupId,
          ...(payload.newSortOrder !== undefined ? { sort_order: payload.newSortOrder } : {}),
        })
        .eq('id', payload.id)
        .select('*')
        .single();

      if (error) throw error;
      return data as ProjectBudgetLine;
    },
    onSuccess: invalidate,
  });

  return {
    ...query,
    createGroup,
    updateGroup,
    deleteGroup,
    reorderGroups,
    createLine,
    updateLine,
    deleteLine,
    moveLine,
  };
}
