import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BudgetCategorySummary {
  label: string;
  budget: number;
  actual: number;
}

export interface BudgetMiniOverviewProps {
  categories: BudgetCategorySummary[];
  onOpenBudget?: () => void;
}

function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={cn("h-1.5 bg-muted rounded-full overflow-hidden", className)}>
      <div 
        className={cn(
          "h-full transition-all duration-500 ease-out rounded-full",
          percent > 100 ? 'bg-red-500' : percent > 85 ? 'bg-amber-500' : 'bg-emerald-500'
        )}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

export function BudgetMiniOverview({ categories, onOpenBudget }: BudgetMiniOverviewProps) {
  const totalBudget = categories.reduce((sum, c) => sum + c.budget, 0);
  const totalActual = categories.reduce((sum, c) => sum + c.actual, 0);
  const totalVariance = totalBudget - totalActual;
  const totalPercent = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
  const overBudgetPercent = totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget) * 100 : 0;

  return (
    <Card className="rounded-xl border-border/60 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            Budget vs Actual
          </CardTitle>
          {onOpenBudget && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onOpenBudget}
              className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground gap-1"
            >
              View Budget
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Total Summary */}
        <div className="p-3 bg-muted/40 rounded-xl">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm font-medium">Total</span>
            <div className="text-right">
              <span className={cn(
                "text-base font-bold",
                totalVariance >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {totalVariance >= 0 ? '+' : ''}${totalVariance.toLocaleString()}
              </span>
              {totalVariance < 0 && (
                <span className="text-[10px] text-red-500 ml-1">
                  ({Math.abs(overBudgetPercent).toFixed(0)}% over)
                </span>
              )}
            </div>
          </div>
          <ProgressBar percent={totalPercent} className="mb-2" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>${totalActual.toLocaleString()} spent</span>
            <span>${totalBudget.toLocaleString()} budget</span>
          </div>
        </div>

        {/* Category Grid with separators */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {categories.map((cat, index) => {
            const variance = cat.budget - cat.actual;
            const percent = cat.budget > 0 ? (cat.actual / cat.budget) * 100 : 0;
            const isOver = variance < 0;
            const overPercent = cat.budget > 0 ? ((cat.actual - cat.budget) / cat.budget) * 100 : 0;

            return (
              <div 
                key={cat.label} 
                className={cn(
                  "space-y-1.5 py-2",
                  // Add top border for items in second row
                  index >= 2 && "border-t border-border/40 pt-3"
                )}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{cat.label}</span>
                  <div className="text-right">
                    <span className={cn(
                      "text-xs font-semibold",
                      isOver ? 'text-red-500' : 'text-emerald-600'
                    )}>
                      {isOver ? '' : '+'}${variance.toLocaleString()}
                    </span>
                    {isOver && (
                      <span className="text-[9px] text-red-400 ml-0.5">
                        ({Math.abs(overPercent).toFixed(0)}%)
                      </span>
                    )}
                  </div>
                </div>
                <ProgressBar percent={percent} className="h-1" />
                <div className="flex justify-between text-[9px] text-muted-foreground/70">
                  <span>B: ${cat.budget.toLocaleString()}</span>
                  <span>A: ${cat.actual.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
