// GroupHeader.tsx - Collapsible group header with category totals
import React, { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, FolderOpen, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type BudgetCategory = "labor" | "subs" | "materials" | "other";

interface CategoryTotals {
  labor: number;
  subs: number;
  materials: number;
  other: number;
}

interface GroupHeaderProps {
  groupLabel: string;
  itemCount: number;
  totals: CategoryTotals;
  isCollapsed: boolean;
  onToggle: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onAddItem: () => void;
}

const CATEGORY_COLORS: Record<BudgetCategory, string> = {
  labor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  subs: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  materials: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  other: "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300",
};

const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  labor: "LAB",
  subs: "SUBS",
  materials: "MAT",
  other: "OTHER",
};

function formatCurrency(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function GroupHeaderComponent({
  groupLabel,
  itemCount,
  totals,
  isCollapsed,
  onToggle,
  onRename,
  onDelete,
  onAddItem,
}: GroupHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(groupLabel);
  const [isHovered, setIsHovered] = useState(false);

  const total = totals.labor + totals.subs + totals.materials + totals.other;

  const handleBlur = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== groupLabel) {
      onRename(trimmed);
    } else {
      setEditValue(groupLabel);
    }
    setIsEditing(false);
  }, [editValue, groupLabel, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setEditValue(groupLabel);
      setIsEditing(false);
    }
  }, [handleBlur, groupLabel]);

  return (
    <div
      className="group ml-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 rounded-lg transition-all cursor-pointer",
          "bg-muted/40 hover:bg-muted/60",
          "border-l-2 border-primary/30"
        )}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </motion.div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">
                Group = trade or phase inside an area (Demo, Plumbing, Cabinets, Permit Fees). Optional.
              </p>
            </TooltipContent>
          </Tooltip>

          {isEditing ? (
            <input
              autoFocus
              className="flex-1 max-w-[160px] h-6 px-2 text-xs font-medium bg-background border border-ring rounded focus:outline-none focus:ring-2 focus:ring-ring"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="text-xs font-medium text-foreground truncate cursor-text hover:text-primary hover:underline underline-offset-2 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              title="Click to rename"
            >
              {groupLabel}
            </span>
          )}

          <span className="text-[10px] text-muted-foreground shrink-0">
            ({itemCount})
          </span>
        </div>

        {/* Category totals - compact */}
        <div className="hidden sm:flex items-center gap-1 mr-2">
          {(Object.entries(totals) as [BudgetCategory, number][])
            .filter(([, v]) => v > 0)
            .map(([cat, amt]) => (
              <span
                key={cat}
                className={cn(
                  "inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] font-medium",
                  CATEGORY_COLORS[cat]
                )}
              >
                {CATEGORY_LABELS[cat]} {formatCurrency(amt)}
              </span>
            ))}
        </div>

        {/* Total */}
        <span className="text-xs font-medium text-foreground tabular-nums mr-2">
          {formatCurrency(total)}
        </span>

        {/* Actions - visible on hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-0.5 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background rounded transition-colors"
                    onClick={onAddItem}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Add item to group</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Delete group and all items</TooltipContent>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export const GroupHeader = memo(GroupHeaderComponent);
