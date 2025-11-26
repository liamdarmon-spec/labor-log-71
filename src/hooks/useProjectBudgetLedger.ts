import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CostCodeLedgerLine {
  costCodeId: string | null;
  costCode: string;
  costCodeName: string;
  category: string;              // 'labor' | 'subs' | 'materials' | 'misc'
  budgetAmount: number;
  budgetHours: number | null;
  actualAmount: number;
  actualHours: number | null;
  variance: number;              // budget - actual
}

export interface BudgetLedgerSummary {
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
  unpaidLabor: number;
  byCategory: {
    labor: { budget: number; actual: number; variance: number };
    subs: { budget: number; actual: number; variance: number };
    materials: { budget: number; actual: number; variance: number };
    misc: { budget: number; actual: number; variance: number };
  };
}

/**
 * Canonical project budget/actual ledger.
 *
 * Sources:
 *  - Budget:        project_budget_lines
 *  - Labor actuals: time_logs (canonical labor table)
 *  - Subs actuals:  sub_logs
 *  - Materials:     costs (category = 'materials')
 *
 * Rules:
 *  - "UNASSIGNED" only appears when there is truly no cost_code_id.
 *  - Unpaid labor = sum of labor_cost where payment_status !== 'paid'.
 */
export function useProjectBudgetLedger(projectId: string) {
  return useQuery({
    queryKey: ["project-budget-ledger", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      // ---------- 1) RAW DATA ----------
      const [
        { data: budgetLines, error: budgetError },
        { data: timeLogs, error: timeError },
        { data: subLogs, error: subError },
        { data: materialCosts, error: materialError },
      ] = await Promise.all([
        supabase
          .from("project_budget_lines")
          .select("id, project_id, cost_code_id, category, budget_amount, budget_hours")
          .eq("project_id", projectId),

        // CANONICAL labor table
        supabase
          .from("time_logs")
          .select(
            "id, project_id, cost_code_id, hours_worked, worker_id, payment_status, labor_cost, hourly_rate"
          )
          .eq("project_id", projectId),

        supabase
          .from("sub_logs")
          .select("id, project_id, cost_code_id, amount")
          .eq("project_id", projectId),

        supabase
          .from("costs")
          .select("id, project_id, cost_code_id, amount, category")
          .eq("project_id", projectId)
          .eq("category", "materials"),
      ]);

      if (budgetError) throw budgetError;
      if (timeError) throw timeError;
      if (subError) throw subError;
      if (materialError) throw materialError;

      // ---------- 2) COST CODE METADATA ----------
      const costCodeIds = new Set<string>();

      (budgetLines || []).forEach((l: any) => {
        if (l.cost_code_id) costCodeIds.add(l.cost_code_id);
      });
      (timeLogs || []).forEach((l: any) => {
        if (l.cost_code_id) costCodeIds.add(l.cost_code_id);
      });
      (subLogs || []).forEach((l: any) => {
        if (l.cost_code_id) costCodeIds.add(l.cost_code_id);
      });
      (materialCosts || []).forEach((c: any) => {
        if (c.cost_code_id) costCodeIds.add(c.cost_code_id);
      });

      let costCodeMap = new Map<
        string,
        { code: string; name: string; category: string | null }
      >();

      if (costCodeIds.size > 0) {
        const { data: costCodes, error: ccError } = await supabase
          .from("cost_codes")
          .select("id, code, name, category")
          .in("id", Array.from(costCodeIds));

        if (ccError) throw ccError;

        costCodeMap = new Map(
          (costCodes || []).map((cc: any) => [
            cc.id,
            {
              code: cc.code,
              name: cc.name,
              category: cc.category ?? null,
            },
          ])
        );
      }

      // ---------- 3) LEDGER MAP HELPERS ----------
      const ledgerMap = new Map<string, CostCodeLedgerLine>();

      const ensureLine = (
        costCodeId: string | null,
        fallbackCategory: string
      ): CostCodeLedgerLine => {
        const key = costCodeId ?? "unassigned";
        let line = ledgerMap.get(key);
        if (line) return line;

        const meta = costCodeId ? costCodeMap.get(costCodeId) : undefined;
        const rawCategory =
          (meta?.category as string | undefined) || fallbackCategory;
        const category = rawCategory.toLowerCase() || "misc";

        line = {
          costCodeId,
          costCode: meta?.code || "UNASSIGNED",
          costCodeName: meta?.name || "Unassigned",
          category,
          budgetAmount: 0,
          budgetHours: null,
          actualAmount: 0,
          actualHours: null,
          variance: 0,
        };

        ledgerMap.set(key, line);
        return line;
      };

      // ---------- 4) BUDGET LINES ----------
      (budgetLines || []).forEach((line: any) => {
        const category = (line.category as string | undefined)?.toLowerCase() || "misc";
        const ledgerLine = ensureLine(line.cost_code_id, category);

        ledgerLine.category = category;
        ledgerLine.budgetAmount += Number(line.budget_amount || 0);
        if (line.budget_hours != null) {
          ledgerLine.budgetHours =
            (ledgerLine.budgetHours || 0) + Number(line.budget_hours || 0);
        }
        ledgerLine.variance = ledgerLine.budgetAmount - ledgerLine.actualAmount;
      });

      // ---------- 5) LABOR ACTUALS (time_logs) ----------
      let unpaidLabor = 0;

      (timeLogs || []).forEach((log: any) => {
        const ledgerLine = ensureLine(log.cost_code_id, "labor");

        const hours = Number(log.hours_worked || 0);
        const explicitCost =
          log.labor_cost != null ? Number(log.labor_cost) : null;
        const rate = Number(log.hourly_rate || 0);
        const cost = explicitCost != null ? explicitCost : hours * rate;

        ledgerLine.category = "labor";
        ledgerLine.actualAmount += cost;
        ledgerLine.actualHours = (ledgerLine.actualHours || 0) + hours;
        ledgerLine.variance = ledgerLine.budgetAmount - ledgerLine.actualAmount;

        if (log.payment_status !== "paid") {
          unpaidLabor += cost;
        }
      });

      // ---------- 6) SUBS ACTUALS (sub_logs) ----------
      (subLogs || []).forEach((log: any) => {
        const ledgerLine = ensureLine(log.cost_code_id, "subs");
        const amount = Number(log.amount || 0);

        ledgerLine.category = "subs";
        ledgerLine.actualAmount += amount;
        ledgerLine.variance = ledgerLine.budgetAmount - ledgerLine.actualAmount;
      });

      // ---------- 7) MATERIALS ACTUALS (costs) ----------
      (materialCosts || []).forEach((cost: any) => {
        const ledgerLine = ensureLine(cost.cost_code_id, "materials");
        const amount = Number(cost.amount || 0);

        ledgerLine.category = "materials";
        ledgerLine.actualAmount += amount;
        ledgerLine.variance = ledgerLine.budgetAmount - ledgerLine.actualAmount;
      });

      const ledgerLines = Array.from(ledgerMap.values());

      // ---------- 8) SUMMARY ----------
      const totalBudget = ledgerLines.reduce(
        (sum, line) => sum + line.budgetAmount,
        0
      );
      const totalActual = ledgerLines.reduce(
        (sum, line) => sum + line.actualAmount,
        0
      );
      const totalVariance = totalBudget - totalActual;

      const rollUp = (category: string) =>
        ledgerLines
          .filter((l) => l.category === category)
          .reduce(
            (acc, l) => ({
              budget: acc.budget + l.budgetAmount,
              actual: acc.actual + l.actualAmount,
              variance: acc.variance + (l.budgetAmount - l.actualAmount),
            }),
            { budget: 0, actual: 0, variance: 0 }
          );

      const summary: BudgetLedgerSummary = {
        totalBudget,
        totalActual,
        totalVariance,
        unpaidLabor,
        byCategory: {
          labor: rollUp("labor"),
          subs: rollUp("subs"),
          materials: rollUp("materials"),
          misc: rollUp("misc"),
        },
      };

      return {
        ledgerLines,
        summary,
      };
    },
  });
}
