import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryBreakdown {
  budget: number;
  actual: number;
  variance: number;
  percentConsumed: number;
  unpaid: number;
  entryCount: number;
}

export interface ProjectFinancialsV2 {
  // Budget
  totalBudget: number;
  laborBudget: number;
  subsBudget: number;
  materialsBudget: number;

  // Actual Costs
  actualCost: number;
  laborActual: number;
  subsActual: number;
  materialsActual: number;

  // Variance
  variance: number;
  percentConsumed: number;

  // Unpaid
  unpaidLabor: number;
  unpaidSubs: number;
  unpaidMaterials: number;

  // Categories breakdown
  categories: {
    labor: CategoryBreakdown;
    subs: CategoryBreakdown;
    materials: CategoryBreakdown;
  };
}

/**
 * PROJECT-LEVEL FINANCIALS (CANONICAL)
 *
 * Budgets:
 *   - project_budgets (labor_budget, subs_budget, materials_budget, other_budget)
 *
 * Actuals:
 *   - Labor     → project_labor_summary_view (time_logs.labor_cost)
 *   - Subs      → project_cost_summary_view (category = 'subs')
 *   - Materials → project_cost_summary_view (category = 'materials')
 *
 * Unpaid:
 *   - Labor     → project_labor_summary_view.unpaid_labor_cost
 *   - Subs      → project_cost_summary_view.subs_unpaid
 *   - Materials → project_cost_summary_view.materials_unpaid
 */
export function useProjectFinancialsV2(projectId: string) {
  return useQuery({
    queryKey: ['project-financials-v2', projectId],
    queryFn: async (): Promise<ProjectFinancialsV2> => {
      // ---- 1) Budget from project_budgets ----
      const { data: budgetRow, error: budgetError } = await supabase
        .from('project_budgets')
        .select('labor_budget, subs_budget, materials_budget, other_budget')
        .eq('project_id', projectId)
        .maybeSingle();

      if (budgetError) throw budgetError;

      const laborBudget = Number(budgetRow?.labor_budget || 0);
      const subsBudget = Number(budgetRow?.subs_budget || 0);
      const materialsBudget = Number(budgetRow?.materials_budget || 0);
      const otherBudget = Number(budgetRow?.other_budget || 0);

      const totalBudget = laborBudget + subsBudget + materialsBudget + otherBudget;

      // ---- 2) Labor actuals from project_labor_summary_view ----
      const { data: laborSummary, error: laborError } = await supabase
        .from('project_labor_summary_view')
        .select(
          'total_hours, total_labor_cost, paid_labor_cost, unpaid_labor_cost, time_log_count'
        )
        .eq('project_id', projectId)
        .maybeSingle();

      if (laborError) throw laborError;

      const laborActual = Number(laborSummary?.total_labor_cost || 0);
      const unpaidLabor = Number(laborSummary?.unpaid_labor_cost || 0);
      const laborEntryCount = Number(laborSummary?.time_log_count || 0);

      // ---- 3) Subs / Materials actuals from project_cost_summary_view ----
      const { data: costSummary, error: costError } = await supabase
        .from('project_cost_summary_view')
        .select(
          'subs_cost, materials_cost, subs_unpaid, materials_unpaid, cost_entry_count'
        )
        .eq('project_id', projectId)
        .maybeSingle();

      if (costError) throw costError;

      const subsActual = Number(costSummary?.subs_cost || 0);
      const materialsActual = Number(costSummary?.materials_cost || 0);
      const unpaidSubs = Number(costSummary?.subs_unpaid || 0);
      const unpaidMaterials = Number(costSummary?.materials_unpaid || 0);

      // We want per-category entry counts → pull from costs table
      const { data: costEntries, error: costEntriesError } = await supabase
        .from('costs')
        .select('id, category')
        .eq('project_id', projectId)
        .in('category', ['subs', 'materials']);

      if (costEntriesError) throw costEntriesError;

      const subsEntryCount =
        costEntries?.filter((c: any) => c.category === 'subs').length || 0;
      const materialsEntryCount =
        costEntries?.filter((c: any) => c.category === 'materials').length || 0;

      // ---- 4) Totals & variance ----
      const actualCost = laborActual + subsActual + materialsActual;
      const variance = totalBudget - actualCost;
      const percentConsumed =
        totalBudget > 0 ? (actualCost / totalBudget) * 100 : 0;

      // ---- 5) Category breakdowns ----
      const laborVariance = laborBudget - laborActual;
      const subsVariance = subsBudget - subsActual;
      const materialsVariance = materialsBudget - materialsActual;

      const financials: ProjectFinancialsV2 = {
        totalBudget,
        laborBudget,
        subsBudget,
        materialsBudget,

        actualCost,
        laborActual,
        subsActual,
        materialsActual,

        variance,
        percentConsumed,

        unpaidLabor,
        unpaidSubs,
        unpaidMaterials,

        categories: {
          labor: {
            budget: laborBudget,
            actual: laborActual,
            variance: laborVariance,
            percentConsumed:
              laborBudget > 0 ? (laborActual / laborBudget) * 100 : 0,
            unpaid: unpaidLabor,
            entryCount: laborEntryCount,
          },
          subs: {
            budget: subsBudget,
            actual: subsActual,
            variance: subsVariance,
            percentConsumed:
              subsBudget > 0 ? (subsActual / subsBudget) * 100 : 0,
            unpaid: unpaidSubs,
            entryCount: subsEntryCount,
          },
          materials: {
            budget: materialsBudget,
            actual: materialsActual,
            variance: materialsVariance,
            percentConsumed:
              materialsBudget > 0 ? (materialsActual / materialsBudget) * 100 : 0,
            unpaid: unpaidMaterials,
            entryCount: materialsEntryCount,
          },
        },
      };

      return financials;
    },
    enabled: !!projectId,
  });
}

/**
 * GLOBAL FINANCIALS HOOK
 *
 * Now backed directly by global_financial_summary_view.
 * (One row summarizing the whole company.)
 */
export function useGlobalFinancials(filters?: {
  companyId?: string;
  startDate?: string;
  endDate?: string;
  projectId?: string;
}) {
  return useQuery({
    queryKey: ['global-financials', filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_financial_summary_view')
        .select('*')
        .single();

      if (error) throw error;

      return {
        totalRevenue: Number(data?.revenue || 0),
        totalProfit: Number(data?.profit || 0),
        totalCosts: Number(data?.total_costs || 0),
        totalOutstanding: Number(data?.total_outstanding || 0),

        laborActual: Number(data?.labor_actual || 0),
        laborUnpaid: Number(data?.labor_unpaid || 0),

        subsActual: Number(data?.subs_actual || 0),
        subsUnpaid: Number(data?.subs_unpaid || 0),

        materialsActual: Number(data?.materials_actual || 0),
        retentionHeld: Number(data?.retention_held || 0),
      };
    },
  });
}
