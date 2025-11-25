import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface JobCostingFilters {
  companyId?: string;
  projectStatus?: string;
}

export function useJobCosting(filters?: JobCostingFilters) {
  return useQuery({
    queryKey: ['job-costing', filters],
    queryFn: async () => {
      // 1) Base projects query
      let projectsQuery = supabase
        .from('projects')
        .select(`
          id,
          project_name,
          company_id,
          status,
          companies (id, name)
        `);

      if (filters?.companyId) {
        projectsQuery = projectsQuery.eq('company_id', filters.companyId);
      }
      if (filters?.projectStatus && filters.projectStatus !== 'all') {
        projectsQuery = projectsQuery.eq('status', filters.projectStatus);
      }

      const { data: projects, error: projectsError } = await projectsQuery;
      if (projectsError) throw projectsError;

      if (!projects || projects.length === 0) return [];

      const projectIds = projects.map(p => p.id);

      // 2) Budgets (still canonical source)
      const { data: budgets, error: budgetsError } = await supabase
        .from('project_budgets')
        .select('project_id, labor_budget, subs_budget, materials_budget, other_budget')
        .in('project_id', projectIds);

      if (budgetsError) throw budgetsError;

      // 3) Labor actuals — SWITCHED TO time_logs (canonical labor ledger)
      const { data: laborActuals, error: laborError } = await supabase
        .from('time_logs')
        .select('project_id, labor_cost')
        .in('project_id', projectIds);

      if (laborError) throw laborError;

      // 4) Non-labor costs (subs / materials / misc) from costs table
      const { data: costsActuals, error: costsError } = await supabase
        .from('costs')
        .select('project_id, category, amount')
        .in('project_id', projectIds);

      if (costsError) throw costsError;

      // 5) Revenue / billed from invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('project_id, total_amount, status')
        .in('project_id', projectIds)
        .neq('status', 'void');

      if (invoicesError) throw invoicesError;

      // ---------- AGGREGATION LAYER ----------

      // Budgets by project
      const budgetMap = new Map(
        (budgets || []).map(b => [b.project_id, b])
      );

      // Labor actuals by project (from time_logs)
      const laborMap = new Map<string, number>();
      (laborActuals || []).forEach((log: any) => {
        const cost = log.labor_cost || 0;
        laborMap.set(
          log.project_id,
          (laborMap.get(log.project_id) || 0) + cost
        );
      });

      // Cost categories by project
      const costsMap = new Map<
        string,
        { subs: number; materials: number; misc: number }
      >();

      (costsActuals || []).forEach((cost: any) => {
        if (!costsMap.has(cost.project_id)) {
          costsMap.set(cost.project_id, { subs: 0, materials: 0, misc: 0 });
        }
        const projectCosts = costsMap.get(cost.project_id)!;

        if (cost.category === 'subs') {
          projectCosts.subs += cost.amount || 0;
        } else if (cost.category === 'materials') {
          projectCosts.materials += cost.amount || 0;
        } else {
          // treat anything else as misc (including old 'other' / 'misc')
          projectCosts.misc += cost.amount || 0;
        }
      });

      // Invoiced / billed by project
      const invoiceMap = new Map<string, number>();
      (invoices || []).forEach(inv => {
        const amt = inv.total_amount || 0;
        invoiceMap.set(
          inv.project_id,
          (invoiceMap.get(inv.project_id) || 0) + amt
        );
      });

      // ---------- FINAL SHAPE FOR UI ----------

      return projects.map(project => {
        const budget = budgetMap.get(project.id);
        const totalBudget =
          (budget?.labor_budget || 0) +
          (budget?.subs_budget || 0) +
          (budget?.materials_budget || 0) +
          (budget?.other_budget || 0);

        const laborActual = laborMap.get(project.id) || 0;
        const projectCosts = costsMap.get(project.id) || {
          subs: 0,
          materials: 0,
          misc: 0,
        };

        const totalActual =
          laborActual +
          projectCosts.subs +
          projectCosts.materials +
          projectCosts.misc;

        const variance = totalBudget - totalActual;

        const billed = invoiceMap.get(project.id) || 0;
        const margin = billed - totalActual;

        return {
          project,
          budget: totalBudget,
          actuals: {
            labor: laborActual,
            subs: projectCosts.subs,
            materials: projectCosts.materials,
            misc: projectCosts.misc,
            total: totalActual,
          },
          variance,
          billed,
          margin,
        };
      });
    },
  });
}
