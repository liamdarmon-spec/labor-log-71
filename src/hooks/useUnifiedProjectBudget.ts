import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BudgetCategory = 'labor' | 'subs' | 'materials' | 'misc';

export interface ActualEntry {
  id: string;
  type: BudgetCategory;
  date: string;
  description: string;
  amount: number;
  hours?: number;
  worker_name?: string;
  vendor_name?: string;
}

export interface CostCodeBudgetLine {
  cost_code_id: string | null;
  code: string;
  description: string;
  category: BudgetCategory;
  budget_amount: number;
  budget_hours: number | null;
  actual_amount: number;
  actual_hours: number | null;
  variance: number;
  is_allowance: boolean;
  details: ActualEntry[];
}

export interface BudgetSummary {
  total_budget: number;
  total_actual: number;
  total_variance: number;
  labor_budget: number;
  labor_actual: number;
  labor_variance: number;
  labor_unpaid: number;
  subs_budget: number;
  subs_actual: number;
  subs_variance: number;
  materials_budget: number;
  materials_actual: number;
  materials_variance: number;
  other_budget: number;
  other_actual: number;
  other_variance: number;
}

// ---------------------
// CATEGORY HELPERS
// ---------------------

// Generic string → category
function normalizeCategory(raw?: string | null): BudgetCategory {
  const value = (raw || '').toLowerCase().trim();
  if (value.startsWith('lab')) return 'labor';
  if (value.startsWith('sub')) return 'subs';
  if (value.startsWith('mat')) return 'materials';
  return 'misc';
}

// For BUDGET LINES: trust cost code suffix first (-L, -S, -M)
// This fixes APPL-M being treated as Subs even though it's Materials.
function normalizeCategoryFromLine(line: any): BudgetCategory {
  const code = (line.cost_codes?.code || '').toUpperCase().trim();
  if (code.endsWith('-L')) return 'labor';
  if (code.endsWith('-S')) return 'subs';
  if (code.endsWith('-M')) return 'materials';

  // fallback to whatever label is stored
  return normalizeCategory(line.category);
}

// Composite key so same cost code can have multiple categories
function makeKey(costCodeId: string | null, category: BudgetCategory): string {
  return `${costCodeId || 'unassigned'}:${category}`;
}

// ---------------------
// MAIN HOOK
// ---------------------

export function useUnifiedProjectBudget(projectId: string) {
  return useQuery({
    queryKey: ['unified-project-budget', projectId],
    queryFn: async () => {
      // 1) Budget lines + cost codes
      const { data: budgetLines, error: budgetError } = await supabase
        .from('project_budget_lines')
        .select(`
          *,
          cost_codes (code, name)
        `)
        .eq('project_id', projectId)
        .order('category')
        .order('cost_code_id');

      if (budgetError) throw budgetError;

      // 2) Labor actuals from time_logs (canonical)
      const { data: laborLogs, error: laborError } = await supabase
        .from('time_logs')
        .select(`
          id,
          date,
          hours_worked,
          labor_cost,
          hourly_rate,
          notes,
          cost_code_id,
          payment_status,
          workers (name),
          cost_codes (code, name)
        `)
        .eq('project_id', projectId)
        .order('date', { ascending: false });

      if (laborError) throw laborError;

      // 3) ALL non-labor costs from costs (canonical)
      const { data: allCosts, error: costsError } = await supabase
        .from('costs')
        .select(`
          id,
          date_incurred,
          amount,
          description,
          cost_code_id,
          category,
          vendor_id,
          status,
          cost_codes (code, name)
        `)
        .eq('project_id', projectId)
        .order('date_incurred', { ascending: false });

      if (costsError) throw costsError;

      // 4) Build cost-code ledger using composite key (cost_code_id + category)
      const costCodeMap = new Map<string, CostCodeBudgetLine>();

      // 4a) Seed from budget lines
      budgetLines?.forEach(line => {
        const category = normalizeCategoryFromLine(line); // <<< IMPORTANT
        const key = makeKey(line.cost_code_id, category);

        if (!costCodeMap.has(key)) {
          costCodeMap.set(key, {
            cost_code_id: line.cost_code_id,
            code: line.cost_codes?.code || 'N/A',
            description: line.cost_codes?.name || line.description || 'Unassigned',
            category,
            budget_amount: 0,
            budget_hours: null,
            actual_amount: 0,
            actual_hours: null,
            variance: 0,
            is_allowance: line.is_allowance || false,
            details: [],
          });
        }
        const entry = costCodeMap.get(key)!;
        entry.budget_amount += line.budget_amount || 0;
        if (line.budget_hours) {
          entry.budget_hours = (entry.budget_hours || 0) + line.budget_hours;
        }
      });

      // 4b) Labor actuals
      laborLogs?.forEach((log: any) => {
        const category: BudgetCategory = 'labor';
        const key = makeKey(log.cost_code_id, category);

        if (!costCodeMap.has(key)) {
          costCodeMap.set(key, {
            cost_code_id: log.cost_code_id,
            code: log.cost_codes?.code || 'N/A',
            description: log.cost_codes?.name || 'Unassigned Labor',
            category,
            budget_amount: 0,
            budget_hours: null,
            actual_amount: 0,
            actual_hours: null,
            variance: 0,
            is_allowance: false,
            details: [],
          });
        }
        const entry = costCodeMap.get(key)!;
        const amount =
          log.labor_cost ?? (log.hours_worked * (log.hourly_rate || 0));

        entry.actual_amount += amount;
        entry.actual_hours = (entry.actual_hours || 0) + log.hours_worked;
        entry.details.push({
          id: log.id,
          type: 'labor',
          date: log.date,
          description:
            log.notes || `${log.workers?.name || 'Worker'} - ${log.hours_worked}h`,
          amount,
          hours: log.hours_worked,
          worker_name: log.workers?.name,
        });
      });

      // 4c) Non-labor costs (subs, materials, misc)
      allCosts?.forEach((cost: any) => {
        const category = normalizeCategory(cost.category);
        const key = makeKey(cost.cost_code_id, category);

        if (!costCodeMap.has(key)) {
          costCodeMap.set(key, {
            cost_code_id: cost.cost_code_id,
            code: cost.cost_codes?.code || 'N/A',
            description:
              cost.cost_codes?.name || `Unassigned ${category}`,
            category,
            budget_amount: 0,
            budget_hours: null,
            actual_amount: 0,
            actual_hours: null,
            variance: 0,
            is_allowance: false,
            details: [],
          });
        }
        const entry = costCodeMap.get(key)!;
        entry.actual_amount += cost.amount || 0;
        entry.details.push({
          id: cost.id,
          type: category,
          date: cost.date_incurred,
          description: cost.description || `${category} cost`,
          amount: cost.amount || 0,
          vendor_name: cost.vendor_id,
        });
      });

      // 5) Finalize lines + variance
      const costCodeLines = Array.from(costCodeMap.values()).map(line => ({
        ...line,
        variance: line.budget_amount - line.actual_amount,
      }));

      // 6) Summary totals (plus unpaid labor)
      const unpaidLaborAmount = (laborLogs || []).reduce(
        (sum: number, log: any) => {
          if (log.payment_status === 'unpaid') {
            return (
              sum +
              (log.labor_cost ??
                (log.hours_worked * (log.hourly_rate || 0)))
            );
          }
          return sum;
        },
        0
      );

      const summary: BudgetSummary = {
        total_budget: 0,
        total_actual: 0,
        total_variance: 0,
        labor_budget: 0,
        labor_actual: 0,
        labor_variance: 0,
        labor_unpaid: unpaidLaborAmount,
        subs_budget: 0,
        subs_actual: 0,
        subs_variance: 0,
        materials_budget: 0,
        materials_actual: 0,
        materials_variance: 0,
        other_budget: 0,
        other_actual: 0,
        other_variance: 0,
      };

      costCodeLines.forEach(line => {
        summary.total_budget += line.budget_amount;
        summary.total_actual += line.actual_amount;

        switch (line.category) {
          case 'labor':
            summary.labor_budget += line.budget_amount;
            summary.labor_actual += line.actual_amount;
            break;
          case 'subs':
            summary.subs_budget += line.budget_amount;
            summary.subs_actual += line.actual_amount;
            break;
          case 'materials':
            summary.materials_budget += line.budget_amount;
            summary.materials_actual += line.actual_amount;
            break;
          case 'misc':
            summary.other_budget += line.budget_amount;
            summary.other_actual += line.actual_amount;
            break;
        }
      });

      summary.total_variance = summary.total_budget - summary.total_actual;
      summary.labor_variance = summary.labor_budget - summary.labor_actual;
      summary.subs_variance = summary.subs_budget - summary.subs_actual;
      summary.materials_variance =
        summary.materials_budget - summary.materials_actual;
      summary.other_variance = summary.other_budget - summary.other_actual;

      return {
        costCodeLines,
        summary,
      };
    },
  });
}
