================================================================================
DATA DUMP: All Files Associated with useProjectBudgetStructure.ts
================================================================================
Generated: 2024-12-10
Purpose: Complete code dump of all files related to project budget structure


================================================================================
FILE 1: src/hooks/useProjectBudgetStructure.ts
================================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getUnassignedCostCodeId } from '@/lib/costCodes';

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
          .maybeSingle();

        if (createError) throw createError;
        if (!created) {
          throw new Error('Failed to create budget');
        }
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
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Failed to create budget group');
      }
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
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Budget group not found');
      }
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
      const unassignedId = await getUnassignedCostCodeId();
      
      const { data, error } = await supabase
        .from('project_budget_lines')
        .insert([{
          project_id: payload.project_id,
          project_budget_id: payload.project_budget_id,
          group_id: payload.group_id,
          scope_type: 'base',
          line_type: payload.line_type,
          category: payload.line_type,
          qty: 1,
          unit_cost: 0,
          budget_amount: 0,
          description_internal: '',
          description_client: '',
          cost_code_id: unassignedId,
        }])
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Failed to create budget line');
      }
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
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Budget line not found');
      }
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
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Budget line not found');
      }
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



================================================================================
FILE 2: src/hooks/useActiveBudget.ts
================================================================================

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



================================================================================
FILE 3: src/components/project/ProjectBudgetBuilderTab.tsx
================================================================================

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { UnitSelect } from '@/components/shared/UnitSelect';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useProjectBudgetStructure } from '@/hooks/useProjectBudgetStructure';
import { useUpdateBudgetLine } from '@/hooks/useUpdateBudgetLine';
import { cn } from '@/lib/utils';
import { CreateWorkOrderDialog } from '@/components/work-orders/CreateWorkOrderDialog';
import { FileText } from 'lucide-react';

interface ProjectBudgetBuilderTabProps {
  projectId: string;
}

type EditableLine = {
  id: string;
  description_client: string | null;
  description_internal: string | null;
  qty: number;
  unit: string | null;
  unit_cost: number;
  line_type: 'labor' | 'subs' | 'materials' | 'other' | null;
  scope_type: 'base' | 'change_order' | 'allowance' | 'option';
  is_optional: boolean;
  client_visible: boolean;
  cost_codes?: { code?: string | null } | null;
};

export function ProjectBudgetBuilderTab({
  projectId,
}: ProjectBudgetBuilderTabProps) {
  const { data, isLoading, error, refetch } =
    useProjectBudgetStructure(projectId);
  const updateLineMutation = useUpdateBudgetLine(projectId);
  const [workOrderDialogOpen, setWorkOrderDialogOpen] = useState(false);
  const [selectedBudgetLine, setSelectedBudgetLine] = useState<{
    id: string;
    description: string;
    amount?: number;
  } | null>(null);

  // simple local edit state: map lineId -> EditableLine
  const [drafts, setDrafts] = useState<Record<string, EditableLine>>({});

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (error) {
    console.error(error);
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-red-600 mb-2">
            Failed to load budget.
          </p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No budget found for this project yet.
        </CardContent>
      </Card>
    );
  }

  const { budget, groups, lines } = data as any;

  // 🔒 Immutable Baseline Logic
  // Treat any of these as "locked":
  // - explicit locked status
  // - is_locked boolean (if present)
  // - baseline_estimate_id set (meaning synced from an estimate)
  const isLocked =
    budget?.status === 'locked' ||
    budget?.is_locked === true ||
    !!budget?.baseline_estimate_id;

  const getDraft = (line: any): EditableLine => {
    if (drafts[line.id]) return drafts[line.id];

    const draft: EditableLine = {
      id: line.id,
      description_client: line.description_client ?? '',
      description_internal: line.description_internal ?? '',
      qty: Number(line.qty ?? 1),
      unit: line.unit ?? '',
      unit_cost: Number(line.unit_cost ?? 0),
      line_type: line.line_type ?? null,
      scope_type: (line.scope_type as any) || 'base',
      is_optional: !!line.is_optional,
      client_visible: line.client_visible ?? true,
      cost_codes: line.cost_codes,
    };

    setDrafts((prev) => ({ ...prev, [line.id]: draft }));
    return draft;
  };

  const handleChange = <K extends keyof EditableLine>(
    lineId: string,
    field: K,
    value: EditableLine[K],
  ) => {
    // If locked, ignore changes at UI layer
    if (isLocked) return;

    setDrafts((prev) => ({
      ...prev,
      [lineId]: {
        ...(prev[lineId] || {}),
        [field]: value,
      } as EditableLine,
    }));
  };

  const handleSave = async (lineId: string) => {
    if (isLocked) return;

    const draft = drafts[lineId];
    if (!draft) return;

    await updateLineMutation.mutateAsync({
      id: draft.id,
      description_client: draft.description_client || null,
      description_internal: draft.description_internal || null,
      qty: draft.qty,
      unit: draft.unit || null,
      unit_cost: draft.unit_cost,
      line_type: draft.line_type,
      scope_type: draft.scope_type,
      is_optional: draft.is_optional,
      client_visible: draft.client_visible,
    });
  };

  const linesByGroup: Record<string, any[]> = {};
  (lines || []).forEach((line: any) => {
    const key = line.group_id || 'ungrouped';
    if (!linesByGroup[key]) linesByGroup[key] = [];
    linesByGroup[key].push(line);
  });

  const ungroupedLines = linesByGroup['ungrouped'] || [];

  const renderLineRow = (line: any) => {
    const draft = getDraft(line);

    const displayAmount =
      draft.qty && draft.unit_cost
        ? draft.qty * draft.unit_cost
        : line.budget_amount || 0;

    const isSaving =
      updateLineMutation.isPending &&
      updateLineMutation.variables?.id === draft.id;

    const disabled = isLocked || isSaving;

    return (
      <div
        key={line.id}
        className="flex flex-col gap-2 py-2 border-b last:border-0"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Left: descriptions */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {draft.cost_codes?.code || line.cost_codes?.code || 'N/A'}
              </span>
              {draft.scope_type !== 'base' && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  {draft.scope_type}
                </Badge>
              )}
              {draft.is_optional && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  Optional
                </Badge>
              )}
              {!draft.client_visible && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  Internal
                </Badge>
              )}
            </div>

            <Input
              value={draft.description_client ?? ''}
              onChange={(e) =>
                handleChange(line.id, 'description_client', e.target.value)
              }
              placeholder="Client-facing description"
              className="h-8 text-sm"
              disabled={disabled}
            />
            <Input
              value={draft.description_internal ?? ''}
              onChange={(e) =>
                handleChange(line.id, 'description_internal', e.target.value)
              }
              placeholder="Internal description / notes"
              className="h-8 text-xs text-muted-foreground"
              disabled={disabled}
            />
          </div>

          {/* Middle: qty/unit/unit_cost */}
          <div className="flex items-center gap-2 md:w-[260px]">
            <div className="w-16">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={Number.isFinite(draft.qty) ? draft.qty : ''}
                onChange={(e) =>
                  handleChange(
                    line.id,
                    'qty',
                    Number(e.target.value || 0) as any,
                  )
                }
                className="h-8 text-xs"
                placeholder="Qty"
                disabled={disabled}
              />
            </div>
            <div className="w-24">
              <UnitSelect
                value={draft.unit}
                onChange={(value) =>
                  handleChange(line.id, 'unit', value as any)
                }
                className="h-8 text-xs"
                placeholder="Unit"
              />
            </div>
            <div className="w-28">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={
                  Number.isFinite(draft.unit_cost) ? draft.unit_cost : ''
                }
                onChange={(e) =>
                  handleChange(
                    line.id,
                    'unit_cost',
                    Number(e.target.value || 0) as any,
                  )
                }
                className="h-8 text-xs"
                placeholder="Unit cost"
                disabled={disabled}
              />
            </div>
          </div>

          {/* Right: type/scope + total + save */}
          <div className="flex items-center gap-2 md:w-[260px] justify-end">
            <Select
              value={draft.line_type || 'other'}
              onValueChange={(val) =>
                handleChange(
                  line.id,
                  'line_type',
                  (val as EditableLine['line_type']) || null,
                )
              }
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="subs">Subs</SelectItem>
                <SelectItem value="materials">Materials</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={draft.scope_type}
              onValueChange={(val) =>
                handleChange(
                  line.id,
                  'scope_type',
                  val as EditableLine['scope_type'],
                )
              }
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="base">Base</SelectItem>
                <SelectItem value="change_order">Change Order</SelectItem>
                <SelectItem value="allowance">Allowance</SelectItem>
                <SelectItem value="option">Option</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-24 text-right text-sm font-semibold">
              ${Number(displayAmount || 0).toLocaleString()}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={draft.client_visible}
                onCheckedChange={(checked) =>
                  handleChange(
                    line.id,
                    'client_visible',
                    Boolean(checked) as any,
                  )
                }
                aria-label="Client visible"
                disabled={disabled}
              />
              <span className="text-[10px] text-muted-foreground">
                Client
              </span>
            </div>

            {isLocked ? (
              <Badge
                variant="outline"
                className="h-8 flex items-center text-xs"
              >
                Baseline Locked
              </Badge>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  disabled={disabled}
                  onClick={() => {
                    setSelectedBudgetLine({
                      id: line.id,
                      description: draft.description_client || draft.description_internal || 'Untitled',
                      amount: displayAmount,
                    });
                    setWorkOrderDialogOpen(true);
                  }}
                  title="Create Work Order"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  WO
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    'h-8 text-xs',
                    isSaving && 'opacity-70 cursor-wait',
                  )}
                  disabled={disabled}
                  onClick={() => handleSave(line.id)}
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header / summary */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">
            {budget?.name || 'Project Budget'}
          </h3>
          <p className="text-sm text-muted-foreground">
            Canonical budget structure – this drives proposals and cost
            tracking.
          </p>
          {isLocked ? (
            <p className="mt-1 text-xs text-red-600">
              This budget is{' '}
              <span className="font-semibold">locked as the baseline.</span>{' '}
              To change the budget, use Change Orders or Budget Transfers (not
              direct edits).
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Changes here update the working budget. Once an estimate is
              synced as baseline, edits will be locked.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {budget?.status && (
            <Badge
              variant={budget.status === 'active' ? 'default' : 'secondary'}
            >
              {budget.status}
            </Badge>
          )}
          {isLocked && (
            <Badge variant="outline" className="text-xs">
              Baseline Locked
            </Badge>
          )}
        </div>
      </div>

      {/* Groups + lines */}
      <ScrollArea className="h-[520px] border rounded-md">
        <div className="p-4 space-y-4">
          {(groups || [])
            .sort(
              (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
            )
            .map((group: any) => {
              const groupLines = (linesByGroup as any)[group.id] || [];
              return (
                <Card key={group.id} className="border-dashed">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">
                          {group.name}
                        </CardTitle>
                        {group.description && (
                          <p className="text-xs text-muted-foreground">
                            {group.description}
                          </p>
                        )}
                      </div>
                      {!group.client_visible && (
                        <Badge variant="outline" className="text-xs">
                          Internal only
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {groupLines.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No lines in this section yet.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {groupLines
                          .sort(
                            (a: any, b: any) =>
                              (a.sort_order ?? 0) -
                              (b.sort_order ?? 0),
                          )
                          .map(renderLineRow)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

          {ungroupedLines.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ungrouped</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {ungroupedLines
                    .sort(
                      (a: any, b: any) =>
                        (a.sort_order ?? 0) - (b.sort_order ?? 0),
                    )
                    .map(renderLineRow)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {selectedBudgetLine && (
        <CreateWorkOrderDialog
          open={workOrderDialogOpen}
          onOpenChange={(open) => {
            setWorkOrderDialogOpen(open);
            if (!open) {
              setSelectedBudgetLine(null);
            }
          }}
          projectId={projectId}
          budgetItemId={selectedBudgetLine.id}
          budgetItemDescription={selectedBudgetLine.description}
          budgetItemAmount={selectedBudgetLine.amount}
        />
      )}
    </div>
  );
}



================================================================================
FILE 4: src/hooks/useUpdateBudgetLine.ts
================================================================================

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
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Budget line not found');
      }
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



================================================================================
FILE 5: src/hooks/useProjectBudgetLines.ts
================================================================================

import { useUnifiedProjectBudget } from '@/hooks/useUnifiedProjectBudget';

/**
 * VERY DEPRECATED – labor-only legacy hook.
 *
 * Kept only so old code doesn’t crash. New code should use
 * useUnifiedProjectBudget(projectId) instead.
 */
export function useProjectBudgetLines(projectId: string) {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      '[useProjectBudgetLines] is deprecated. Use useUnifiedProjectBudget instead.'
    );
  }

  const { data, isLoading, isError, error, refetch } =
    useUnifiedProjectBudget(projectId);

  // If something expects "lines", give them everything for now.
  const lines = data?.costCodeLines ?? [];

  return {
    lines,
    isLoading,
    isError,
    error,
    refetch,
    raw: data,
  };
}



================================================================================
FILE 6: src/lib/costCodes.ts
================================================================================

/**
 * Cost code utilities and bootstrap helpers
 */

import { supabase } from '@/integrations/supabase/client';

let unassignedCostCodeId: string | null = null;

/**
 * Gets the UNASSIGNED cost code ID (cached after first fetch)
 * This is used as a fallback when cost_code_id is required but not provided
 */
export async function getUnassignedCostCodeId(): Promise<string> {
  if (unassignedCostCodeId) {
    return unassignedCostCodeId;
  }

  const { data, error } = await supabase
    .from('cost_codes')
    .select('id')
    .eq('code', 'UNASSIGNED')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch UNASSIGNED cost code: ${error.message}`);
  }
  if (!data) {
    throw new Error('UNASSIGNED cost code not found');
  }

  unassignedCostCodeId = data.id;
  return data.id;
}

/**
 * Ensure Overhead & Fees trade and standard fee cost codes exist
 * 
 * Creates or finds:
 * - "Overhead & Fees" trade (optional, can be null if fees are trade-less)
 * - OFFICE-FEE cost code: "Office & Admin Expenses"
 * - MISC-FEE cost code: "Miscellaneous Job Expenses"
 * - PERSONAL-FEE cost code: "Personal / Owner Expenses"
 * 
 * All fee codes have category='other' and may or may not have a trade_id
 * (depending on whether we use the Overhead trade or keep them trade-less)
 * 
 * @returns IDs of fee cost codes and optional trade ID
 */
export async function ensureOverheadTradeAndFeeCodes(): Promise<{
  tradeId: string | null; // null if fees are trade-less
  officeFeeId: string;
  miscFeeId: string;
  personalExpenseId: string;
}> {
  // Strategy: Keep fees trade-less (trade_id = null) for simplicity
  // This avoids polluting the trade system with non-trade items
  
  const feeCodes = [
    {
      code: 'OFFICE-FEE',
      name: 'Office & Admin Expenses',
      category: 'other' as const,
      trade_id: null,
    },
    {
      code: 'MISC-FEE',
      name: 'Miscellaneous Job Expenses',
      category: 'other' as const,
      trade_id: null,
    },
    {
      code: 'PERSONAL-FEE',
      name: 'Personal / Owner Expenses',
      category: 'other' as const,
      trade_id: null,
    },
  ];

  const result: {
    tradeId: string | null;
    officeFeeId: string;
    miscFeeId: string;
    personalExpenseId: string;
  } = {
    tradeId: null,
    officeFeeId: '',
    miscFeeId: '',
    personalExpenseId: '',
  };

  // Find or create each fee code
  for (const feeCode of feeCodes) {
    // Check if code already exists
    const { data: existing } = await supabase
      .from('cost_codes')
      .select('id')
      .eq('code', feeCode.code)
      .maybeSingle();

    if (existing) {
      // Use existing code
      if (feeCode.code === 'OFFICE-FEE') {
        result.officeFeeId = existing.id;
      } else if (feeCode.code === 'MISC-FEE') {
        result.miscFeeId = existing.id;
      } else if (feeCode.code === 'PERSONAL-FEE') {
        result.personalExpenseId = existing.id;
      }
    } else {
      // Create new fee code
      const { data: created, error } = await supabase
        .from('cost_codes')
        .insert({
          code: feeCode.code,
          name: feeCode.name,
          category: feeCode.category,
          trade_id: feeCode.trade_id,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create fee code ${feeCode.code}: ${error.message}`);
      }

      if (feeCode.code === 'OFFICE-FEE') {
        result.officeFeeId = created.id;
      } else if (feeCode.code === 'MISC-FEE') {
        result.miscFeeId = created.id;
      } else if (feeCode.code === 'PERSONAL-FEE') {
        result.personalExpenseId = created.id;
      }
    }
  }

  return result;
}



================================================================================
FILE 7: src/hooks/useSyncEstimateToBudget.ts (relevant parts)
================================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SyncMode = 'merge' | 'replace';

interface SyncEstimateToBudgetOptions {
  projectId: string;
  estimateId: string;
  mode?: SyncMode;
}

/**
 * Thin wrapper around the canonical SQL function:
 *   sync_estimate_to_budget_v2(p_project_id, p_estimate_id, p_mode)
 *
 * This hook:
 * - calls the RPC
 * - invalidates relevant queries
 * - shows user feedback
 */
export function useSyncEstimateToBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: SyncEstimateToBudgetOptions) => {
      const { projectId, estimateId, mode = 'merge' } = options;

      if (!projectId) {
        throw new Error('projectId is required for syncing estimate to budget');
      }
      if (!estimateId) {
        throw new Error('estimateId is required for syncing estimate to budget');
      }

      const { data, error } = await supabase.rpc(
        'sync_estimate_to_budget_v2' as any,
        {
          p_project_id: projectId,
          p_estimate_id: estimateId,
          p_mode: mode,
        }
      );

      if (error) {
        console.error('[estimate→budget sync] RPC error', {
          projectId,
          estimateId,
          mode,
          error,
        });
        throw error;
      }

      const result = data as { budget_id?: string; estimate_id?: string } | null;
      return {
        budgetId: result?.budget_id ?? null,
        estimateId: result?.estimate_id ?? estimateId,
        mode,
      };
    },
    onSuccess: (data, variables) => {
      const { projectId, estimateId } = variables;

      if (!projectId) {
        console.error(
          '[useSyncEstimateToBudget] onSuccess: projectId is missing from variables',
          variables
        );
        return;
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['active-budget', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-budget-structure', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-budget-ledger', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-financials-v3', projectId] });
      queryClient.invalidateQueries({ queryKey: ['estimates', projectId] });
      queryClient.invalidateQueries({ queryKey: ['estimate-builder', estimateId] });
      queryClient.invalidateQueries({ queryKey: ['project-estimates-sync-status', projectId] });

      // Dispatch event for any legacy listeners
      window.dispatchEvent(new Event('budget-updated'));

      toast.success(
        data.mode === 'replace'
          ? 'Estimate synced to budget (replaced existing)'
          : 'Estimate synced to budget (merged)'
      );
    },
    onError: (error: Error) => {
      console.error('Sync estimate to budget error:', error);
      toast.error(`Failed to sync estimate: ${error.message}`);
    },
  });
}



================================================================================
RELATIONSHIPS SUMMARY
================================================================================

1. useProjectBudgetStructure.ts
   - Exports: ProjectBudgetHeader, ProjectBudgetGroup, ProjectBudgetLine, ProjectBudgetStructure types
   - Exports: useProjectBudgetStructure hook
   - Imports: getUnassignedCostCodeId from @/lib/costCodes
   - Query Key: ['project-budget-structure', projectId]

2. useActiveBudget.ts
   - Imports: ProjectBudgetHeader type from useProjectBudgetStructure
   - Query Key: ['active-budget', projectId]

3. ProjectBudgetBuilderTab.tsx
   - Imports: useProjectBudgetStructure hook
   - Imports: useUpdateBudgetLine hook
   - Uses: data, isLoading, error, refetch from useProjectBudgetStructure

4. useUpdateBudgetLine.ts
   - Invalidates: ['project-budget-structure', projectId] query

5. useSyncEstimateToBudget.ts
   - Invalidates: ['project-budget-structure', projectId] query

6. useProjectBudgetLines.ts
   - DEPRECATED wrapper around useUnifiedProjectBudget
   - Not directly related but mentioned in audit docs

7. costCodes.ts
   - Exports: getUnassignedCostCodeId function
   - Used by: useProjectBudgetStructure.createLine mutation

================================================================================
QUERY INVALIDATION PATTERNS
================================================================================

The following hooks invalidate the 'project-budget-structure' query:
- useProjectBudgetStructure (internal mutations)
- useUpdateBudgetLine
- useSyncEstimateToBudget

================================================================================
END OF DATA DUMP
================================================================================
