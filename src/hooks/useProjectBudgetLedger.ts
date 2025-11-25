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
 * Canonical project budget/actual ledger.
 *
 * IMPORTANT:
 * - Labor actuals come from time_logs (labor_cost) – NOT daily_logs
 * - Subs actuals come from sub_logs
 * - Materials actuals come from costs(category='materials')
 * - Budget comes from project_budget_lines
 */
export function useProjectBudgetLedger(projectId: string) {
  return useQuery({
    queryKey: ['project-budget-ledger', projectId],
    queryFn: async () => {
      // 1) Budget lines
      const { data: budgetLines, error: budgetError } = await supabase
        .from('project_budget_lines')
        .select('*, cost_codes(id, code, name, category)')
        .eq('project_id', projectId);

      if (budgetError) throw budgetError;

      // 2) Labor actuals from time_logs (canonical labor ledger)
      const { data: laborLogs, error: laborError } = await supabase
        .from('time_logs')
        .select('cost_code_id, hours_worked, labor_cost, payment_status')
        .eq('project_id', projectId);

      if (laborError) throw laborError;

      // 3) Subs actuals
      const { data: subLogs, error: subsError } = await supabase
        .from('sub_logs')
        .select('cost_code_id, amount')
        .eq('project_id', projectId);

      if (subsError) throw subsError;

      // 4) Material actuals from costs table
      const { data: materialCosts, error: materialsError } = await supabase
        .from('costs')
        .select('cost_code_id, amount')
        .eq('project_id', projectId)
        .eq('category', 'materials');

      if (materialsError) throw materialsError;

      // ------------------------
      // Ledger assembly by cost code
      // ------------------------
      const ledgerMap = new Map<string, CostCodeLedgerLine>();

      // Seed with budget lines
      budgetLines?.forEach((line) => {
        const costCodeId = line.cost_code_id || 'unassigned';
        const costCode = line.cost_codes;

        ledgerMap.set(costCodeId, {
          costCodeId: line.cost_code_id,
          costCode: costCode?.code || 'MISC',
          costCodeName: costCode?.name || 'Miscellaneous',
          category: line.category,
          budgetAmount: line.budget_amount || 0,
          budgetHours: line.budget_hours,
          actualAmount: 0,
          actualHours: 0,
          variance: line.budget_amount || 0,
        });
      });

      // Labor actuals (time_logs.labor_cost)
      laborLogs?.forEach((log) => {
        const costCodeId = log.cost_code_id || 'unassigned';
        const cost = log.labor_cost || 0;
        const hours = Number(log.hours_worked || 0);

        if (!ledgerMap.has(costCodeId)) {
          ledgerMap.set(costCodeId, {
            costCodeId: log.cost_code_id,
            costCode: 'UNASSIGNED',
            costCodeName: 'Unassigned',
            category: 'labor',
            budgetAmount: 0,
            budgetHours: null,
            actualAmount: 0,
            actualHours: 0,
            variance: 0,
          });
        }

        const line = ledgerMap.get(costCodeId)!;
        line.actualAmount += cost;
        line.actualHours = (line.actualHours || 0) + hours;
        line.variance = line.budgetAmount - line.actualAmount;
      });

      // Subs actuals
      subLogs?.forEach((log) => {
        const costCodeId = log.cost_code_id || 'unassigned';

        if (!ledgerMap.has(costCodeId)) {
          ledgerMap.set(costCodeId, {
            costCodeId: log.cost_code_id,
            costCode: 'UNASSIGNED',
            costCodeName: 'Unassigned',
            category: 'subs',
            budgetAmount: 0,
            budgetHours: null,
            actualAmount: 0,
            actualHours: null,
            variance: 0,
          });
        }

        const line = ledgerMap.get(costCodeId)!;
        line.actualAmount += Number(log.amount || 0);
        line.variance = line.budgetAmount - line.actualAmount;
      });

      // Materials actuals
      materialCosts?.forEach((cost) => {
        const costCodeId = cost.cost_code_id || 'unassigned';

        if (!ledgerMap.has(costCodeId)) {
          ledgerMap.set(costCodeId, {
            costCodeId: cost.cost_code_id,
            costCode: 'UNASSIGNED',
            costCodeName: 'Unassigned',
            category: 'materials',
            budgetAmount: 0,
            budgetHours: null,
            actualAmount: 0,
            actualHours: null,
            variance: 0,
          });
        }

        const line = ledgerMap.get(costCodeId)!;
        line.actualAmount += Number(cost.amount || 0);
        line.variance = line.budgetAmount - line.actualAmount;
      });

      const ledgerLines = Array.from(ledgerMap.values());

      // ------------------------
      // Summary calculations
      // ------------------------
      const totalBudget = ledgerLines.reduce(
        (sum, line) => sum + line.budgetAmount,
        0
      );
      const totalActual = ledgerLines.reduce(
        (sum, line) => sum + line.actualAmount,
        0
      );
      const totalVariance = totalBudget - totalActual;

      // Unpaid labor based on time_logs.payment_status
      const unpaidLabor =
        laborLogs?.reduce((sum, log) => {
          if (log.payment_status === 'unpaid') {
            return sum + (log.labor_cost || 0);
          }
          return sum;
        }, 0) || 0;

      const byCategory = {
        labor: ledgerLines
          .filter((l) => l.category === 'labor')
          .reduce(
            (acc, l) => ({
              budget: acc.budget + l.budgetAmount,
              actual: acc.actual + l.actualAmount,
              variance: acc.variance + l.variance,
            }),
            { budget: 0, actual: 0, variance: 0 }
          ),
        subs: ledgerLines
          .filter((l) => l.category === 'subs')
          .reduce(
            (acc, l) => ({
              budget: acc.budget + l.budgetAmount,
              actual: acc.actual + l.actualAmount,
              variance: acc.variance + l.variance,
            }),
            { budget: 0, actual: 0, variance: 0 }
          ),
        materials: ledgerLines
          .filter((l) => l.category === 'materials')
          .reduce(
            (acc, l) => ({
              budget: acc.budget + l.budgetAmount,
              actual: acc.actual + l.actualAmount,
              variance: acc.variance + l.variance,
            }),
            { budget: 0, actual: 0, variance: 0 }
          ),
        misc: ledgerLines
          .filter((l) => l.category === 'misc' || l.category === 'other')
          .reduce(
            (acc, l) => ({
              budget: acc.budget + l.budgetAmount,
              actual: acc.actual + l.actualAmount,
              variance: acc.variance + l.variance,
            }),
            { budget: 0, actual: 0, variance: 0 }
          ),
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
