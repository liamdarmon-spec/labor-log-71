import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useProjectBudgetLedger } from '@/hooks/useProjectBudgetLedger';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProjectBudgetCostsTabV2Props {
  projectId: string;
}

export function ProjectBudgetCostsTabV2({ projectId }: ProjectBudgetCostsTabV2Props) {
  const { data, isLoading } = useProjectBudgetLedger(projectId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { ledgerLines, summary } = data;

  const getVarianceColor = (variance: number) => {
    if (variance < 0) return 'text-red-600';
    if (variance > 0) return 'text-green-600';
    return 'text-muted-foreground';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance < 0) return <TrendingDown className="h-4 w-4" />;
    if (variance > 0) return <TrendingUp className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <p className="text-3xl font-bold">${summary.totalBudget.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Actual Cost</p>
              <p className="text-3xl font-bold">${summary.totalActual.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Variance</p>
              <div className="flex items-center gap-2">
                <p className={`text-3xl font-bold ${getVarianceColor(summary.totalVariance)}`}>
                  ${Math.abs(summary.totalVariance).toLocaleString()}
                </p>
                {getVarianceIcon(summary.totalVariance)}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.totalVariance >= 0 ? 'Under budget' : 'Over budget'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={summary.unpaidLabor > 0 ? 'border-orange-200 bg-orange-50' : ''}>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Unpaid Labor</p>
              <p className="text-3xl font-bold text-orange-600">
                ${summary.unpaidLabor.toLocaleString()}
              </p>
              {summary.unpaidLabor > 0 && (
                <p className="text-xs text-orange-600">Requires payment</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(['labor', 'subs', 'materials', 'misc'] as const).map((category) => {
              const data = summary.byCategory[category];
              const percentUsed = data.budget > 0 ? (data.actual / data.budget) * 100 : 0;
              const isAlert = percentUsed > 90 && data.budget > 0;

              return (
                <Card key={category} className={isAlert ? 'border-orange-200 bg-orange-50' : ''}>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium capitalize mb-3">{category}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Budget:</span>
                        <span className="font-medium">${data.budget.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Actual:</span>
                        <span className="font-medium">${data.actual.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Variance:</span>
                        <span className={`font-medium ${getVarianceColor(data.variance)}`}>
                          ${Math.abs(data.variance).toLocaleString()}
                        </span>
                      </div>
                      {data.budget > 0 && (
                        <div className="pt-2 border-t">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Used:</span>
                            <span className={percentUsed > 90 ? 'text-orange-600 font-medium' : 'text-muted-foreground'}>
                              {percentUsed.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      )}
                      {isAlert && (
                        <div className="flex items-center gap-1 text-xs text-orange-600 mt-2">
                          <AlertCircle className="h-3 w-3" />
                          <span>Over 90% used</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cost Code Ledger */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Code Ledger</CardTitle>
          <CardDescription>Budget vs. Actual by Cost Code</CardDescription>
        </CardHeader>
        <CardContent>
          {ledgerLines.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cost Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">% Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerLines
                  .sort((a, b) => a.category.localeCompare(b.category))
                  .map((line, index) => {
                    const percentUsed = line.budgetAmount > 0 ? (line.actualAmount / line.budgetAmount) * 100 : 0;
                    const isOverBudget = percentUsed > 100;

                    return (
                      <TableRow key={line.costCodeId || `unassigned-${index}`} className={isOverBudget ? 'bg-orange-50' : ''}>
                        <TableCell className="font-mono font-medium">{line.costCode}</TableCell>
                        <TableCell>{line.costCodeName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {line.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${line.budgetAmount.toLocaleString()}
                          {line.budgetHours && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({line.budgetHours}h)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${line.actualAmount.toLocaleString()}
                          {line.actualHours && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({line.actualHours}h)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${getVarianceColor(line.variance)}`}>
                          ${Math.abs(line.variance).toLocaleString()}
                          {getVarianceIcon(line.variance) && (
                            <span className="ml-1 inline-block">
                              {getVarianceIcon(line.variance)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.budgetAmount > 0 ? (
                            <span className={isOverBudget ? 'text-orange-600 font-medium' : ''}>
                              {percentUsed.toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">No budget lines yet</p>
              <p className="text-sm text-muted-foreground">
                Accept an estimate as baseline to create budget lines
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
