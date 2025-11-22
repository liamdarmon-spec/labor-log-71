import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, CreditCard, Package } from 'lucide-react';
import { useProjectBudgetLedger } from '@/hooks/useProjectBudgetLedger';
import { Skeleton } from '@/components/ui/skeleton';

interface FinancialSummaryTabProps {
  projectId: string;
}

export function FinancialSummaryTab({ projectId }: FinancialSummaryTabProps) {
  const { data, isLoading } = useProjectBudgetLedger(projectId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { summary } = data;
  const percentConsumed = summary.totalBudget > 0 ? (summary.totalActual / summary.totalBudget) * 100 : 0;
  const isOverBudget = percentConsumed > 100;

  const metrics = [
    {
      label: 'Total Budget',
      value: summary.totalBudget,
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Actual Cost',
      value: summary.totalActual,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Variance',
      value: Math.abs(summary.totalVariance),
      icon: summary.totalVariance >= 0 ? TrendingUp : TrendingDown,
      color: summary.totalVariance >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: summary.totalVariance >= 0 ? 'bg-green-50' : 'bg-red-50',
      subLabel: summary.totalVariance >= 0 ? 'Under Budget' : 'Over Budget',
    },
    {
      label: 'Percent Consumed',
      value: percentConsumed.toFixed(1),
      suffix: '%',
      icon: AlertCircle,
      color: isOverBudget ? 'text-orange-600' : 'text-muted-foreground',
      bgColor: isOverBudget ? 'bg-orange-50' : 'bg-muted/50',
      subLabel: isOverBudget ? 'Over 100%' : 'On Track',
    },
    {
      label: 'Unpaid Labor',
      value: summary.unpaidLabor,
      icon: CreditCard,
      color: summary.unpaidLabor > 0 ? 'text-orange-600' : 'text-muted-foreground',
      bgColor: summary.unpaidLabor > 0 ? 'bg-orange-50' : 'bg-muted/50',
      subLabel: summary.unpaidLabor > 0 ? 'Requires Payment' : 'All Paid',
    },
    {
      label: 'Labor Spend',
      value: summary.byCategory.labor.actual,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      subLabel: `${summary.byCategory.labor.budget > 0 ? ((summary.byCategory.labor.actual / summary.byCategory.labor.budget) * 100).toFixed(0) : 0}% of budget`,
    },
    {
      label: 'Material Spend',
      value: summary.byCategory.materials.actual,
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      subLabel: `${summary.byCategory.materials.budget > 0 ? ((summary.byCategory.materials.actual / summary.byCategory.materials.budget) * 100).toFixed(0) : 0}% of budget`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Financial Overview</h3>
        <p className="text-muted-foreground">
          Real-time project financial metrics and cost tracking
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card 
              key={index} 
              className="overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${metric.bgColor}`}>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className={`text-3xl font-bold ${metric.color} tracking-tight`}>
                    {metric.suffix ? (
                      <>{metric.value}{metric.suffix}</>
                    ) : (
                      <>${typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}</>
                    )}
                  </p>
                  {metric.subLabel && (
                    <p className="text-xs text-muted-foreground">
                      {metric.subLabel}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
