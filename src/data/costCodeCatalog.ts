import { supabase } from '@/integrations/supabase/client';

export type CostCodeCategory = 'labor' | 'material' | 'sub';

export type CostCodeCatalogRow = {
  cost_code_id: string;
  company_id: string;
  code: string;
  name: string;
  category: CostCodeCategory;
  trade_id: string;
  trade_name: string;
  trade_prefix: string | null;
  is_active: boolean;
  is_legacy: boolean;
  created_at: string | null;
};

export type CostCodeCatalog = {
  rows: CostCodeCatalogRow[];
  byId: Map<string, CostCodeCatalogRow>;
  byCode: Map<string, CostCodeCatalogRow>;
  byTradeId: Map<string, CostCodeCatalogRow[]>;
  byTradeIdAndCategory: Map<string, Map<CostCodeCategory, CostCodeCatalogRow>>;
  trades: { id: string; name: string; prefix: string | null }[];
};

function requireCompanyId(companyId: string | null | undefined): string {
  if (!companyId) throw new Error('No active company selected');
  return companyId;
}

/**
 * SINGLE source of truth for cost codes across the entire ERP.
 * Calls the canonical DB RPC:
 *   public.get_cost_code_catalog(p_company_id uuid)
 */
export async function fetchCostCodeCatalog(companyId: string): Promise<CostCodeCatalog> {
  const cid = requireCompanyId(companyId);
  const { data, error } = await supabase.rpc('get_cost_code_catalog', { p_company_id: cid });
  if (error) throw new Error(error.message);

  const rows = (data || []) as unknown as CostCodeCatalogRow[];

  const byId = new Map<string, CostCodeCatalogRow>();
  const byCode = new Map<string, CostCodeCatalogRow>();
  const byTradeId = new Map<string, CostCodeCatalogRow[]>();
  const byTradeIdAndCategory = new Map<string, Map<CostCodeCategory, CostCodeCatalogRow>>();

  const tradeMeta = new Map<string, { id: string; name: string; prefix: string | null }>();

  for (const r of rows) {
    byId.set(r.cost_code_id, r);
    byCode.set(r.code, r);

    const list = byTradeId.get(r.trade_id) ?? [];
    list.push(r);
    byTradeId.set(r.trade_id, list);

    const catMap = byTradeIdAndCategory.get(r.trade_id) ?? new Map<CostCodeCategory, CostCodeCatalogRow>();
    catMap.set(r.category, r);
    byTradeIdAndCategory.set(r.trade_id, catMap);

    if (!tradeMeta.has(r.trade_id)) {
      tradeMeta.set(r.trade_id, { id: r.trade_id, name: r.trade_name, prefix: r.trade_prefix });
    }
  }

  // Stable sort trades for dropdowns
  const trades = Array.from(tradeMeta.values()).sort((a, b) => a.name.localeCompare(b.name));

  // Stable sort each trade group by code
  for (const [tid, list] of byTradeId.entries()) {
    list.sort((a, b) => a.code.localeCompare(b.code));
    byTradeId.set(tid, list);
  }

  return { rows, byId, byCode, byTradeId, byTradeIdAndCategory, trades };
}


