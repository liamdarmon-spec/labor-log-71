import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Project-level financials aligned with Job Costing + views.
 *
 * Budgets:
 *   - project_budgets
 *
 * Actuals:
 *   - Labor     → project_labor_summary_view
 *   - Subs/etc  → project_cost_summary_view
 *
 * Revenue:
 *   - project_revenue_summary_view (billed)
 *   - invoices.retention_amount for retention held
 */
export function useProjectFinancialsV3(projectId: string) {
  return useQuery({
    queryKey: ['project-financials-v3', projectId],
    queryFn: async () => {
      // 1) Budget
      const { data: budget, error: budgetError } = await supabase
        .from('project_budgets')
        .select('labor_budget, subs_budget, materials_budget, other_budget')
        .eq('project_id', projectId)
        .maybeSingle();

      if (budgetError) throw budgetError;

      const laborBudget = Number(budget?.labor_budget || 0);
      const subsBudget = Number(budget?.subs_budget || 0);
      const materialsBudget = Number(budget?.materials_budget || 0);
      const otherBudget = Number(budget?.other_budget || 0);

      const totalBudget =
        laborBudget + subsBudget + materialsBudget + otherBudget;

      // 2) Labor from view
      const { data: laborSummary, error: laborError } = await supabase
        .from('project_labor_summary_view')
        .select(
          'total_labor_cost, unpaid_labor_cost'
        )
        .eq('project_id', projectId)
        .maybeSingle();

      if (laborError) throw laborError;

      const laborActual = Number(laborSummary?.total_labor_cost || 0);

      // 3) Costs from view
      const { data: costSummary, error: costError } = await supabase
        .from('project_cost_summary_view')
        .select(
          'total_cost, subs_cost, materials_cost, misc_cost, subs_unpaid, materials_unpaid'
        )
        .eq('project_id', projectId)
        .maybeSingle();

      if (costError) throw costError;

      const subsActual = Number(costSummary?.subs_cost || 0);
      const materialsActual = Number(costSummary?.materials_cost || 0);
      const miscActual = Number(costSummary?.misc_cost || 0);

      const subsUnpaid = Number(costSummary?.subs_unpaid || 0);
      const materialsUnpaid = Number(costSummary?.materials_unpaid || 0);

      // 4) Revenue & retention
      const { data: revenueRow, error: revenueError } = await supabase
        .from('project_revenue_summary_view')
        .select('billed_amount')
        .eq('project_id', projectId)
        .maybeSingle();

      if (revenueError) throw revenueError;

      const billed = Number(revenueRow?.billed_amount || 0);

      // Retention from invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('retention_amount, status, total_amount')
        .eq('project_id', projectId)
        .neq('status', 'void');

      if (invoicesError) throw invoicesError;

      const retentionHeld =
        invoices?.reduce(
          (sum: number, inv: any) => sum + Number(inv.retention_amount || 0),
          0
        ) || 0;

      const totalActual = laborActual + subsActual + materialsActual + miscActual;
      const variance = totalBudget - totalActual;
      const margin = billed - totalActual;
      const percentComplete =
        totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

      return {
        budget: {
          labor: laborBudget,
          subs: subsBudget,
          materials: materialsBudget,
          other: otherBudget,
          total: totalBudget,
        },
        actuals: {
          labor: laborActual,
          subs: subsActual,
          materials: materialsActual,
          misc: miscActual,
          total: totalActual,
        },
        unpaid: {
          subs: subsUnpaid,
          materials: materialsUnpaid,
        },
        invoicing: {
          billed,
          retentionHeld,
        },
        variance,
        margin,
        percentComplete,
      };
    },
    enabled: !!projectId,
  });
}
