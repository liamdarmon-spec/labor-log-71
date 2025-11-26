import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchProjectBudgetLedger } from './useProjectBudgetLedger';

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
    total: number;
  };
  invoicing: {
    billed: number;
    retentionHeld: number;
  };
  variance: number;        // budget - actual
  margin: number;          // billed - actual
  percentComplete: number; // actual / budget
}

/**
 * Project-level financials aligned with:
 * - project_labor_summary_view
 * - project_cost_summary_view
 * - project_revenue_summary_view
 * - project_budgets / project_budget_lines
 */
export function useProjectFinancialsV3(projectId: string) {
  return useQuery<ProjectFinancialsV3>({
    queryKey: ['project-financials-v3', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) throw new Error('projectId is required');

      // Run everything in parallel
      const [
        budgetLedger,
        { data: laborRow, error: laborError },
        { data: costRow, error: costError },
        { data: revenueRow, error: revenueError },
        { data: invoices, error: invoiceError },
        { data: budgetRow, error: budgetError },
      ] = await Promise.all([
        fetchProjectBudgetLedger(projectId),
        supabase
          .from('project_labor_summary_view')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle(),
        supabase
          .from('project_cost_summary_view')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle(),
        supabase
          .from('project_revenue_summary_view')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle(),
        supabase
          .from('invoices')
          .select('total_amount, status, retention_amount')
          .eq('project_id', projectId)
          .neq('status', 'void'),
        supabase
          .from('project_budgets')
          .select('labor_budget, subs_budget, materials_budget, other_budget')
          .eq('project_id', projectId)
          .maybeSingle(),
      ]);

      if (laborError) throw laborError;
      if (costError) throw costError;
      if (revenueError) throw revenueError;
      if (invoiceError) throw invoiceError;
      if (budgetError) throw budgetError;

      const laborActual = laborRow?.total_labor_cost || 0;
      const laborUnpaid = laborRow?.unpaid_labor_cost || 0;

      const subsActual = costRow?.subs_cost || 0;
      const subsUnpaid = costRow?.subs_unpaid || 0;

      const materialsActual = costRow?.materials_cost || 0;
      const materialsUnpaid = costRow?.materials_unpaid || 0;

      const miscActual = costRow?.misc_cost || 0;
      const miscUnpaid = costRow?.misc_unpaid || 0;

      const billed = revenueRow?.billed_amount || 0;

      const retentionHeld =
        (invoices || []).reduce(
          (sum, inv: any) => sum + (inv.retention_amount || 0),
          0
        ) || 0;

      const laborBudget = budgetRow?.labor_budget || 0;
      const subsBudget = budgetRow?.subs_budget || 0;
      const materialsBudget = budgetRow?.materials_budget || 0;
      const otherBudget = budgetRow?.other_budget || 0;

      const totalBudget =
        laborBudget + subsBudget + materialsBudget + otherBudget;

      const totalActual =
        laborActual + subsActual + materialsActual + miscActual;

      const totalUnpaid =
        laborUnpaid + subsUnpaid + materialsUnpaid + miscUnpaid;

      const variance = totalBudget - totalActual;
      const margin = billed - totalActual;
      const percentComplete =
        totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

      const financials: ProjectFinancialsV3 = {
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
          total: totalUnpaid,
        },
        invoicing: {
          billed,
          retentionHeld,
        },
        variance,
        margin,
        percentComplete,
      };

      return financials;
    },
  });
}
