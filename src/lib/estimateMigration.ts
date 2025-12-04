// src/lib/estimateMigration.ts
// Utility to migrate legacy estimate_items to scope_block_cost_items format

import { supabase } from "@/integrations/supabase/client";
import { getUnassignedCostCodeId } from "@/lib/costCodes";

interface LegacyEstimateItem {
  id: string;
  estimate_id: string;
  description: string | null;
  category: string | null;
  cost_code_id: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  line_total: number | null;
  trade_id: string | null;
  planned_hours: number | null;
}

/**
 * Check if an estimate has legacy items that need migration
 */
export async function checkEstimateNeedsMigration(estimateId: string): Promise<{
  needsMigration: boolean;
  legacyItemCount: number;
  scopeItemCount: number;
}> {
  // Get legacy item count
  const { count: legacyCount, error: legacyError } = await supabase
    .from("estimate_items")
    .select("*", { count: "exact", head: true })
    .eq("estimate_id", estimateId);

  if (legacyError) {
    console.error("Error checking legacy items:", legacyError);
    return { needsMigration: false, legacyItemCount: 0, scopeItemCount: 0 };
  }

  // Get scope block item count
  const { data: blocks, error: blocksError } = await supabase
    .from("scope_blocks")
    .select("id")
    .eq("entity_type", "estimate")
    .eq("entity_id", estimateId);

  if (blocksError) {
    console.error("Error checking scope blocks:", blocksError);
    return { needsMigration: false, legacyItemCount: legacyCount || 0, scopeItemCount: 0 };
  }

  const blockIds = blocks?.map((b) => b.id) || [];
  
  let scopeItemCount = 0;
  if (blockIds.length > 0) {
    const { count, error } = await supabase
      .from("scope_block_cost_items")
      .select("*", { count: "exact", head: true })
      .in("scope_block_id", blockIds);
    
    if (!error) {
      scopeItemCount = count || 0;
    }
  }

  // Need migration if: has legacy items AND has no scope items
  const needsMigration = (legacyCount || 0) > 0 && scopeItemCount === 0;

  return {
    needsMigration,
    legacyItemCount: legacyCount || 0,
    scopeItemCount,
  };
}

/**
 * Migrate legacy estimate_items to scope_block_cost_items
 * Creates a scope block if none exists, then converts all legacy items
 */
export async function migrateEstimateToScopeBlocks(estimateId: string): Promise<{
  success: boolean;
  migratedCount: number;
  error?: string;
}> {
  try {
    // 1. Fetch legacy items
    const { data: legacyItems, error: fetchError } = await supabase
      .from("estimate_items")
      .select("*")
      .eq("estimate_id", estimateId)
      .order("created_at", { ascending: true });

    if (fetchError) throw fetchError;
    if (!legacyItems || legacyItems.length === 0) {
      return { success: true, migratedCount: 0 };
    }

    // 2. Check if scope block already exists, if not create one
    let { data: existingBlocks, error: blockError } = await supabase
      .from("scope_blocks")
      .select("id")
      .eq("entity_type", "estimate")
      .eq("entity_id", estimateId)
      .eq("block_type", "cost_items")
      .order("sort_order", { ascending: true })
      .limit(1);

    if (blockError) throw blockError;

    let scopeBlockId: string;
    
    if (existingBlocks && existingBlocks.length > 0) {
      scopeBlockId = existingBlocks[0].id;
    } else {
      // Create a new scope block
      const { data: newBlock, error: createBlockError } = await supabase
        .from("scope_blocks")
        .insert({
          entity_type: "estimate",
          entity_id: estimateId,
          block_type: "cost_items",
          title: "Migrated Items",
          sort_order: 0,
        })
        .select()
        .single();

      if (createBlockError) throw createBlockError;
      scopeBlockId = newBlock.id;
    }

    // 3. Get UNASSIGNED cost code for fallback
    const unassignedId = await getUnassignedCostCodeId();

    // 4. Transform and insert legacy items as scope_block_cost_items
    const scopeItems = legacyItems.map((item: LegacyEstimateItem, idx: number) => {
      // Normalize category
      let category = "other";
      const rawCat = item.category?.toLowerCase() || "";
      if (rawCat.includes("lab")) category = "labor";
      else if (rawCat.includes("sub")) category = "subs";
      else if (rawCat.includes("mat")) category = "materials";

      return {
        scope_block_id: scopeBlockId,
        category,
        cost_code_id: item.cost_code_id || unassignedId,
        description: item.description || "Migrated Item",
        quantity: item.quantity || 1,
        unit: item.unit || "ea",
        unit_price: item.unit_price || 0,
        markup_percent: 0,
        line_total: item.line_total || (item.quantity || 0) * (item.unit_price || 0),
        sort_order: idx,
        area_label: null,
        group_label: null,
      };
    });

    const { error: insertError } = await supabase
      .from("scope_block_cost_items")
      .insert(scopeItems);

    if (insertError) throw insertError;

    console.log(`Migrated ${scopeItems.length} items for estimate ${estimateId}`);

    return { success: true, migratedCount: scopeItems.length };
  } catch (err: any) {
    console.error("Migration error:", err);
    return { success: false, migratedCount: 0, error: err.message };
  }
}
