import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  GripVertical,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EstimateCostItemRow, CostItem } from "./EstimateCostItemRow";

interface EstimateSectionCardProps {
  id: string;
  title: string | null;
  items: CostItem[];
  onTitleChange: (title: string) => void;
  onAddItem: (groupLabel?: string | null) => void;
  onUpdateItem: (itemId: string, updates: Partial<CostItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteSection: () => void;
  isOnlySection: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  labor: "bg-blue-500/10 text-blue-700 border-blue-200",
  subs: "bg-orange-500/10 text-orange-700 border-orange-200",
  materials: "bg-green-500/10 text-green-700 border-green-200",
  other: "bg-gray-500/10 text-gray-700 border-gray-200",
};

interface GroupBucket {
  groupLabel: string | null;
  items: CostItem[];
}

function groupItemsByLabel(items: CostItem[]): GroupBucket[] {
  const groups: GroupBucket[] = [];
  let currentLabel: string | null | undefined = undefined;
  let currentGroup: GroupBucket | null = null;

  for (const item of items) {
    const label = item.group_label ?? null;

    if (currentGroup && currentLabel === label) {
      currentGroup.items.push(item);
    } else {
      currentLabel = label;
      currentGroup = { groupLabel: label, items: [item] };
      groups.push(currentGroup);
    }
  }

  return groups;
}

interface GroupBlockProps {
  groupLabel: string | null;
  items: CostItem[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRenameGroup: (newLabel: string) => void;
  onAddItem: () => void;
  onUpdateItem: (itemId: string, updates: Partial<CostItem>) => void;
  onDeleteItem: (itemId: string) => void;
}

function GroupBlock({
  groupLabel,
  items,
  isCollapsed,
  onToggleCollapse,
  onRenameGroup,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: GroupBlockProps) {
  const [labelDraft, setLabelDraft] = useState<string | null>(null);

  const groupTotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.line_total || 0), 0),
    [items]
  );

  const formatMoney = (value: number) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleLabelBlur = useCallback(() => {
    if (labelDraft !== null && labelDraft !== (groupLabel ?? "")) {
      onRenameGroup(labelDraft);
    }
    setLabelDraft(null);
  }, [labelDraft, groupLabel, onRenameGroup]);

  // Ungrouped items - render without header
  if (groupLabel === null) {
    return (
      <div className="divide-y">
        {items.map((item) => (
          <EstimateCostItemRow
            key={item.id}
            item={item}
            onUpdate={(updates) => onUpdateItem(item.id, updates)}
            onDelete={() => onDeleteItem(item.id)}
          />
        ))}
      </div>
    );
  }

  // Grouped items - render with header
  return (
    <Collapsible open={!isCollapsed} onOpenChange={() => onToggleCollapse()}>
      <div className="border-t border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 px-4 py-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </CollapsibleTrigger>

          <FolderOpen className="h-4 w-4 text-primary/70" />

          <Input
            value={labelDraft ?? groupLabel}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={handleLabelBlur}
            onKeyDown={(e) => e.key === "Enter" && handleLabelBlur()}
            placeholder="Group Name"
            className="flex-1 h-7 text-sm font-medium border-none shadow-none px-2 bg-transparent focus-visible:ring-1 max-w-[200px]"
          />

          <div className="flex items-center gap-2 ml-auto">
            <Badge variant="outline" className="text-xs font-mono">
              {formatMoney(groupTotal)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>
        </div>
      </div>

      <CollapsibleContent>
        <div className="divide-y">
          {items.map((item) => (
            <EstimateCostItemRow
              key={item.id}
              item={item}
              onUpdate={(updates) => onUpdateItem(item.id, updates)}
              onDelete={() => onDeleteItem(item.id)}
            />
          ))}
        </div>

        {/* Add Item to Group */}
        <div className="px-4 py-2 bg-muted/10 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddItem}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add to {groupLabel}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function EstimateSectionCard({
  id,
  title,
  items,
  onTitleChange,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onDeleteSection,
  isOnlySection,
}: EstimateSectionCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const sectionTotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.line_total || 0), 0),
    [items]
  );

  // Category breakdown for section
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    for (const item of items) {
      const cat = item.category || "other";
      breakdown[cat] = (breakdown[cat] || 0) + (item.line_total || 0);
    }
    return breakdown;
  }, [items]);

  // Group items by group_label
  const grouped = useMemo(() => groupItemsByLabel(items), [items]);

  const handleTitleBlur = useCallback(() => {
    if (titleDraft !== null && titleDraft !== title) {
      onTitleChange(titleDraft);
    }
    setTitleDraft(null);
  }, [titleDraft, title, onTitleChange]);

  const handleToggleGroupCollapse = useCallback((label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  const handleRenameGroup = useCallback(
    (oldLabel: string | null, newLabel: string) => {
      // Update all items in the group with the new label
      const targetItems = items.filter((i) => (i.group_label ?? null) === oldLabel);
      const finalLabel = newLabel.trim() || null;
      for (const item of targetItems) {
        onUpdateItem(item.id, { group_label: finalLabel });
      }
    },
    [items, onUpdateItem]
  );

  const formatMoney = (value: number) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="py-3 px-4 bg-muted/30 border-b sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>

            <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />

            <Input
              value={titleDraft ?? title ?? ""}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Section Title"
              className="flex-1 text-base font-semibold border-none shadow-none px-2 h-8 bg-transparent focus-visible:ring-1"
            />

            <div className="flex items-center gap-2 shrink-0">
              {/* Category breakdown badges */}
              <div className="hidden md:flex items-center gap-1">
                {Object.entries(categoryBreakdown).map(([cat, amount]) => (
                  <Badge
                    key={cat}
                    variant="outline"
                    className={cn("text-[10px] px-1.5", CATEGORY_COLORS[cat])}
                  >
                    {cat.slice(0, 3).toUpperCase()}: {formatMoney(amount)}
                  </Badge>
                ))}
              </div>

              <Badge variant="secondary" className="text-sm font-mono">
                {formatMoney(sectionTotal)}
              </Badge>

              <span className="text-xs text-muted-foreground">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>

              {!isOnlySection && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={onDeleteSection}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-0">
            {/* Table Header - Hidden on mobile */}
            <div className="hidden lg:grid grid-cols-[80px_100px_140px_1fr_70px_70px_90px_70px_90px_70px] gap-2 px-4 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
              <div>Area</div>
              <div>Category</div>
              <div>Cost Code</div>
              <div>Description</div>
              <div className="text-right">Qty</div>
              <div>Unit</div>
              <div className="text-right">Rate</div>
              <div className="text-right">Markup</div>
              <div className="text-right">Total</div>
              <div className="text-center">Details</div>
            </div>

            {/* Grouped Cost Items */}
            {grouped.map((group, idx) => (
              <GroupBlock
                key={group.groupLabel ?? `ungrouped-${idx}`}
                groupLabel={group.groupLabel}
                items={group.items}
                isCollapsed={group.groupLabel ? collapsedGroups.has(group.groupLabel) : false}
                onToggleCollapse={() => group.groupLabel && handleToggleGroupCollapse(group.groupLabel)}
                onRenameGroup={(newLabel) => handleRenameGroup(group.groupLabel, newLabel)}
                onAddItem={() => onAddItem(group.groupLabel)}
                onUpdateItem={onUpdateItem}
                onDeleteItem={onDeleteItem}
              />
            ))}

            {items.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                No items in this section. Click "Add Item" to get started.
              </div>
            )}

            {/* Add Item Button (section-level, adds to ungrouped) */}
            <div className="p-3 border-t bg-muted/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddItem(null)}
                className="w-full border border-dashed hover:border-primary hover:bg-primary/5"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
