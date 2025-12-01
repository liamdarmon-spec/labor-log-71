// src/components/project/BudgetDetailTable.tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useUnifiedProjectBudget } from "@/hooks/useUnifiedProjectBudget";
import { format } from "date-fns";
import { EstimateDetailsSheet } from "@/components/project/EstimateDetailsSheet";

interface BudgetDetailTableProps {
  projectId: string;
}

type CategoryFilter = "all" | "labor" | "subs" | "materials" | "other";

export function BudgetDetailTable({ projectId }: BudgetDetailTableProps) {
  const { data, isLoading, refetch } = useUnifiedProjectBudget(projectId);
  const budgetLines = data?.costCodeLines || [];

  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>("all");
  const [viewEstimateId, setViewEstimateId] = useState<string | null>(null);

  // Listen for budget updates from estimates
  useEffect(() => {
    const handleBudgetUpdate = () => {
      refetch();
    };
    window.addEventListener("budget-updated", handleBudgetUpdate);
    return () =>
      window.removeEventListener("budget-updated", handleBudgetUpdate);
  }, [refetch]);

  const selectedBudgetLine = budgetLines.find(
    (line) => line.cost_code_id === selectedLine
  );

  // Fetch project budget header to get baseline_estimate_id
  const { data: projectBudget } = useQuery({
    queryKey: ["project_budget_header", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_budgets")
        .select("id, baseline_estimate_id")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const baselineEstimateId = projectBudget?.baseline_estimate_id || null;

  // Time logs for the selected cost code (labor drill-down)
  const { data: timeLogs } = useQuery({
    queryKey: [
      "time_logs_by_cost_code",
      projectId,
      selectedBudgetLine?.cost_code_id,
    ],
    queryFn: async () => {
      if (!selectedBudgetLine?.cost_code_id) return [];

      const { data, error } = await supabase
        .from("time_logs_with_meta_view")
        .select("*")
        .eq("project_id", projectId)
        .eq("cost_code_id", selectedBudgetLine.cost_code_id)
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedLine && !!selectedBudgetLine?.cost_code_id,
  });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (budgetLines.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          No budget lines available. Create an estimate and set it as the
          budget baseline to get started.
        </p>
      </Card>
    );
  }

  const visibleLines =
    categoryFilter === "all"
      ? budgetLines
      : budgetLines.filter((line) => line.category === categoryFilter);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg">
              Cost Code Ledger
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Click a row to see time logs and details. Filter by category
              below.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-flex h-2 w-2 rounded-full bg-destructive" />
              <span>Over budget</span>
              <span className="inline-flex h-2 w-2 rounded-full bg-green-600" />
              <span>Under budget</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!baselineEstimateId}
              onClick={() =>
                baselineEstimateId && setViewEstimateId(baselineEstimateId)
              }
            >
              View Baseline Estimate
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Category filter */}
          <div className="mb-3 flex flex-wrap gap-2">
            {(
              [
                { key: "all", label: "All" },
                { key: "labor", label: "Labor" },
                { key: "subs", label: "Subs" },
                { key: "materials", label: "Materials" },
                { key: "other", label: "Other" },
              ] as { key: CategoryFilter; label: string }[]
            ).map((cat) => (
              <Button
                key={cat.key}
                size="sm"
                variant={categoryFilter === cat.key ? "default" : "outline"}
                onClick={() => setCategoryFilter(cat.key)}
              >
                {cat.label}
              </Button>
            ))}
          </div>

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
              {visibleLines.map((line) => {
                const budgetHours = line.budget_hours ?? null;
                const actualHours = line.actual_hours ?? null;
                const hoursDelta =
                  budgetHours !== null && actualHours !== null
                    ? actualHours - budgetHours
                    : null;

                const budgetAmount = line.budget_amount || 0;
                const actualAmount = line.actual_amount || 0;
                const amountDelta = actualAmount - budgetAmount;

                const hoursClass =
                  hoursDelta !== null && hoursDelta > 0
                    ? "text-destructive"
                    : hoursDelta !== null && hoursDelta < 0
                    ? "text-green-600"
                    : "";

                const amountClass =
                  amountDelta > 0
                    ? "text-destructive"
                    : amountDelta < 0
                    ? "text-green-600"
                    : "";

                return (
                  <TableRow
                    key={line.cost_code_id || `unassigned-${line.category}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedLine(line.cost_code_id || "")}
                  >
                    <TableCell className="font-medium">
                      {line.code && line.description
                        ? `${line.code} - ${line.description}`
                        : "No Code"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {line.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {budgetHours !== null
                        ? budgetHours.toFixed(1)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {actualHours !== null
                        ? actualHours.toFixed(1)
                        : "—"}
                    </TableCell>
                    <TableCell className={`text-right ${hoursClass}`}>
                      {hoursDelta !== null && hoursDelta !== 0
                        ? `${hoursDelta > 0 ? "+" : ""}${hoursDelta.toFixed(
                            1
                          )}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      ${budgetAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right`}>
                      ${actualAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right ${amountClass}`}>
                      {amountDelta !== 0
                        ? `${amountDelta > 0 ? "+$" : "-$"}${Math.abs(
                            amountDelta
                          ).toFixed(2)}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {line.is_allowance ? "✓" : ""}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cost-code drill-down */}
      <Sheet
        open={!!selectedLine}
        onOpenChange={(open) => !open && setSelectedLine(null)}
      >
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>
              {selectedBudgetLine?.code && selectedBudgetLine?.description
                ? `${selectedBudgetLine.code} - ${selectedBudgetLine.description}`
                : "Cost Code Details"}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">
                  Budget Hours
                </p>
                <p className="text-2xl font-bold">
                  {selectedBudgetLine?.budget_hours !== null &&
                  selectedBudgetLine?.budget_hours !== undefined
                    ? selectedBudgetLine.budget_hours.toFixed(1)
                    : "—"}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">
                  Actual Hours
                </p>
                <p className="text-2xl font-bold">
                  {selectedBudgetLine?.actual_hours !== null &&
                  selectedBudgetLine?.actual_hours !== undefined
                    ? selectedBudgetLine.actual_hours.toFixed(1)
                    : "0.0"}
                </p>
              </Card>
            </div>

            <div className="pt-4">
              <h3 className="font-semibold mb-2">Time Logs</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {timeLogs?.map((log: any) => (
                  <Card key={log.id} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {log.worker_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(log.date), "MMM d, yyyy")}
                        </p>
                        {log.notes && (
                          <p className="text-xs mt-1">{log.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {log.hours_worked}h
                        </p>
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

      {/* Baseline estimate drill-down */}
      <EstimateDetailsSheet
        estimateId={viewEstimateId}
        projectId={projectId}
        open={!!viewEstimateId}
        onOpenChange={(open) => {
          if (!open) setViewEstimateId(null);
        }}
      />
    </>
  );
}
