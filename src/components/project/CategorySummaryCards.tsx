import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Hammer, Package, MoreHorizontal } from 'lucide-react';
import { BudgetSummary, BudgetCategory } from '@/hooks/useUnifiedProjectBudget';

interface CategorySummaryCardsProps {
  summary: BudgetSummary;
  selectedCategory: BudgetCategory | 'all';
  onCategorySelect: (category: BudgetCategory | 'all') => void;
}

export const CategorySummaryCards = ({ summary, selectedCategory, onCategorySelect }: CategorySummaryCardsProps) => {
  const categories = [
    {
      id: 'labor' as const,
      label: 'Labor',
      icon: Users,
      budget: summary.labor_budget,
      actual: summary.labor_actual,
      variance: summary.labor_variance,
      color: 'blue',
    },
    {
      id: 'subs' as const,
      label: 'Subs',
      icon: Hammer,
      budget: summary.subs_budget,
      actual: summary.subs_actual,
      variance: summary.subs_variance,
      color: 'purple',
    },
    {
      id: 'materials' as const,
      label: 'Materials',
      icon: Package,
      budget: summary.materials_budget,
      actual: summary.materials_actual,
      variance: summary.materials_variance,
      color: 'orange',
    },
    {
      id: 'other' as const,
      label: 'Other',
      icon: MoreHorizontal,
      budget: summary.other_budget,
      actual: summary.other_actual,
      variance: summary.other_variance,
      color: 'gray',
    },
  ];

  const getColorClasses = (color: string, isSelected: boolean) => {
    if (isSelected) {
      return {
        card: `border-${color}-500 bg-${color}-50/50 dark:bg-${color}-950/20`,
        icon: `bg-${color}-500`,
        iconText: 'text-white',
      };
    }
    return {
      card: 'hover:border-border/80 cursor-pointer',
      icon: `bg-${color}-500/10`,
      iconText: `text-${color}-500`,
    };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {categories.map((category) => {
        const isSelected = selectedCategory === category.id;
        const Icon = category.icon;
        const colorClasses = getColorClasses(category.color, isSelected);

        return (
          <Card
            key={category.id}
            className={`transition-all ${colorClasses.card}`}
            onClick={() => onCategorySelect(isSelected ? 'all' : category.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{category.label}</CardTitle>
                <div className={`w-8 h-8 rounded-lg ${colorClasses.icon} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${colorClasses.iconText}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Budget:</span>
                <span className="text-sm font-semibold">${category.budget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Actual:</span>
                <span className="text-sm font-semibold">${category.actual.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-xs text-muted-foreground">Variance:</span>
                <span className={`text-sm font-bold ${
                  category.variance > 0 ? 'text-green-600 dark:text-green-400' :
                  category.variance < 0 ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  ${Math.abs(category.variance).toLocaleString()}
                  {category.variance < 0 && ' over'}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
