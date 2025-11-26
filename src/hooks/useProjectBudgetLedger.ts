import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CostCodeLedgerLine {
  costCodeId: string | null;
  costCode: string;
  costCodeName: string;
  category: string; // 'labor' | 'subs' | 'materials' | 'misc' | etc.
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
 * Canonical project budget/actual ledger.
 *
 * Sources:
 * - Budget: project_budget_lines
 * - Labor actuals: daily_logs (+ workers for rate)
 * - Subs actuals: sub_logs
 * - Materials actuals: costs (category = 'materials')
 *
 * Notes:
 * - Cost codes are always resolved from cost_codes when possible.
 * - "UNASSIGNED" only appears when a record truly has no cost_code_id.
 * - Unpaid labor uses payment_status + pay_run_id.
 */
export function useProjectBudgetLedger(projectId: string) {
  return useQuery({
    queryKey: ["project-budget-ledger", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      // ---------- 1) RAW DATA QUERIES ----------
      const [
        { data: budgetLines, error: budgetError },
        { data: laborLogs, error: laborError },
        { data: subLogs, error: subError },
        { data: materialCosts, error: materialError },
      ] = await Promise.all([
        supabase
          .from("project_budget_lines")
          .select("*, cost_codes(id, code, name, category)")
          .eq("project_id", projectId),

        // Include pay_run_id so we can treat attached logs as paid
        supabase
          .from("daily_logs")
          .select(
            "id, project_id, cost_code_id, hours_worked, worker_id, payment_status, pay_run_id"
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
      if (laborError) throw laborError;
      if (subError) throw subError;
      if (materialError) throw materialError;

      // ---------- 2) WORKER RATES ----------
      const workerIds = Array.from(
        new Set(
          (laborLogs || [])
            .map((l: any) => l.worker_id)
            .filter((id) => !!id)
        )
      );

      let workerRateMap = new Map<string, number>();
      if (workerIds.length > 0) {
        const { data: workers, error: workerError } = await supabase
          .from("workers")
          .select("id, hourly_rate")
          .in("id", workerIds);

        if (workerError) throw workerError;

        workerRateMap = new Map(
          (workers || []).map((w: any) => [w.id, Number(w.hourly_rate) || 0])
        );
      }

      // ---------- 3) COST CODE METADATA ----------
      const costCodeIdsSet = new Set<string>();

      (budgetLines || []).forEach((line: any) => {
        if (line.cost_code_id) costCodeIdsSet.add(line.cost_code_id);
      });
      (laborLogs || []).forEach((log: any) => {
        if (log.cost_code_id) costCodeIdsSet.add(log.cost_code_id);
      });
      (subLogs || []).forEach((log: any) => {
        if (log.cost_code_id) costCodeIdsSet.add(log.cost_code_id);
      });
      (materialCosts || []).forEach((cost: any) => {
        if (cost.cost_code_id) costCodeIdsSet.add(cost.cost_code_id);
      });

      let costCodeMap = new Map<
        string,
        { code: string; name: string; category?: string | null }
      >();

      if (costCodeIdsSet.size > 0) {
        const { data: costCodes, error: ccError } = await supabase
          .from("cost_codes")
          .select("id, code, name, category")
          .in("id", Array.from(costCodeIdsSet));

        if (ccError) throw ccError;

        costCodeMap = new Map(
          (costCodes || []).map((cc: any) => [
            cc.id,
            {
              code: cc.code,
              name: cc.name,
              category: cc.category,
            },
          ])
        );
      }

      // ---------- 4) BUILD LEDGER LINES ----------
      const ledgerMap = new Map<string, CostCodeLedgerLine>();

      const ensureLine = (opts: {
        costCodeId: string | null;
        fallbackCategory: string;
      }): CostCodeLedgerLine => {
        const key = opts.costCodeId || "unassigned";
        const existing = ledgerMap.get(key);
        if (existing) return existing;

        const ccMeta =
          (opts.costCodeId && costCodeMap.get(opts.costCodeId)) || null;

        const categoryRaw =
          (ccMeta?.category as string | undefined) || opts.fallbackCategory;
        const category = categoryRaw.toLowerCase();

        const line: CostCodeLedgerLine = {
          costCodeId: opts.costCodeId,
          costCode: ccMeta?.code || "UNASSIGNED",
          costCodeName: ccMeta?.name || "Unassigned",
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

      // 4a) Budget lines (these seed the ledger)
      (budgetLines || []).forEach((line: any) => {
        const key = line.cost_code_id || "unassigned";
        const ccMeta =
          line.cost_codes ||
          (line.cost_code_id && costCodeMap.get(line.cost_code_id)) ||
          null;

        const categoryRaw =
          (line.category as string | undefined) ||
          (ccMeta?.category as string | undefined) ||
          "misc";
        const category = categoryRaw.toLowerCase();

        const ledgerLine: CostCodeLedgerLine = {
          costCodeId: line.cost_code_id,
          costCode: ccMeta?.code || "UNASSIGNED",
          costCodeName: ccMeta?.name || "Unassigned",
          category,
          budgetAmount: Number(line.budget_amount) || 0,
          budgetHours:
            typeof line.budget_hours === "number" ? line.budget_hours : null,
          actualAmount: 0,
          actualHours: 0,
          variance: Number(line.budget_amount) || 0,
        };

        ledgerMap.set(key, ledgerLine);
      });

      // 4b) Labor actuals from daily_logs
      (laborLogs || []).forEach((log: any) => {
        const costCodeId: string | null = log.cost_code_id;
        const line = ensureLine({ costCodeId, fallbackCategory: "labor" });

        const rate = workerRateMap.get(log.worker_id) || 0;
        const hours = Number(log.hours_worked) || 0;
        const cost = hours * rate;

        line.actualAmount += cost;
        line.actualHours = (line.actualHours || 0) + hours;
        line.variance = line.budgetAmount - line.actualAmount;
      });

      // 4c) Subcontractor actuals from sub_logs
      (subLogs || []).forEach((log: any) => {
        const costCodeId: string | null = log.cost_code_id;
        const line = ensureLine({ costCodeId, fallbackCategory: "subs" });

        const amount = Number(log.amount) || 0;
        line.actualAmount += amount;
        line.variance = line.budgetAmount - line.actualAmount;
      });

      // 4d) Material actuals from costs (category = 'materials')
      (materialCosts || []).forEach((cost: any) => {
        const costCodeId: string | null = cost.cost_code_id;
        const line = ensureLine({ costCodeId, fallbackCategory: "materials" });

        const amount = Number(cost.amount) || 0;
        line.actualAmount += amount;
        line.variance = line.budgetAmount - line.actualAmount;
      });

      const ledgerLines = Array.from(ledgerMap.values());

      // ---------- 5) SUMMARY CALCS ----------
      const totalBudget = ledgerLines.reduce(
        (sum, line) => sum + line.budgetAmount,
        0
      );
      const totalActual = ledgerLines.reduce(
        (sum, line) => sum + line.actualAmount,
        0
      );
      const totalVariance = totalBudget - totalActual;

      // Unpaid labor: only logs with NO pay run and not marked 'paid'
      const unpaidLabor =
        (laborLogs || []).reduce((sum, log: any) => {
          const rate = workerRateMap.get(log.worker_id) || 0;
          const hours = Number(log.hours_worked) || 0;
          const cost = hours * rate;

          const isPaid =
            log.payment_status === "paid" || (log.pay_run_id ?? null) !== null;

          return isPaid ? sum : sum + cost;
        }, 0) || 0;

      const buildCategoryTotals = (category: string) =>
        ledgerLines
          .filter((l) => l.category === category)
          .reduce(
            (acc, l) => ({
              budget: acc.budget + l.budgetAmount,
              actual: acc.actual + l.actualAmount,
              variance: acc.variance + l.variance,
            }),
            { budget: 0, actual: 0, variance: 0 }
          );

      const summary: BudgetLedgerSummary = {
        totalBudget,
        totalActual,
        totalVariance,
        unpaidLabor,
        byCategory: {
          labor: buildCategoryTotals("labor"),
          subs: buildCategoryTotals("subs"),
          materials: buildCategoryTotals("materials"),
          misc: buildCategoryTotals("misc"),
        },
      };

      return {
        ledgerLines,
        summary,
      };
    },
  });
}
