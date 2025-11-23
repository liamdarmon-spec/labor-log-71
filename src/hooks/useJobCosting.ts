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
      // Build base projects query
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
      if (filters?.projectStatus) {
        projectsQuery = projectsQuery.eq('status', filters.projectStatus);
      }

      const { data: projects, error: projectsError } = await projectsQuery;
      if (projectsError) throw projectsError;

      if (!projects || projects.length === 0) return [];

      const projectIds = projects.map(p => p.id);

      // Fetch budgets with a single query
      const { data: budgets } = await supabase
        .from('project_budgets')
        .select('project_id, labor_budget, subs_budget, materials_budget, other_budget')
        .in('project_id', projectIds);

      // Fetch labor actuals with single query
      const { data: laborActuals } = await supabase
        .from('daily_logs')
        .select('project_id, hours_worked, workers!inner(hourly_rate)')
        .in('project_id', projectIds);

      // Fetch costs actuals with single query
      const { data: costsActuals } = await supabase
        .from('costs')
        .select('project_id, category, amount')
        .in('project_id', projectIds);

      // Fetch invoices with single query
      const { data: invoices } = await supabase
        .from('invoices')
        .select('project_id, total_amount')
        .in('project_id', projectIds)
        .neq('status', 'void');

      // Client-side aggregation (optimized with Maps for O(1) lookups)
      const budgetMap = new Map(budgets?.map(b => [b.project_id, b]));
      
      const laborMap = new Map<string, number>();
      (laborActuals || []).forEach((log: any) => {
        const cost = log.hours_worked * (log.workers?.hourly_rate || 0);
        laborMap.set(log.project_id, (laborMap.get(log.project_id) || 0) + cost);
      });

      const costsMap = new Map<string, { subs: number; materials: number; misc: number }>();
      (costsActuals || []).forEach((cost: any) => {
        if (!costsMap.has(cost.project_id)) {
          costsMap.set(cost.project_id, { subs: 0, materials: 0, misc: 0 });
        }
        const projectCosts = costsMap.get(cost.project_id)!;
        if (cost.category === 'subs') projectCosts.subs += cost.amount || 0;
        else if (cost.category === 'materials') projectCosts.materials += cost.amount || 0;
        else if (cost.category === 'misc') projectCosts.misc += cost.amount || 0;
      });

      const invoiceMap = new Map<string, number>();
      invoices?.forEach(inv => {
        invoiceMap.set(inv.project_id, (invoiceMap.get(inv.project_id) || 0) + (inv.total_amount || 0));
      });

      // Build final result set
      return projects.map(project => {
        const budget = budgetMap.get(project.id);
        const totalBudget = (budget?.labor_budget || 0) + 
                           (budget?.subs_budget || 0) + 
                           (budget?.materials_budget || 0) + 
                           (budget?.other_budget || 0);

        const laborActual = laborMap.get(project.id) || 0;
        const projectCosts = costsMap.get(project.id) || { subs: 0, materials: 0, misc: 0 };
        
        const totalActual = laborActual + projectCosts.subs + projectCosts.materials + projectCosts.misc;
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
