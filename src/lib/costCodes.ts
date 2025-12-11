/**
 * Cost code utilities and bootstrap helpers
 */

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

/**
 * Ensure Overhead & Fees trade and standard fee cost codes exist
 * 
 * Creates or finds:
 * - "Overhead & Fees" trade (optional, can be null if fees are trade-less)
 * - OFFICE-FEE cost code: "Office & Admin Expenses"
 * - MISC-FEE cost code: "Miscellaneous Job Expenses"
 * - PERSONAL-FEE cost code: "Personal / Owner Expenses"
 * 
 * All fee codes have category='other' and may or may not have a trade_id
 * (depending on whether we use the Overhead trade or keep them trade-less)
 * 
 * @returns IDs of fee cost codes and optional trade ID
 */
export async function ensureOverheadTradeAndFeeCodes(): Promise<{
  tradeId: string | null; // null if fees are trade-less
  officeFeeId: string;
  miscFeeId: string;
  personalExpenseId: string;
}> {
  // Strategy: Keep fees trade-less (trade_id = null) for simplicity
  // This avoids polluting the trade system with non-trade items
  
  const feeCodes = [
    {
      code: 'OFFICE-FEE',
      name: 'Office & Admin Expenses',
      category: 'other' as const,
      trade_id: null,
    },
    {
      code: 'MISC-FEE',
      name: 'Miscellaneous Job Expenses',
      category: 'other' as const,
      trade_id: null,
    },
    {
      code: 'PERSONAL-FEE',
      name: 'Personal / Owner Expenses',
      category: 'other' as const,
      trade_id: null,
    },
  ];

  const result: {
    tradeId: string | null;
    officeFeeId: string;
    miscFeeId: string;
    personalExpenseId: string;
  } = {
    tradeId: null,
    officeFeeId: '',
    miscFeeId: '',
    personalExpenseId: '',
  };

  // Find or create each fee code
  for (const feeCode of feeCodes) {
    // Check if code already exists
    const { data: existing } = await supabase
      .from('cost_codes')
      .select('id')
      .eq('code', feeCode.code)
      .maybeSingle();

    if (existing) {
      // Use existing code
      if (feeCode.code === 'OFFICE-FEE') {
        result.officeFeeId = existing.id;
      } else if (feeCode.code === 'MISC-FEE') {
        result.miscFeeId = existing.id;
      } else if (feeCode.code === 'PERSONAL-FEE') {
        result.personalExpenseId = existing.id;
      }
    } else {
      // Create new fee code
      const { data: created, error } = await supabase
        .from('cost_codes')
        .insert({
          code: feeCode.code,
          name: feeCode.name,
          category: feeCode.category,
          trade_id: feeCode.trade_id,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create fee code ${feeCode.code}: ${error.message}`);
      }

      if (feeCode.code === 'OFFICE-FEE') {
        result.officeFeeId = created.id;
      } else if (feeCode.code === 'MISC-FEE') {
        result.miscFeeId = created.id;
      } else if (feeCode.code === 'PERSONAL-FEE') {
        result.personalExpenseId = created.id;
      }
    }
  }

  return result;
}
