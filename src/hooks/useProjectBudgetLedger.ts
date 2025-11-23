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

export function useProjectBudgetLedger(projectId: string) {
  return useQuery({
    queryKey: ['project-budget-ledger', projectId],
    queryFn: async () => {
      // Fetch budget lines
      const { data: budgetLines } = await supabase
        .from('project_budget_lines')
        .select('*, cost_codes(id, code, name, category)')
        .eq('project_id', projectId);

      // Fetch labor actuals
      const { data: laborLogs } = await supabase
        .from('daily_logs')
        .select('cost_code_id, hours_worked, worker_id, payment_status')
        .eq('project_id', projectId);

      // Fetch worker rates
      const workerIds = [...new Set(laborLogs?.map(l => l.worker_id) || [])];
      const { data: workers } = await supabase
        .from('workers')
        .select('id, hourly_rate')
        .in('id', workerIds);

      const workerRateMap = new Map(workers?.map(w => [w.id, w.hourly_rate]) || []);

      // Fetch sub actuals
      const { data: subLogs } = await supabase
        .from('sub_logs')
        .select('cost_code_id, amount')
        .eq('project_id', projectId);

      // Fetch material actuals from costs table
      const { data: materialCosts } = await supabase
        .from('costs')
        .select('cost_code_id, amount')
        .eq('project_id', projectId)
        .eq('category', 'materials');

      // Build ledger lines by cost code
      const ledgerMap = new Map<string, CostCodeLedgerLine>();

      // Add budget lines
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

      // Add labor actuals
      laborLogs?.forEach((log) => {
        const costCodeId = log.cost_code_id || 'unassigned';
        const rate = workerRateMap.get(log.worker_id) || 0;
        const cost = (log.hours_worked || 0) * rate;

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
        line.actualHours = (line.actualHours || 0) + (log.hours_worked || 0);
        line.variance = line.budgetAmount - line.actualAmount;
      });

      // Add sub actuals
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
        line.actualAmount += log.amount || 0;
        line.variance = line.budgetAmount - line.actualAmount;
      });

      // Add material actuals from costs table
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
        line.actualAmount += cost.amount || 0;
        line.variance = line.budgetAmount - line.actualAmount;
      });

      const ledgerLines = Array.from(ledgerMap.values());

      // Calculate summary
      const totalBudget = ledgerLines.reduce((sum, line) => sum + line.budgetAmount, 0);
      const totalActual = ledgerLines.reduce((sum, line) => sum + line.actualAmount, 0);
      const totalVariance = totalBudget - totalActual;

      const unpaidLabor = laborLogs?.reduce((sum, log) => {
        if (log.payment_status === 'unpaid') {
          const rate = workerRateMap.get(log.worker_id) || 0;
          return sum + ((log.hours_worked || 0) * rate);
        }
        return sum;
      }, 0) || 0;

      const byCategory = {
        labor: ledgerLines
          .filter(l => l.category === 'labor')
          .reduce((acc, l) => ({
            budget: acc.budget + l.budgetAmount,
            actual: acc.actual + l.actualAmount,
            variance: acc.variance + l.variance,
          }), { budget: 0, actual: 0, variance: 0 }),
        subs: ledgerLines
          .filter(l => l.category === 'subs')
          .reduce((acc, l) => ({
            budget: acc.budget + l.budgetAmount,
            actual: acc.actual + l.actualAmount,
            variance: acc.variance + l.variance,
          }), { budget: 0, actual: 0, variance: 0 }),
        materials: ledgerLines
          .filter(l => l.category === 'materials')
          .reduce((acc, l) => ({
            budget: acc.budget + l.budgetAmount,
            actual: acc.actual + l.actualAmount,
            variance: acc.variance + l.variance,
          }), { budget: 0, actual: 0, variance: 0 }),
        misc: ledgerLines
          .filter(l => l.category === 'misc' || l.category === 'other')
          .reduce((acc, l) => ({
            budget: acc.budget + l.budgetAmount,
            actual: acc.actual + l.actualAmount,
            variance: acc.variance + l.variance,
          }), { budget: 0, actual: 0, variance: 0 }),
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
