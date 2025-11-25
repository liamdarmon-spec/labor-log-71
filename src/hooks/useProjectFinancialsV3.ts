// FILE: src/hooks/useProjectFinancialsV3.ts
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
 * Project-level financials that match the global Job Costing calculations.
 * Uses:
 * - project_budgets         → contract/budget
 * - project_labor_summary_view  → labor actuals + unpaid
 * - project_cost_summary_view   → subs/materials/misc actuals + unpaid
 * - project_revenue_summary_view → billed amount
 */
export function useProjectFinancialsV3(projectId: string) {
  return useQuery<ProjectFinancialsV3>({
    queryKey: ['project-financials-v3', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) throw new Error('projectId is required');

      // 1) Budget (contract level)
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
      const totalBudget = laborBudget + subsBudget + materialsBudget + otherBudget;

      // 2) Labor summary from view
      const { data: laborView, error: laborError } = await supabase
        .from('project_labor_summary_view')
        .select('total_labor_cost, unpaid_labor_cost')
        .eq('project_id', projectId)
        .maybeSingle();

      if (laborError) throw laborError;

      const laborActual = Number(laborView?.total_labor_cost || 0);
      const unpaidLabor = Number(laborView?.unpaid_labor_cost || 0);

      // 3) Non-labor cost summary from view
      const { data: costView, error: costError } = await supabase
        .from('project_cost_summary_view')
        .select(
          'subs_cost, materials_cost, misc_cost, subs_unpaid, materials_unpaid, misc_unpaid'
        )
        .eq('project_id', projectId)
        .maybeSingle();

      if (costError) throw costError;

      const subsActual = Number(costView?.subs_cost || 0);
      const materialsActual = Number(costView?.materials_cost || 0);
      const miscActual = Number(costView?.misc_cost || 0);

      const unpaidSubs = Number(costView?.subs_unpaid || 0);
      const unpaidMaterials = Number(costView?.materials_unpaid || 0);
      // misc unpaid tracked but not surfaced separately yet
      // const unpaidMisc = Number(costView?.misc_unpaid || 0);

      // 4) Billed amount from invoices via view
      const { data: revenueView, error: revenueError } = await supabase
        .from('project_revenue_summary_view')
        .select('billed_amount')
        .eq('project_id', projectId)
        .maybeSingle();

      if (revenueError) throw revenueError;

      const billed = Number(revenueView?.billed_amount || 0);

      // 5) Roll-up
      const totalActual = laborActual + subsActual + materialsActual + miscActual;
      const variance = totalBudget - totalActual;
      const margin = billed - totalActual;
      const percentComplete = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

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
          labor: unpaidLabor,
          subs: unpaidSubs,
          materials: unpaidMaterials,
        },
        invoicing: {
          billed,
          // Owner-side retention/schedule-of-values is out of scope for now.
          retentionHeld: 0,
        },
        variance,
        margin,
        percentComplete,
      };

      return result;
    },
  });
}
