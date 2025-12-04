// AreaHeader.tsx - Collapsible area header with category totals
import React, { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Layers, Trash2, Plus, FolderPlus } from "lucide-react";
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

interface AreaHeaderProps {
  areaLabel: string;
  itemCount: number;
  totals: CategoryTotals;
  isCollapsed: boolean;
  onToggle: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onAddItem: () => void;
  onAddGroup: () => void;
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

function AreaHeaderComponent({
  areaLabel,
  itemCount,
  totals,
  isCollapsed,
  onToggle,
  onRename,
  onDelete,
  onAddItem,
  onAddGroup,
}: AreaHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(areaLabel);
  const [isHovered, setIsHovered] = useState(false);

  const total = totals.labor + totals.subs + totals.materials + totals.other;

  const handleBlur = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== areaLabel) {
      onRename(trimmed);
    } else {
      setEditValue(areaLabel);
    }
    setIsEditing(false);
  }, [editValue, areaLabel, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setEditValue(areaLabel);
      setIsEditing(false);
    }
  }, [handleBlur, areaLabel]);

  return (
    <div
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2.5 rounded-xl transition-all cursor-pointer",
          "bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/10",
          "border border-primary/10"
        )}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Layers className="h-4 w-4 text-primary/70 shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">
                Area = physical location (Kitchen, Bathroom, Exterior). Optional but enabled by default.
              </p>
            </TooltipContent>
          </Tooltip>

          {isEditing ? (
            <input
              autoFocus
              className="flex-1 max-w-[200px] h-7 px-2 text-sm font-medium bg-background border border-ring rounded focus:outline-none focus:ring-2 focus:ring-ring"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="text-sm font-semibold text-foreground truncate cursor-text hover:text-primary transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              {areaLabel}
            </span>
          )}

          <span className="text-xs text-muted-foreground shrink-0">
            ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
        </div>

        {/* Category totals */}
        <div className="hidden sm:flex items-center gap-1.5 mr-2">
          {(Object.entries(totals) as [BudgetCategory, number][])
            .filter(([, v]) => v > 0)
            .map(([cat, amt]) => (
              <span
                key={cat}
                className={cn(
                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                  CATEGORY_COLORS[cat]
                )}
              >
                {CATEGORY_LABELS[cat]} {formatCurrency(amt)}
              </span>
            ))}
        </div>

        {/* Total */}
        <span className="text-sm font-semibold text-foreground tabular-nums mr-2">
          {formatCurrency(total)}
        </span>

        {/* Actions - visible on hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-1 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    onClick={onAddItem}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Add item to area</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    onClick={onAddGroup}
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Add group to area</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Delete area and all items</TooltipContent>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export const AreaHeader = memo(AreaHeaderComponent);
