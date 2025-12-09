/**
 * VarianceCell - Standard display for budget vs actual variance
 * 
 * North Star Alignment:
 * - "Operator sees exactly where money and time are leaking — live"
 * - "If the budget is correct, the entire business is correct"
 */

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface VarianceCellProps {
  budget: number;
  actual: number;
  /** Show as currency or hours */
  type?: "currency" | "hours";
  /** Show percentage alongside absolute value */
  showPercent?: boolean;
  /** Invert the logic (e.g., for revenue where over is good) */
  invertColors?: boolean;
  className?: string;
}

export function VarianceCell({
  budget,
  actual,
  type = "currency",
  showPercent = false,
  invertColors = false,
  className,
}: VarianceCellProps) {
  const variance = budget - actual;
  const isOver = variance < 0;
  const isUnder = variance > 0;
  const isOnBudget = Math.abs(variance) < 0.01;
  
  const percentVariance = budget > 0 
    ? ((actual - budget) / budget) * 100 
    : 0;

  // Color logic: red = bad, green = good
  // For costs: over budget = bad (red), under budget = good (green)
  // For revenue: over = good (green), under = bad (red) — use invertColors
  const isBad = invertColors ? isUnder : isOver;
  const isGood = invertColors ? isOver : isUnder;

  const formatValue = (value: number) => {
    if (type === "currency") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.abs(value));
    }
    return `${Math.abs(value).toFixed(1)}h`;
  };

  if (isOnBudget) {
    return (
      <div className={cn("flex items-center gap-1 text-muted-foreground", className)}>
        <Minus className="w-3 h-3" />
        <span className="tabular-nums">On budget</span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-1 tabular-nums font-medium",
        isBad && "text-destructive",
        isGood && "text-success",
        className
      )}
    >
      {isBad ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      <span>
        {isOver ? "+" : "-"}
        {formatValue(variance)}
      </span>
      {showPercent && (
        <span className="text-xs opacity-70">
          ({Math.abs(percentVariance).toFixed(0)}%)
        </span>
      )}
    </div>
  );
}

/**
 * Compact variance badge for tight spaces
 */
export function VarianceBadge({
  budget,
  actual,
  className,
}: {
  budget: number;
  actual: number;
  className?: string;
}) {
  const variance = budget - actual;
  const isOver = variance < 0;
  const percent = budget > 0 ? ((actual - budget) / budget) * 100 : 0;
  
  if (Math.abs(percent) < 1) {
    return (
      <span className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        "bg-muted text-muted-foreground",
        className
      )}>
        On track
      </span>
    );
  }

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      isOver 
        ? "bg-destructive/10 text-destructive" 
        : "bg-success/10 text-success",
      className
    )}>
      {isOver ? "+" : "-"}{Math.abs(percent).toFixed(0)}%
    </span>
  );
}

/**
 * Progress bar showing budget utilization
 */
export function BudgetProgressBar({
  budget,
  actual,
  className,
  showLabels = true,
}: {
  budget: number;
  actual: number;
  className?: string;
  showLabels?: boolean;
}) {
  const percent = budget > 0 ? (actual / budget) * 100 : 0;
  const isOver = percent > 100;
  const cappedPercent = Math.min(percent, 100);

  return (
    <div className={cn("space-y-1", className)}>
      {showLabels && (
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            ${actual.toLocaleString()} of ${budget.toLocaleString()}
          </span>
          <span className={cn(
            "font-medium",
            isOver ? "text-destructive" : "text-muted-foreground"
          )}>
            {percent.toFixed(0)}%
          </span>
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            isOver ? "bg-destructive" : percent > 80 ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${cappedPercent}%` }}
        />
      </div>
    </div>
  );
}
