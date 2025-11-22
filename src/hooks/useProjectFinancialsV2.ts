import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectFinancialsV2 {
  // Budget
  totalBudget: number;
  laborBudget: number;
  subsBudget: number;
  materialsBudget: number;
  
  // Actual Costs
  actualCost: number;
  laborActual: number;
  subsActual: number;
  materialsActual: number;
  
  // Variance
  variance: number;
  percentConsumed: number;
  
  // Unpaid
  unpaidLabor: number;
  unpaidSubs: number;
  unpaidMaterials: number;
  
  // Categories breakdown
  categories: {
    labor: CategoryBreakdown;
    subs: CategoryBreakdown;
    materials: CategoryBreakdown;
  };
}

export interface CategoryBreakdown {
  budget: number;
  actual: number;
  variance: number;
  percentConsumed: number;
  unpaid: number;
  entryCount: number;
}

/**
 * UNIFIED PROJECT FINANCIALS HOOK
 * Single source of truth for all project financial calculations
 * Reads from: estimates, daily_logs, material_receipts, sub_invoices, payments
 */
export function useProjectFinancialsV2(projectId: string) {
  return useQuery({
    queryKey: ['project-financials-v2', projectId],
    queryFn: async () => {
      // 1. Get Budget from estimates marked as budget source
      const { data: budgetEstimate } = await supabase
        .from('estimates')
        .select('*, estimate_items(*)')
        .eq('project_id', projectId)
        .eq('is_budget_source', true)
        .maybeSingle();

      let laborBudget = 0;
      let subsBudget = 0;
      let materialsBudget = 0;

      if (budgetEstimate?.estimate_items) {
        budgetEstimate.estimate_items.forEach((item: any) => {
          const lineTotal = item.line_total || 0;
          if (item.category === 'labor') laborBudget += lineTotal;
          else if (item.category === 'subs') subsBudget += lineTotal;
          else if (item.category === 'materials') materialsBudget += lineTotal;
        });
      }

      const totalBudget = laborBudget + subsBudget + materialsBudget;

      // 2. Get Labor Actuals from daily_logs (time logs)
      const { data: timeLogs } = await supabase
        .from('daily_logs')
        .select('*, workers(hourly_rate)')
        .eq('project_id', projectId);

      let laborActual = 0;
      let unpaidLabor = 0;
      let laborEntryCount = 0;

      (timeLogs || []).forEach((log: any) => {
        const cost = (log.hours_worked || 0) * (log.workers?.hourly_rate || 0);
        laborActual += cost;
        if (log.payment_status === 'unpaid') {
          unpaidLabor += cost;
        }
        laborEntryCount++;
      });

      // 3. Get Sub Actuals from sub_invoices
      const { data: subInvoices } = await supabase
        .from('sub_invoices')
        .select('*')
        .eq('project_id', projectId);

      let subsActual = 0;
      let unpaidSubs = 0;
      let subsEntryCount = 0;

      (subInvoices || []).forEach((invoice: any) => {
        const total = invoice.total || 0;
        subsActual += total;
        if (invoice.payment_status === 'unpaid') {
          unpaidSubs += total - (invoice.retention_amount || 0);
        }
        subsEntryCount++;
      });

      // 4. Get Materials Actuals from material_receipts
      const { data: materialReceipts } = await supabase
        .from('material_receipts')
        .select('*')
        .eq('project_id', projectId);

      let materialsActual = 0;
      let materialsEntryCount = 0;

      (materialReceipts || []).forEach((receipt: any) => {
        materialsActual += receipt.total || 0;
        materialsEntryCount++;
      });

      // 5. Calculate totals and variances
      const actualCost = laborActual + subsActual + materialsActual;
      const variance = totalBudget - actualCost;
      const percentConsumed = totalBudget > 0 ? (actualCost / totalBudget) * 100 : 0;

      const financials: ProjectFinancialsV2 = {
        totalBudget,
        laborBudget,
        subsBudget,
        materialsBudget,
        actualCost,
        laborActual,
        subsActual,
        materialsActual,
        variance,
        percentConsumed,
        unpaidLabor,
        unpaidSubs,
        unpaidMaterials: 0, // Not tracking yet
        categories: {
          labor: {
            budget: laborBudget,
            actual: laborActual,
            variance: laborBudget - laborActual,
            percentConsumed: laborBudget > 0 ? (laborActual / laborBudget) * 100 : 0,
            unpaid: unpaidLabor,
            entryCount: laborEntryCount,
          },
          subs: {
            budget: subsBudget,
            actual: subsActual,
            variance: subsBudget - subsActual,
            percentConsumed: subsBudget > 0 ? (subsActual / subsBudget) * 100 : 0,
            unpaid: unpaidSubs,
            entryCount: subsEntryCount,
          },
          materials: {
            budget: materialsBudget,
            actual: materialsActual,
            variance: materialsBudget - materialsActual,
            percentConsumed: materialsBudget > 0 ? (materialsActual / materialsBudget) * 100 : 0,
            unpaid: 0,
            entryCount: materialsEntryCount,
          },
        },
      };

      return financials;
    },
    enabled: !!projectId,
  });
}

/**
 * GLOBAL FINANCIALS HOOK
 * Aggregates across all projects with optional filters
 */
export function useGlobalFinancials(filters?: {
  companyId?: string;
  startDate?: string;
  endDate?: string;
  projectId?: string;
}) {
  return useQuery({
    queryKey: ['global-financials', filters],
    queryFn: async () => {
      // Build queries with filters
      let logsQuery = supabase.from('daily_logs').select('*, workers(hourly_rate)');
      let subInvoicesQuery = supabase.from('sub_invoices').select('*');
      let materialsQuery = supabase.from('material_receipts').select('*');
      let estimatesQuery = supabase.from('estimates').select('*, estimate_items(*)').eq('status', 'accepted');

      if (filters?.projectId) {
        logsQuery = logsQuery.eq('project_id', filters.projectId);
        subInvoicesQuery = subInvoicesQuery.eq('project_id', filters.projectId);
        materialsQuery = materialsQuery.eq('project_id', filters.projectId);
        estimatesQuery = estimatesQuery.eq('project_id', filters.projectId);
      }

      // TODO: Add company_id and date range filters

      const [
        { data: timeLogs },
        { data: subInvoices },
        { data: materialReceipts },
        { data: estimates },
      ] = await Promise.all([
        logsQuery,
        subInvoicesQuery,
        materialsQuery,
        estimatesQuery,
      ]);

      // Calculate labor
      let laborActual = 0;
      let laborUnpaid = 0;
      (timeLogs || []).forEach((log: any) => {
        const cost = (log.hours_worked || 0) * (log.workers?.hourly_rate || 0);
        laborActual += cost;
        if (log.payment_status === 'unpaid') laborUnpaid += cost;
      });

      // Calculate subs
      let subsActual = 0;
      let subsUnpaid = 0;
      (subInvoices || []).forEach((invoice: any) => {
        subsActual += invoice.total || 0;
        if (invoice.payment_status === 'unpaid') {
          subsUnpaid += (invoice.total || 0) - (invoice.retention_amount || 0);
        }
      });

      // Calculate materials
      let materialsActual = 0;
      (materialReceipts || []).forEach((receipt: any) => {
        materialsActual += receipt.total || 0;
      });

      // Calculate revenue
      let totalRevenue = 0;
      (estimates || []).forEach((est: any) => {
        totalRevenue += est.total_amount || 0;
      });

      const totalCosts = laborActual + subsActual + materialsActual;
      const totalProfit = totalRevenue - totalCosts;
      const totalOutstanding = laborUnpaid + subsUnpaid;

      return {
        totalRevenue,
        totalProfit,
        totalCosts,
        totalOutstanding,
        laborActual,
        laborUnpaid,
        subsActual,
        subsUnpaid,
        materialsActual,
        retentionHeld: 0, // TODO: Calculate from sub_invoices
      };
    },
  });
}
