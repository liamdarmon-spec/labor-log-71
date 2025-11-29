import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Search, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { useProjectBudgetLedger } from '@/hooks/useProjectBudgetLedger';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CostCodeLedgerTabProps {
  projectId: string;
  filterCategory?: string;
}

export function CostCodeLedgerTab({ projectId, filterCategory }: CostCodeLedgerTabProps) {
  const { ledger, isLoading } = useProjectBudgetLedger(projectId);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(filterCategory || 'all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96" />
        </CardContent>
      </Card>
    );
  }

  if (!ledger) return null;

  const filteredLines = ledger.filter(line => {
    const matchesSearch = 
      line.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      line.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || line.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const toggleRow = (costCodeId: string | null, category: string) => {
    const id = `${costCodeId || 'unassigned'}:${category}`;
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getVarianceColor = (variance: number) => {
    if (variance < 0) return 'text-red-600';
    if (variance > 0) return 'text-green-600';
    return 'text-muted-foreground';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance < 0) return <TrendingDown className="h-4 w-4 inline" />;
    if (variance > 0) return <TrendingUp className="h-4 w-4 inline" />;
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Cost Code Ledger</h3>
        <p className="text-muted-foreground">
          Detailed budget vs. actual tracking by cost code
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cost codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="subs">Subs</SelectItem>
                <SelectItem value="materials">Materials</SelectItem>
                <SelectItem value="misc">Miscellaneous</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Lines</CardTitle>
          <CardDescription>
            {filteredLines.length} cost code{filteredLines.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLines.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
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
                  {filteredLines
                    .sort((a, b) => a.category.localeCompare(b.category))
                    .map((line) => {
                      const percentUsed = line.budget_amount > 0 ? (line.actual_amount / line.budget_amount) * 100 : 0;
                      const isOverBudget = percentUsed > 100;
                      const compositeKey = `${line.cost_code_id || 'unassigned'}:${line.category}`;
                      const isExpanded = expandedRows.has(compositeKey);

                      return (
                        <TableRow 
                          key={compositeKey} 
                          className={`${isOverBudget ? 'bg-red-50' : ''} hover:bg-muted/50`}
                        >
                          <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(line.cost_code_id, line.category)}
                            className="h-8 w-8 p-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono font-semibold">
                          {line.code}
                        </TableCell>
                        <TableCell className="font-medium">
                          {line.description}
                        </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {line.category}
                            </Badge>
                          </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${(line.budget_amount || 0).toLocaleString()}
                          {line.budget_hours && (
                            <span className="text-xs text-muted-foreground ml-1 block">
                              ({line.budget_hours}h)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${(line.actual_amount || 0).toLocaleString()}
                          {line.actual_hours !== null && (
                            <span className="text-xs text-muted-foreground ml-1 block">
                              ({line.actual_hours}h)
                            </span>
                          )}
                        </TableCell>
                          <TableCell className={`text-right font-semibold ${getVarianceColor(line.variance)}`}>
                            ${Math.abs(line.variance).toLocaleString()}
                            {getVarianceIcon(line.variance) && (
                              <span className="ml-1">
                                {getVarianceIcon(line.variance)}
                              </span>
                            )}
                          </TableCell>
                        <TableCell className="text-right">
                          {line.budget_amount > 0 ? (
                            <span className={`font-semibold ${isOverBudget ? 'text-red-600' : ''}`}>
                              {percentUsed.toFixed(1)}%
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
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">No cost codes found</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm || categoryFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Accept an estimate as baseline to create budget lines'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
