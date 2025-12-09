import { supabase } from '@/integrations/supabase/client';

let unassignedCostCodeId: string | null = null;

/**
 * Gets the UNASSIGNED cost code ID (cached after first fetch)
 * This is used as a fallback when cost_code_id is required but not provided
 */
export async function getUnassignedCostCodeId(): Promise<string> {
  if (unassignedCostCodeId) {
    return unassignedCostCodeId;
  }

  const { data, error } = await supabase
    .from('cost_codes')
    .select('id')
    .eq('code', 'UNASSIGNED')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch UNASSIGNED cost code: ${error.message}`);
  }
  if (!data) {
    throw new Error('UNASSIGNED cost code not found');
  }

  unassignedCostCodeId = data.id;
  return data.id;
}
