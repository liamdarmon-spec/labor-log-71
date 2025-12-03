// ProjectEstimateEditor.tsx
// Best-in-class grouped estimate editor using scope_blocks + scope_block_cost_items
// Block → Area → Item, with 4-way cost category & cost code integration.

import React, { useMemo, useCallback } from "react";
import { GripVertical, Plus, Trash2, ChevronDown } from "lucide-react";
import { CostCodeSelect } from "@/components/cost-codes/CostCodeSelect";
import { UnitSelect } from "@/components/shared/UnitSelect";
import { cn } from "@/lib/utils";

// ====== Types – mapped to scope_blocks + scope_block_cost_items ======

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
  area_label: string | null;   // e.g. "Demo", "Shower", "Flooring"
  group_label: string | null;  // reserved for future subgrouping
  category: BudgetCategory;    // 4-way: labor / subs / materials / other
  cost_code_id: string | null; // FK → cost_codes.id
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  markup_percent: number;
  line_total: number;          // can be recomputed on the fly
  hasError?: boolean;
  errorMessage?: string;
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

function groupItemsByArea(items: ScopeItem[]): AreaGroup[] {
  const map = new Map<string | null, ScopeItem[]>();

  for (const item of items) {
    const key = item.area_label || null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  const groups: AreaGroup[] = [];
  for (const [area, areaItems] of map.entries()) {
    const sorted = [...areaItems].sort((a, b) => a.id.localeCompare(b.id));
    groups.push({ area, items: sorted });
  }

  return groups.sort((a, b) => {
    if (a.area === b.area) return 0;
    if (a.area === null) return 1;
    if (b.area === null) return -1;
    return a.area.localeCompare(b.area);
  });
}

function computeItemTotal(item: ScopeItem): number {
  const base = (item.quantity || 0) * (item.unit_price || 0);
  const markup = item.markup_percent ? base * (item.markup_percent / 100) : 0;
  return base + markup;
}

function computeCategoryTotals(items: ScopeItem[]): Record<BudgetCategory, number> {
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

function isItemValid(item: ScopeItem): boolean {
  const hasCostCode = !!item.cost_code_id && item.cost_code_id !== "UNASSIGNED";
  const qtyValid = (item.quantity || 0) > 0;
  return hasCostCode && qtyValid && !!item.description.trim();
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "$0.00";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

// ====== Top-level component ======

export const ProjectEstimateEditor: React.FC<EstimateEditorProps> = ({
  blocks,
  isBudgetSourceLocked,
  onBlocksChange,
  onSetAsBudgetSource,
}) => {
  const flatItems = useMemo(() => blocks.flatMap((b) => b.items), [blocks]);
  const globalTotals = useMemo(() => computeCategoryTotals(flatItems), [flatItems]);
  const hasInvalidItems = useMemo(() => flatItems.some((i) => !isItemValid(i)), [flatItems]);

  // ---------- mutation helpers (immutable) ----------

  const updateItem = useCallback(
    (blockId: string, itemId: string, patch: Partial<ScopeItem>) => {
      const next = blocks.map((b) => {
        if (b.block.id !== blockId) return b;
        return {
          ...b,
          items: b.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
        };
      });
      onBlocksChange(next);
    },
    [blocks, onBlocksChange]
  );

  const addItemToArea = useCallback(
    (blockId: string, area: string | null) => {
      const next = blocks.map((b) => {
        if (b.block.id !== blockId) return b;
        const newItem: ScopeItem = {
          id: crypto.randomUUID(),
          scope_block_id: blockId,
          area_label: area,
          group_label: null,
          category: "labor",
          cost_code_id: null,
          description: "New Item",
          quantity: 1,
          unit: "ea",
          unit_price: 0,
          markup_percent: 0,
          line_total: 0,
        };
        return { ...b, items: [...b.items, newItem] };
      });
      onBlocksChange(next);
    },
    [blocks, onBlocksChange]
  );

  const addAreaToBlock = useCallback(
    (blockId: string) => {
      const baseName = "New Area";
      const block = blocks.find((b) => b.block.id === blockId);
      const usedNames = new Set(
        block?.items.map((i) => i.area_label).filter(Boolean) as string[]
      );
      let name = baseName;
      let idx = 2;
      while (usedNames.has(name)) {
        name = `${baseName} ${idx++}`;
      }
      addItemToArea(blockId, name);
    },
    [blocks, addItemToArea]
  );

  const deleteItem = useCallback(
    (blockId: string, itemId: string) => {
      const next = blocks.map((b) => {
        if (b.block.id !== blockId) return b;
        return { ...b, items: b.items.filter((i) => i.id !== itemId) };
      });
      onBlocksChange(next);
    },
    [blocks, onBlocksChange]
  );

  const renameArea = useCallback(
    (blockId: string, oldName: string | null, newName: string | null) => {
      const cleaned = newName?.trim() || null;
      const next = blocks.map((b) => {
        if (b.block.id !== blockId) return b;
        return {
          ...b,
          items: b.items.map((i) =>
            i.area_label === oldName ? { ...i, area_label: cleaned } : i
          ),
        };
      });
      onBlocksChange(next);
    },
    [blocks, onBlocksChange]
  );

  // ---------- global totals ----------

  const subtotal =
    globalTotals.labor + globalTotals.subs + globalTotals.materials + globalTotals.other;
  const tax = 0; // reserved for future tax logic
  const total = subtotal + tax;

  return (
    <div className="space-y-4">
      {/* Top Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
        <SummaryCard label="Subtotal" value={subtotal} />
        <SummaryCard label="Tax" value={tax} />
        <SummaryCard label="Total" value={total} highlight />
        <SummaryCard label="Items" value={flatItems.length} isCount />
        <CategorySummaryCard totals={globalTotals} />
      </div>

      {/* Budget Source Banner */}
      {isBudgetSourceLocked ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 flex items-center justify-between">
          <span>This estimate is already the active project budget.</span>
        </div>
      ) : (
        <div className="mb-4 rounded-lg border px-3 py-2 text-xs flex items-center justify-between bg-muted/50 border-border">
          <span className={cn(hasInvalidItems && "text-destructive")}>
            {hasInvalidItems
              ? "Some items are missing cost codes, quantities, or descriptions. Fix these before using this estimate as the project budget."
              : "Ready to make this your live project budget?"}
          </span>
          {onSetAsBudgetSource && (
            <button
              type="button"
              disabled={hasInvalidItems}
              onClick={onSetAsBudgetSource}
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
                hasInvalidItems
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              Set as Budget Source
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
          addItemToArea={addItemToArea}
          addAreaToBlock={addAreaToBlock}
          deleteItem={deleteItem}
          renameArea={renameArea}
        />
      ))}
    </div>
  );
};

// ====== Block Section ======

interface BlockSectionProps {
  block: EstimateEditorBlock;
  updateItem: (blockId: string, itemId: string, patch: Partial<ScopeItem>) => void;
  addItemToArea: (blockId: string, area: string | null) => void;
  addAreaToBlock: (blockId: string) => void;
  deleteItem: (blockId: string, itemId: string) => void;
  renameArea: (blockId: string, oldName: string | null, newName: string | null) => void;
}

const BlockSection: React.FC<BlockSectionProps> = ({
  block: b,
  updateItem,
  addItemToArea,
  addAreaToBlock,
  deleteItem,
  renameArea,
}) => {
  const groups = groupItemsByArea(b.items);
  const blockTotals = computeCategoryTotals(b.items);

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Block header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium text-foreground">
              {b.block.title || "Untitled Section"}
            </div>
            {b.block.description && (
              <div className="text-xs text-muted-foreground">{b.block.description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <ChipLabel label="LAB" amount={blockTotals.labor} />
          <ChipLabel label="SUBS" amount={blockTotals.subs} />
          <ChipLabel label="MAT" amount={blockTotals.materials} />
          <ChipLabel label="OTHER" amount={blockTotals.other} />
          <span className="text-muted-foreground">· {b.items.length} items</span>
        </div>
      </header>

      {/* Table header - hidden on mobile */}
      <div className="hidden lg:grid grid-cols-[minmax(0,120px)_minmax(0,180px)_minmax(0,1fr)_80px_80px_90px_80px_90px_60px] px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border">
        <div>Area</div>
        <div>Category / Cost Code</div>
        <div>Description</div>
        <div className="text-right">Qty</div>
        <div>Unit</div>
        <div className="text-right">Rate</div>
        <div className="text-right">Markup %</div>
        <div className="text-right">Total</div>
        <div></div>
      </div>

      {/* Areas & rows */}
      {groups.map((g) => (
        <AreaGroupSection
          key={g.area ?? "ungrouped"}
          blockId={b.block.id}
          group={g}
          updateItem={updateItem}
          addItemToArea={addItemToArea}
          deleteItem={deleteItem}
          renameArea={renameArea}
        />
      ))}

      {/* Add area */}
      <div className="px-4 py-3 border-t border-border flex justify-between items-center">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => addAreaToBlock(b.block.id)}
        >
          <Plus className="h-3 w-3" />
          Add Area
        </button>
      </div>
    </section>
  );
};

// ====== Area Group Section ======

interface AreaGroupSectionProps {
  blockId: string;
  group: AreaGroup;
  updateItem: (blockId: string, itemId: string, patch: Partial<ScopeItem>) => void;
  addItemToArea: (blockId: string, area: string | null) => void;
  deleteItem: (blockId: string, itemId: string) => void;
  renameArea: (blockId: string, oldName: string | null, newName: string | null) => void;
}

const AreaGroupSection: React.FC<AreaGroupSectionProps> = ({
  blockId,
  group: g,
  updateItem,
  addItemToArea,
  deleteItem,
  renameArea,
}) => {
  const areaTotals = computeCategoryTotals(g.items);
  const areaLabel = g.area ?? "Ungrouped";

  return (
    <div className="px-2 py-2">
      {/* Area header */}
      <div className="flex items-center justify-between px-2 py-1 mb-1 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
          <input
            className="bg-transparent text-sm font-medium text-foreground border-none outline-none px-1 rounded-md focus:bg-background focus:ring-1 focus:ring-ring"
            defaultValue={areaLabel}
            onBlur={(e) => renameArea(blockId, g.area, e.target.value || null)}
          />
          {g.area === null && (
            <span className="text-[11px] text-muted-foreground">(items without an area)</span>
          )}
        </div>
        <div className="hidden md:flex items-center gap-2 text-[11px]">
          <ChipLabel label="LAB" amount={areaTotals.labor} small />
          <ChipLabel label="SUBS" amount={areaTotals.subs} small />
          <ChipLabel label="MAT" amount={areaTotals.materials} small />
          <ChipLabel label="OTHER" amount={areaTotals.other} small />
        </div>
      </div>

      {/* Rows */}
      {g.items.map((item) => (
        <ItemRow
          key={item.id}
          blockId={blockId}
          item={item}
          updateItem={updateItem}
          deleteItem={deleteItem}
        />
      ))}

      {/* Add item inside area */}
      <div className="px-2 py-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => addItemToArea(blockId, g.area)}
        >
          <Plus className="h-3 w-3" />
          Add Item
        </button>
      </div>
    </div>
  );
};

// ====== Item Row ======

interface ItemRowProps {
  blockId: string;
  item: ScopeItem;
  updateItem: (blockId: string, itemId: string, patch: Partial<ScopeItem>) => void;
  deleteItem: (blockId: string, itemId: string) => void;
}

const ItemRow: React.FC<ItemRowProps> = ({ blockId, item, updateItem, deleteItem }) => {
  const total = computeItemTotal(item);
  const invalid = !isItemValid(item);

  return (
    <>
      {/* Desktop layout */}
      <div
        className={cn(
          "hidden lg:grid grid-cols-[minmax(0,120px)_minmax(0,180px)_minmax(0,1fr)_80px_80px_90px_80px_90px_60px] items-center gap-2 px-2 py-1 text-xs",
          invalid && "bg-destructive/10"
        )}
      >
        <input
          className="w-full rounded-lg border border-input px-2 py-1 text-xs bg-background"
          value={item.area_label ?? ""}
          placeholder="Area"
          onChange={(e) => updateItem(blockId, item.id, { area_label: e.target.value || null })}
        />

        <div className="flex items-center gap-1">
          <select
            className="h-7 rounded-full border border-input bg-muted px-2 text-[11px]"
            value={item.category}
            onChange={(e) =>
              updateItem(blockId, item.id, { category: e.target.value as BudgetCategory })
            }
          >
            <option value="labor">LAB</option>
            <option value="subs">SUBS</option>
            <option value="materials">MAT</option>
            <option value="other">OTHER</option>
          </select>

          <div className="flex-1 min-w-0">
            <CostCodeSelect
              value={item.cost_code_id}
              onChange={(val) => updateItem(blockId, item.id, { cost_code_id: val })}
              error={!item.cost_code_id ? "Required" : undefined}
            />
          </div>
        </div>

        <input
          className="w-full rounded-lg border border-input px-2 py-1 text-xs bg-background"
          value={item.description}
          onChange={(e) => updateItem(blockId, item.id, { description: e.target.value })}
        />

        <input
          type="number"
          min={0}
          className="w-full text-right rounded-lg border border-input px-2 py-1 bg-background"
          value={item.quantity}
          onChange={(e) =>
            updateItem(blockId, item.id, { quantity: Number(e.target.value || 0) })
          }
        />

        <UnitSelect
          value={item.unit}
          onChange={(val) => updateItem(blockId, item.id, { unit: val })}
        />

        <input
          type="number"
          className="w-full text-right rounded-lg border border-input px-2 py-1 bg-background"
          value={item.unit_price}
          onChange={(e) =>
            updateItem(blockId, item.id, { unit_price: Number(e.target.value || 0) })
          }
        />

        <input
          type="number"
          className="w-full text-right rounded-lg border border-input px-2 py-1 bg-background"
          value={item.markup_percent}
          onChange={(e) =>
            updateItem(blockId, item.id, { markup_percent: Number(e.target.value || 0) })
          }
        />

        <div className="text-right font-medium text-foreground">{formatCurrency(total)}</div>

        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors"
          onClick={() => deleteItem(blockId, item.id)}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Mobile layout */}
      <div
        className={cn(
          "lg:hidden p-3 mb-2 rounded-lg border border-border",
          invalid && "bg-destructive/10"
        )}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <select
              className="h-7 rounded-full border border-input bg-muted px-2 text-[11px]"
              value={item.category}
              onChange={(e) =>
                updateItem(blockId, item.id, { category: e.target.value as BudgetCategory })
              }
            >
              <option value="labor">LAB</option>
              <option value="subs">SUBS</option>
              <option value="materials">MAT</option>
              <option value="other">OTHER</option>
            </select>
            <span className="text-sm font-medium">{formatCurrency(total)}</span>
          </div>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-destructive/20 text-destructive"
            onClick={() => deleteItem(blockId, item.id)}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-2">
          <input
            className="w-full rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
            value={item.description}
            placeholder="Description"
            onChange={(e) => updateItem(blockId, item.id, { description: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-2">
            <CostCodeSelect
              value={item.cost_code_id}
              onChange={(val) => updateItem(blockId, item.id, { cost_code_id: val })}
              error={!item.cost_code_id ? "Required" : undefined}
            />
            <input
              className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
              value={item.area_label ?? ""}
              placeholder="Area"
              onChange={(e) =>
                updateItem(blockId, item.id, { area_label: e.target.value || null })
              }
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            <input
              type="number"
              min={0}
              className="text-right rounded-lg border border-input px-2 py-1.5 bg-background"
              value={item.quantity}
              placeholder="Qty"
              onChange={(e) =>
                updateItem(blockId, item.id, { quantity: Number(e.target.value || 0) })
              }
            />
            <UnitSelect
              value={item.unit}
              onChange={(val) => updateItem(blockId, item.id, { unit: val })}
            />
            <input
              type="number"
              className="text-right rounded-lg border border-input px-2 py-1.5 bg-background"
              value={item.unit_price}
              placeholder="Rate"
              onChange={(e) =>
                updateItem(blockId, item.id, { unit_price: Number(e.target.value || 0) })
              }
            />
            <input
              type="number"
              className="text-right rounded-lg border border-input px-2 py-1.5 bg-background"
              value={item.markup_percent}
              placeholder="%"
              onChange={(e) =>
                updateItem(blockId, item.id, { markup_percent: Number(e.target.value || 0) })
              }
            />
          </div>
        </div>
      </div>
    </>
  );
};

// ====== Small shared UI bits ======

interface SummaryCardProps {
  label: string;
  value: number;
  highlight?: boolean;
  isCount?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, highlight, isCount }) => (
  <div
    className={cn(
      "rounded-2xl border border-border bg-card px-4 py-3 flex flex-col justify-between",
      highlight && "border-primary shadow-md"
    )}
  >
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={cn("mt-1 text-lg font-semibold", highlight && "text-foreground")}>
      {isCount ? value : formatCurrency(value)}
    </span>
  </div>
);

const CategorySummaryCard: React.FC<{ totals: Record<BudgetCategory, number> }> = ({
  totals,
}) => (
  <div className="col-span-2 md:col-span-1 rounded-2xl border border-border bg-card px-4 py-3 flex flex-col justify-between">
    <span className="text-xs text-muted-foreground">By Category</span>
    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
      <CategoryPill label="Labor" amount={totals.labor} />
      <CategoryPill label="Subs" amount={totals.subs} />
      <CategoryPill label="Materials" amount={totals.materials} />
      <CategoryPill label="Other" amount={totals.other} />
    </div>
  </div>
);

const CategoryPill: React.FC<{ label: string; amount: number }> = ({ label, amount }) => (
  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">
    <span className="mr-1 text-muted-foreground">{label}:</span>
    <span className="font-medium text-foreground">{formatCurrency(amount)}</span>
  </span>
);

const ChipLabel: React.FC<{ label: string; amount: number; small?: boolean }> = ({
  label,
  amount,
  small,
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full bg-muted px-2",
      small ? "py-0.5 text-[10px]" : "py-1 text-[11px]"
    )}
  >
    <span className="mr-1 uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="font-semibold text-foreground">{formatCurrency(amount)}</span>
  </span>
);

export default ProjectEstimateEditor;
