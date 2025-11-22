import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useProjectFinancialsV2 } from '@/hooks/useProjectFinancialsV2';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye } from 'lucide-react';

interface CostByCategoryTabV2Props {
  projectId: string;
  onViewDetails: (category: string) => void;
}

export function CostByCategoryTabV2({ projectId, onViewDetails }: CostByCategoryTabV2Props) {
  const { data: financials, isLoading } = useProjectFinancialsV2(projectId);

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!financials) return null;

  const categories = [
    {
      name: 'Labor',
      key: 'labor',
      data: financials.categories.labor,
    },
    {
      name: 'Subcontractors',
      key: 'subs',
      data: financials.categories.subs,
    },
    {
      name: 'Materials',
      key: 'materials',
      data: financials.categories.materials,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle>Cost by Category</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead className="text-right">% Consumed</TableHead>
              <TableHead className="text-right">Entries</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => {
              const isOverBudget = category.data.variance < 0;
              return (
                <TableRow key={category.key} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-right">
                    ${category.data.budget.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    ${category.data.actual.toLocaleString()}
                  </TableCell>
                  <TableCell className={`text-right ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                    ${Math.abs(category.data.variance).toLocaleString()}
                    {isOverBudget && ' ⚠️'}
                  </TableCell>
                  <TableCell className="text-right">
                    {category.data.percentConsumed.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {category.data.entryCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(category.key)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Summary Row */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <p className="text-lg font-bold">${financials.totalBudget.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Actual</p>
              <p className="text-lg font-bold">${financials.actualCost.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Variance</p>
              <p className={`text-lg font-bold ${financials.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${Math.abs(financials.variance).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">% Consumed</p>
              <p className="text-lg font-bold">{financials.percentConsumed.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
