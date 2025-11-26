import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LedgerCategory = "labor" | "subs" | "materials" | "misc";

export interface CostCodeLedgerLine {
  costCodeId: string | null;
  costCode: string;
  costCodeName: string;
  category: LedgerCategory;
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

// Normalize arbitrary category strings into our 4 canonical buckets
function normalizeCategory(raw: string | null | undefined): LedgerCategory {
  const c = (raw || "").toLowerCase().trim();

  if (c.startsWith("lab")) return "labor";        // labor, labour, etc.
  if (c.startsWith("sub")) return "subs";         // subs, subcontractor, etc.
  if (c.startsWith("mat")) return "materials";    // material, materials, etc.
  // everything else → misc (other, equipment, etc.)
  return "misc";
}

export function useProjectBudgetLedger(projectId: string) {
  return useQuery({
    queryKey: ["project-budget-ledger", projectId],
    queryFn: async () => {
      if (!projectId) {
        return {
          ledgerLines: [] as CostCodeLedgerLine[],
          summary: {
            totalBudget: 0,
            totalActual: 0,
            totalVariance: 0,
            unpaidLabor: 0,
            byCategory: {
              labor: { budget: 0, actual: 0, variance: 0 },
              subs: { budget: 0, actual: 0, variance: 0 },
              materials: { budget: 0, actual: 0, variance: 0 },
              misc: { budget: 0, actual: 0, variance: 0 },
            },
          } as BudgetLedgerSummary,
        };
      }

      // 1) FETCH RAW DATA
      const [
        { data: budgetLines, error: budgetError },
        { data: laborLogs, error: laborError },
        { data: subLogs, error: subError },
        { data: allCosts, error: costsError },
      ] = await Promise.all([
        // Budget lines
        supabase
          .from("project_budget_lines")
          .select(
            `
            id,
            project_id,
            cost_code_id,
            category,
            budget_amount,
            budget_hours,
            cost_codes (
              id,
              code,
              name,
              category
            )
          `
          )
          .eq("project_id", projectId),

        // CANONICAL LABOR: time_logs
        supabase
          .from("time_logs")
          .select(
            `
            id,
            project_id,
            cost_code_id,
            hours_worked,
            labor_cost,
            payment_status
          `
          )
          .eq("project_id", projectId),

        // Legacy subs log (backward compat only)
        supabase
          .from("sub_logs")
          .select("id, project_id, cost_code_id, amount")
          .eq("project_id", projectId),

        // ALL non-labor AP costs
        supabase
          .from("costs")
          .select("id, project_id, cost_code_id, amount, category")
          .eq("project_id", projectId),
      ]);

      if (budgetError) throw budgetError;
      if (laborError) throw laborError;
      if (subError) throw subError;
      if (costsError) throw costsError;

      const safeBudgetLines = budgetLines || [];
      const safeLaborLogs = laborLogs || [];
      const safeSubLogs = subLogs || [];
      const safeCosts = allCosts || [];

      // 2) BUILD INITIAL COST CODE META FROM BUDGET LINES
      const costCodeMeta = new Map<
        string,
        { code: string; name: string; category: LedgerCategory }
      >();

      safeBudgetLines.forEach((line: any) => {
        const cc = line.cost_codes;
        if (line.cost_code_id && cc) {
          costCodeMeta.set(line.cost_code_id, {
            code: cc.code || "MISC",
            name: cc.name || "Miscellaneous",
            // IMPORTANT: cost code category wins over budget line category
            category: normalizeCategory(cc.category || line.category),
          });
        }
      });

      // 3) AUGMENT META WITH ANY COST CODES USED IN ACTUALS (labor + subs + costs)
      const costCodeIds = new Set<string>();
      safeLaborLogs.forEach((log: any) => {
        if (log.cost_code_id) costCodeIds.add(log.cost_code_id);
      });
      safeSubLogs.forEach((log: any) => {
        if (log.cost_code_id) costCodeIds.add(log.cost_code_id);
      });
      safeCosts.forEach((c: any) => {
        if (c.cost_code_id) costCodeIds.add(c.cost_code_id);
      });

      if (costCodeIds.size > 0) {
        const { data: costCodesData, error: costCodesError } = await supabase
          .from("cost_codes")
          .select("id, code, name, category")
          .in("id", Array.from(costCodeIds));

        if (costCodesError) throw costCodesError;

        costCodesData?.forEach((cc: any) => {
          if (!costCodeMeta.has(cc.id)) {
            costCodeMeta.set(cc.id, {
              code: cc.code || "MISC",
              name: cc.name || "Miscellaneous",
              category: normalizeCategory(cc.category),
            });
          }
        });
      }

      // 4) LEDGER MAP PER COST CODE
      const ledgerMap = new Map<string, CostCodeLedgerLine>();

      const getKey = (costCodeId: string | null) =>
        costCodeId ?? "unassigned";

      const getOrCreateLine = (
        costCodeId: string | null,
        defaultCategory: LedgerCategory
      ): CostCodeLedgerLine => {
        const key = getKey(costCodeId);
        let line = ledgerMap.get(key);

        if (!line) {
          const meta = costCodeId ? costCodeMeta.get(costCodeId) : null;
          const normalized = meta
            ? meta.category
            : defaultCategory;

          line = {
            costCodeId,
            costCode: meta?.code || (costCodeId ? "MISC" : "UNASSIGNED"),
            costCodeName:
              meta?.name || (costCodeId ? "Miscellaneous" : "Unassigned"),
            category: normalized,
            budgetAmount: 0,
            budgetHours: null,
            actualAmount: 0,
            actualHours: null,
            variance: 0,
          };

          ledgerMap.set(key, line);
        }

        return line;
      };

      // 5) SEED LEDGER WITH BUDGET LINES
      safeBudgetLines.forEach((line: any) => {
        const costCodeId = line.cost_code_id as string | null;
        const meta = costCodeId ? costCodeMeta.get(costCodeId) : null;

        // cost code category wins; fall back to line.category only if we have no meta
        const category = normalizeCategory(
          meta?.category || line.category || null
        );
        const key = getKey(costCodeId);

        const budgetAmount = Number(line.budget_amount || 0);
        const budgetHours =
          line.budget_hours !== null && line.budget_hours !== undefined
            ? Number(line.budget_hours)
            : null;

        ledgerMap.set(key, {
          costCodeId,
          costCode: meta?.code || (costCodeId ? "MISC" : "UNASSIGNED"),
          costCodeName:
            meta?.name || (costCodeId ? "Miscellaneous" : "Unassigned"),
          category,
          budgetAmount,
          budgetHours,
          actualAmount: 0,
          actualHours: budgetHours !== null ? 0 : null,
          variance: budgetAmount,
        });
      });

      // 6) LABOR ACTUALS (time_logs)
      safeLaborLogs.forEach((log: any) => {
        const costCodeId = log.cost_code_id as string | null;
        const hours = Number(log.hours_worked || 0);
        const cost = Number(log.labor_cost || 0);

        const line = getOrCreateLine(costCodeId, "labor");
        line.category = "labor";
        line.actualAmount += cost;
        if (line.actualHours !== null) {
          line.actualHours = (line.actualHours || 0) + hours;
        } else {
          line.actualHours = hours;
        }
        line.variance = line.budgetAmount - line.actualAmount;
      });

      // 7) LEGACY SUB LOGS
      safeSubLogs.forEach((log: any) => {
        const costCodeId = log.cost_code_id as string | null;
        const amount = Number(log.amount || 0);

        const line = getOrCreateLine(costCodeId, "subs");
        line.category = "subs";
        line.actualAmount += amount;
        line.variance = line.budgetAmount - line.actualAmount;
      });

      // 8) ALL NON-LABOR COSTS FROM costs TABLE
      safeCosts.forEach((cost: any) => {
        const costCodeId = cost.cost_code_id as string | null;
        const category = normalizeCategory(cost.category);
        const amount = Number(cost.amount || 0);

        const line = getOrCreateLine(costCodeId, category);
        line.category = category;
        line.actualAmount += amount;
        line.variance = line.budgetAmount - line.actualAmount;
      });

      const ledgerLines = Array.from(ledgerMap.values());

      // 9) SUMMARY
      const totalBudget = ledgerLines.reduce(
        (sum, line) => sum + line.budgetAmount,
        0
      );
      const totalActual = ledgerLines.reduce(
        (sum, line) => sum + line.actualAmount,
        0
      );
      const totalVariance = totalBudget - totalActual;

      const unpaidLabor =
        safeLaborLogs.reduce((sum, log: any) => {
          if (log.payment_status === "unpaid") {
            return sum + Number(log.labor_cost || 0);
          }
          return sum;
        }, 0) || 0;

      const sumCategory = (cat: LedgerCategory) =>
        ledgerLines.reduce(
          (acc, line) => {
            if (line.category !== cat) return acc;
            acc.budget += line.budgetAmount;
            acc.actual += line.actualAmount;
            acc.variance += line.variance;
            return acc;
          },
          { budget: 0, actual: 0, variance: 0 }
        );

      const summary: BudgetLedgerSummary = {
        totalBudget,
        totalActual,
        totalVariance,
        unpaidLabor,
        byCategory: {
          labor: sumCategory("labor"),
          subs: sumCategory("subs"),
          materials: sumCategory("materials"),
          misc: sumCategory("misc"),
        },
      };

      return {
        ledgerLines,
        summary,
      };
    },
  });
}
