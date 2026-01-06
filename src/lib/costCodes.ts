import { supabase } from '@/integrations/supabase/client';

let unassignedCostCodeId: string | null = null;

/**
 * Gets the UNASSIGNED cost code ID (cached after first fetch)
 * This is used as a fallback when cost_code_id is required but not provided
 */
export async function getUnassignedCostCodeId(companyId: string): Promise<string> {
  if (!companyId) {
    throw new Error('No active company selected');
  }
  if (unassignedCostCodeId) {
    return unassignedCostCodeId;
  }

  // Canonical SOT: fetch via get_cost_code_catalog, never direct-table read
  const { data, error } = await supabase.rpc('get_cost_code_catalog', { p_company_id: companyId });

  if (error || !data) {
    throw new Error('UNASSIGNED cost code not found');
  }

  const row = (data as any[]).find((r) => r.code === 'UNASSIGNED');
  if (!row?.cost_code_id) {
    throw new Error('UNASSIGNED cost code not found');
  }

  unassignedCostCodeId = row.cost_code_id;
  return row.cost_code_id;
}
