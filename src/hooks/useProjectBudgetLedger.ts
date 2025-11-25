// FILE: src/hooks/useProjectBudgetLedger.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CostCodeLedgerLine {
  costCodeId: string | null;
  costCode: string;
  costCodeName: string;
  category: 'labor' | 'subs' | 'materials' | 'misc';
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
 * Cost-code level budget vs actual ledger for a single project.
 *
 * Budget:
 *   - project_budget_lines (per cost code, category)
 *
 * Actuals:
 *   - Labor     → time_logs (labor_cost, hours_worked, payment_status)
 *   - Subs      → costs(category = 'subs')
 *   - Materials → costs(category = 'materials')
 *   - Misc      → costs(category = 'misc')
 */
export function useProjectBudgetLedger(projectId: string) {
  return useQuery({
    queryKey: ['project-budget-ledger', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) throw new Error('projectId is required');

      // 1) Budget lines + cost codes
      const { data: budgetLines, error: budgetError } = await supabase
        .from('project_budget_lines')
        .select('id, project_id, cost_code_id, category, budget_amount, budget_hours, cost_codes(id, code, name)')
        .eq('project_id', projectId);

      if (budgetError) throw budgetError;

      // 2) Labor actuals from time_logs
      const { data: laborLogs, error: laborError } = await supabase
        .from('time_logs')
        .select('cost_code_id, hours_worked, labor_cost, payment_status')
        .eq('project_id', projectId);

      if (laborError) throw laborError;

      // 3) Non-labor actuals from costs
      const { data: costRows, error: costError } = await supabase
        .from('costs')
        .select('cost_code_id, category, amount')
        .eq('project_id', projectId);

      if (costError) throw costError;

      // -------- Build ledger map keyed by cost_code_id (or 'unassigned') --------
      const ledgerMap = new Map<string, CostCodeLedgerLine>();

      // Seed with budget lines
      (budgetLines || []).forEach((line: any) => {
        const key = line.cost_code_id || 'unassigned';
        const code = line.cost_codes;

        ledgerMap.set(key, {
          costCodeId: line.cost_code_id,
          costCode: code?.code || 'MISC',
          costCodeName: code?.name || 'Miscellaneous',
          // Budget line category is our canonical category for this cost code
          category: (line.category || 'misc') as CostCodeLedgerLine['category'],
          budgetAmount: Number(line.budget_amount || 0),
          budgetHours: line.budget_hours !== null ? Number(line.budget_hours) : null,
          actualAmount: 0,
          actualHours: 0,
          variance: Number(line.budget_amount || 0),
        });
      });

      // Helper to ensure a ledger line exists for a given cost code + category
      const ensureLine = (
        key: string,
        category: CostCodeLedgerLine['category'],
        fallbackCode: string,
        fallbackName: string,
      ) => {
        if (!ledgerMap.has(key)) {
          ledgerMap.set(key, {
            costCodeId: key === 'unassigned' ? null : key,
            costCode: fallbackCode,
            costCodeName: fallbackName,
            category,
            budgetAmount: 0,
            budgetHours: null,
            actualAmount: 0,
            actualHours: null,
            variance: 0,
          });
        }
        return ledgerMap.get(key)!;
      };

      // -------- Add labor actuals (time_logs) --------
      let unpaidLabor = 0;

      (laborLogs || []).forEach((log: any) => {
        const key = log.cost_code_id || 'unassigned';
        const hours = Number(log.hours_worked || 0);
        const cost = Number(log.labor_cost || 0);

        const line = ensureLine(key, 'labor', 'LABOR', 'Unassigned Labor');

        line.actualAmount += cost;
        line.actualHours = (line.actualHours || 0) + hours;
        line.variance = line.budgetAmount - line.actualAmount;

        if (log.payment_status === 'unpaid') {
          unpaidLabor += cost;
        }
      });

      // -------- Add non-labor actuals (costs) --------
      (costRows || []).forEach((row: any) => {
        // Normalize categories: ignore 'labor' here; labor is from time_logs
        let category: CostCodeLedgerLine['category'];
        if (row.category === 'subs') category = 'subs';
        else if (row.category === 'materials') category = 'materials';
        else if (row.category === 'misc') category = 'misc';
        else return; // ignore 'labor' or any unknown

        const key = row.cost_code_id || 'unassigned';
        const amount = Number(row.amount || 0);

        const line = ensureLine(
          key,
          category,
          category.toUpperCase(),
          `Unassigned ${category.charAt(0).toUpperCase()}${category.slice(1)}`
        );

        line.actualAmount += amount;
        line.variance = line.budgetAmount - line.actualAmount;
      });

      const ledgerLines = Array.from(ledgerMap.values());

      // -------- Summary rollup --------
      const totalBudget = ledgerLines.reduce((sum, line) => sum + line.budgetAmount, 0);
      const totalActual = ledgerLines.reduce((sum, line) => sum + line.actualAmount, 0);
      const totalVariance = totalBudget - totalActual;

      const sumByCategory = (category: CostCodeLedgerLine['category']) =>
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

      const byCategory = {
        labor: sumByCategory('labor'),
        subs: sumByCategory('subs'),
        materials: sumByCategory('materials'),
        misc: sumByCategory('misc'),
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
