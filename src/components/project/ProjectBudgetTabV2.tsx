import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  BarChart3
} from 'lucide-react';
import { useUnifiedProjectBudget } from '@/hooks/useUnifiedProjectBudget';
import { useProjectFinancialsSnapshot, useRecalculateProjectFinancials } from '@/hooks/useProjectFinancials';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectBudgetTabV2Props {
  projectId: string;
}

export function ProjectBudgetTabV2({ projectId }: ProjectBudgetTabV2Props) {
  const { data: budgetData, isLoading: budgetLoading } = useUnifiedProjectBudget(projectId);
  const { data: snapshot, isLoading: snapshotLoading } = useProjectFinancialsSnapshot(projectId);
  const recalculate = useRecalculateProjectFinancials();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (budgetLoading || snapshotLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const baseline = snapshot?.baseline_budget || 0;
  const revised = snapshot?.revised_budget || baseline;
  const actual = snapshot?.actual_cost_total || 0;
  const remaining = revised - actual;
  const variance = actual - revised;
  const variancePercent = revised > 0 ? (variance / revised) * 100 : 0;
  const percentConsumed = revised > 0 ? (actual / revised) * 100 : 0;

  const categories = [
    {
      name: 'Labor',
      budget: budgetData?.summary.labor_budget || 0,
      actual: snapshot?.actual_cost_labor || 0,
      color: 'bg-blue-500',
    },
    {
      name: 'Subcontractors',
      budget: budgetData?.summary.subs_budget || 0,
      actual: snapshot?.actual_cost_subs || 0,
      color: 'bg-green-500',
    },
    {
      name: 'Materials',
      budget: budgetData?.summary.materials_budget || 0,
      actual: snapshot?.actual_cost_materials || 0,
      color: 'bg-orange-500',
    },
    {
      name: 'Other',
      budget: budgetData?.summary.other_budget || 0,
      actual: snapshot?.actual_cost_other || 0,
      color: 'bg-purple-500',
    },
  ];

  const handleRecalculate = () => {
    recalculate.mutate(projectId);
  };

  return (
    <div className="space-y-6">
      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Baseline Budget
              <DollarSign className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${baseline.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Original estimate</p>
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
            <div className="text-2xl font-bold">${actual.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {percentConsumed.toFixed(1)}% of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Remaining Budget
              {remaining > 0 ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${remaining < 0 ? 'text-red-600' : ''}`}>
              ${remaining.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {revised > 0 ? ((remaining / revised) * 100).toFixed(1) : 0}% left
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Variance
              {variance > 0 ? <TrendingUp className="w-4 h-4 text-red-600" /> : <TrendingDown className="w-4 h-4 text-green-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ${Math.abs(variance).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {variance > 0 ? 'Over' : 'Under'} by {Math.abs(variancePercent).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Category Rollups */}
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
              <RefreshCw className={`w-4 h-4 mr-2 ${recalculate.isPending ? 'animate-spin' : ''}`} />
              Recalculate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {categories.map((cat) => {
              const catVariance = cat.actual - cat.budget;
              const catPercent = cat.budget > 0 ? (cat.actual / cat.budget) * 100 : 0;
              const isOverBudget = catPercent > 90;

              return (
                <div key={cat.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                      <span className="font-medium">{cat.name}</span>
                      {isOverBudget && (
                        <Badge variant="destructive" className="ml-2">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {catPercent > 100 ? 'Over Budget' : 'Warning'}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        ${cat.actual.toLocaleString()} / ${cat.budget.toLocaleString()}
                      </div>
                      <div className={`text-sm ${catVariance > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {catVariance > 0 ? '+' : ''}${catVariance.toLocaleString()} ({catPercent.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                  <Progress value={Math.min(catPercent, 100)} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cost Code Ledger */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Code Ledger</CardTitle>
          <CardDescription>Detailed breakdown by cost code</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all" onClick={() => setSelectedCategory(null)}>
                All
              </TabsTrigger>
              <TabsTrigger value="labor" onClick={() => setSelectedCategory('labor')}>
                Labor
              </TabsTrigger>
              <TabsTrigger value="subs" onClick={() => setSelectedCategory('subs')}>
                Subs
              </TabsTrigger>
              <TabsTrigger value="materials" onClick={() => setSelectedCategory('materials')}>
                Materials
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">% Used</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetData?.costCodeLines && budgetData.costCodeLines.length > 0 ? (
                      budgetData.costCodeLines
                        .filter(line => !selectedCategory || line.category === selectedCategory)
                        .map((line) => {
                          const actualCost = line.actual_amount || 0;
                          const budgetAmount = line.budget_amount || 0;
                          const lineVariance = actualCost - budgetAmount;
                          const percentUsed = budgetAmount > 0 ? (actualCost / budgetAmount) * 100 : 0;

                          return (
                            <TableRow key={line.cost_code_id || 'unassigned'}>
                              <TableCell className="font-mono text-sm">
                                {line.code || 'N/A'}
                              </TableCell>
                              <TableCell>
                                {line.description || 'Unnamed'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{line.category}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                ${budgetAmount.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                ${actualCost.toLocaleString()}
                              </TableCell>
                              <TableCell className={`text-right ${lineVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {lineVariance > 0 ? '+' : ''}${lineVariance.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <span className={percentUsed > 90 ? 'text-red-600 font-semibold' : ''}>
                                    {percentUsed.toFixed(1)}%
                                  </span>
                                  {percentUsed > 90 && (
                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No budget lines found. Sync an estimate to create a budget.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
