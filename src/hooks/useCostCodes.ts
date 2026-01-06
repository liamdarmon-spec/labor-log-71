import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/company/CompanyProvider";
import { fetchCostCodes, type CanonicalCostCodeCategory } from "@/data/catalog";

export interface CostCode {
  id: string;
  code: string;
  name: string | null;
  category: CanonicalCostCodeCategory;
  trade_id: string | null;
  default_trade_id: string | null;
  is_active: boolean;
  is_legacy?: boolean;
}

export function useCostCodes(category?: CostCode['category']) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['cost_codes', activeCompanyId, category],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const rows = await fetchCostCodes(activeCompanyId, {
        status: 'active',
        includeLegacy: false,
        category: category ?? undefined,
        limit: 500,
        offset: 0,
      });

      // Canonical dropdowns must not include UNASSIGNED
      return rows.filter((r) => r.code !== 'UNASSIGNED') as unknown as CostCode[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - cost codes rarely change
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: false,
    enabled: !!activeCompanyId,
  });
}

// Lightweight version for CostCodeSelect - just id, code, name, category
export function useCostCodesForSelect() {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['cost-codes-select', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const rows = await fetchCostCodes(activeCompanyId, {
        status: 'active',
        includeLegacy: false,
        limit: 500,
        offset: 0,
      });
      return rows
        .filter((r) => r.code !== 'UNASSIGNED')
        .map((r) => ({ id: r.id, code: r.code, name: r.name, category: r.category })) as Pick<
          CostCode,
          'id' | 'code' | 'name' | 'category'
        >[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: false,
    enabled: !!activeCompanyId,
  });
}
