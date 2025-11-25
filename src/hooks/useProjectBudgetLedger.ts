import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
 * Project budget ledger by cost code.
 *
 * Canonical sources:
 * - Budget: project_budget_lines (+ cost_codes)
 * - Labor actuals: daily_logs (with cost_code_id + worker rates)
 * - Subs actuals: sub_logs (per-cost-code sub costs)
 * - Materials actuals: costs table (category = 'materials')
 *
 * NOTE: Labor *payments* and pay runs are tracked via time_logs/pay_runs.
 * For cost code tracking we still rely on daily_logs because it carries cost_code_id.
 */
export function useProjectBudgetLedger(projectId: string) {
  return useQuery({
    queryKey: ['project-budget-ledger', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      // 1) Budget lines
      const { data: budgetLines, error: budgetError } = await supabase
        .from('project_budget_lines')
        .select('*, cost_codes(id, code, name, category)')
        .eq('project_id', projectId);

      if (budgetError) throw budgetError;

      // 2) Labor actuals from daily_logs
      const { data: laborLogs, error: laborError } = await supabase
        .from('daily_logs')
        .select('cost_code_id, hours_worked, worker_id, payment_status')
        .eq('project_id', projectId);

      if (laborError) throw laborError;

      // 3) Worker rates (only if we actually have workers)
      const workerIds = Array.from(
        new Set((laborLogs || []).map((l) => l.worker_id).filter(Boolean))
      ) as string[];

      let workerRateMap = new Map<string, number>();

      if (workerIds.length > 0) {
        const { data: workers, error: workersError } = await supabase
          .from('workers')
          .select('id, hourly_rate')
          .in('id', workerIds);

        if (workersError) throw workersError;

        workerRateMap = new Map(
          (workers || []).map((w: any) => [w.id as string, Number(w.hourly_rate) || 0])
        );
      }

      // 4) Sub actuals (legacy sub_logs – safe, non-breaking)
      const { data: subLogs, error: subError } = await supabase
        .from('sub_logs')
        .select('cost_code_id, amount')
        .eq('project_id', projectId);

      if (subError) throw subError;

      // 5) Material actuals from costs table
      const { data: materialCosts, error: materialsError } = await supabase
        .from('costs')
        .select('cost_code_id, amount')
        .eq('project_id', projectId)
        .eq('category', 'materials');

      if (materialsError) throw materialsError;

      // ---------- BUILD LEDGER MAP ----------

      const ledgerMap = new Map<string, CostCodeLedgerLine>();

      // Seed with budget lines
      (budgetLines || []).forEach((line: any) => {
        const rawId = line.cost_code_id as string | null;
        const key = rawId || 'unassigned';
        const costCode = line.cost_codes;

        ledgerMap.set(key, {
          costCodeId: rawId,
          costCode: costCode?.code || 'MISC',
          costCodeName: costCode?.name || 'Miscellaneous',
          category: line.category,
          budgetAmount: Number(line.budget_amount) || 0,
          budgetHours: line.budget_hours !== null ? Number(line.budget_hours) : null,
          actualAmount: 0,
          actualHours: 0,
          variance: Number(line.budget_amount) || 0,
        });
      });

      // Labor actuals
      (laborLogs || []).forEach((log: any) => {
        const rawId = log.cost_code_id as string | null;
        const key = rawId || 'unassigned';
        const rate = workerRateMap.get(log.worker_id) || 0;
        const hours = Number(log.hours_worked) || 0;
        const cost = hours * rate;

        if (!ledgerMap.has(key)) {
          ledgerMap.set(key, {
            costCodeId: rawId,
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

        const line = ledgerMap.get(key)!;
        line.actualAmount += cost;
        line.actualHours = (line.actualHours || 0) + hours;
        line.variance = line.budgetAmount - line.actualAmount;
      });

      // Sub actuals
      (subLogs || []).forEach((log: any) => {
        const rawId = log.cost_code_id as string | null;
        const key = rawId || 'unassigned';

        if (!ledgerMap.has(key)) {
          ledgerMap.set(key, {
            costCodeId: rawId,
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

        const line = ledgerMap.get(key)!;
        const amt = Number(log.amount) || 0;
        line.actualAmount += amt;
        line.variance = line.budgetAmount - line.actualAmount;
      });

      // Material actuals
      (materialCosts || []).forEach((cost: any) => {
        const rawId = cost.cost_code_id as string | null;
        const key = rawId || 'unassigned';

        if (!ledgerMap.has(key)) {
          ledgerMap.set(key, {
            costCodeId: rawId,
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

        const line = ledgerMap.get(key)!;
        const amt = Number(cost.amount) || 0;
        line.actualAmount += amt;
        line.variance = line.budgetAmount - line.actualAmount;
      });

      const ledgerLines = Array.from(ledgerMap.values());

      // ---------- SUMMARY ROLLUP ----------

      const totalBudget = ledgerLines.reduce(
        (sum, line) => sum + line.budgetAmount,
        0
      );
      const totalActual = ledgerLines.reduce(
        (sum, line) => sum + line.actualAmount,
        0
      );
      const totalVariance = totalBudget - totalActual;

      // unpaid labor (based on daily_logs payment_status)
      const unpaidLabor =
        (laborLogs || []).reduce((sum, log: any) => {
          if (log.payment_status === 'unpaid') {
            const rate = workerRateMap.get(log.worker_id) || 0;
            const hours = Number(log.hours_worked) || 0;
            return sum + hours * rate;
          }
          return sum;
        }, 0) || 0;

      const rollupCategory = (category: string) =>
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

      const byCategory = {
        labor: rollupCategory('labor'),
        subs: rollupCategory('subs'),
        materials: rollupCategory('materials'),
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
