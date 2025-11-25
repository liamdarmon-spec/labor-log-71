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
      //
      // 1) Projects Query (unchanged)
      //
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

      //
      // 2) Budgets (canonical)
      //
      const { data: budgets, error: budgetsError } = await supabase
        .from('project_budgets')
        .select('project_id, labor_budget, subs_budget, materials_budget, other_budget')
        .in('project_id', projectIds);

      if (budgetsError) throw budgetsError;

      //
      // 3) LABOR: from project_labor_summary_view (~60% faster)
      //
      const { data: laborSummaries, error: laborError } = await supabase
        .from('project_labor_summary_view')
        .select('project_id, total_labor_cost')
        .in('project_id', projectIds);

      if (laborError) throw laborError;

      const laborMap = new Map<string, number>(
        (laborSummaries || []).map(row => [
          row.project_id,
          row.total_labor_cost || 0
        ])
      );

      //
      // 4) COSTS: from project_cost_summary_view
      //
      const { data: costSummaries, error: costError } = await supabase
        .from('project_cost_summary_view')
        .select('project_id, subs_cost, materials_cost, misc_cost')
        .in('project_id', projectIds);

      if (costError) throw costError;

      const costsMap = new Map<
        string,
        { subs: number; materials: number; misc: number }
      >(
        (costSummaries || []).map(row => [
          row.project_id,
          {
            subs: row.subs_cost || 0,
            materials: row.materials_cost || 0,
            misc: row.misc_cost || 0
          }
        ])
      );

      //
      // 5) Revenue / billed (still from invoices)
      //
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('project_id, total_amount, status')
        .in('project_id', projectIds)
        .neq('status', 'void');

      if (invoicesError) throw invoicesError;

      const invoiceMap = new Map<string, number>();
      (invoices || []).forEach(inv => {
        const amt = inv.total_amount || 0;
        invoiceMap.set(
          inv.project_id,
          (invoiceMap.get(inv.project_id) || 0) + amt
        );
      });

      //
      // ---------- FINAL UI SHAPE ----------
      //
      return projects.map(project => {
        const budget = budgets?.find(b => b.project_id === project.id);
        const totalBudget =
          (budget?.labor_budget || 0) +
          (budget?.subs_budget || 0) +
          (budget?.materials_budget || 0) +
          (budget?.other_budget || 0);

        const laborActual = laborMap.get(project.id) || 0;
        const c = costsMap.get(project.id) || { subs: 0, materials: 0, misc: 0 };

        const totalActual = laborActual + c.subs + c.materials + c.misc;
        const variance = totalBudget - totalActual;

        const billed = invoiceMap.get(project.id) || 0;
        const margin = billed - totalActual;

        return {
          project,
          budget: totalBudget,
          actuals: {
            labor: laborActual,
            subs: c.subs,
            materials: c.materials,
            misc: c.misc,
            total: totalActual
          },
          variance,
          billed,
          margin
        };
      });
    },
  });
}
