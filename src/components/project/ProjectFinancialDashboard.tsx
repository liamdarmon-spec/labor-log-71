import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle,
  RefreshCw,
  Briefcase,
  Receipt,
  Users
} from 'lucide-react';
import { useProjectFinancialsSnapshot, useRecalculateProjectFinancials } from '@/hooks/useProjectFinancials';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectFinancialDashboardProps {
  projectId: string;
}

export function ProjectFinancialDashboard({ projectId }: ProjectFinancialDashboardProps) {
  const { data: snapshot, isLoading } = useProjectFinancialsSnapshot(projectId);
  const recalculate = useRecalculateProjectFinancials();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No financial data available</h3>
          <p className="text-muted-foreground mb-4">
            Financial calculations will appear here once cost data is recorded
          </p>
          <Button onClick={() => recalculate.mutate(projectId)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Calculate Financials
          </Button>
        </CardContent>
      </Card>
    );
  }

  const profitColor = snapshot.profit_amount >= 0 ? 'text-green-600' : 'text-red-600';
  const profitIcon = snapshot.profit_amount >= 0 ? TrendingUp : TrendingDown;
  const ProfitIcon = profitIcon;

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Profit
              <ProfitIcon className={`w-4 h-4 ${profitColor}`} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${profitColor}`}>
              ${Math.abs(snapshot.profit_amount).toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {snapshot.profit_percent.toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Revenue
              <DollarSign className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${snapshot.billed_to_date.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-1">Billed to date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Total Costs
              <Briefcase className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${snapshot.actual_cost_total.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <div>Labor: ${snapshot.actual_cost_labor.toLocaleString()}</div>
              <div>Subs: ${snapshot.actual_cost_subs.toLocaleString()}</div>
              <div>Materials: ${snapshot.actual_cost_materials.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Open AR
              <Receipt className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${snapshot.open_ar.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Retention: ${snapshot.retention_held.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown Donuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Actual</CardTitle>
            <CardDescription>Overall project performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Budget</span>
                  <span className="font-semibold">${snapshot.revised_budget.toLocaleString()}</span>
                </div>
                <Progress value={100} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Actual Costs</span>
                  <span className="font-semibold">${snapshot.actual_cost_total.toLocaleString()}</span>
                </div>
                <Progress
                  value={snapshot.revised_budget > 0 ? (snapshot.actual_cost_total / snapshot.revised_budget) * 100 : 0}
                  className="h-2"
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium">Variance</span>
                <span className={`text-lg font-bold ${
                  snapshot.revised_budget - snapshot.actual_cost_total >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${Math.abs(snapshot.revised_budget - snapshot.actual_cost_total).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Payables</CardTitle>
            <CardDescription>Outstanding vendor and labor payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Labor</span>
                </div>
                <span className="text-lg font-bold text-blue-600">
                  ${snapshot.open_ap_labor.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Subcontractors</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  ${snapshot.open_ap_subs.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium">Total AP</span>
                <span className="text-xl font-bold text-primary">
                  ${(snapshot.open_ap_labor + snapshot.open_ap_subs).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recalculate Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => recalculate.mutate(projectId)}
          disabled={recalculate.isPending}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${recalculate.isPending ? 'animate-spin' : ''}`} />
          Recalculate All Financials
        </Button>
      </div>
    </div>
  );
}
