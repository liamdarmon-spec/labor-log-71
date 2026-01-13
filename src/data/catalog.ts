import { supabase } from '@/integrations/supabase/client';

export type CanonicalCostCodeCategory = string;

export type TradeDefaultsStatus = 'complete' | 'incomplete' | 'invalid';

export type TradeWithDefaults = {
  id: string;
  name: string;
  description: string | null;
  code_prefix: string | null;
  labor_code: string | null;
  labor_code_id: string | null;
  material_code: string | null;
  material_code_id: string | null;
  sub_code: string | null;
  sub_code_id: string | null;
  status: TradeDefaultsStatus;
};

export type CostCodeStatusFilter = 'active' | 'archived' | 'all';

export type CostCodeWithTrade = {
  id: string;
  company_id?: string;
  code: string;
  name: string;
  category: CanonicalCostCodeCategory;
  is_active: boolean;
  trade_id: string | null;
  trade_name: string | null;
  is_legacy: boolean;
};

export type FetchCostCodesFilters = {
  search?: string;
  tradeId?: string | null;
  category?: CanonicalCostCodeCategory;
  status?: CostCodeStatusFilter;
  includeLegacy?: boolean;
  limit?: number;
  offset?: number;
};

export type CreateTradeWithDefaultsPayload = {
  companyId: string;
  name: string;
  description?: string | null;
  codePrefix?: string | null;
  autoGenerate?: boolean;
};

function requireCompanyId(companyId: string | null | undefined): string {
  if (!companyId) throw new Error('No active company selected');
  return companyId;
}

/**
 * Trades (source of truth) + defaults in ONE query.
 * Canonical contract: rpc('get_trades_with_default_codes', { p_company_id })
 */
export async function fetchTradesWithDefaults(companyId: string): Promise<TradeWithDefaults[]> {
  const cid = requireCompanyId(companyId);
  const { data, error } = await supabase.rpc('get_trades_with_default_codes', { p_company_id: cid });
  if (error) throw new Error(error.message);
  return (data || []) as TradeWithDefaults[];
}

/**
 * Cost Codes (read-only projection) in ONE query, tenant scoped.
 * Canonical contract: rpc('get_cost_codes_with_trades', { p_company_id, ...optional filters })
 */
export async function fetchCostCodes(companyId: string, filters: FetchCostCodesFilters = {}): Promise<CostCodeWithTrade[]> {
  const cid = requireCompanyId(companyId);
  const {
    search,
    tradeId,
    category,
    status = 'active',
    includeLegacy = false,
    limit = 200,
    offset = 0,
  } = filters;

  const { data, error } = await supabase.rpc('get_cost_codes_with_trades', {
    p_company_id: cid,
    p_include_legacy: includeLegacy,
    p_limit: limit,
    p_offset: offset,
    p_search: search ?? null,
    p_trade_id: tradeId ?? null,
    p_category: category ?? null,
    p_status: status,
  });

  if (error) throw new Error(error.message);
  return (data || []) as unknown as CostCodeWithTrade[];
}

/**
 * Canonical write path (atomic).
 * rpc('create_trade_with_default_cost_codes', { p_company_id, ... })
 */
export async function createTradeWithDefaults(payload: CreateTradeWithDefaultsPayload) {
  const cid = requireCompanyId(payload.companyId);
  const name = payload.name?.trim();
  if (!name) throw new Error('Trade name is required');

  const { data, error } = await supabase.rpc('create_trade_with_default_cost_codes', {
    p_company_id: cid,
    p_name: name,
    p_description: (payload.description ?? '').trim() || null,
    p_code_prefix: (payload.codePrefix ?? '').trim() || null,
    p_auto_generate: payload.autoGenerate ?? true,
  });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Canonical repair path (admin action, no silent fixes).
 * rpc('ensure_trade_has_default_cost_codes', { p_trade_id })
 */
export async function ensureTradeDefaults(tradeId: string) {
  if (!tradeId) throw new Error('Trade id is required');
  const { data, error } = await supabase.rpc('ensure_trade_has_default_cost_codes', { p_trade_id: tradeId });
  if (error) throw new Error(error.message);
  return data;
}


