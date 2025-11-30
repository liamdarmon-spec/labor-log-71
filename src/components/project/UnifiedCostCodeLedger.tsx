import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { CostCodeBudgetLine, BudgetCategory } from "@/hooks/useUnifiedProjectBudget";
import { format } from "date-fns";

interface UnifiedCostCodeLedgerProps {
  costCodeLines: CostCodeBudgetLine[];
  selectedCategory: BudgetCategory | 'all';
}

export function UnifiedCostCodeLedger({ 
  costCodeLines, 
  selectedCategory 
}: UnifiedCostCodeLedgerProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof CostCodeBudgetLine>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const toggleRow = (costCodeId: string | null, category: BudgetCategory) => {
    const key = `${costCodeId || 'unassigned'}:${category}`;
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (column: keyof CostCodeBudgetLine) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filter and sort
  let filteredLines = costCodeLines.filter(line => {
    if (selectedCategory !== 'all' && line.category !== selectedCategory) {
      return false;
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        line.code.toLowerCase().includes(search) ||
        line.description.toLowerCase().includes(search)
      );
    }
    return true;
  });

  filteredLines = [...filteredLines].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * multiplier;
    }
    return String(aVal).localeCompare(String(bVal)) * multiplier;
  });

  const getCategoryColor = (category: BudgetCategory) => {
    switch (category) {
      case 'labor': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'subs': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'materials': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'other': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Card>
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search cost codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          {searchTerm && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSearchTerm('')}
            >
              Clear
            </Button>
          )}
        </div>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('code')}
            >
              Cost Code {sortColumn === 'code' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('description')}
            >
              Description {sortColumn === 'description' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('category')}
            >
              Category {sortColumn === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead 
              className="text-right cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('budget_amount')}
            >
              Budget {sortColumn === 'budget_amount' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead 
              className="text-right cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('actual_amount')}
            >
              Actual {sortColumn === 'actual_amount' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead 
              className="text-right cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('variance')}
            >
              Variance {sortColumn === 'variance' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                {searchTerm ? 'No cost codes match your search' : 'No cost codes available'}
              </TableCell>
            </TableRow>
          ) : (
            filteredLines.map((line) => {
              const key = `${line.cost_code_id || 'unassigned'}:${line.category}`;
              const isExpanded = expandedRows.has(key);
              const varianceColor = line.variance >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-destructive';

              return (
                <>
                  <TableRow 
                    key={key}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => toggleRow(line.cost_code_id, line.category)}
                  >
                    <TableCell>
                      {line.details.length > 0 && (
                        isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{line.code}</TableCell>
                    <TableCell>
                      {line.description}
                      {line.is_allowance && (
                        <Badge variant="secondary" className="ml-2 text-xs">Allowance</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getCategoryColor(line.category)}>
                        {line.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${line.budget_amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${line.actual_amount.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${varianceColor}`}>
                      ${line.variance.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  
                  {isExpanded && line.details.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/20">
                        <div className="p-4 space-y-2">
                          <h4 className="font-semibold text-sm mb-3">Actual Entries ({line.details.length})</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Hours</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {line.details.map((detail) => (
                                <TableRow key={detail.id}>
                                  <TableCell className="text-sm">
                                    {format(new Date(detail.date), 'MMM d, yyyy')}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {detail.type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm">{detail.description}</TableCell>
                                  <TableCell className="text-right text-sm">
                                    {detail.hours ? `${detail.hours.toFixed(1)}h` : '—'}
                                  </TableCell>
                                  <TableCell className="text-right text-sm font-medium">
                                    ${detail.amount.toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
