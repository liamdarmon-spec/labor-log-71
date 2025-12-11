// src/lib/trades.ts

/**
 * Shared helper for creating trades with default cost codes
 */

import { supabase } from "@/integrations/supabase/client";

export interface CreatedTradeWithDefaults {
  trade: { id: string; name: string };
  defaultLaborCostCodeId: string | null;
  defaultSubCostCodeId: string | null;
  defaultMaterialCostCodeId: string | null;
  defaultEquipmentCostCodeId: string | null;
}

/**
 * Create a trade with its default cost codes (L / M / S / EQ)
 *
 * PREFIX = full uppercase trade name
 * PREFIX-L → labor
 * PREFIX-M → materials
 * PREFIX-S → subs
 * PREFIX-EQ → equipment
 */
export async function createTradeWithDefaultCostCodes(
  name: string
): Promise<CreatedTradeWithDefaults> {
  if (!name || !name.trim()) {
    throw new Error("Trade name is required");
  }

  const tradeName = name.trim();
  const prefix = tradeName.toUpperCase();

  const { data: newTrade, error: tradeError } = await supabase
    .from("trades")
    .insert([{ name: tradeName, description: null }])
    .select()
    .single();

  if (tradeError || !newTrade) {
    throw new Error(`Failed to create trade: ${tradeError?.message ?? "Unknown error"}`);
  }

  const costCodesToCreate = [
    {
      code: `${prefix}-L`,
      name: `${tradeName} Labor`,
      category: "labor",
      trade_id: newTrade.id,
      is_active: true,
    },
    {
      code: `${prefix}-M`,
      name: `${tradeName} Materials`,
      category: "materials",
      trade_id: newTrade.id,
      is_active: true,
    },
    {
      code: `${prefix}-S`,
      name: `${tradeName} Sub-Contractor`,
      category: "subs",
      trade_id: newTrade.id,
      is_active: true,
    },
    {
      code: `${prefix}-EQ`,
      name: `${tradeName} Equipment`,
      category: "equipment",
      trade_id: newTrade.id,
      is_active: true,
    },
  ];

  const { data: createdCostCodes, error: costCodeError } = await supabase
    .from("cost_codes")
    .insert(costCodesToCreate)
    .select();

  if (costCodeError || !createdCostCodes) {
    await supabase.from("trades").delete().eq("id", newTrade.id);
    throw new Error(`Failed to create cost codes: ${costCodeError?.message ?? "Unknown error"}`);
  }

  const laborCode = createdCostCodes.find((cc) => cc.category === "labor");
  const materialCode = createdCostCodes.find((cc) => cc.category === "materials");
  const subCode = createdCostCodes.find((cc) => cc.category === "subs");
  const equipmentCode = createdCostCodes.find((cc) => cc.category === "equipment");

  const { error: updateError } = await supabase
    .from("trades")
    .update({
      default_labor_cost_code_id: laborCode?.id || null,
      default_material_cost_code_id: materialCode?.id || null,
      default_sub_cost_code_id: subCode?.id || null,
      default_equipment_cost_code_id: equipmentCode?.id || null,
    })
    .eq("id", newTrade.id);

  if (updateError) {
    await supabase
      .from("cost_codes")
      .delete()
      .in(
        "id",
        createdCostCodes.map((cc) => cc.id)
      );
    await supabase.from("trades").delete().eq("id", newTrade.id);
    throw new Error(`Failed to update trade defaults: ${updateError.message}`);
  }

  return {
    trade: { id: newTrade.id, name: newTrade.name },
    defaultLaborCostCodeId: laborCode?.id || null,
    defaultSubCostCodeId: subCode?.id || null,
    defaultMaterialCostCodeId: materialCode?.id || null,
    defaultEquipmentCostCodeId: equipmentCode?.id || null,
  };
}