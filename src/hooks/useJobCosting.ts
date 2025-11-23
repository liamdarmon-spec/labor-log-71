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
      // Fetch all active projects
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

      // Fetch budgets
      const { data: budgets } = await supabase
        .from('project_budgets')
        .select('*')
        .in('project_id', projectIds);

      // Fetch labor actuals (daily_logs)
      const { data: laborLogs } = await supabase
        .from('daily_logs')
        .select('project_id, hours_worked, workers!inner(hourly_rate)')
        .in('project_id', projectIds);

      // Fetch other costs
      const { data: costs } = await supabase
        .from('costs')
        .select('project_id, category, amount')
        .in('project_id', projectIds);

      // Fetch invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('project_id, total_amount, status')
        .in('project_id', projectIds)
        .neq('status', 'void');

      // Aggregate by project
      return projects.map(project => {
        const budget = budgets?.find(b => b.project_id === project.id);
        const totalBudget = (budget?.labor_budget || 0) + 
                           (budget?.subs_budget || 0) + 
                           (budget?.materials_budget || 0) + 
                           (budget?.other_budget || 0);

        // Labor actuals
        const projectLaborLogs = laborLogs?.filter(l => l.project_id === project.id) || [];
        const laborActual = projectLaborLogs.reduce((sum, log: any) => 
          sum + (log.hours_worked * (log.workers?.hourly_rate || 0)), 0
        );

        // Other costs actuals
        const projectCosts = costs?.filter(c => c.project_id === project.id) || [];
        const subsActual = projectCosts
          .filter(c => c.category === 'subs')
          .reduce((sum, c) => sum + (c.amount || 0), 0);
        const materialsActual = projectCosts
          .filter(c => c.category === 'materials')
          .reduce((sum, c) => sum + (c.amount || 0), 0);
        const miscActual = projectCosts
          .filter(c => c.category === 'misc')
          .reduce((sum, c) => sum + (c.amount || 0), 0);

        const totalActual = laborActual + subsActual + materialsActual + miscActual;
        const variance = totalBudget - totalActual;

        // Invoiced
        const projectInvoices = invoices?.filter(i => i.project_id === project.id) || [];
        const billed = projectInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
        const margin = billed - totalActual;

        return {
          project,
          budget: totalBudget,
          actuals: {
            labor: laborActual,
            subs: subsActual,
            materials: materialsActual,
            misc: miscActual,
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
