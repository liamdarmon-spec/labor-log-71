import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, ChevronRight } from 'lucide-react';

export interface BudgetCategorySummary {
  label: string;
  budget: number;
  actual: number;
}

export interface BudgetMiniOverviewProps {
  categories: BudgetCategorySummary[];
  onOpenBudget?: () => void;
}

export function BudgetMiniOverview({ categories, onOpenBudget }: BudgetMiniOverviewProps) {
  const totalBudget = categories.reduce((sum, c) => sum + c.budget, 0);
  const totalActual = categories.reduce((sum, c) => sum + c.actual, 0);
  const totalVariance = totalBudget - totalActual;
  const totalPercent = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Budget vs Actual
          </CardTitle>
          {onOpenBudget && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onOpenBudget}
              className="text-xs h-7 text-muted-foreground hover:text-foreground"
            >
              View Budget
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Summary */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Total</span>
            <span className={`text-sm font-semibold ${totalVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {totalVariance >= 0 ? '+' : '-'}${Math.abs(totalVariance).toLocaleString()}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${
                totalPercent > 100 ? 'bg-red-500' : totalPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(totalPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>${totalActual.toLocaleString()} spent</span>
            <span>${totalBudget.toLocaleString()} budget</span>
          </div>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => {
            const variance = cat.budget - cat.actual;
            const percent = cat.budget > 0 ? (cat.actual / cat.budget) * 100 : 0;
            const isOver = variance < 0;

            return (
              <div key={cat.label} className="space-y-2 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{cat.label}</span>
                  <span className={`text-xs font-semibold ${isOver ? 'text-red-600' : 'text-emerald-600'}`}>
                    {isOver ? '-' : '+'}${Math.abs(variance).toLocaleString()}
                  </span>
                </div>
                {/* Mini progress bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      percent > 100 ? 'bg-red-500' : percent > 80 ? 'bg-amber-500' : 'bg-primary/70'
                    }`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Budget: ${cat.budget.toLocaleString()}</span>
                  <span>Actual: ${cat.actual.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
