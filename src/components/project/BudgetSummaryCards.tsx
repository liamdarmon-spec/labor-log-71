import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { BudgetSummary } from '@/hooks/useUnifiedProjectBudget';

interface BudgetSummaryCardsProps {
  summary: BudgetSummary;
}

export const BudgetSummaryCards = ({ summary }: BudgetSummaryCardsProps) => {
  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600 dark:text-green-400';
    if (variance < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (variance < 0) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Budget */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">${summary.total_budget.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Baseline estimate</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Actual Cost */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Actual Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">${summary.total_actual.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Costs to date</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Variance */}
      <Card className={summary.total_variance < 0 ? 'border-destructive/50' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Budget Variance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-3xl font-bold ${getVarianceColor(summary.total_variance)}`}>
                ${Math.abs(summary.total_variance).toLocaleString()}
                {summary.total_variance < 0 && ' over'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {getVarianceIcon(summary.total_variance)}
                {summary.total_variance > 0 ? 'Under budget' : summary.total_variance < 0 ? 'Over budget' : 'On budget'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              summary.total_variance < 0 ? 'bg-destructive/10' : 'bg-green-500/10'
            }`}>
              {summary.total_variance < 0 ? (
                <AlertTriangle className="w-6 h-6 text-destructive" />
              ) : (
                <TrendingUp className="w-6 h-6 text-green-600" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
