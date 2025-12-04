// ItemRow.tsx - Clean item row with category, cost code, description, qty, unit, rate, markup, total
import React, { memo, useState, useCallback, useEffect, useMemo } from "react";
import { Trash2 } from "lucide-react";
import { CostCodeSelect } from "@/components/cost-codes/CostCodeSelect";
import { UnitSelect } from "@/components/shared/UnitSelect";
import { cn } from "@/lib/utils";

export type BudgetCategory = "labor" | "subs" | "materials" | "other";

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
  sort_order?: number;
}

interface ItemRowProps {
  item: ScopeItem;
  onUpdate: (patch: Partial<ScopeItem>) => void;
  onDelete: () => void;
}

const CATEGORY_COLORS: Record<BudgetCategory, string> = {
  labor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  subs: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  materials: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  other: "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300",
};

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function ItemRowComponent({ item, onUpdate, onDelete }: ItemRowProps) {
  // Local state for blur-to-save pattern
  const [localDesc, setLocalDesc] = useState(item.description);
  const [localQty, setLocalQty] = useState(String(item.quantity || ""));
  const [localRate, setLocalRate] = useState(String(item.unit_price || ""));
  const [localMarkup, setLocalMarkup] = useState(String(item.markup_percent || ""));

  // Sync when item changes externally
  useEffect(() => {
    setLocalDesc(item.description);
    setLocalQty(String(item.quantity || ""));
    setLocalRate(String(item.unit_price || ""));
    setLocalMarkup(String(item.markup_percent || ""));
  }, [item.id, item.description, item.quantity, item.unit_price, item.markup_percent]);

  // Compute total from local values for instant feedback
  const localTotal = useMemo(() => {
    const qty = parseFloat(localQty) || 0;
    const rate = parseFloat(localRate) || 0;
    const markup = parseFloat(localMarkup) || 0;
    return qty * rate * (1 + markup / 100);
  }, [localQty, localRate, localMarkup]);

  // Validation
  const missingCostCode = !item.cost_code_id || item.cost_code_id === "UNASSIGNED";
  const missingDesc = !localDesc?.trim();
  const missingQty = (parseFloat(localQty) || 0) <= 0;
  const invalid = missingCostCode || missingDesc || missingQty;

  // Handlers
  const handleCategoryChange = useCallback((cat: BudgetCategory) => {
    onUpdate({ category: cat });
  }, [onUpdate]);

  const handleCostCodeChange = useCallback((codeId: string) => {
    onUpdate({ cost_code_id: codeId });
  }, [onUpdate]);

  const handleDescBlur = useCallback(() => {
    const trimmed = localDesc?.trim() || "";
    if (trimmed !== item.description) {
      onUpdate({ description: trimmed });
    }
  }, [localDesc, item.description, onUpdate]);

  const handleQtyBlur = useCallback(() => {
    const val = parseFloat(localQty) || 0;
    if (val !== item.quantity) {
      onUpdate({ quantity: val });
    }
  }, [localQty, item.quantity, onUpdate]);

  const handleRateBlur = useCallback(() => {
    const val = parseFloat(localRate) || 0;
    if (val !== item.unit_price) {
      onUpdate({ unit_price: val });
    }
  }, [localRate, item.unit_price, onUpdate]);

  const handleMarkupBlur = useCallback(() => {
    const val = parseFloat(localMarkup) || 0;
    if (val !== item.markup_percent) {
      onUpdate({ markup_percent: val });
    }
  }, [localMarkup, item.markup_percent, onUpdate]);

  const handleUnitChange = useCallback((unit: string) => {
    onUpdate({ unit });
  }, [onUpdate]);

  return (
    <>
      {/* Desktop layout */}
      <div
        className={cn(
          "hidden lg:grid grid-cols-[60px_minmax(120px,1fr)_minmax(180px,2fr)_65px_60px_75px_65px_85px_36px] items-center gap-1.5 px-4 py-1.5 text-xs transition-colors",
          invalid ? "bg-destructive/5" : "hover:bg-muted/30"
        )}
      >
        {/* Category Type selector */}
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
          value={localDesc}
          placeholder="Description"
          onChange={(e) => setLocalDesc(e.target.value)}
          onBlur={handleDescBlur}
        />

        {/* Qty */}
        <input
          type="number"
          className={cn(
            "h-7 px-1.5 text-xs text-right bg-transparent border rounded focus:ring-1 focus:ring-ring focus:border-ring transition-colors tabular-nums",
            missingQty ? "border-destructive/50" : "border-border/50"
          )}
          value={localQty}
          placeholder="0"
          min={0}
          onChange={(e) => setLocalQty(e.target.value)}
          onBlur={handleQtyBlur}
        />

        {/* Unit */}
        <UnitSelect
          value={item.unit}
          onChange={handleUnitChange}
          className="h-7 text-xs"
        />

        {/* Rate */}
        <input
          type="number"
          className="h-7 px-1.5 text-xs text-right bg-transparent border border-border/50 rounded focus:ring-1 focus:ring-ring focus:border-ring transition-colors tabular-nums"
          value={localRate}
          placeholder="0"
          min={0}
          step={0.01}
          onChange={(e) => setLocalRate(e.target.value)}
          onBlur={handleRateBlur}
        />

        {/* Markup */}
        <div className="relative">
          <input
            type="number"
            className="h-7 px-1.5 pr-4 w-full text-xs text-right bg-transparent border border-border/50 rounded focus:ring-1 focus:ring-ring focus:border-ring transition-colors tabular-nums"
            value={localMarkup}
            placeholder="0"
            min={0}
            onChange={(e) => setLocalMarkup(e.target.value)}
            onBlur={handleMarkupBlur}
          />
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            %
          </span>
        </div>

        {/* Total */}
        <div className="text-right font-medium tabular-nums text-foreground">
          {formatCurrency(localTotal)}
        </div>

        {/* Delete */}
        <button
          type="button"
          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Mobile layout */}
      <div
        className={cn(
          "lg:hidden p-3 mb-2 rounded-xl border transition-colors",
          invalid ? "bg-destructive/5 border-destructive/20" : "bg-card border-border/50"
        )}
      >
        {/* Top row: category + total + delete */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <select
            className={cn(
              "h-7 px-2 text-[11px] font-medium rounded border-0 cursor-pointer",
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
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(localTotal)}
            </span>
            <button
              type="button"
              className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
              onClick={onDelete}
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
          value={localDesc}
          placeholder="Description"
          onChange={(e) => setLocalDesc(e.target.value)}
          onBlur={handleDescBlur}
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
            <label className="text-[10px] text-muted-foreground block mb-0.5">Qty</label>
            <input
              type="number"
              className={cn(
                "w-full h-7 px-1.5 text-xs text-right bg-transparent border rounded focus:ring-1 focus:ring-ring focus:border-ring transition-colors tabular-nums",
                missingQty ? "border-destructive/50" : "border-border/50"
              )}
              value={localQty}
              placeholder="0"
              min={0}
              onChange={(e) => setLocalQty(e.target.value)}
              onBlur={handleQtyBlur}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">Unit</label>
            <UnitSelect
              value={item.unit}
              onChange={handleUnitChange}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">Rate</label>
            <input
              type="number"
              className="w-full h-7 px-1.5 text-xs text-right bg-transparent border border-border/50 rounded focus:ring-1 focus:ring-ring focus:border-ring transition-colors tabular-nums"
              value={localRate}
              placeholder="0"
              min={0}
              step={0.01}
              onChange={(e) => setLocalRate(e.target.value)}
              onBlur={handleRateBlur}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">Markup</label>
            <div className="relative">
              <input
                type="number"
                className="w-full h-7 px-1.5 pr-4 text-xs text-right bg-transparent border border-border/50 rounded focus:ring-1 focus:ring-ring focus:border-ring transition-colors tabular-nums"
                value={localMarkup}
                placeholder="0"
                min={0}
                onChange={(e) => setLocalMarkup(e.target.value)}
                onBlur={handleMarkupBlur}
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
}

export const ItemRow = memo(ItemRowComponent);
