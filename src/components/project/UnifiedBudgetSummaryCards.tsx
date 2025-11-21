import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { BudgetSummary, BudgetCategory } from "@/hooks/useUnifiedProjectBudget";

interface UnifiedBudgetSummaryCardsProps {
  summary: BudgetSummary;
  selectedCategory: BudgetCategory | 'all';
  onCategorySelect: (category: BudgetCategory | 'all') => void;
}

export function UnifiedBudgetSummaryCards({ 
  summary, 
  selectedCategory,
  onCategorySelect 
}: UnifiedBudgetSummaryCardsProps) {
  const cards = [
    {
      id: 'all' as const,
      title: 'Total Budget',
      budget: summary.total_budget,
      actual: summary.total_actual,
      variance: summary.total_variance,
    },
    {
      id: 'labor' as const,
      title: 'Labor',
      budget: summary.labor_budget,
      actual: summary.labor_actual,
      variance: summary.labor_variance,
    },
    {
      id: 'subs' as const,
      title: 'Subs',
      budget: summary.subs_budget,
      actual: summary.subs_actual,
      variance: summary.subs_variance,
    },
    {
      id: 'materials' as const,
      title: 'Materials',
      budget: summary.materials_budget,
      actual: summary.materials_actual,
      variance: summary.materials_variance,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const isSelected = selectedCategory === card.id;
        const varianceColor = card.variance >= 0 
          ? 'text-green-600 dark:text-green-400' 
          : 'text-destructive';
        const variancePercent = card.budget > 0 
          ? ((card.variance / card.budget) * 100).toFixed(1) 
          : '0.0';

        return (
          <Card 
            key={card.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isSelected ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onCategorySelect(card.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted-foreground">Budget:</span>
                <span className="text-lg font-bold">${card.budget.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted-foreground">Actual:</span>
                <span className="text-lg font-semibold">${card.actual.toFixed(0)}</span>
              </div>
              <div className="pt-1 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {card.variance >= 0 ? (
                      <TrendingDown className="w-3 h-3" />
                    ) : (
                      <TrendingUp className="w-3 h-3" />
                    )}
                    Variance:
                  </span>
                  <span className={`text-sm font-bold ${varianceColor}`}>
                    ${Math.abs(card.variance).toFixed(0)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  ({variancePercent}%)
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
