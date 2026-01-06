import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCompany } from '@/company/CompanyProvider';
import { fetchCostCodeCatalog, type CostCodeCatalog, type CostCodeCategory } from '@/data/costCodeCatalog';

export function useCostCodeCatalog() {
  const { activeCompanyId } = useCompany();

  return useQuery<CostCodeCatalog>({
    queryKey: ['cost-code-catalog', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) {
        return {
          rows: [],
          byId: new Map(),
          byCode: new Map(),
          byTradeId: new Map(),
          byTradeIdAndCategory: new Map(),
          trades: [],
        };
      }
      return await fetchCostCodeCatalog(activeCompanyId);
    },
    enabled: !!activeCompanyId,
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCatalogTrades() {
  const q = useCostCodeCatalog();
  return useMemo(() => ({ ...q, trades: q.data?.trades ?? [] }), [q]);
}

export function useCatalogCostCodesForTrade(tradeId: string | null | undefined) {
  const q = useCostCodeCatalog();
  return useMemo(() => {
    const catalog = q.data;
    if (!catalog || !tradeId) return { ...q, rows: [] as any[] };
    return { ...q, rows: catalog.byTradeId.get(tradeId) ?? [] };
  }, [q, tradeId]);
}

export function useCatalogCostCode(tradeId: string | null | undefined, category: CostCodeCategory) {
  const q = useCostCodeCatalog();
  return useMemo(() => {
    const catalog = q.data;
    if (!catalog || !tradeId) return { ...q, row: null as any };
    const row = catalog.byTradeIdAndCategory.get(tradeId)?.get(category) ?? null;
    return { ...q, row };
  }, [q, tradeId, category]);
}


