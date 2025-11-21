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
import { useBudgetLinesWithActuals } from "@/hooks/useProjectBudgetLines";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface BudgetDetailTableProps {
  projectId: string;
}

export function BudgetDetailTable({ projectId }: BudgetDetailTableProps) {
  const { data: budgetLines, isLoading, refetch } = useBudgetLinesWithActuals(projectId);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);

  // Listen for budget updates from estimates
  useEffect(() => {
    const handleBudgetUpdate = () => {
      refetch();
    };
    window.addEventListener('budget-updated', handleBudgetUpdate);
    return () => window.removeEventListener('budget-updated', handleBudgetUpdate);
  }, [refetch]);

  const selectedBudgetLine = budgetLines?.find(line => line.id === selectedLine);

  const { data: timeLogs } = useQuery({
    queryKey: ['time_logs_by_cost_code', projectId, selectedBudgetLine?.cost_code_id],
    queryFn: async () => {
      if (!selectedBudgetLine?.cost_code_id) return [];
      
      const { data, error } = await supabase
        .from('daily_logs')
        .select(`
          *,
          workers (name),
          projects (project_name)
        `)
        .eq('project_id', projectId)
        .eq('cost_code_id', selectedBudgetLine.cost_code_id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedLine && !!selectedBudgetLine?.cost_code_id,
  });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!budgetLines || budgetLines.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          No budget lines available. Create an estimate and accept it as the budget baseline to get started.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="mb-3">
        <p className="text-sm text-muted-foreground">
          💡 Actuals are currently tracked for <strong>Labor</strong> category only. Subs, Materials, and Other categories will show budget only.
        </p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cost Code</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Budget Hours</TableHead>
              <TableHead className="text-right">Actual Hours</TableHead>
              <TableHead className="text-right">Hours Δ</TableHead>
              <TableHead className="text-right">Budget Amount</TableHead>
              <TableHead className="text-right">Actual Amount</TableHead>
              <TableHead className="text-right">Amount Δ</TableHead>
              <TableHead>Allowance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgetLines.map((line) => {
              const hoursDelta = line.actual_hours - (line.budget_hours || 0);
              const amountDelta = line.actual_cost - line.budget_amount;
              
              return (
            <TableRow 
              key={line.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => setSelectedLine(line.id)}
            >
              <TableCell className="font-medium">
                {line.cost_codes ? `${line.cost_codes.code} - ${line.cost_codes.name}` : 'No Code'}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">{line.category}</Badge>
              </TableCell>
              <TableCell className="text-right">{line.budget_hours?.toFixed(1) || '—'}</TableCell>
              <TableCell className="text-right">
                {line.category === 'labor' ? line.actual_hours.toFixed(1) : '—'}
              </TableCell>
              <TableCell className={`text-right ${hoursDelta > 0 ? 'text-destructive' : hoursDelta < 0 ? 'text-green-600' : ''}`}>
                {line.category === 'labor' && hoursDelta !== 0 ? (hoursDelta > 0 ? '+' : '') + hoursDelta.toFixed(1) : '—'}
              </TableCell>
              <TableCell className="text-right">${line.budget_amount.toFixed(2)}</TableCell>
              <TableCell className="text-right">
                {line.category === 'labor' ? `$${line.actual_cost.toFixed(2)}` : '—'}
              </TableCell>
              <TableCell className={`text-right ${amountDelta > 0 ? 'text-destructive' : amountDelta < 0 ? 'text-green-600' : ''}`}>
                {line.category === 'labor' && amountDelta !== 0 ? (amountDelta > 0 ? '+$' : '-$') + Math.abs(amountDelta).toFixed(2) : '—'}
              </TableCell>
              <TableCell>{line.is_allowance ? '✓' : ''}</TableCell>
            </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Sheet open={!!selectedLine} onOpenChange={(open) => !open && setSelectedLine(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>
              {selectedBudgetLine?.cost_codes ? 
                `${selectedBudgetLine.cost_codes.code} - ${selectedBudgetLine.cost_codes.name}` : 
                'Cost Code Details'
              }
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Budget Hours</p>
                <p className="text-2xl font-bold">{selectedBudgetLine?.budget_hours?.toFixed(1) || '—'}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Actual Hours</p>
                <p className="text-2xl font-bold">{selectedBudgetLine?.actual_hours.toFixed(1)}</p>
              </Card>
            </div>

            <div className="pt-4">
              <h3 className="font-semibold mb-2">Time Logs</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {timeLogs?.map((log: any) => (
                  <Card key={log.id} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{log.workers?.name}</p>
                        <p className="text-sm text-muted-foreground">{format(new Date(log.date), 'MMM d, yyyy')}</p>
                        {log.notes && <p className="text-xs mt-1">{log.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{log.hours_worked}h</p>
                      </div>
                    </div>
                  </Card>
                ))}
                {(!timeLogs || timeLogs.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No time logs for this cost code yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
