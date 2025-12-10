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
