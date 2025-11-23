import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSubCosts, useSubCostsSummary } from '@/hooks/useSubCosts';
import { format } from 'date-fns';
import { DollarSign, Calendar, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SubCostsTabProps {
  subId: string;
}

export function SubCostsTab({ subId }: SubCostsTabProps) {
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: costs, isLoading } = useSubCosts(subId);
  const { data: summary } = useSubCostsSummary(subId);

  // Get unique projects for filter
  const projects = costs?.reduce((acc, cost) => {
    if (cost.projects && !acc.find(p => p.id === cost.projects!.id)) {
      acc.push(cost.projects);
    }
    return acc;
  }, [] as Array<{ id: string; project_name: string }>);

  // Filter costs
  const filteredCosts = costs?.filter(cost => {
    if (projectFilter !== 'all' && cost.project_id !== projectFilter) return false;
    if (statusFilter !== 'all' && cost.status !== statusFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Total Costs</div>
            </div>
            <div className="text-2xl font-bold">
              ${(summary?.totalCost || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div className="text-sm text-muted-foreground">Paid</div>
            </div>
            <div className="text-2xl font-bold text-green-600">
              ${(summary?.paidCost || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              <div className="text-sm text-muted-foreground">Unpaid</div>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              ${(summary?.unpaidCost || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cost History</CardTitle>
          <div className="flex gap-3 mt-4">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCosts && filteredCosts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Cost Code</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCosts.map(cost => (
                  <TableRow key={cost.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(cost.date_incurred), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{cost.projects?.project_name}</div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {cost.projects?.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {cost.description}
                    </TableCell>
                    <TableCell>
                      {cost.cost_codes ? (
                        <div>
                          <div className="font-mono text-xs">{cost.cost_codes.code}</div>
                          <div className="text-xs text-muted-foreground">{cost.cost_codes.name}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      ${cost.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cost.status === 'paid' ? 'default' : 'secondary'}>
                        {cost.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No costs recorded yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
