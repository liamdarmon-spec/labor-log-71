import { useQuery } from '@tanstack/react-query';
import { useCompany } from '@/company/CompanyProvider';
import { fetchCostCodes, fetchTradesWithDefaults } from '@/data/catalog';

export interface Trade {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  default_labor_cost_code_id: string | null;
  default_material_cost_code_id: string | null;
  default_sub_cost_code_id: string | null;
}

/**
 * Canonical hook for fetching trades
 * Used across: Admin, Workers, Subs, Materials, Cost Codes, Schedule
 */
export function useTrades() {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['trades', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const rows = await fetchTradesWithDefaults(activeCompanyId);
      // Map to legacy Trade shape where needed
      return rows.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        created_at: '', // not provided by RPC (avoid relying on it)
        default_labor_cost_code_id: t.labor_code_id,
        default_material_cost_code_id: t.material_code_id,
        default_sub_cost_code_id: t.sub_code_id,
      })) as Trade[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - trades rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: false,
    enabled: !!activeCompanyId,
  });
}

/**
 * Lightweight version for dropdowns - only id and name
 */
export function useTradesSimple() {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['trades-simple', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const rows = await fetchTradesWithDefaults(activeCompanyId);
      return rows.map((t) => ({ id: t.id, name: t.name }));
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    enabled: !!activeCompanyId,
  });
}

export function useTradeCostCodes(tradeId?: string) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['trade-cost-codes', activeCompanyId, tradeId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      // Canonical: trade-linked cost codes only (legacy excluded by default)
      const rows = await fetchCostCodes(activeCompanyId, {
        tradeId: tradeId ?? null,
        status: 'active',
        includeLegacy: false,
        limit: 500,
        offset: 0,
      });
      return rows;
    },
    enabled: !!activeCompanyId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });
}

/**
 * Get the standard 3 cost codes for a trade
 */
export function getTradeStandardCodes(tradeName: string) {
  const prefix = tradeName.substring(0, 3).toUpperCase();
  return {
    labor: `${prefix}-L`,
    materials: `${prefix}-M`,
    subs: `${prefix}-S`,
  };
}
