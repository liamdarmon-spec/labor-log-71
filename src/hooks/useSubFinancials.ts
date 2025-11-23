import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * SINGLE SOURCE OF TRUTH FOR SUB FINANCIAL CALCULATIONS
 * 
 * Formulas used consistently across:
 * - Sub Detail → Projects & Contracts tab
 * - Project OS → Subs tab  
 * - Financials v3 → Job Costing (subs slice)
 * - Financials v3 → Costs (sub filters)
 * 
 * Definitions:
 * - contract_total = contract_value + approved_change_orders_amount
 * - actual_cost = SUM(costs.amount WHERE vendor_type='sub' AND vendor_id=sub_id AND project_id=project_id)
 * - remaining = contract_total - actual_cost
 */

export interface SubProjectFinancials {
  projectId: string;
  projectName: string;
  contractId: string | null;
  contractValue: number;
  approvedChangeOrders: number;
  contractTotal: number; // contract_value + approved_change_orders
  actualCost: number; // from costs table
  remaining: number; // contract_total - actual_cost
  retentionPercentage: number;
  amountBilled: number;
  amountPaid: number;
  outstanding: number; // amount_billed - amount_paid
}

/**
 * Get unified financial data for a sub across one or all projects
 * Uses costs table as single source for actual_cost
 */
export function useSubFinancials(subId: string, projectId?: string) {
  return useQuery({
    queryKey: ['sub-financials-unified', subId, projectId],
    queryFn: async () => {
      // Step 1: Fetch contracts
      let contractsQuery = supabase
        .from('sub_contracts')
        .select(`
          id,
          project_id,
          sub_id,
          contract_value,
          retention_percentage,
          amount_billed,
          amount_paid,
          status,
          projects (
            id,
            project_name,
            status
          )
        `)
        .eq('sub_id', subId);

      if (projectId) {
        contractsQuery = contractsQuery.eq('project_id', projectId);
      }

      const { data: contracts, error: contractsError } = await contractsQuery;
      if (contractsError) throw contractsError;

      // Step 2: Fetch costs from costs table
      let costsQuery = supabase
        .from('costs')
        .select('project_id, amount, status')
        .eq('vendor_type', 'sub')
        .eq('vendor_id', subId)
        .eq('category', 'subs');

      if (projectId) {
        costsQuery = costsQuery.eq('project_id', projectId);
      }

      const { data: costs, error: costsError } = await costsQuery;
      if (costsError) throw costsError;

      // Step 3: Aggregate costs by project
      const costsByProject: Record<string, number> = {};
      (costs || []).forEach(cost => {
        costsByProject[cost.project_id] = (costsByProject[cost.project_id] || 0) + Number(cost.amount);
      });

      // Step 4: Build unified financials per project
      const financials: SubProjectFinancials[] = (contracts || []).map(contract => {
        const contractValue = Number(contract.contract_value || 0);
        const approvedChangeOrders = 0; // TODO: Add this field if needed
        const contractTotal = contractValue + approvedChangeOrders;
        const actualCost = costsByProject[contract.project_id] || 0;
        const remaining = contractTotal - actualCost;
        const amountBilled = Number(contract.amount_billed || 0);
        const amountPaid = Number(contract.amount_paid || 0);
        const outstanding = amountBilled - amountPaid;

        return {
          projectId: contract.project_id,
          projectName: contract.projects?.project_name || 'Unknown Project',
          contractId: contract.id,
          contractValue,
          approvedChangeOrders,
          contractTotal,
          actualCost,
          remaining,
          retentionPercentage: Number(contract.retention_percentage || 0),
          amountBilled,
          amountPaid,
          outstanding,
        };
      });

      return financials;
    },
  });
}

/**
 * Get aggregated totals for a sub across all projects
 */
export function useSubFinancialsSummary(subId: string) {
  return useQuery({
    queryKey: ['sub-financials-summary', subId],
    queryFn: async () => {
      // Get all financials
      const financialsQuery = await supabase
        .from('sub_contracts')
        .select('contract_value, amount_billed, amount_paid, project_id')
        .eq('sub_id', subId);

      if (financialsQuery.error) throw financialsQuery.error;

      const contracts = financialsQuery.data || [];

      // Get all costs for this sub
      const costsQuery = await supabase
        .from('costs')
        .select('amount, status, project_id')
        .eq('vendor_type', 'sub')
        .eq('vendor_id', subId)
        .eq('category', 'subs');

      if (costsQuery.error) throw costsQuery.error;

      const costs = costsQuery.data || [];

      // Aggregate
      let totalContractValue = 0;
      let totalBilled = 0;
      let totalPaid = 0;
      let totalActualCost = 0;
      let totalPaidCost = 0;
      let totalUnpaidCost = 0;

      contracts.forEach(c => {
        totalContractValue += Number(c.contract_value || 0);
        totalBilled += Number(c.amount_billed || 0);
        totalPaid += Number(c.amount_paid || 0);
      });

      costs.forEach(c => {
        const amount = Number(c.amount || 0);
        totalActualCost += amount;
        if (c.status === 'paid') totalPaidCost += amount;
        else if (c.status === 'unpaid') totalUnpaidCost += amount;
      });

      const totalRemaining = totalContractValue - totalActualCost;
      const totalOutstanding = totalBilled - totalPaid;

      return {
        totalContractValue,
        totalApprovedCOs: 0, // TODO: Add if needed
        totalContractTotal: totalContractValue,
        totalActualCost,
        totalRemaining,
        totalBilled,
        totalPaid,
        totalOutstanding,
        totalPaidCost,
        totalUnpaidCost,
        activeProjectsCount: new Set(contracts.map(c => c.project_id)).size,
      };
    },
  });
}

/**
 * Get sub costs only (for Costs tab)
 * Maintains compatibility with existing useSubCosts but ensures consistent filtering
 */
export function useSubCostsDetailed(subId: string, projectId?: string, dateRange?: { start: string; end: string }, status?: 'paid' | 'unpaid' | 'all') {
  return useQuery({
    queryKey: ['sub-costs-detailed', subId, projectId, dateRange, status],
    queryFn: async () => {
      let query = supabase
        .from('costs')
        .select(`
          *,
          projects (id, project_name, status),
          cost_codes (id, code, name)
        `)
        .eq('vendor_type', 'sub')
        .eq('vendor_id', subId)
        .eq('category', 'subs')
        .order('date_incurred', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      if (dateRange) {
        query = query.gte('date_incurred', dateRange.start).lte('date_incurred', dateRange.end);
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
