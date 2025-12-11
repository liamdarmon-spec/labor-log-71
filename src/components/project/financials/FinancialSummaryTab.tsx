import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CreditCard,
  Package,
  Receipt,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUnifiedProjectBudget } from '@/hooks/useUnifiedProjectBudget';
import { useInvoicesSummary, useInvoices } from '@/hooks/useInvoices';
import { useNavigate } from 'react-router-dom';

interface FinancialSummaryTabProps {
  projectId: string;
}

export function FinancialSummaryTab({ projectId }: FinancialSummaryTabProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useUnifiedProjectBudget(projectId);
  const summary = data?.summary;
  const { data: invoiceSummary } = useInvoicesSummary({ projectId });
  const { data: invoices } = useInvoices({ projectId });

  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const percentConsumed =
    summary.total_budget > 0
      ? (summary.total_actual / summary.total_budget) * 100
      : 0;
  const isOverBudget = percentConsumed > 100;

  const metrics = [
    {
      label: 'Total Budget',
      value: summary.total_budget,
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Actual Cost',
      value: summary.total_actual,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Variance',
      // unified summary.total_variance = total_budget - total_actual
      value: Math.abs(summary.total_variance),
      icon: summary.total_variance >= 0 ? TrendingDown : TrendingUp,
      color: summary.total_variance >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: summary.total_variance >= 0 ? 'bg-green-50' : 'bg-red-50',
      subLabel: summary.total_variance >= 0 ? 'Under Budget' : 'Over Budget',
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
      value: summary.labor_unpaid,
      icon: CreditCard,
      color:
        summary.labor_unpaid > 0
          ? 'text-orange-600'
          : 'text-muted-foreground',
      bgColor:
        summary.labor_unpaid > 0 ? 'bg-orange-50' : 'bg-muted/50',
      subLabel:
        summary.labor_unpaid > 0 ? 'Requires Payment' : 'All Paid',
    },
    {
      label: 'Labor Spend',
      value: summary.labor_actual,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      subLabel: `${
        summary.labor_budget > 0
          ? ((summary.labor_actual / summary.labor_budget) * 100).toFixed(0)
          : 0
      }% of budget`,
    },
    {
      label: 'Material Spend',
      value: summary.materials_actual,
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      subLabel: `${
        summary.materials_budget > 0
          ? ((summary.materials_actual / summary.materials_budget) * 100).toFixed(0)
          : 0
      }% of budget`,
    },
    {
      label: 'Total Invoiced',
      value: invoiceSummary?.totalInvoiced || 0,
      icon: Receipt,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      subLabel: `${invoices?.length || 0} invoices`,
      clickable: true,
      onClick: () => navigate(`/projects/${projectId}?tab=billing`),
    },
    {
      label: 'Outstanding',
      value: invoiceSummary?.outstanding || 0,
      icon: AlertCircle,
      color: invoiceSummary && invoiceSummary.outstanding > 0 ? 'text-yellow-600' : 'text-muted-foreground',
      bgColor: invoiceSummary && invoiceSummary.outstanding > 0 ? 'bg-yellow-50' : 'bg-muted/50',
      subLabel: invoiceSummary && invoiceSummary.outstanding > 0 ? 'Requires Payment' : 'All Paid',
      clickable: true,
      onClick: () => navigate(`/projects/${projectId}?tab=billing`),
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
          const CardComponent = metric.clickable ? Button : 'div';
          const cardProps = metric.clickable 
            ? { 
                variant: 'ghost' as const,
                className: 'h-auto p-0 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg',
                onClick: metric.onClick,
              }
            : {
                className: 'overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg',
              };
          
          return (
            <Card key={index} {...cardProps}>
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
                  <p
                    className={`text-3xl font-bold ${metric.color} tracking-tight`}
                  >
                    {metric.suffix ? (
                      <>
                        {metric.value}
                        {metric.suffix}
                      </>
                    ) : (
                      <>
                        $
                        {typeof metric.value === 'number'
                          ? metric.value.toLocaleString()
                          : metric.value}
                      </>
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
