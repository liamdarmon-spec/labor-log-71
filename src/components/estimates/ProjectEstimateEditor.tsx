// ProjectEstimateEditor.tsx
// Clean, industry-standard hierarchy: SECTION → AREA → GROUP → ITEM
// With full drag & drop support using @dnd-kit

import React, { useMemo, useCallback, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AreaHeader } from "./AreaHeader";
import { GroupHeader } from "./GroupHeader";
import { ItemRow, ScopeItem } from "./ItemRow";
import { ReorderItemPayload, ReorderSectionPayload } from "@/hooks/useEstimateBlocks";

// ====== Types ======

export type BudgetCategory = "labor" | "subs" | "materials" | "other";

export interface ScopeBlock {
  id: string;
  title: string;
  description?: string | null;
  sort_order?: number | null;
}

export type { ScopeItem };

export interface EstimateEditorBlock {
  block: ScopeBlock;
  items: ScopeItem[];
}

interface EstimateEditorProps {
  blocks: EstimateEditorBlock[];
  isBudgetSourceLocked?: boolean;
  isBudgetSyncing?: boolean;
  onBlocksChange: (blocks: EstimateEditorBlock[]) => void;
  onSetAsBudgetSource?: () => void;
  onReorderItems?: (blockId: string, items: ReorderItemPayload[]) => void;
  onReorderSections?: (sections: ReorderSectionPayload[]) => void;
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
  const order: (string | null)[] = [];
  
  for (const item of items) {
    const key = item.area_label || null;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(item);
  }

  return order.map(area => ({ area, items: map.get(area)! }));
}

function groupItemsByGroup(items: ScopeItem[]): SubGroup[] {
  const map = new Map<string | null, ScopeItem[]>();
  const order: (string | null)[] = [];
  
  for (const item of items) {
    const key = item.group_label || null;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(item);
  }

  return order.map(group => ({ group, items: map.get(group)! }));
}

function computeCategoryTotals(items: ScopeItem[]): Record<BudgetCategory, number> {
  const totals: Record<BudgetCategory, number> = { labor: 0, subs: 0, materials: 0, other: 0 };
  for (const i of items) {
    const total = (i.quantity || 0) * (i.unit_price || 0) * (1 + (i.markup_percent || 0) / 100);
    totals[i.category] += total;
  }
  return totals;
}

function computeTotalProfit(items: ScopeItem[]): number {
  return items.reduce((sum, item) => {
    const base = (item.quantity || 0) * (item.unit_price || 0);
    return sum + base * ((item.markup_percent || 0) / 100);
  }, 0);
}

function isItemValid(item: ScopeItem): boolean {
  const hasCostCode = !!item.cost_code_id && item.cost_code_id !== "UNASSIGNED";
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
  subs: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
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

const SummaryCard = memo(function SummaryCard({
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
        "rounded-2xl p-4 border transition-all",
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
});

const CategoryBreakdownCard = memo(function CategoryBreakdownCard({
  totals,
}: {
  totals: Record<BudgetCategory, number>;
}) {
  const entries = useMemo(
    () => (Object.entries(totals) as [BudgetCategory, number][]).filter(([, v]) => v > 0),
    [totals]
  );

  return (
    <div className="rounded-2xl p-4 border bg-card border-border">
      <p className="text-xs font-medium text-muted-foreground mb-2">By Category</p>
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
});

// ====== Sortable Item Row Wrapper ======

interface SortableItemRowProps {
  item: ScopeItem;
  blockId: string;
  updateItem: (blockId: string, itemId: string, patch: Partial<ScopeItem>) => void;
  deleteItem: (blockId: string, itemId: string) => void;
}

const SortableItemRow = memo(function SortableItemRow({
  item,
  blockId,
  updateItem,
  deleteItem,
}: SortableItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group flex items-stretch",
        isDragging && "opacity-50 shadow-lg scale-[1.01] bg-background rounded-lg z-50"
      )}
    >
      {/* Drag handle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={setActivatorNodeRef}
            type="button"
            className={cn(
              "flex items-center justify-center w-6 shrink-0 cursor-grab active:cursor-grabbing",
              "text-muted-foreground/30 hover:text-muted-foreground transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded"
            )}
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          Drag to reorder
        </TooltipContent>
      </Tooltip>

      {/* Item content */}
      <div className="flex-1 min-w-0">
        <ItemRow
          item={item}
          onUpdate={(patch) => updateItem(blockId, item.id, patch)}
          onDelete={() => deleteItem(blockId, item.id)}
        />
      </div>
    </div>
  );
});

// ====== Main Component ======

export const ProjectEstimateEditor: React.FC<EstimateEditorProps> = ({
  blocks,
  isBudgetSourceLocked,
  isBudgetSyncing,
  onBlocksChange,
  onSetAsBudgetSource,
  onReorderItems,
  onReorderSections,
}) => {
  const [activeItemId, setActiveItemId] = useState<UniqueIdentifier | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<UniqueIdentifier | null>(null);

  const flatItems = useMemo(() => blocks.flatMap((b) => b.items), [blocks]);
  const globalTotals = useMemo(() => computeCategoryTotals(flatItems), [flatItems]);
  const totalProfit = useMemo(() => computeTotalProfit(flatItems), [flatItems]);
  const hasInvalidItems = useMemo(() => flatItems.some((i) => !isItemValid(i)), [flatItems]);
  const invalidCount = useMemo(() => flatItems.filter((i) => !isItemValid(i)).length, [flatItems]);

  // DnD sensors with activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px threshold before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Section IDs for sortable
  const sectionIds = useMemo(() => blocks.map((b) => b.block.id), [blocks]);

  // Find active item for drag overlay
  const activeItem = useMemo(() => {
    if (!activeItemId) return null;
    for (const block of blocks) {
      const item = block.items.find((i) => i.id === activeItemId);
      if (item) return item;
    }
    return null;
  }, [activeItemId, blocks]);

  // Find active section for drag overlay
  const activeSection = useMemo(() => {
    if (!activeSectionId) return null;
    return blocks.find((b) => b.block.id === activeSectionId) || null;
  }, [activeSectionId, blocks]);

  // Mutation helpers
  const updateItem = useCallback(
    (blockId: string, itemId: string, patch: Partial<ScopeItem>) => {
      onBlocksChange(
        blocks.map((b) => {
          if (b.block.id !== blockId) return b;
          return {
            ...b,
            items: b.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
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
          const maxSortOrder = Math.max(...b.items.map((i) => i.sort_order || 0), 0);
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
            sort_order: maxSortOrder + 10,
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
      const usedNames = new Set(block?.items.map((i) => i.area_label).filter(Boolean) as string[]);
      let name = "New Area";
      let idx = 2;
      while (usedNames.has(name)) name = `New Area ${idx++}`;
      addItem(blockId, name, null);
    },
    [blocks, addItem]
  );

  const addGroupToArea = useCallback(
    (blockId: string, areaLabel: string | null) => {
      const block = blocks.find((b) => b.block.id === blockId);
      const areaItems = block?.items.filter((i) => i.area_label === areaLabel);
      const usedGroups = new Set(areaItems?.map((i) => i.group_label).filter(Boolean) as string[]);
      let name = "New Group";
      let idx = 2;
      while (usedGroups.has(name)) name = `New Group ${idx++}`;
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

  const deleteArea = useCallback(
    (blockId: string, areaLabel: string | null) => {
      onBlocksChange(
        blocks.map((b) => {
          if (b.block.id !== blockId) return b;
          return { ...b, items: b.items.filter((i) => i.area_label !== areaLabel) };
        })
      );
    },
    [blocks, onBlocksChange]
  );

  const deleteGroup = useCallback(
    (blockId: string, areaLabel: string | null, groupLabel: string | null) => {
      onBlocksChange(
        blocks.map((b) => {
          if (b.block.id !== blockId) return b;
          return {
            ...b,
            items: b.items.filter(
              (i) => !(i.area_label === areaLabel && i.group_label === groupLabel)
            ),
          };
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
    (blockId: string, areaLabel: string | null, oldGroup: string | null, newGroup: string | null) => {
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

  // Section drag handlers
  const handleSectionDragStart = useCallback((event: DragStartEvent) => {
    setActiveSectionId(event.active.id);
  }, []);

  const handleSectionDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveSectionId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = blocks.findIndex((b) => b.block.id === active.id);
      const newIndex = blocks.findIndex((b) => b.block.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newBlocks = arrayMove(blocks, oldIndex, newIndex);
      
      // Update local state immediately (optimistic)
      onBlocksChange(newBlocks);

      // Persist to backend
      if (onReorderSections) {
        const payload: ReorderSectionPayload[] = newBlocks.map((b, idx) => ({
          id: b.block.id,
          sort_order: (idx + 1) * 10,
        }));
        onReorderSections(payload);
      }
    },
    [blocks, onBlocksChange, onReorderSections]
  );

  const total = globalTotals.labor + globalTotals.subs + globalTotals.materials + globalTotals.other;
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
              subtitle={invalidCount > 0 ? `${invalidCount} need attention` : "All valid"}
              isCount
            />
            <CategoryBreakdownCard totals={globalTotals} />
          </div>
        </div>

        {/* Budget Source Banner */}
        {isBudgetSourceLocked ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <span className="flex-1">This estimate is the active project budget.</span>
          </div>
        ) : (
          <div
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm flex items-center justify-between gap-3",
              hasInvalidItems
                ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
                : "bg-muted/50 border-border"
            )}
          >
            <div className="flex items-center gap-2 flex-1">
              {hasInvalidItems && <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
              <span className={cn("text-sm", hasInvalidItems ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
                {hasInvalidItems
                  ? `${invalidCount} item${invalidCount > 1 ? "s" : ""} missing cost codes, quantities, or descriptions.`
                  : "Ready to make this your project budget?"}
              </span>
            </div>
            {onSetAsBudgetSource && (
              <button
                type="button"
                disabled={hasInvalidItems || isBudgetSyncing}
                onClick={onSetAsBudgetSource}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all shrink-0",
                  hasInvalidItems || isBudgetSyncing
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                )}
              >
                {isBudgetSyncing && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {isBudgetSyncing ? "Syncing..." : "Set as Budget"}
              </button>
            )}
          </div>
        )}

        {/* Sections with DnD */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleSectionDragStart}
          onDragEnd={handleSectionDragEnd}
        >
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            {blocks.map((b) => (
              <SortableBlockSection
                key={b.block.id}
                block={b}
                updateItem={updateItem}
                addItem={addItem}
                addAreaToBlock={addAreaToBlock}
                addGroupToArea={addGroupToArea}
                deleteItem={deleteItem}
                deleteArea={deleteArea}
                deleteGroup={deleteGroup}
                renameArea={renameArea}
                renameGroup={renameGroup}
                onReorderItems={onReorderItems}
              />
            ))}
          </SortableContext>

          <DragOverlay>
            {activeSection && (
              <div className="opacity-90 shadow-2xl rounded-2xl border border-primary/30 bg-card overflow-hidden">
                <header className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                  <GripVertical className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold text-foreground">
                    {activeSection.block.title || "Untitled Section"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {activeSection.items.length} items
                  </span>
                </header>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </TooltipProvider>
  );
};

// ====== Sortable Block Section ======

interface SortableBlockSectionProps {
  block: EstimateEditorBlock;
  updateItem: (blockId: string, itemId: string, patch: Partial<ScopeItem>) => void;
  addItem: (blockId: string, area: string | null, group: string | null) => void;
  addAreaToBlock: (blockId: string) => void;
  addGroupToArea: (blockId: string, areaLabel: string | null) => void;
  deleteItem: (blockId: string, itemId: string) => void;
  deleteArea: (blockId: string, areaLabel: string | null) => void;
  deleteGroup: (blockId: string, areaLabel: string | null, groupLabel: string | null) => void;
  renameArea: (blockId: string, oldName: string | null, newName: string | null) => void;
  renameGroup: (blockId: string, areaLabel: string | null, oldGroup: string | null, newGroup: string | null) => void;
  onReorderItems?: (blockId: string, items: ReorderItemPayload[]) => void;
}

const SortableBlockSection = memo(function SortableBlockSection({
  block: b,
  updateItem,
  addItem,
  addAreaToBlock,
  addGroupToArea,
  deleteItem,
  deleteArea,
  deleteGroup,
  renameArea,
  renameGroup,
  onReorderItems,
}: SortableBlockSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeItemId, setActiveItemId] = useState<UniqueIdentifier | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: b.block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 40 : undefined,
  };

  const areaGroups = useMemo(() => groupItemsByArea(b.items), [b.items]);
  const blockTotals = useMemo(() => computeCategoryTotals(b.items), [b.items]);
  const blockTotal = blockTotals.labor + blockTotals.subs + blockTotals.materials + blockTotals.other;

  // Item IDs for sortable context (all items in this block)
  const itemIds = useMemo(() => b.items.map((i) => i.id), [b.items]);

  // DnD sensors for items
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Find active item for overlay
  const activeItem = useMemo(() => {
    if (!activeItemId) return null;
    return b.items.find((i) => i.id === activeItemId) || null;
  }, [activeItemId, b.items]);

  const handleItemDragStart = useCallback((event: DragStartEvent) => {
    setActiveItemId(event.active.id);
  }, []);

  const handleItemDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveItemId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = b.items.findIndex((i) => i.id === active.id);
      const newIndex = b.items.findIndex((i) => i.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Get target item's area and group
      const targetItem = b.items[newIndex];
      const movedItem = b.items[oldIndex];

      // Create new items array with reordered item
      const newItems = arrayMove(b.items, oldIndex, newIndex);

      // If moving to a different area/group, update the moved item's labels
      const updatedItems = newItems.map((item, idx) => {
        if (item.id === movedItem.id && (movedItem.area_label !== targetItem.area_label || movedItem.group_label !== targetItem.group_label)) {
          return {
            ...item,
            area_label: targetItem.area_label,
            group_label: targetItem.group_label,
            sort_order: (idx + 1) * 10,
          };
        }
        return {
          ...item,
          sort_order: (idx + 1) * 10,
        };
      });

      // Persist to backend
      if (onReorderItems) {
        const payload: ReorderItemPayload[] = updatedItems.map((item) => ({
          id: item.id,
          sort_order: item.sort_order || 0,
          area_label: item.area_label,
          group_label: item.group_label,
        }));
        onReorderItems(b.block.id, payload);
      }
    },
    [b.items, b.block.id, onReorderItems]
  );

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-2xl border border-border bg-card shadow-sm overflow-hidden",
        isDragging && "opacity-50 shadow-xl ring-2 ring-primary/20"
      )}
    >
      {/* Block header */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 cursor-pointer select-none"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Section drag handle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                ref={setActivatorNodeRef}
                type="button"
                className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded"
                onClick={(e) => e.stopPropagation()}
                {...attributes}
                {...listeners}
                aria-label="Drag to reorder section"
              >
                <GripVertical className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              Drag to reorder section
            </TooltipContent>
          </Tooltip>

          <motion.div animate={{ rotate: isCollapsed ? 0 : 90 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </motion.div>
          <div className="min-w-0">
            <div className="font-semibold text-foreground truncate">{b.block.title || "Untitled Section"}</div>
            {b.block.description && (
              <div className="text-xs text-muted-foreground truncate">{b.block.description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs shrink-0">
          {(Object.entries(blockTotals) as [BudgetCategory, number][])
            .filter(([, v]) => v > 0)
            .map(([cat, amt]) => (
              <span
                key={cat}
                className={cn(
                  "hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                  CATEGORY_COLORS[cat]
                )}
              >
                {CATEGORY_LABELS[cat]} {formatCurrency(amt)}
              </span>
            ))}
          <span className="text-muted-foreground">
            {b.items.length} items · {formatCurrency(blockTotal)}
          </span>
        </div>
      </header>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {/* Table header - desktop only */}
            <div className="hidden lg:grid grid-cols-[24px_60px_minmax(120px,1fr)_minmax(180px,2fr)_65px_60px_75px_65px_85px_36px] gap-1.5 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border bg-muted/20">
              <div></div>
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

            {/* Items with DnD context */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleItemDragStart}
              onDragEnd={handleItemDragEnd}
            >
              <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                <div className="divide-y divide-border/50">
                  {areaGroups.map((ag) => (
                    <AreaSection
                      key={ag.area ?? "_ungrouped"}
                      blockId={b.block.id}
                      areaGroup={ag}
                      updateItem={updateItem}
                      addItem={addItem}
                      addGroupToArea={addGroupToArea}
                      deleteItem={deleteItem}
                      deleteArea={deleteArea}
                      deleteGroup={deleteGroup}
                      renameArea={renameArea}
                      renameGroup={renameGroup}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeItem && (
                  <div className="opacity-95 shadow-2xl scale-[1.02] bg-background rounded-lg border border-primary/20">
                    <div className="flex items-stretch">
                      <div className="flex items-center justify-center w-6 shrink-0 text-primary">
                        <GripVertical className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0 py-2 px-2 text-sm">
                        <span className="font-medium">{activeItem.description || "New Item"}</span>
                        <span className="text-muted-foreground ml-2">
                          {formatCurrency(activeItem.line_total || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </DragOverlay>
            </DndContext>

            {/* Footer actions */}
            <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2 bg-muted/10">
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
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
                      Area = physical location (Kitchen, Bathroom, Exterior). Optional but enabled by default.
                    </p>
                  </TooltipContent>
                </Tooltip>

                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    addItem(b.block.id, null, null);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </button>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Section: {formatCurrency(blockTotal)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
});

// ====== Area Section ======

interface AreaSectionProps {
  blockId: string;
  areaGroup: AreaGroup;
  updateItem: (blockId: string, itemId: string, patch: Partial<ScopeItem>) => void;
  addItem: (blockId: string, area: string | null, group: string | null) => void;
  addGroupToArea: (blockId: string, areaLabel: string | null) => void;
  deleteItem: (blockId: string, itemId: string) => void;
  deleteArea: (blockId: string, areaLabel: string | null) => void;
  deleteGroup: (blockId: string, areaLabel: string | null, groupLabel: string | null) => void;
  renameArea: (blockId: string, oldName: string | null, newName: string | null) => void;
  renameGroup: (blockId: string, areaLabel: string | null, oldGroup: string | null, newGroup: string | null) => void;
}

const AreaSection = memo(function AreaSection({
  blockId,
  areaGroup: ag,
  updateItem,
  addItem,
  addGroupToArea,
  deleteItem,
  deleteArea,
  deleteGroup,
  renameArea,
  renameGroup,
}: AreaSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const areaTotals = useMemo(() => computeCategoryTotals(ag.items), [ag.items]);
  const subGroups = useMemo(() => groupItemsByGroup(ag.items), [ag.items]);

  // Ungrouped items (area_label === null) render flat
  if (ag.area === null) {
    const ungroupedItems = subGroups.find((sg) => sg.group === null)?.items || [];
    const groupedSubGroups = subGroups.filter((sg) => sg.group !== null);

    return (
      <div className="py-2">
        {/* Ungrouped section header */}
        <div className="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">Ungrouped</span>
          <span>{ag.items.length} items</span>
        </div>

        {/* Grouped items within ungrouped area */}
        {groupedSubGroups.map((sg) => (
          <GroupSubSection
            key={sg.group!}
            blockId={blockId}
            areaLabel={null}
            subGroup={sg}
            updateItem={updateItem}
            addItem={addItem}
            deleteItem={deleteItem}
            deleteGroup={deleteGroup}
            renameGroup={renameGroup}
          />
        ))}

        {/* Ungrouped items */}
        {ungroupedItems.map((item) => (
          <SortableItemRow
            key={item.id}
            item={item}
            blockId={blockId}
            updateItem={updateItem}
            deleteItem={deleteItem}
          />
        ))}

        {/* Add item button */}
        <div className="px-4 py-2">
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

  // Named area
  return (
    <div className="py-2">
      <div className="px-2">
        <AreaHeader
          areaLabel={ag.area}
          itemCount={ag.items.length}
          totals={areaTotals}
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          onRename={(newName) => renameArea(blockId, ag.area, newName)}
          onDelete={() => deleteArea(blockId, ag.area)}
          onAddItem={() => addItem(blockId, ag.area, null)}
          onAddGroup={() => addGroupToArea(blockId, ag.area)}
        />
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="mt-2"
          >
            {subGroups.map((sg) =>
              sg.group === null ? (
                // Ungrouped items within area
                <div key="_ungrouped" className="px-2">
                  {sg.items.map((item) => (
                    <SortableItemRow
                      key={item.id}
                      item={item}
                      blockId={blockId}
                      updateItem={updateItem}
                      deleteItem={deleteItem}
                    />
                  ))}
                </div>
              ) : (
                <GroupSubSection
                  key={sg.group}
                  blockId={blockId}
                  areaLabel={ag.area}
                  subGroup={sg}
                  updateItem={updateItem}
                  addItem={addItem}
                  deleteItem={deleteItem}
                  deleteGroup={deleteGroup}
                  renameGroup={renameGroup}
                />
              )
            )}
            
            {/* Add Item button at the bottom of area */}
            <div className="px-4 py-2 mt-1">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => addItem(blockId, ag.area, null)}
              >
                <Plus className="h-3 w-3" />
                Add Item
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ====== Group Sub-Section ======

interface GroupSubSectionProps {
  blockId: string;
  areaLabel: string | null;
  subGroup: SubGroup;
  updateItem: (blockId: string, itemId: string, patch: Partial<ScopeItem>) => void;
  addItem: (blockId: string, area: string | null, group: string | null) => void;
  deleteItem: (blockId: string, itemId: string) => void;
  deleteGroup: (blockId: string, areaLabel: string | null, groupLabel: string | null) => void;
  renameGroup: (blockId: string, areaLabel: string | null, oldGroup: string | null, newGroup: string | null) => void;
}

const GroupSubSection = memo(function GroupSubSection({
  blockId,
  areaLabel,
  subGroup: sg,
  updateItem,
  addItem,
  deleteItem,
  deleteGroup,
  renameGroup,
}: GroupSubSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const groupTotals = useMemo(() => computeCategoryTotals(sg.items), [sg.items]);

  if (!sg.group) return null;

  return (
    <div className="px-2 py-1">
      <GroupHeader
        groupLabel={sg.group}
        itemCount={sg.items.length}
        totals={groupTotals}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        onRename={(newName) => renameGroup(blockId, areaLabel, sg.group, newName)}
        onDelete={() => deleteGroup(blockId, areaLabel, sg.group)}
        onAddItem={() => addItem(blockId, areaLabel, sg.group)}
      />

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="ml-4 mt-1"
          >
            {sg.items.map((item) => (
              <SortableItemRow
                key={item.id}
                item={item}
                blockId={blockId}
                updateItem={updateItem}
                deleteItem={deleteItem}
              />
            ))}
            
            {/* Add Item button at the bottom of group */}
            <div className="py-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => addItem(blockId, areaLabel, sg.group)}
              >
                <Plus className="h-3 w-3" />
                Add Item
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default ProjectEstimateEditor;
