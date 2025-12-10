import { Fragment, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Clock,
  Receipt,
  Shuffle,
  CheckSquare,
  Eye,
} from 'lucide-react';
import { useUnifiedProjectBudget } from '@/hooks/useUnifiedProjectBudget';
import { useRecalculateProjectFinancials } from '@/hooks/useProjectFinancials';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface ProjectBudgetTabV2Props {
  projectId: string;
}

type BudgetTabValue = 'all' | 'labor' | 'subs' | 'materials' | 'other';

export function ProjectBudgetTabV2({ projectId }: ProjectBudgetTabV2Props) {
  const { data: budgetData, isLoading } = useUnifiedProjectBudget(projectId);
  const recalculate = useRecalculateProjectFinancials();
  const [tabValue, setTabValue] = useState<BudgetTabValue>('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  if (isLoading || !budgetData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const summary = budgetData.summary ?? {
    total_budget: 0,
    total_actual: 0,
    total_variance: 0,
    labor_budget: 0,
    labor_actual: 0,
    labor_variance: 0,
    labor_unpaid: 0,
    subs_budget: 0,
    subs_actual: 0,
    subs_variance: 0,
    materials_budget: 0,
    materials_actual: 0,
    materials_variance: 0,
    other_budget: 0,
    other_actual: 0,
    other_variance: 0,
  };

  // Per-category budgets
  const laborBudget = summary.labor_budget;
  const subsBudget = summary.subs_budget;
  const materialsBudget = summary.materials_budget;
  const otherBudget = summary.other_budget;

  // Per-category actuals
  const laborActual = summary.labor_actual;
  const subsActual = summary.subs_actual;
  const materialsActual = summary.materials_actual;
  const otherActual = summary.other_actual;

  // Totals (for now: Budget vs Actual; ledger uses Total Cost for variance)
  const baseline = summary.total_budget;
  const actual = summary.total_actual;

  const remaining = baseline - actual;
  const variance = baseline - actual; // summary variance still Budget - Actual
  const variancePercent = baseline > 0 ? (variance / baseline) * 100 : 0;
  const percentConsumed = baseline > 0 ? (actual / baseline) * 100 : 0;

  const categories = [
    {
      name: 'Labor',
      key: 'labor' as const,
      budget: laborBudget,
      actual: laborActual,
      color: 'bg-blue-500',
    },
    {
      name: 'Subcontractors',
      key: 'subs' as const,
      budget: subsBudget,
      actual: subsActual,
      color: 'bg-green-500',
    },
    {
      name: 'Materials',
      key: 'materials' as const,
      budget: materialsBudget,
      actual: materialsActual,
      color: 'bg-orange-500',
    },
    {
      name: 'Other',
      key: 'other' as const,
      budget: otherBudget,
      actual: otherActual,
      color: 'bg-purple-500',
    },
  ];

  const handleRecalculate = () => {
    recalculate.mutate(projectId);
  };

  const filteredLines = budgetData.costCodeLines.filter((line: any) => {
    if (tabValue === 'all') return true;
    return line.category === tabValue;
  });

  const formatMoney = (value: number) =>
    `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

  const handleViewTransactions = (rowKey: string) => {
    setExpandedRowId((prev) => (prev === rowKey ? null : rowKey));
  };

  // TODO: Wire these to real dialogs / flows
  const handleLogTime = (line: any) => {
    // open time log dialog with pre-filled project_id + cost_code_id
    console.log('Log Time for line', {
      cost_code_id: line.cost_code_id,
      code: line.code,
      category: line.category,
    });
  };

  const handleAddCost = (line: any) => {
    // open AP cost dialog with pre-filled project_id + cost_code_id
    console.log('Add Cost for line', {
      cost_code_id: line.cost_code_id,
      code: line.code,
      category: line.category,
    });
  };

  const handleInitiateTransfer = (line: any) => {
    // open Budget Transfer modal with this line as source
    console.log('Initiate Budget Transfer from line', {
      cost_code_id: line.cost_code_id,
      code: line.code,
      category: line.category,
    });
  };

  const handleMarkComplete = (line: any) => {
    // mark this cost code line as "complete" (status field once available)
    console.log('Mark line as complete', {
      cost_code_id: line.cost_code_id,
      code: line.code,
      category: line.category,
    });
  };

  const renderDetailsRow = (line: any) => {
    const details = line.details || [];
    if (!details.length) {
      return (
        <div className="text-xs text-muted-foreground py-2">
          No underlying transactions yet for this cost code.
        </div>
      );
    }

    return (
      <div className="py-2">
        <div className="text-xs font-semibold mb-2">
          Transactions ({details.length})
        </div>
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {details.map((entry: any, idx: number) => (
                <TableRow key={entry.id || idx}>
                  <TableCell className="text-xs">
                    {entry.date
                      ? new Date(entry.date).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell className="text-xs capitalize">
                    {entry.type || 'entry'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {entry.description || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {formatMoney(entry.amount ?? 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const renderLedgerTable = () => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Budget</TableHead>
            <TableHead className="text-right">Actuals</TableHead>
            <TableHead className="text-right">Committed</TableHead>
            <TableHead className="text-right">Total Cost</TableHead>
            <TableHead className="text-right">Variance</TableHead>
            <TableHead className="text-right">EAC</TableHead>
            <TableHead className="text-right">% Used</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLines && filteredLines.length > 0 ? (
            filteredLines.map((line: any) => {
              const rowKey =
                line.cost_code_id ||
                `${line.code || 'NO-CODE'}-${line.category || 'other'}`;

              const budgetAmount = line.budget_amount ?? 0;
              const actualCost = line.actual_amount ?? 0;
              const committedAmount = (line as any).committed_amount ?? 0;
              const totalCost = actualCost + committedAmount;

              // For ledger variance, we use Budget - Total Cost
              const lineVariance = budgetAmount - totalCost;

              // EAC: PM forecast > explicit eac > Total Cost
              const pmForecast = (line as any).pm_forecast;
              const eac =
                pmForecast ??
                (line as any).eac ??
                totalCost;

              const percentUsed =
                budgetAmount > 0 ? (totalCost / budgetAmount) * 100 : 0;

              const isOverBudget = lineVariance < 0;
              const isExpanded = expandedRowId === rowKey;

              return (
                <Fragment key={rowKey}>
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <TableRow
                        className={cn(
                          'cursor-pointer hover:bg-muted/50',
                          isExpanded && 'bg-muted/60'
                        )}
                        // Left-click toggles expand
                        onClick={() =>
                          setExpandedRowId((prev) =>
                            prev === rowKey ? null : rowKey
                          )
                        }
                      >
                        <TableCell className="align-middle">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {line.code || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{line.description || 'Unnamed'}</span>
                            {line.source_estimate_title && (
                              <Badge variant="outline" className="text-xs">
                                {line.source_estimate_title}
                              </Badge>
                            )}
                            {line.source_estimate_id && !line.source_estimate_title && (
                              <Badge variant="outline" className="text-xs">
                                From Estimate
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {line.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMoney(budgetAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMoney(actualCost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMoney(committedAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMoney(totalCost)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right',
                            isOverBudget ? 'text-red-600' : 'text-green-600'
                          )}
                        >
                          {isOverBudget ? '-' : '+'}
                          {formatMoney(Math.abs(lineVariance))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-medium">
                              {formatMoney(eac)}
                            </span>
                            {pmForecast != null && (
                              <span className="text-[10px] text-muted-foreground">
                                PM Forecast
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className={cn(
                                percentUsed > 90 && 'text-red-600 font-semibold'
                              )}
                            >
                              {percentUsed.toFixed(1)}%
                            </span>
                            {percentUsed > 90 && (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-56">
                      <ContextMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          handleViewTransactions(rowKey);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Transactions
                      </ContextMenuItem>
                      <ContextMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          handleLogTime(line);
                        }}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Log Time
                      </ContextMenuItem>
                      <ContextMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          handleAddCost(line);
                        }}
                      >
                        <Receipt className="w-4 h-4 mr-2" />
                        Add Cost
                      </ContextMenuItem>
                      <ContextMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          handleInitiateTransfer(line);
                        }}
                      >
                        <Shuffle className="w-4 h-4 mr-2" />
                        Initiate Budget Transfer
                      </ContextMenuItem>
                      <ContextMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          handleMarkComplete(line);
                        }}
                      >
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Mark as Complete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>

                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={11} className="bg-muted/40">
                        {renderDetailsRow(line)}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={11}
                className="text-center py-8 text-muted-foreground"
              >
                No budget lines found. Sync an estimate to create a budget.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Budget Summary Cards (all from unified budget engine) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Baseline Budget
              <DollarSign className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoney(baseline)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sum of all budget lines
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Actual Costs
              <BarChart3 className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoney(actual)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {percentConsumed.toFixed(1)}% of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Remaining Budget
              {remaining > 0 ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                remaining < 0 && 'text-red-600'
              )}
            >
              {formatMoney(remaining)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {baseline > 0 ? ((remaining / baseline) * 100).toFixed(1) : 0}% left
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Variance
              {variance < 0 ? (
                <TrendingUp className="w-4 h-4 text-red-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-green-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                variance < 0 ? 'text-red-600' : 'text-green-600'
              )}
            >
              {formatMoney(Math.abs(variance))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {variance < 0 ? 'Over' : 'Under'} by{' '}
              {Math.abs(variancePercent).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Category Rollups (unified budgets + actuals) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cost Categories</CardTitle>
              <CardDescription>Budget vs Actual by category</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              disabled={recalculate.isPending}
            >
              <RefreshCw
                className={cn(
                  'w-4 h-4 mr-2',
                  recalculate.isPending && 'animate-spin'
                )}
              />
              Recalculate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {categories.map((cat) => {
              const catVariance = cat.budget - cat.actual;
              const catPercent =
                cat.budget > 0 ? (cat.actual / cat.budget) * 100 : 0;
              const isWarn = catPercent > 90;

              return (
                <div key={cat.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                      <span className="font-medium">{cat.name}</span>
                      {isWarn && (
                        <Badge variant="destructive" className="ml-2">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {catPercent > 100 ? 'Over Budget' : 'Warning'}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatMoney(cat.actual)} / {formatMoney(cat.budget)}
                      </div>
                      <div
                        className={cn(
                          'text-sm',
                          catVariance < 0
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                        )}
                      >
                        {catVariance < 0 ? '-' : '+'}
                        {formatMoney(Math.abs(catVariance))} (
                        {catPercent.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                  <Progress
                    value={Math.min(catPercent, 100)}
                    className="h-2"
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cost Code Ledger – unified, tab-filtered, 4-point variance + EAC + context menu */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Code Ledger</CardTitle>
          <CardDescription>
            Budget, Actuals, Committed, Total Cost, Variance & EAC — with
            one-click actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={tabValue}
            onValueChange={(val) => setTabValue(val as BudgetTabValue)}
            className="w-full"
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="labor">Labor</TabsTrigger>
              <TabsTrigger value="subs">Subs</TabsTrigger>
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="other">Other</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              {renderLedgerTable()}
            </TabsContent>
            <TabsContent value="labor" className="mt-4">
              {renderLedgerTable()}
            </TabsContent>
            <TabsContent value="subs" className="mt-4">
              {renderLedgerTable()}
            </TabsContent>
            <TabsContent value="materials" className="mt-4">
              {renderLedgerTable()}
            </TabsContent>
            <TabsContent value="other" className="mt-4">
              {renderLedgerTable()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
