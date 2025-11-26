import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CostCodeLedgerLine {
  costCodeId: string | null;
  costCode: string;
  costCodeName: string;
  category: string;
  budgetAmount: number;
  budgetHours: number | null;
  actualAmount: number;
  actualHours: number | null;
  variance: number;
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
 * CANONICAL PROJECT BUDGET LEDGER
 *
 * Budget comes from:
 *   - project_budget_lines (per cost code, per category)
 *
 * Actuals come from:
 *   - time_logs      (labor, canonical labor ledger, with payment_status + labor_cost)
 *   - sub_logs       (subs)
 *   - costs          (materials via category = 'materials')
 *
 * This hook is used by:
 *   - Project Financial Overview (cards)
 *   - Cost By Category tab
 *   - Cost Code Ledger tab
 *
 * Labor numbers here MUST match:
 *   - Workforce / Labor tab
 *   - Global Job Costing view
 */
export function useProjectBudgetLedger(projectId: string) {
  return useQuery({
    queryKey: ["project-budget-ledger", projectId],
    queryFn: async () => {
      if (!projectId) return null;

      /**
       * 1) BUDGET LINES
       *    One row per cost code / category from the accepted estimate.
       */
      const { data: budgetLines, error: budgetError } = await supabase
        .from("project_budget_lines")
        .select("*, cost_codes(id, code, name, category)")
        .eq("project_id", projectId);

      if (budgetError) {
        console.error("Error fetching project_budget_lines", budgetError);
      }

      /**
       * 2) LABOR ACTUALS (CANONICAL: time_logs)
       *    We join cost_codes so unbudgeted cost codes still show real labels
       *    instead of "UNASSIGNED".
       */
      const { data: laborLogs, error: laborError } = await supabase
        .from("time_logs")
        .select(
          `
          id,
          project_id,
          cost_code_id,
          worker_id,
          hours_worked,
          labor_cost,
          payment_status,
          cost_codes ( id, code, name, category )
        `
        )
        .eq("project_id", projectId);

      if (laborError) {
        console.error("Error fetching time_logs", laborError);
      }

      /**
       * 3) SUB ACTUALS (sub_logs)
       */
      const { data: subLogs, error: subError } = await supabase
        .from("sub_logs")
        .select(
          `
          id,
          project_id,
          cost_code_id,
          amount,
          cost_codes ( id, code, name, category )
        `
        )
        .eq("project_id", projectId);

      if (subError) {
        console.error("Error fetching sub_logs", subError);
      }

      /**
       * 4) MATERIAL ACTUALS from costs table (category = 'materials')
       */
      const { data: materialCosts, error: materialsError } = await supabase
        .from("costs")
        .select(
          `
          id,
          project_id,
          cost_code_id,
          amount,
          category,
          cost_codes ( id, code, name, category )
        `
        )
        .eq("project_id", projectId)
        .eq("category", "materials");

      if (materialsError) {
        console.error("Error fetching material costs", materialsError);
      }

      /**
       * 5) BUILD LEDGER MAP
       *    Keyed by costCodeId (or "unassigned" for truly blank items)
       */
      const ledgerMap = new Map<string, CostCodeLedgerLine>();

      // --- Seed with BUDGET lines ---
      (budgetLines || []).forEach((line: any) => {
        const costCodeId = line.cost_code_id || "unassigned";
        const cc = line.cost_codes;

        ledgerMap.set(costCodeId, {
          costCodeId: line.cost_code_id,
          costCode: cc?.code || "MISC",
          costCodeName: cc?.name || "Miscellaneous",
          category: line.category, // 'labor' | 'subs' | 'materials' | 'misc'
          budgetAmount: line.budget_amount || 0,
          budgetHours: line.budget_hours ?? null,
          actualAmount: 0,
          actualHours: 0,
          variance: line.budget_amount || 0,
        });
      });

      const ensureLine = (
        key: string,
        fallback: {
          costCodeId: string | null;
          code?: string | null;
          name?: string | null;
          category: string;
        }
      ): CostCodeLedgerLine => {
        if (!ledgerMap.has(key)) {
          ledgerMap.set(key, {
            costCodeId: fallback.costCodeId,
            costCode: fallback.code || (fallback.costCodeId ? "UNBUDGETED" : "UNASSIGNED"),
            costCodeName:
              fallback.name ||
              (fallback.costCodeId ? "Unbudgeted Cost Code" : "Unassigned"),
            category: fallback.category,
            budgetAmount: 0,
            budgetHours: null,
            actualAmount: 0,
            actualHours: null,
            variance: 0,
          });
        }
        return ledgerMap.get(key)!;
      };

      // --- LABOR ACTUALS from time_logs ---
      (laborLogs || []).forEach((log: any) => {
        const key = log.cost_code_id || "unassigned";
        const cc = log.cost_codes;

        const line = ensureLine(key, {
          costCodeId: log.cost_code_id,
          code: cc?.code,
          name: cc?.name,
          category: cc?.category || "labor",
        });

        const cost = log.labor_cost || 0;
        const hours = log.hours_worked || 0;

        line.actualAmount += cost;
        line.actualHours = (line.actualHours || 0) + hours;
        line.variance = line.budgetAmount - line.actualAmount;
      });

      // --- SUB ACTUALS from sub_logs ---
      (subLogs || []).forEach((log: any) => {
        const key = log.cost_code_id || "unassigned";
        const cc = log.cost_codes;

        const line = ensureLine(key, {
          costCodeId: log.cost_code_id,
          code: cc?.code,
          name: cc?.name,
          category: cc?.category || "subs",
        });

        line.actualAmount += log.amount || 0;
        line.variance = line.budgetAmount - line.actualAmount;
      });

      // --- MATERIAL ACTUALS from costs ---
      (materialCosts || []).forEach((cost: any) => {
        const key = cost.cost_code_id || "unassigned";
        const cc = cost.cost_codes;

        const line = ensureLine(key, {
          costCodeId: cost.cost_code_id,
          code: cc?.code,
          name: cc?.name,
          category: cc?.category || "materials",
        });

        line.actualAmount += cost.amount || 0;
        line.variance = line.budgetAmount - line.actualAmount;
      });

      const ledgerLines = Array.from(ledgerMap.values());

      /**
       * 6) SUMMARY CALCULATIONS
       */

      // Total budget / actual / variance
      const totalBudget = ledgerLines.reduce(
        (sum, line) => sum + (line.budgetAmount || 0),
        0
      );
      const totalActual = ledgerLines.reduce(
        (sum, line) => sum + (line.actualAmount || 0),
        0
      );
      const totalVariance = totalBudget - totalActual;

      // Unpaid labor from time_logs (this will now respect pay runs)
      const unpaidLabor =
        (laborLogs || []).reduce((sum, log: any) => {
          if (log.payment_status === "unpaid") {
            return sum + (log.labor_cost || 0);
          }
          return sum;
        }, 0) || 0;

      // Category roll-ups
      const aggregateCategory = (category: string) =>
        ledgerLines
          .filter((l) => l.category === category)
          .reduce(
            (acc, l) => ({
              budget: acc.budget + (l.budgetAmount || 0),
              actual: acc.actual + (l.actualAmount || 0),
              variance: acc.variance + (l.variance || 0),
            }),
            { budget: 0, actual: 0, variance: 0 }
          );

      const byCategory = {
        labor: aggregateCategory("labor"),
        subs: aggregateCategory("subs"),
        materials: aggregateCategory("materials"),
        misc: aggregateCategory("misc"),
      };

      const summary: BudgetLedgerSummary = {
        totalBudget,
        totalActual,
        totalVariance,
        unpaidLabor,
        byCategory,
      };

      return {
        ledgerLines,
        summary,
      };
    },
  });
}
