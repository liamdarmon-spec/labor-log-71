// ProjectEstimateEditor.tsx
// Best-in-class grouped estimate editor: Block → Area → Group → Item
// Optional areas and groups for flexible organization

import React, { useMemo, useCallback, useState, memo } from "react";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Layers,
  FolderOpen,
} from "lucide-react";
import { CostCodeSelect } from "@/components/cost-codes/CostCodeSelect";
import { UnitSelect } from "@/components/shared/UnitSelect";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ====== Types ======

export type BudgetCategory = "labor" | "subs" | "materials" | "other";

export interface ScopeBlock {
  id: string;
  title: string;
  description?: string | null;
  sort_order?: number | null;
}

export interface ScopeItem {
  id: string;
  scope_block_id: string;
  area_label: string | null;
  group_label: string | null;
  category: BudgetCategory;
  cost_code_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  markup_percent: number;
  line_total: number;
  notes?: string | null;
}

export interface EstimateEditorBlock {
  block: ScopeBlock;
  items: ScopeItem[];
}

interface EstimateEditorProps {
  blocks: EstimateEditorBlock[];
  isBudgetSourceLocked?: boolean;
  onBlocksChange: (blocks: EstimateEditorBlock[]) => void;
  onSetAsBudgetSource?: () => void;
}

// ====== Helpers ======

interface AreaGroup {
  area: string | null;
  items: ScopeItem[];
}

interface SubGroup {
  group: string | null;
  items: ScopeItem[];
}

function groupItemsByArea(items: ScopeItem[]): AreaGroup[] {
  const map = new Map<string | null, ScopeItem[]>();
  for (const item of items) {
    const key = item.area_label || null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  const groups: AreaGroup[] = [];
  for (const [area, areaItems] of map.entries()) {
    groups.push({ area, items: areaItems });
  }

  return groups.sort((a, b) => {
    if (a.area === null && b.area === null) return 0;
    if (a.area === null) return 1;
    if (b.area === null) return -1;
    return a.area.localeCompare(b.area);
  });
}

function groupItemsByGroup(items: ScopeItem[]): SubGroup[] {
  const map = new Map<string | null, ScopeItem[]>();
  for (const item of items) {
    const key = item.group_label || null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  const groups: SubGroup[] = [];
  for (const [group, groupItems] of map.entries()) {
    groups.push({ group, items: groupItems });
  }

  return groups.sort((a, b) => {
    if (a.group === null && b.group === null) return 0;
    if (a.group === null) return 1;
    if (b.group === null) return -1;
    return a.group.localeCompare(b.group);
  });
}

function computeItemBase(item: ScopeItem): number {
  return (item.quantity || 0) * (item.unit_price || 0);
}

function computeItemMarkup(item: ScopeItem): number {
  const base = computeItemBase(item);
  return item.markup_percent ? base * (item.markup_percent / 100) : 0;
}

function computeItemTotal(item: ScopeItem): number {
  return computeItemBase(item) + computeItemMarkup(item);
}

function computeCategoryTotals(
  items: ScopeItem[]
): Record<BudgetCategory, number> {
  const totals: Record<BudgetCategory, number> = {
    labor: 0,
    subs: 0,
    materials: 0,
    other: 0,
  };
  for (const i of items) {
    const total = computeItemTotal(i);
    totals[i.category] += total;
  }
  return totals;
}

function computeTotalProfit(items: ScopeItem[]): number {
  return items.reduce((sum, item) => sum + computeItemMarkup(item), 0);
}

function isItemValid(item: ScopeItem): boolean {
  const hasCostCode =
    !!item.cost_code_id && item.cost_code_id !== "UNASSIGNED";
  const qtyValid = (item.quantity || 0) > 0;
  const descValid = !!item.description?.trim();
  return hasCostCode && qtyValid && descValid;
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

const CATEGORY_COLORS: Record<BudgetCategory, string> = {
  labor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  subs: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  materials: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  other: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
};

const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  labor: "LAB",
  subs: "SUBS",
  materials: "MAT",
  other: "OTHER",
};

// ====== Summary Components ======

function SummaryCard({
  label,
  value,
  subtitle,
  highlight,
  variant,
  isCount,
}: {
  label: string;
  value: number;
  subtitle?: string;
  highlight?: boolean;
  variant?: "success" | "warning";
  isCount?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 border transition-all",
        highlight
          ? "bg-primary/5 border-primary/20"
          : variant === "success"
          ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"
          : variant === "warning"
          ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
          : "bg-card border-border"
      )}
    >
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p
        className={cn(
          "text-2xl font-semibold tracking-tight",
          highlight && "text-primary",
          variant === "success" && "text-emerald-600 dark:text-emerald-400",
          variant === "warning" && "text-amber-600 dark:text-amber-400"
        )}
      >
        {isCount ? value : formatCurrency(value)}
      </p>
      {subtitle && (
        <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

function CategoryBreakdownCard({
  totals,
}: {
  totals: Record<BudgetCategory, number>;
}) {
  const entries = (
    Object.entries(totals) as [BudgetCategory, number][]
  ).filter(([, v]) => v > 0);

  return (
    <div className="rounded-xl p-4 border bg-card border-border">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        By Category
      </p>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No costs yet</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {entries.map(([cat, amt]) => (
            <span
              key={cat}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
                CATEGORY_COLORS[cat]
              )}
            >
              {CATEGORY_LABELS[cat]} {formatCurrency(amt)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ChipLabel({
  label,
  amount,
  small,
}: {
  label: string;
  amount: number;
  small?: boolean;
}) {
  if (amount <= 0) return null;
  const cat = label.toLowerCase() as BudgetCategory;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-medium",
        small ? "text-[10px]" : "text-[11px]",
        CATEGORY_COLORS[cat] || CATEGORY_COLORS.other
      )}
    >
      {label} {formatCurrency(amount)}
    </span>
  );
}

// ====== Top-level Component ======

export const ProjectEstimateEditor: React.FC<EstimateEditorProps> = ({
  blocks,
  isBudgetSourceLocked,
  onBlocksChange,
  onSetAsBudgetSource,
}) => {
  const flatItems = useMemo(() => blocks.flatMap((b) => b.items), [blocks]);
  const globalTotals = useMemo(
    () => computeCategoryTotals(flatItems),
    [flatItems]
  );
  const totalProfit = useMemo(() => computeTotalProfit(flatItems), [flatItems]);
  const hasInvalidItems = useMemo(
    () => flatItems.some((i) => !isItemValid(i)),
    [flatItems]
  );
  const invalidCount = useMemo(
    () => flatItems.filter((i) => !isItemValid(i)).length,
    [flatItems]
  );

  // Mutation helpers (immutable)
  const updateItem = useCallback(
    (blockId: string, itemId: string, patch: Partial<ScopeItem>) => {
      onBlocksChange(
        blocks.map((b) => {
          if (b.block.id !== blockId) return b;
          return {
            ...b,
            items: b.items.map((it) =>
              it.id === itemId ? { ...it, ...patch } : it
            ),
          };
        })
      );
    },
    [blocks, onBlocksChange]
  );

  const addItem = useCallback(
    (blockId: string, area: string | null, group: string | null) => {
      onBlocksChange(
        blocks.map((b) => {
          if (b.block.id !== blockId) return b;
          const newItem: ScopeItem = {
            id: crypto.randomUUID(),
            scope_block_id: blockId,
            area_label: area,
            group_label: group,
            category: "labor",
            cost_code_id: null,
            description: "",
            quantity: 1,
            unit: "ea",
            unit_price: 0,
            markup_percent: 0,
            line_total: 0,
          };
          return { ...b, items: [...b.items, newItem] };
        })
      );
    },
    [blocks, onBlocksChange]
  );

  const addAreaToBlock = useCallback(
    (blockId: string) => {
      const block = blocks.find((b) => b.block.id === blockId);
      const usedNames = new Set(
        block?.items.map((i) => i.area_label).filter(Boolean) as string[]
      );
      let name = "New Area";
      let idx = 2;
      while (usedNames.has(name)) {
        name = `New Area ${idx++}`;
      }
      addItem(blockId, name, null);
    },
    [blocks, addItem]
  );

  const addGroupToArea = useCallback(
    (blockId: string, areaLabel: string | null) => {
      const block = blocks.find((b) => b.block.id === blockId);
      const areaItems = block?.items.filter(
        (i) => i.area_label === areaLabel
      );
      const usedGroups = new Set(
        areaItems?.map((i) => i.group_label).filter(Boolean) as string[]
      );
      let name = "New Group";
      let idx = 2;
      while (usedGroups.has(name)) {
        name = `New Group ${idx++}`;
      }
      addItem(blockId, areaLabel, name);
    },
    [blocks, addItem]
  );

  const deleteItem = useCallback(
    (blockId: string, itemId: string) => {
      onBlocksChange(
        blocks.map((b) => {
          if (b.block.id !== blockId) return b;
          return { ...b, items: b.items.filter((i) => i.id !== itemId) };
        })
      );
    },
    [blocks, onBlocksChange]
  );

  const renameArea = useCallback(
    (blockId: string, oldName: string | null, newName: string | null) => {
      const cleaned = newName?.trim() || null;
      onBlocksChange(
        blocks.map((b) => {
          if (b.block.id !== blockId) return b;
          return {
            ...b,
            items: b.items.map((i) =>
              i.area_label === oldName ? { ...i, area_label: cleaned } : i
            ),
          };
        })
      );
    },
    [blocks, onBlocksChange]
  );

  const renameGroup = useCallback(
    (
      blockId: string,
      areaLabel: string | null,
      oldGroup: string | null,
      newGroup: string | null
    ) => {
      const cleaned = newGroup?.trim() || null;
      onBlocksChange(
        blocks.map((b) => {
          if (b.block.id !== blockId) return b;
          return {
            ...b,
            items: b.items.map((i) =>
              i.area_label === areaLabel && i.group_label === oldGroup
                ? { ...i, group_label: cleaned }
                : i
            ),
          };
        })
      );
    },
    [blocks, onBlocksChange]
  );

  // Totals
  const total =
    globalTotals.labor +
    globalTotals.subs +
    globalTotals.materials +
    globalTotals.other;
  const profitMargin = total > 0 ? (totalProfit / total) * 100 : 0;

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Sticky Summary Bar */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-4 -mx-1 px-1">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard label="Estimate Total" value={total} highlight />
            <SummaryCard
              label="Profit (Markup)"
              value={totalProfit}
              subtitle={`${profitMargin.toFixed(1)}% margin`}
              variant="success"
            />
            <SummaryCard
              label="Line Items"
              value={flatItems.length}
              subtitle={
                invalidCount > 0
                  ? `${invalidCount} need attention`
                  : "All valid"
              }
              isCount
            />
            <CategoryBreakdownCard totals={globalTotals} />
          </div>
        </div>

        {/* Budget Source Banner */}
        {isBudgetSourceLocked ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <span className="flex-1">
              This estimate is the active project budget.
            </span>
          </div>
        ) : (
          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-sm flex items-center justify-between gap-3",
              hasInvalidItems
                ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
                : "bg-muted/50 border-border"
            )}
          >
            <div className="flex items-center gap-2 flex-1">
              {hasInvalidItems && (
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              )}
              <span
                className={cn(
                  "text-sm",
                  hasInvalidItems
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-muted-foreground"
                )}
              >
                {hasInvalidItems
                  ? `${invalidCount} item${invalidCount > 1 ? "s" : ""} missing cost codes, quantities, or descriptions.`
                  : "Ready to make this your project budget?"}
              </span>
            </div>
            {onSetAsBudgetSource && (
              <button
                type="button"
                disabled={hasInvalidItems}
                onClick={onSetAsBudgetSource}
                className={cn(
                  "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-all shrink-0",
                  hasInvalidItems
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                )}
              >
                Set as Budget
              </button>
            )}
          </div>
        )}

        {/* Blocks */}
        {blocks.map((b) => (
          <BlockSection
            key={b.block.id}
            block={b}
            updateItem={updateItem}
            addItem={addItem}
            addAreaToBlock={addAreaToBlock}
            addGroupToArea={addGroupToArea}
            deleteItem={deleteItem}
            renameArea={renameArea}
            renameGroup={renameGroup}
          />
        ))}
      </div>
    </TooltipProvider>
  );
};

// ====== Block Section ======

interface BlockSectionProps {
  block: EstimateEditorBlock;
  updateItem: (
    blockId: string,
    itemId: string,
    patch: Partial<ScopeItem>
  ) => void;
  addItem: (
    blockId: string,
    area: string | null,
    group: string | null
  ) => void;
  addAreaToBlock: (blockId: string) => void;
  addGroupToArea: (blockId: string, areaLabel: string | null) => void;
  deleteItem: (blockId: string, itemId: string) => void;
  renameArea: (
    blockId: string,
    oldName: string | null,
    newName: string | null
  ) => void;
  renameGroup: (
    blockId: string,
    areaLabel: string | null,
    oldGroup: string | null,
    newGroup: string | null
  ) => void;
}

const BlockSection = memo(function BlockSection({
  block: b,
  updateItem,
  addItem,
  addAreaToBlock,
  addGroupToArea,
  deleteItem,
  renameArea,
  renameGroup,
}: BlockSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const areaGroups = useMemo(() => groupItemsByArea(b.items), [b.items]);
  const blockTotals = useMemo(
    () => computeCategoryTotals(b.items),
    [b.items]
  );
  const blockTotal =
    blockTotals.labor +
    blockTotals.subs +
    blockTotals.materials +
    blockTotals.other;

  // Check if any areas or groups are used
  const hasAreas = b.items.some((i) => i.area_label !== null);

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Block header */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 cursor-pointer select-none"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <div className="min-w-0">
            <div className="font-semibold text-foreground truncate">
              {b.block.title || "Untitled Section"}
            </div>
            {b.block.description && (
              <div className="text-xs text-muted-foreground truncate">
                {b.block.description}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs shrink-0">
          <ChipLabel label="LAB" amount={blockTotals.labor} />
          <ChipLabel label="SUBS" amount={blockTotals.subs} />
          <ChipLabel label="MAT" amount={blockTotals.materials} />
          <ChipLabel label="OTHER" amount={blockTotals.other} />
          <span className="text-muted-foreground hidden sm:inline">
            · {b.items.length} items · {formatCurrency(blockTotal)}
          </span>
        </div>
      </header>

      {!isCollapsed && (
        <>
          {/* Table header - desktop only */}
          <div className="hidden lg:grid grid-cols-[60px_minmax(120px,1fr)_minmax(180px,2fr)_65px_60px_75px_65px_85px_36px] gap-1.5 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border bg-muted/20">
            <div>Type</div>
            <div>Cost Code</div>
            <div>Description</div>
            <div className="text-right">Qty</div>
            <div>Unit</div>
            <div className="text-right">Rate</div>
            <div className="text-right">Markup</div>
            <div className="text-right">Total</div>
            <div></div>
          </div>

          {/* Areas */}
          {areaGroups.map((ag) => (
            <AreaSection
              key={ag.area ?? "_ungrouped"}
              blockId={b.block.id}
              areaGroup={ag}
              hasAreas={hasAreas}
              updateItem={updateItem}
              addItem={addItem}
              addGroupToArea={addGroupToArea}
              deleteItem={deleteItem}
              renameArea={renameArea}
              renameGroup={renameGroup}
            />
          ))}

          {/* Footer actions */}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2 bg-muted/10">
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      addAreaToBlock(b.block.id);
                    }}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Add Area
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs">
                    Use areas to group items by room or phase (e.g. Kitchen,
                    Primary Bath). Optional.
                  </p>
                </TooltipContent>
              </Tooltip>

              {!hasAreas && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    addItem(b.block.id, null, null);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </button>
              )}
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Section: {formatCurrency(blockTotal)}
            </span>
          </div>
        </>
      )}
    </section>
  );
});

// ====== Area Section ======

interface AreaSectionProps {
  blockId: string;
  areaGroup: AreaGroup;
  hasAreas: boolean;
  updateItem: (
    blockId: string,
    itemId: string,
    patch: Partial<ScopeItem>
  ) => void;
  addItem: (
    blockId: string,
    area: string | null,
    group: string | null
  ) => void;
  addGroupToArea: (blockId: string, areaLabel: string | null) => void;
  deleteItem: (blockId: string, itemId: string) => void;
  renameArea: (
    blockId: string,
    oldName: string | null,
    newName: string | null
  ) => void;
  renameGroup: (
    blockId: string,
    areaLabel: string | null,
    oldGroup: string | null,
    newGroup: string | null
  ) => void;
}

const AreaSection = memo(function AreaSection({
  blockId,
  areaGroup: ag,
  hasAreas,
  updateItem,
  addItem,
  addGroupToArea,
  deleteItem,
  renameArea,
  renameGroup,
}: AreaSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const areaTotals = useMemo(
    () => computeCategoryTotals(ag.items),
    [ag.items]
  );
  const areaTotal =
    areaTotals.labor +
    areaTotals.subs +
    areaTotals.materials +
    areaTotals.other;

  const subGroups = useMemo(() => groupItemsByGroup(ag.items), [ag.items]);
  const hasGroups = ag.items.some((i) => i.group_label !== null);

  // If no areas used, just show a flat list
  if (!hasAreas && ag.area === null) {
    return (
      <div className="px-2 py-1">
        {ag.items.map((item) => (
          <ItemRow
            key={item.id}
            blockId={blockId}
            item={item}
            updateItem={updateItem}
            deleteItem={deleteItem}
          />
        ))}
        <div className="px-2 py-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => addItem(blockId, null, null)}
          >
            <Plus className="h-3 w-3" />
            Add Item
          </button>
        </div>
      </div>
    );
  }

  const areaLabel = ag.area ?? "Ungrouped";

  return (
    <div className="border-b border-border/50 last:border-b-0">
      {/* Area header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-2 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {areaLabel}
          </span>
          {ag.area === null && (
            <span className="text-[11px] text-muted-foreground">
              (items without area)
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">
            ({ag.items.length})
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] shrink-0">
          <ChipLabel label="LAB" amount={areaTotals.labor} small />
          <ChipLabel label="SUBS" amount={areaTotals.subs} small />
          <ChipLabel label="MAT" amount={areaTotals.materials} small />
          <ChipLabel label="OTHER" amount={areaTotals.other} small />
          <span className="text-muted-foreground ml-1">
            {formatCurrency(areaTotal)}
          </span>
        </div>
      </button>

      {!isCollapsed && (
        <div className="px-2 py-1">
          {/* Editable area name */}
          {ag.area !== null && (
            <div className="px-2 pb-1">
              <input
                className="bg-transparent text-xs text-muted-foreground border-none outline-none px-1 py-0.5 rounded focus:bg-background focus:ring-1 focus:ring-ring w-36"
                defaultValue={areaLabel}
                placeholder="Area name"
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) =>
                  renameArea(blockId, ag.area, e.target.value || null)
                }
              />
            </div>
          )}

          {/* Groups or flat items */}
          {hasGroups ? (
            subGroups.map((sg) => (
              <GroupSection
                key={sg.group ?? "_nogroup"}
                blockId={blockId}
                areaLabel={ag.area}
                subGroup={sg}
                updateItem={updateItem}
                addItem={addItem}
                deleteItem={deleteItem}
                renameGroup={renameGroup}
              />
            ))
          ) : (
            <>
              {ag.items.map((item) => (
                <ItemRow
                  key={item.id}
                  blockId={blockId}
                  item={item}
                  updateItem={updateItem}
                  deleteItem={deleteItem}
                />
              ))}
            </>
          )}

          {/* Area footer */}
          <div className="px-2 py-2 flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => addItem(blockId, ag.area, null)}
            >
              <Plus className="h-3 w-3" />
              Add Item
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => addGroupToArea(blockId, ag.area)}
                >
                  <FolderOpen className="h-3 w-3" />
                  Add Group
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs">
                  Use groups inside an area (e.g. Demo, Framing, Finishes).
                  Optional.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
});

// ====== Group Section ======

interface GroupSectionProps {
  blockId: string;
  areaLabel: string | null;
  subGroup: SubGroup;
  updateItem: (
    blockId: string,
    itemId: string,
    patch: Partial<ScopeItem>
  ) => void;
  addItem: (
    blockId: string,
    area: string | null,
    group: string | null
  ) => void;
  deleteItem: (blockId: string, itemId: string) => void;
  renameGroup: (
    blockId: string,
    areaLabel: string | null,
    oldGroup: string | null,
    newGroup: string | null
  ) => void;
}

const GroupSection = memo(function GroupSection({
  blockId,
  areaLabel,
  subGroup: sg,
  updateItem,
  addItem,
  deleteItem,
  renameGroup,
}: GroupSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const groupTotals = useMemo(
    () => computeCategoryTotals(sg.items),
    [sg.items]
  );
  const groupTotal =
    groupTotals.labor +
    groupTotals.subs +
    groupTotals.materials +
    groupTotals.other;

  const groupLabel = sg.group ?? "Ungrouped";

  // Ungrouped items - no header
  if (sg.group === null) {
    return (
      <div>
        {sg.items.map((item) => (
          <ItemRow
            key={item.id}
            blockId={blockId}
            item={item}
            updateItem={updateItem}
            deleteItem={deleteItem}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="ml-4 border-l-2 border-border/50 mb-2">
      {/* Group header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <FolderOpen className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-foreground truncate">
            {groupLabel}
          </span>
          <span className="text-[10px] text-muted-foreground">
            ({sg.items.length})
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {formatCurrency(groupTotal)}
        </span>
      </button>

      {!isCollapsed && (
        <div className="pl-2">
          {/* Editable group name */}
          <div className="px-2 pb-1">
            <input
              className="bg-transparent text-[11px] text-muted-foreground border-none outline-none px-1 py-0.5 rounded focus:bg-background focus:ring-1 focus:ring-ring w-28"
              defaultValue={groupLabel}
              placeholder="Group name"
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) =>
                renameGroup(
                  blockId,
                  areaLabel,
                  sg.group,
                  e.target.value || null
                )
              }
            />
          </div>

          {sg.items.map((item) => (
            <ItemRow
              key={item.id}
              blockId={blockId}
              item={item}
              updateItem={updateItem}
              deleteItem={deleteItem}
            />
          ))}

          <div className="px-2 py-1.5">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => addItem(blockId, areaLabel, sg.group)}
            >
              <Plus className="h-2.5 w-2.5" />
              Add Item
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// ====== Item Row ======

interface ItemRowProps {
  blockId: string;
  item: ScopeItem;
  updateItem: (
    blockId: string,
    itemId: string,
    patch: Partial<ScopeItem>
  ) => void;
  deleteItem: (blockId: string, itemId: string) => void;
}

const ItemRow = memo(function ItemRow({
  blockId,
  item,
  updateItem,
  deleteItem,
}: ItemRowProps) {
  const total = computeItemTotal(item);
  const invalid = !isItemValid(item);
  const missingCostCode =
    !item.cost_code_id || item.cost_code_id === "UNASSIGNED";
  const missingDesc = !item.description?.trim();
  const missingQty = (item.quantity || 0) <= 0;

  const handleCostCodeChange = (codeId: string) => {
    updateItem(blockId, item.id, { cost_code_id: codeId });
  };

  const handleCategoryChange = (cat: BudgetCategory) => {
    updateItem(blockId, item.id, { category: cat });
  };

  return (
    <>
      {/* Desktop layout */}
      <div
        className={cn(
          "hidden lg:grid grid-cols-[60px_minmax(120px,1fr)_minmax(180px,2fr)_65px_60px_75px_65px_85px_36px] items-center gap-1.5 px-4 py-1 text-xs rounded-lg transition-colors",
          invalid
            ? "bg-destructive/5 hover:bg-destructive/10"
            : "hover:bg-muted/30"
        )}
      >
        {/* Category */}
        <select
          className={cn(
            "h-7 text-[11px] font-medium rounded border-0 bg-transparent cursor-pointer focus:ring-1 focus:ring-ring",
            CATEGORY_COLORS[item.category]
          )}
          value={item.category}
          onChange={(e) => handleCategoryChange(e.target.value as BudgetCategory)}
        >
          <option value="labor">LAB</option>
          <option value="subs">SUBS</option>
          <option value="materials">MAT</option>
          <option value="other">OTHER</option>
        </select>

        {/* Cost Code */}
        <CostCodeSelect
          value={item.cost_code_id}
          onChange={handleCostCodeChange}
          compact
          required
          error={missingCostCode ? "Required" : undefined}
        />

        {/* Description */}
        <input
          type="text"
          className={cn(
            "h-7 px-2 text-xs bg-transparent border rounded focus:ring-1 focus:ring-ring focus:border-ring transition-colors",
            missingDesc ? "border-destructive/50" : "border-border/50"
          )}
          value={item.description}
          placeholder="Description"
          onChange={(e) =>
            updateItem(blockId, item.id, { description: e.target.value })
          }
          onBlur={(e) =>
            updateItem(blockId, item.id, {
              description: e.target.value.trim(),
            })
          }
        />

        {/* Qty */}
        <input
          type="number"
          className={cn(
            "h-7 px-1.5 text-xs text-right bg-transparent border rounded focus:ring-1 focus:ring-ring focus:border-ring transition-colors tabular-nums",
            missingQty ? "border-destructive/50" : "border-border/50"
          )}
          value={item.quantity || ""}
          placeholder="0"
          min={0}
          onChange={(e) =>
            updateItem(blockId, item.id, {
              quantity: parseFloat(e.target.value) || 0,
            })
          }
        />

        {/* Unit */}
        <UnitSelect
          value={item.unit}
          onChange={(v) => updateItem(blockId, item.id, { unit: v })}
          className="h-7 text-xs"
        />

        {/* Rate */}
        <input
          type="number"
          className="h-7 px-1.5 text-xs text-right bg-transparent border border-border/50 rounded focus:ring-1 focus:ring-ring focus:border-ring transition-colors tabular-nums"
          value={item.unit_price || ""}
          placeholder="0"
          min={0}
          step={0.01}
          onChange={(e) =>
            updateItem(blockId, item.id, {
              unit_price: parseFloat(e.target.value) || 0,
            })
          }
        />

        {/* Markup */}
        <div className="relative">
          <input
            type="number"
            className="h-7 px-1.5 pr-4 w-full text-xs text-right bg-transparent border border-border/50 rounded focus:ring-1 focus:ring-ring focus:border-ring transition-colors tabular-nums"
            value={item.markup_percent || ""}
            placeholder="0"
            min={0}
            onChange={(e) =>
              updateItem(blockId, item.id, {
                markup_percent: parseFloat(e.target.value) || 0,
              })
            }
          />
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            %
          </span>
        </div>

        {/* Total */}
        <div className="text-right font-medium tabular-nums text-foreground">
          {formatCurrency(total)}
        </div>

        {/* Delete */}
        <button
          type="button"
          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
          onClick={() => deleteItem(blockId, item.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Mobile layout */}
      <div
        className={cn(
          "lg:hidden p-3 mb-2 rounded-xl border transition-colors",
          invalid
            ? "bg-destructive/5 border-destructive/20"
            : "bg-card border-border/50"
        )}
      >
        {/* Top row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <select
            className={cn(
              "h-7 px-2 text-[11px] font-medium rounded border-0 cursor-pointer",
              CATEGORY_COLORS[item.category]
            )}
            value={item.category}
            onChange={(e) =>
              handleCategoryChange(e.target.value as BudgetCategory)
            }
          >
            <option value="labor">LAB</option>
            <option value="subs">SUBS</option>
            <option value="materials">MAT</option>
            <option value="other">OTHER</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(total)}
            </span>
            <button
              type="button"
              className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
              onClick={() => deleteItem(blockId, item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Description */}
        <input
          type="text"
          className={cn(
            "w-full h-8 px-2 text-sm bg-transparent border rounded mb-2 focus:ring-1 focus:ring-ring focus:border-ring transition-colors",
            missingDesc ? "border-destructive/50" : "border-border/50"
          )}
          value={item.description}
          placeholder="Description"
          onChange={(e) =>
            updateItem(blockId, item.id, { description: e.target.value })
          }
          onBlur={(e) =>
            updateItem(blockId, item.id, {
              description: e.target.value.trim(),
            })
          }
        />

        {/* Cost Code */}
        <div className="mb-2">
          <CostCodeSelect
            value={item.cost_code_id}
            onChange={handleCostCodeChange}
            compact
            required
            error={missingCostCode ? "Required" : undefined}
          />
        </div>

        {/* Numbers grid */}
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">
              Qty
            </label>
            <input
              type="number"
              className={cn(
                "w-full h-7 px-1.5 text-xs text-right bg-transparent border rounded focus:ring-1 focus:ring-ring focus:border-ring transition-colors tabular-nums",
                missingQty ? "border-destructive/50" : "border-border/50"
              )}
              value={item.quantity || ""}
              placeholder="0"
              min={0}
              onChange={(e) =>
                updateItem(blockId, item.id, {
                  quantity: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">
              Unit
            </label>
            <UnitSelect
              value={item.unit}
              onChange={(v) => updateItem(blockId, item.id, { unit: v })}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">
              Rate
            </label>
            <input
              type="number"
              className="w-full h-7 px-1.5 text-xs text-right bg-transparent border border-border/50 rounded focus:ring-1 focus:ring-ring focus:border-ring transition-colors tabular-nums"
              value={item.unit_price || ""}
              placeholder="0"
              min={0}
              step={0.01}
              onChange={(e) =>
                updateItem(blockId, item.id, {
                  unit_price: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">
              Markup
            </label>
            <div className="relative">
              <input
                type="number"
                className="w-full h-7 px-1.5 pr-4 text-xs text-right bg-transparent border border-border/50 rounded focus:ring-1 focus:ring-ring focus:border-ring transition-colors tabular-nums"
                value={item.markup_percent || ""}
                placeholder="0"
                min={0}
                onChange={(e) =>
                  updateItem(blockId, item.id, {
                    markup_percent: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                %
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default ProjectEstimateEditor;
