import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CostCodeLedgerLine {
  costCodeId: string | null;
  costCode: string;
  costCodeName: string;
  category: string; // 'labor' | 'subs' | 'materials' | 'misc'
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
 * Shared fetcher so both the hook and other financial hooks
 * can use the exact same ledger logic.
 */
export async function fetchProjectBudgetLedger(projectId: string) {
  if (!projectId) throw new Error('projectId is required');

  // 1) Budget lines (source of truth)
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

  // 3) Non-labor actuals from costs (subs/materials/misc)
  const { data: nonLaborCosts, error: costsError } = await supabase
    .from('costs')
    .select('cost_code_id, category, amount, status')
    .eq('project_id', projectId);

  if (costsError) throw costsError;

  // ----------------- BUILD LEDGER -----------------

  const ledgerMap = new Map<string, CostCodeLedgerLine>();

  // Helper to normalize categories
  const normalizeCategory = (raw: string | null): string => {
    if (!raw) return 'misc';
    const c = raw.toLowerCase();
    if (c === 'labor') return 'labor';
    if (c === 'subs' || c === 'subcontractor') return 'subs';
    if (c === 'materials' || c === 'material') return 'materials';
    return 'misc';
  };

  // Seed from budget lines
  budgetLines?.forEach((line: any) => {
    const costCodeId = line.cost_code_id || 'unassigned';
    const cc = line.cost_codes;
    const category = normalizeCategory(line.category || cc?.category || null);

    ledgerMap.set(costCodeId, {
      costCodeId: line.cost_code_id,
      costCode: cc?.code || 'MISC',
      costCodeName: cc?.name || 'Miscellaneous',
      category,
      budgetAmount: line.budget_amount || 0,
      budgetHours: line.budget_hours,
      actualAmount: 0,
      actualHours: 0,
      variance: line.budget_amount || 0,
    });
  });

  // Labor actuals from time_logs
  let unpaidLabor = 0;

  laborLogs?.forEach((log: any) => {
    const key = log.cost_code_id || 'unassigned';

    if (!ledgerMap.has(key)) {
      ledgerMap.set(key, {
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

    const line = ledgerMap.get(key)!;
    const cost = Number(log.labor_cost) || 0;
    const hours = Number(log.hours_worked) || 0;

    line.category = 'labor'; // force canonical category
    line.actualAmount += cost;
    line.actualHours = (line.actualHours || 0) + hours;
    line.variance = line.budgetAmount - line.actualAmount;

    if (log.payment_status === 'unpaid') {
      unpaidLabor += cost;
    }
  });

  // Non-labor actuals from costs
  nonLaborCosts?.forEach((row: any) => {
    const key = row.cost_code_id || 'unassigned';
    const category = normalizeCategory(row.category);

    if (!ledgerMap.has(key)) {
      ledgerMap.set(key, {
        costCodeId: row.cost_code_id,
        costCode: 'UNASSIGNED',
        costCodeName: 'Unassigned',
        category,
        budgetAmount: 0,
        budgetHours: null,
        actualAmount: 0,
        actualHours: null,
        variance: 0,
      });
    }

    const line = ledgerMap.get(key)!;
    const amount = Number(row.amount) || 0;

    // If budget said "labor" but costs say "materials", trust budget.
    if (!line.category || line.category === 'misc') {
      line.category = category;
    }

    line.actualAmount += amount;
    line.variance = line.budgetAmount - line.actualAmount;
  });

  const ledgerLines = Array.from(ledgerMap.values());

  // ----------------- SUMMARY -----------------

  const totalBudget = ledgerLines.reduce((sum, l) => sum + l.budgetAmount, 0);
  const totalActual = ledgerLines.reduce((sum, l) => sum + l.actualAmount, 0);
  const totalVariance = totalBudget - totalActual;

  const sumByCategory = (category: string) =>
    ledgerLines
      .filter((l) => l.category === category)
      .reduce(
        (acc, l) => {
          acc.budget += l.budgetAmount;
          acc.actual += l.actualAmount;
          acc.variance += l.variance;
          return acc;
        },
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

  return { ledgerLines, summary };
}

export function useProjectBudgetLedger(projectId: string) {
  return useQuery({
    queryKey: ['project-budget-ledger', projectId],
    queryFn: () => fetchProjectBudgetLedger(projectId),
    enabled: !!projectId,
  });
}
