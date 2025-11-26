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
  BarChart3
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// 🔐 Canonical hooks
import { useProjectFinancialsV3 } from '@/hooks/useProjectFinancialsV3';
import { useProjectBudgetLedger } from '@/hooks/useProjectBudgetLedger';

interface ProjectBudgetTabV2Props {
  projectId: string;
}

export function ProjectBudgetTabV2({ projectId }: ProjectBudgetTabV2Props) {
  const { data: financials, isLoading: financialsLoading } = useProjectFinancialsV3(projectId);
  const { data: ledgerData, isLoading: ledgerLoading } = useProjectBudgetLedger(projectId);

  const [activeTab, setActiveTab] = useState<'all' | 'labor' | 'subs' | 'materials'>('all');

  if (financialsLoading || ledgerLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!financials) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">No financial data found for this project.</p>
      </div>
    );
  }

  const baseline = financials.budget.total || 0;
  const revised = financials.budget.total || 0; // for now, baseline = revised
  const actual = financials.actuals.total || 0;

  const remaining = revised - actual;
  const variance = actual - revised; // positive = over budget
  const variancePercent = revised > 0 ? (variance / revised) * 100 : 0;
  const percentConsumed = revised > 0 ? (actual / revised) * 100 : 0;

  // Top-level category rollups from V3
  const categories = [
    {
      name: 'Labor',
      key: 'labor' as const,
      budget: financials.budget.labor || 0,
      actual: financials.actuals.labor || 0,
      color: 'bg-blue-500',
    },
    {
      name: 'Subcontractors',
      key: 'subs' as const,
      budget: financials.budget.subs || 0,
      actual: financials.actuals.subs || 0,
      color: 'bg-green-500',
    },
    {
      name: 'Materials',
      key: 'materials' as const,
      budget: financials.budget.materials || 0,
      actual: financials.actuals.materials || 0,
      color: 'bg-orange-500',
    },
    {
      name: 'Other',
      key: 'misc' as const,
      budget: financials.budget.other || 0,
      actual: financials.actuals.misc || 0,
      color: 'bg-purple-500',
    },
  ];

  const ledgerLines = ledgerData?.ledgerLines || [];

  const filteredLines = ledgerLines.filter(line => {
    if (activeTab === 'all') return true;
    return line.category === activeTab;
  });

  const renderLedgerTable = () => (
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
          {filteredLines.length > 0 ? (
            filteredLines.map((line, idx) => {
              const budgetAmount = line.budgetAmount || 0;
              const actualAmount = line.actualAmount || 0;
              const lineVariance = actualAmount - budgetAmount;
              const percentUsed =
                budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;

              return (
                <TableRow key={line.costCodeId || `unassigned-${idx}`}>
                  <TableCell className="font-mono text-sm">
                    {line.costCode || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {line.costCodeName || 'Unnamed'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {line.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ${budgetAmount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    ${actualAmount.toLocaleString()}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      lineVariance > 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {lineVariance > 0 ? '+' : '-'}$
                    {Math.abs(lineVariance).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span
                        className={
                          percentUsed > 90 ? 'text-red-600 font-semibold' : ''
                        }
                      >
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
              <TableCell
                colSpan={7}
                className="text-center py-8 text-muted-foreground"
              >
                No budget lines found. Sync an estimate or add budget lines to
                see the ledger.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

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
            <div className="text-2xl font-bold">
              ${baseline.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Original estimate / budget
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
              ${actual.toLocaleString()}
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
              className={`text-2xl font-bold ${
                remaining < 0 ? 'text-red-600' : ''
              }`}
            >
              ${remaining.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {revised > 0
                ? `${((remaining / revised) * 100).toFixed(1)}% left`
                : 'No budget set'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Variance
              {variance > 0 ? (
                <TrendingUp className="w-4 h-4 text-red-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-green-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                variance > 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              ${Math.abs(variance).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {variance > 0 ? 'Over' : 'Under'} by{' '}
              {Math.abs(variancePercent).toFixed(1)}%
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {categories.map((cat) => {
              const catVariance = cat.actual - cat.budget;
              const catPercent =
                cat.budget > 0 ? (cat.actual / cat.budget) * 100 : 0;
              const isOverBudget = catPercent > 90;

              return (
                <div key={cat.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${cat.color}`}
                      />
                      <span className="font-medium">{cat.name}</span>
                      {isOverBudget && (
                        <Badge
                          variant="destructive"
                          className="ml-2"
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {catPercent > 100 ? 'Over Budget' : 'Warning'}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        ${cat.actual.toLocaleString()} / $
                        {cat.budget.toLocaleString()}
                      </div>
                      <div
                        className={`text-sm ${
                          catVariance > 0
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {catVariance > 0 ? '+' : ''}
                        ${catVariance.toLocaleString()} (
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

      {/* Cost Code Ledger */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Code Ledger</CardTitle>
          <CardDescription>Detailed breakdown by cost code</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(val) =>
              setActiveTab(val as 'all' | 'labor' | 'subs' | 'materials')
            }
            className="w-full"
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="labor">Labor</TabsTrigger>
              <TabsTrigger value="subs">Subs</TabsTrigger>
              <TabsTrigger value="materials">Materials</TabsTrigger>
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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
