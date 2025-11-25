import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectFinancialsV3 {
  budget: {
    labor: number;
    subs: number;
    materials: number;
    other: number;
    total: number;
  };
  actuals: {
    labor: number;
    subs: number;
    materials: number;
    misc: number;
    total: number;
  };
  unpaid: {
    labor: number;
    subs: number;
    materials: number;
    misc: number;
  };
  invoicing: {
    billed: number;
    retentionHeld: number;
  };
  variance: number;
  margin: number;
  percentComplete: number;
}

/**
 * Project-level financials aligned with Job Costing + global views.
 *
 * Reads from:
 * - project_budgets
 * - project_labor_summary_view
 * - project_cost_summary_view
 * - project_revenue_summary_view
 */
export function useProjectFinancialsV3(projectId: string) {
  return useQuery({
    queryKey: ['project-financials-v3', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      // 1) Budget by category
      const { data: budget, error: budgetError } = await supabase
        .from('project_budgets')
        .select('labor_budget, subs_budget, materials_budget, other_budget')
        .eq('project_id', projectId)
        .maybeSingle();

      if (budgetError) throw budgetError;

      const laborBudget = budget?.labor_budget ?? 0;
      const subsBudget = budget?.subs_budget ?? 0;
      const materialsBudget = budget?.materials_budget ?? 0;
      const otherBudget = budget?.other_budget ?? 0;
      const totalBudget =
        laborBudget + subsBudget + materialsBudget + otherBudget;

      // 2) Labor actuals from canonical labor summary view
      const { data: laborView, error: laborError } = await supabase
        .from('project_labor_summary_view')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (laborError) throw laborError;

      const laborActual = laborView?.total_labor_cost ?? 0;
      const laborUnpaid = laborView?.unpaid_labor_cost ?? 0;

      // 3) Non-labor costs from cost summary view
      const { data: costView, error: costError } = await supabase
        .from('project_cost_summary_view')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (costError) throw costError;

      const subsActual = costView?.subs_cost ?? 0;
      const materialsActual = costView?.materials_cost ?? 0;
      const miscActual = costView?.misc_cost ?? 0;

      const subsUnpaid = costView?.subs_unpaid ?? 0;
      const materialsUnpaid = costView?.materials_unpaid ?? 0;
      const miscUnpaid = costView?.misc_unpaid ?? 0;

      // 4) Revenue / billed from revenue summary view
      const { data: revenueView, error: revenueError } = await supabase
        .from('project_revenue_summary_view')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (revenueError) throw revenueError;

      const billed = revenueView?.billed_amount ?? 0;

      // 5) Rollups
      const totalActual = laborActual + subsActual + materialsActual + miscActual;
      const variance = totalBudget - totalActual;
      const margin = billed - totalActual;
      const percentComplete =
        totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

      // You explicitly parked retention / SOV logic for now
      const retentionHeld = 0;

      const result: ProjectFinancialsV3 = {
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
          labor: laborUnpaid,
          subs: subsUnpaid,
          materials: materialsUnpaid,
          misc: miscUnpaid,
        },
        invoicing: {
          billed,
          retentionHeld,
        },
        variance,
        margin,
        percentComplete,
      };

      return result;
    },
  });
}
