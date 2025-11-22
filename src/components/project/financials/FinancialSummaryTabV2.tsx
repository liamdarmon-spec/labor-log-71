import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjectFinancialsV2 } from '@/hooks/useProjectFinancialsV2';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Users, Building2, Package } from 'lucide-react';

interface FinancialSummaryTabV2Props {
  projectId: string;
}

export function FinancialSummaryTabV2({ projectId }: FinancialSummaryTabV2Props) {
  const { data: financials, isLoading } = useProjectFinancialsV2(projectId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!financials) return null;

  const isOverBudget = financials.variance < 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Financial Overview</h2>
        <p className="text-muted-foreground">
          Real-time project costs vs. budget
        </p>
      </div>

      {/* Top Row - Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${financials.totalBudget.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From estimate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actual Cost</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${financials.actualCost.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All categories
            </p>
          </CardContent>
        </Card>

        <Card className={isOverBudget ? 'border-red-500' : 'border-green-500'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance</CardTitle>
            {isOverBudget ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingUp className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
              ${Math.abs(financials.variance).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isOverBudget ? 'Over budget' : 'Under budget'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Consumed</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financials.percentConsumed.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Of total budget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Category Spend */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Labor</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${financials.unpaidLabor.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Outstanding
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Labor Spend</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${financials.laborActual.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Budget: ${financials.laborBudget.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Material Spend</CardTitle>
            <Package className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${financials.materialsActual.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Budget: ${financials.materialsBudget.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subcontract Spend</CardTitle>
            <Building2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${financials.subsActual.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Budget: ${financials.subsBudget.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
