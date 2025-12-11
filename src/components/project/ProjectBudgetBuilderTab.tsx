import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useProjectBudgetStructure, type ProjectBudgetLine } from '@/hooks/useProjectBudgetStructure';
import { useUpdateBudgetLine } from '@/hooks/useUpdateBudgetLine';
import { cn } from '@/lib/utils';
import { CreateWorkOrderDialog } from '@/components/work-orders/CreateWorkOrderDialog';
import { FileText, Circle } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectBudgetStructure } from '@/hooks/useProjectBudgetStructure';

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

export function ProjectBudgetBuilderTab({ projectId }: ProjectBudgetBuilderTabProps) {
  const { data, isLoading, error, refetch } =
    useProjectBudgetStructure(projectId);

  const updateLineMutation = useUpdateBudgetLine(projectId);

  const [workOrderDialogOpen, setWorkOrderDialogOpen] = useState(false);
  const [selectedBudgetLine, setSelectedBudgetLine] = useState<{
    id: string;
    description: string;
    amount?: number;
  } | null>(null);

  const [drafts, setDrafts] = useState<Record<string, EditableLine>>({});

  // Initialize drafts from data when it changes (fixes side effect in getDraft)
  useEffect(() => {
    if (!data?.lines) return;
    
    const initialDrafts: Record<string, EditableLine> = {};
    data.lines.forEach((line) => {
      initialDrafts[line.id] = {
        id: line.id,
        description_client: line.description_client ?? '',
        description_internal: line.description_internal ?? '',
        qty: Number(line.qty ?? 1),
        unit: line.unit ?? '',
        unit_cost: Number(line.unit_cost ?? 0),
        line_type: line.line_type ?? null,
        scope_type: line.scope_type || 'base',
        is_optional: !!line.is_optional,
        client_visible: line.client_visible ?? true,
        cost_codes: (line as any).cost_codes,
      };
    });
    
    setDrafts(initialDrafts);
  }, [data]);

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-red-600 mb-2">Failed to load budget.</p>
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

  const { budget, groups, lines, linesByGroup } = data as ProjectBudgetStructure;

  // Memoize isLocked calculation
  const isLocked = useMemo(
    () =>
      budget?.status === 'locked' ||
      budget?.is_locked === true ||
      !!budget?.baseline_estimate_id,
    [budget?.status, budget?.is_locked, budget?.baseline_estimate_id]
  );

  // Get draft for a line (now safe - drafts initialized in useEffect)
  const getDraft = useCallback(
    (line: ProjectBudgetLine): EditableLine => {
      if (drafts[line.id]) return drafts[line.id];

      // Fallback to line data if draft doesn't exist (shouldn't happen after useEffect)
      return {
        id: line.id,
        description_client: line.description_client ?? '',
        description_internal: line.description_internal ?? '',
        qty: Number(line.qty ?? 1),
        unit: line.unit ?? '',
        unit_cost: Number(line.unit_cost ?? 0),
        line_type: line.line_type ?? null,
        scope_type: line.scope_type || 'base',
        is_optional: !!line.is_optional,
        client_visible: line.client_visible ?? true,
        cost_codes: (line as any).cost_codes,
      };
    },
    [drafts]
  );

  // Check if line has unsaved changes
  const hasUnsavedChanges = useCallback(
    (line: ProjectBudgetLine): boolean => {
      const draft = drafts[line.id];
      if (!draft) return false;

      return (
        draft.description_client !== (line.description_client ?? '') ||
        draft.description_internal !== (line.description_internal ?? '') ||
        draft.qty !== Number(line.qty ?? 1) ||
        draft.unit !== (line.unit ?? '') ||
        draft.unit_cost !== Number(line.unit_cost ?? 0) ||
        draft.line_type !== line.line_type ||
        draft.scope_type !== (line.scope_type || 'base') ||
        draft.is_optional !== !!line.is_optional ||
        draft.client_visible !== (line.client_visible ?? true)
      );
    },
    [drafts]
  );

  const handleChange = useCallback(
    <K extends keyof EditableLine>(
      lineId: string,
      field: K,
      value: EditableLine[K],
    ) => {
      if (isLocked) return;
      
      // Validate numeric inputs
      if (field === 'qty' || field === 'unit_cost') {
        const numValue = Number(value);
        if (isNaN(numValue) || numValue < 0) {
          return; // Ignore invalid values
        }
      }
      
      setDrafts((prev) => ({
        ...prev,
        [lineId]: {
          ...(prev[lineId] || {}),
          [field]: value,
        } as EditableLine,
      }));
    },
    [isLocked]
  );

  const handleSave = useCallback(
    async (lineId: string) => {
      if (isLocked) return;

      const draft = drafts[lineId];
      if (!draft) return;

      // Validate inputs
      const qty = Number(draft.qty);
      const unitCost = Number(draft.unit_cost);
      
      if (isNaN(qty) || qty < 0) {
        toast.error('Quantity must be a valid number >= 0');
        return;
      }
      
      if (isNaN(unitCost) || unitCost < 0) {
        toast.error('Unit cost must be a valid number >= 0');
        return;
      }

      try {
        const budget_amount = qty * unitCost;

        await updateLineMutation.mutateAsync({
          id: draft.id,
          description_client: draft.description_client || null,
          description_internal: draft.description_internal || null,
          qty,
          unit: draft.unit || null,
          unit_cost: unitCost,
          budget_amount: isFinite(budget_amount) ? budget_amount : 0,
          line_type: draft.line_type,
          scope_type: draft.scope_type,
          is_optional: draft.is_optional,
          client_visible: draft.client_visible,
        });

        setDrafts((prev) => {
          const updated = { ...prev };
          delete updated[lineId];
          return updated;
        });

        toast.success('Line updated successfully');
      } catch (err: any) {
        const errorMessage =
          err?.message || err?.error?.message || 'Failed to update line';
        toast.error(errorMessage);
        console.error('Error updating budget line:', err);
      }
    },
    [drafts, isLocked, updateLineMutation]
  );

  const handleCancel = useCallback(
    (lineId: string) => {
      setDrafts((prev) => {
        const updated = { ...prev };
        delete updated[lineId];
        return updated;
      });
    },
    []
  );

  const renderLineRow = useCallback(
    (line: ProjectBudgetLine) => {
      const draft = getDraft(line);
      const hasChanges = hasUnsavedChanges(line);
      
      // Calculate display amount safely
      const qty = Number(draft.qty) || 0;
      const unitCost = Number(draft.unit_cost) || 0;
      const calculatedAmount = qty * unitCost;
      const displayAmount =
        isFinite(calculatedAmount) && calculatedAmount > 0
          ? calculatedAmount
          : Number(line.budget_amount) || 0;

      const isSaving =
        updateLineMutation.isPending &&
        updateLineMutation.variables?.id === draft.id;

      const disabled = isLocked || isSaving;

    return (
      <div key={line.id} className="flex flex-col gap-2 py-2 border-b last:border-0">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {draft.cost_codes?.code || (line as any).cost_codes?.code || 'N/A'}
              </span>

              {hasChanges && (
                <Circle className="h-2 w-2 fill-amber-500 text-amber-500" />
              )}

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
              placeholder="Internal description"
              className="h-8 text-xs text-muted-foreground"
              disabled={disabled}
            />
          </div>

          <div className="flex items-center gap-2 md:w-[260px]">
            <div className="w-16">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={draft.qty === 0 ? '' : draft.qty}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    handleChange(line.id, 'qty', 0);
                  } else {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue >= 0) {
                      handleChange(line.id, 'qty', numValue);
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave(line.id);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancel(line.id);
                  }
                }}
                className="h-8 text-xs"
                placeholder="Qty"
                disabled={disabled}
              />
            </div>

            <div className="w-24">
              <UnitSelect
                value={draft.unit}
                onChange={(val) => handleChange(line.id, 'unit', val as any)}
                className="h-8 text-xs"
                placeholder="Unit"
              />
            </div>

            <div className="w-28">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={draft.unit_cost === 0 ? '' : draft.unit_cost}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    handleChange(line.id, 'unit_cost', 0);
                  } else {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue >= 0) {
                      handleChange(line.id, 'unit_cost', numValue);
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave(line.id);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancel(line.id);
                  }
                }}
                className="h-8 text-xs"
                placeholder="Unit cost"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:w-[260px] justify-end">
            <Select
              value={draft.line_type || 'other'}
              onValueChange={(val) =>
                handleChange(line.id, 'line_type', val as any)
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
                handleChange(line.id, 'scope_type', val as any)
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
              {isFinite(displayAmount) && displayAmount >= 0
                ? `$${displayAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : '$0.00'}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={draft.client_visible}
                onCheckedChange={(checked) =>
                  handleChange(line.id, 'client_visible', Boolean(checked) as any)
                }
                aria-label="Client visible"
                disabled={disabled}
              />
              <span className="text-[10px] text-muted-foreground">Client</span>
            </div>

            {isLocked ? (
              <Badge variant="outline" className="h-8 flex items-center text-xs">
                Baseline Locked
              </Badge>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => {
                    setSelectedBudgetLine({
                      id: line.id,
                      description:
                        draft.description_client ||
                        draft.description_internal ||
                        'Untitled',
                      amount: displayAmount,
                    });
                    setWorkOrderDialogOpen(true);
                  }}
                  disabled={disabled}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  WO
                </Button>

                {hasChanges && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-muted-foreground"
                    disabled={disabled}
                    onClick={() => handleCancel(line.id)}
                    title="Cancel changes (Esc)"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={hasChanges ? 'default' : 'outline'}
                  className={cn(
                    'h-8 text-xs',
                    isSaving && 'opacity-70 cursor-wait',
                    hasChanges && 'bg-amber-600 hover:bg-amber-700',
                  )}
                  disabled={disabled || !hasChanges}
                  onClick={() => handleSave(line.id)}
                  title="Save changes (Enter)"
                >
                  {isSaving ? 'Saving…' : hasChanges ? 'Save' : 'Saved'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
    },
    [
      getDraft,
      hasUnsavedChanges,
      isLocked,
      updateLineMutation,
      handleChange,
      handleSave,
      handleCancel,
    ]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">{budget?.name || 'Project Budget'}</h3>
          <p className="text-sm text-muted-foreground">
            Canonical budget structure – this drives proposals and cost tracking.
          </p>

          {isLocked ? (
            <p className="mt-1 text-xs text-red-600">
              This budget is <span className="font-semibold">locked as baseline.</span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Edit freely. Once synced as baseline, fields lock.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {budget?.status && (
            <Badge variant={budget.status === 'active' ? 'default' : 'secondary'}>
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

      <ScrollArea className="h-[520px] border rounded-md">
        <div className="p-4 space-y-4">
          {groups
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((group) => {
              const groupLines = linesByGroup[group.id] || [];

              return (
                <Card key={group.id} className="border-dashed">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{group.name}</CardTitle>
                        {group.description && (
                          <p className="text-xs text-muted-foreground">{group.description}</p>
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
                          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                          .map(renderLineRow)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

          {linesByGroup['ungrouped']?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ungrouped</CardTitle>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-1">
                  {linesByGroup['ungrouped']
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
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
            if (!open) setSelectedBudgetLine(null);
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