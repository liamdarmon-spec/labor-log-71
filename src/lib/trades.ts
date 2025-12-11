/**
 * Shared helper for creating trades with default cost codes
 * 
 * Extracted from TradesWithCostCodesTab to enable reuse in estimate builder
 */

import { supabase } from '@/integrations/supabase/client';

export interface CreatedTradeWithDefaults {
  trade: { id: string; name: string };
  defaultLaborCostCodeId: string | null;
  defaultSubCostCodeId: string | null;
  defaultMaterialCostCodeId: string | null;
}

/**
 * Create a trade with its 3 default cost codes (L/M/S)
 * 
 * - Derives prefix from trade name (full uppercase, consistent with admin UI)
 * - Creates trade row
 * - Creates 3 cost codes: PREFIX-L (labor), PREFIX-M (materials), PREFIX-S (subs)
 * - Assigns trade.default_labor_cost_code_id, default_material_cost_code_id, default_sub_cost_code_id
 * 
 * @param name Trade name (e.g., "Painting", "Aluminum", "Stucco")
 * @returns Created trade with default cost code IDs
 */
export async function createTradeWithDefaultCostCodes(
  name: string
): Promise<CreatedTradeWithDefaults> {
  // Validate name
  if (!name || !name.trim()) {
    throw new Error('Trade name is required');
  }

  const tradeName = name.trim();
  // Derive prefix: full uppercase trade name (consistent with admin UI)
  const prefix = tradeName.toUpperCase();

  // Create trade row
  const { data: newTrade, error: tradeError } = await supabase
    .from('trades')
    .insert([
      {
        name: tradeName,
        description: null,
      },
    ])
    .select()
    .single();

  if (tradeError) {
    throw new Error(`Failed to create trade: ${tradeError.message}`);
  }

  // Create the 3 default cost codes for this trade (L/M/S)
  const costCodesToCreate = [
    {
      code: `${prefix}-L`,
      name: `${tradeName} Labor`,
      category: 'labor',
      trade_id: newTrade.id,
      is_active: true,
    },
    {
      code: `${prefix}-M`,
      name: `${tradeName} Materials`,
      category: 'materials',
      trade_id: newTrade.id,
      is_active: true,
    },
    {
      code: `${prefix}-S`,
      name: `${tradeName} Sub-Contractor`,
      category: 'subs',
      trade_id: newTrade.id,
      is_active: true,
    },
  ];

  const { data: createdCostCodes, error: costCodeError } = await supabase
    .from('cost_codes')
    .insert(costCodesToCreate)
    .select();

  if (costCodeError) {
    // Rollback trade creation if cost codes fail
    await supabase.from('trades').delete().eq('id', newTrade.id);
    throw new Error(`Failed to create cost codes: ${costCodeError.message}`);
  }

  // Find the cost codes by category
  const laborCode = createdCostCodes?.find((cc) => cc.category === 'labor');
  const materialCode = createdCostCodes?.find((cc) => cc.category === 'materials');
  const subCode = createdCostCodes?.find((cc) => cc.category === 'subs');

  // Update trade with default cost code IDs (only L/M/S)
  const { error: updateError } = await supabase
    .from('trades')
    .update({
      default_labor_cost_code_id: laborCode?.id || null,
      default_material_cost_code_id: materialCode?.id || null,
      default_sub_cost_code_id: subCode?.id || null,
    })
    .eq('id', newTrade.id);

  if (updateError) {
    // Rollback everything if update fails
    await supabase.from('cost_codes').delete().in('id', createdCostCodes?.map((cc) => cc.id) || []);
    await supabase.from('trades').delete().eq('id', newTrade.id);
    throw new Error(`Failed to update trade defaults: ${updateError.message}`);
  }

  return {
    trade: {
      id: newTrade.id,
      name: newTrade.name,
    },
    defaultLaborCostCodeId: laborCode?.id || null,
    defaultSubCostCodeId: subCode?.id || null,
    defaultMaterialCostCodeId: materialCode?.id || null,
  };
}
