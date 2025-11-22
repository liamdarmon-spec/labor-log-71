import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UnifiedCosts {
  laborActual: number;
  subsActual: number;
  materialsActual: number;
  totalActual: number;
  laborBudget: number;
  subsBudget: number;
  materialsBudget: number;
  totalBudget: number;
  variance: number;
  byCategory: {
    labor: { budget: number; actual: number; variance: number };
    subs: { budget: number; actual: number; variance: number };
    materials: { budget: number; actual: number; variance: number };
  };
}

export function useUnifiedCosts(projectId?: string) {
  return useQuery({
    queryKey: ['unified-costs', projectId],
    queryFn: async () => {
      // Labor Actuals
      let laborQuery = supabase
        .from('daily_logs')
        .select('hours_worked, workers(hourly_rate)');
      
      if (projectId) {
        laborQuery = laborQuery.eq('project_id', projectId);
      }

      const { data: laborLogs } = await laborQuery;
      const laborActual = (laborLogs || []).reduce((sum, log: any) => 
        sum + (log.hours_worked * (log.workers?.hourly_rate || 0)), 0
      );

      // Sub Actuals
      let subsQuery = supabase
        .from('sub_invoices')
        .select('total, payment_status');
      
      if (projectId) {
        subsQuery = subsQuery.eq('project_id', projectId);
      }

      const { data: subInvoices } = await subsQuery;
      const subsActual = (subInvoices || [])
        .filter((inv: any) => inv.payment_status !== 'rejected')
        .reduce((sum, inv: any) => sum + inv.total, 0);

      // Materials Actuals
      let materialsQuery = supabase
        .from('material_receipts')
        .select('total');
      
      if (projectId) {
        materialsQuery = materialsQuery.eq('project_id', projectId);
      }

      const { data: materials } = await materialsQuery;
      const materialsActual = (materials || []).reduce((sum, m: any) => sum + m.total, 0);

      // Budget
      let budgetQuery = supabase
        .from('project_budgets')
        .select('labor_budget, subs_budget, materials_budget');

      if (projectId) {
        budgetQuery = budgetQuery.eq('project_id', projectId);
      }

      const { data: budgets } = await budgetQuery;

      let laborBudget = 0;
      let subsBudget = 0;
      let materialsBudget = 0;

      if (budgets && budgets.length > 0) {
        laborBudget = budgets.reduce((sum, b: any) => sum + (b.labor_budget || 0), 0);
        subsBudget = budgets.reduce((sum, b: any) => sum + (b.subs_budget || 0), 0);
        materialsBudget = budgets.reduce((sum, b: any) => sum + (b.materials_budget || 0), 0);
      }

      const totalActual = laborActual + subsActual + materialsActual;
      const totalBudget = laborBudget + subsBudget + materialsBudget;
      const variance = totalBudget - totalActual;

      const costs: UnifiedCosts = {
        laborActual,
        subsActual,
        materialsActual,
        totalActual,
        laborBudget,
        subsBudget,
        materialsBudget,
        totalBudget,
        variance,
        byCategory: {
          labor: {
            budget: laborBudget,
            actual: laborActual,
            variance: laborBudget - laborActual,
          },
          subs: {
            budget: subsBudget,
            actual: subsActual,
            variance: subsBudget - subsActual,
          },
          materials: {
            budget: materialsBudget,
            actual: materialsActual,
            variance: materialsBudget - materialsActual,
          },
        },
      };

      return costs;
    },
  });
}
