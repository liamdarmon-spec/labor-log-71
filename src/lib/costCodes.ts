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

  // IMPORTANT:
  // `get_cost_code_catalog` intentionally filters out UNASSIGNED for dropdown UX.
  // But multiple core tables enforce cost_code_id NOT NULL (see migrations), so we must
  // be able to resolve the company-scoped UNASSIGNED id for inserts.
  const { data, error } = await supabase
    .from('cost_codes')
    .select('id')
    .eq('company_id', companyId)
    .eq('code', 'UNASSIGNED')
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error('UNASSIGNED cost code not found');
  }

  unassignedCostCodeId = data.id;
  return data.id;
}
