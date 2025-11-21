import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { CostCodeBudgetLine } from "@/hooks/useUnifiedProjectBudget";
import { format } from "date-fns";

interface LaborDrillDownProps {
  costCodeLines: CostCodeBudgetLine[];
}

export function LaborDrillDown({ costCodeLines }: LaborDrillDownProps) {
  // Extract all labor entries from all cost codes
  const laborEntries = costCodeLines
    .filter(line => line.category === 'labor')
    .flatMap(line => 
      line.details
        .filter(d => d.type === 'labor')
        .map(d => ({
          ...d,
          cost_code: line.code,
          cost_code_description: line.description,
        }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (laborEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Labor Detail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No labor entries recorded yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Labor Detail
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Worker</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Cost Code</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {laborEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">
                  {entry.worker_name || 'Unknown Worker'}
                </TableCell>
                <TableCell>
                  {format(new Date(entry.date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {entry.cost_code}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {entry.cost_code_description}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {entry.hours?.toFixed(1)}h
                </TableCell>
                <TableCell className="text-right font-bold">
                  ${entry.amount.toFixed(2)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                  {entry.description}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
