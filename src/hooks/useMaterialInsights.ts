import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MaterialInsights {
  totalMaterialCosts: number;
  totalBudget: number;
  variance: number;
  variancePercent: number;
  byTrade: {
    trade_name: string;
    total: number;
  }[];
  byProject: {
    project_id: string;
    project_name: string;
    total: number;
  }[];
  recentReceipts: {
    id: string;
    date: string;
    vendor_name: string;
    total: number;
    project_name: string;
  }[];
}

export function useMaterialInsights(projectId?: string) {
  return useQuery({
    queryKey: ['material-insights', projectId],
    queryFn: async () => {
      // SINGLE SOURCE OF TRUTH: Get material costs from costs table only
      // Material receipts are input UI, costs table is financial source of truth
      let costsQuery = supabase
        .from('costs')
        .select(`
          amount,
          project_id,
          cost_code_id,
          projects (id, project_name),
          cost_codes!inner (id, code, name, trade_id, trades!cost_codes_trade_id_fkey (id, name))
        `)
        .eq('category', 'materials')
        .neq('status', 'void');

      if (projectId) {
        costsQuery = costsQuery.eq('project_id', projectId);
      }

      const { data: costs, error: costsError } = await costsQuery;
      if (costsError) throw costsError;

      // Get material budgets
      let budgetQuery = supabase
        .from('project_budgets')
        .select('project_id, materials_budget');

      if (projectId) {
        budgetQuery = budgetQuery.eq('project_id', projectId);
      }

      const { data: budgets, error: budgetsError } = await budgetQuery;
      if (budgetsError) throw budgetsError;

      // Get recent receipts
      let receiptsQuery = supabase
        .from('material_receipts')
        .select(`
          id,
          receipt_date,
          total,
          vendor,
          projects (project_name)
        `)
        .order('receipt_date', { ascending: false })
        .limit(10);

      if (projectId) {
        receiptsQuery = receiptsQuery.eq('project_id', projectId);
      }

      const { data: receipts, error: receiptsError } = await receiptsQuery;
      if (receiptsError) throw receiptsError;

      // Calculate totals
      const totalMaterialCosts = costs?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
      const totalBudget = budgets?.reduce((sum, b) => sum + (b.materials_budget || 0), 0) || 0;
      const variance = totalBudget - totalMaterialCosts;
      const variancePercent = totalBudget > 0 ? (variance / totalBudget) * 100 : 0;

      // Group by trade
      const tradeMap = new Map<string, number>();
      costs?.forEach(cost => {
        const tradeName = cost.cost_codes?.trades?.name || 'Unassigned';
        tradeMap.set(tradeName, (tradeMap.get(tradeName) || 0) + (cost.amount || 0));
      });
      const byTrade = Array.from(tradeMap.entries()).map(([trade_name, total]) => ({
        trade_name,
        total,
      }));

      // Group by project
      const projectMap = new Map<string, { name: string; total: number }>();
      costs?.forEach(cost => {
        const projectId = cost.projects?.id || '';
        const projectName = cost.projects?.project_name || 'Unknown';
        const existing = projectMap.get(projectId);
        projectMap.set(projectId, {
          name: projectName,
          total: (existing?.total || 0) + (cost.amount || 0),
        });
      });
      const byProject = Array.from(projectMap.entries()).map(([project_id, data]) => ({
        project_id,
        project_name: data.name,
        total: data.total,
      }));

      // Format recent receipts
      const recentReceipts = receipts?.map(r => ({
        id: r.id,
        date: r.receipt_date,
        vendor_name: r.vendor || 'Unknown',
        total: r.total,
        project_name: r.projects?.project_name || 'Unknown',
      })) || [];

      return {
        totalMaterialCosts,
        totalBudget,
        variance,
        variancePercent,
        byTrade,
        byProject,
        recentReceipts,
      } as MaterialInsights;
    },
  });
}
