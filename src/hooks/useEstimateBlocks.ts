// src/hooks/useEstimateBlocks.ts
// Bridge hook: transforms scope_blocks → EstimateEditorBlock[] and provides mutation callbacks

import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getUnassignedCostCodeId } from "@/lib/costCodes";

export type BudgetCategory = "labor" | "subs" | "materials" | "other";

export interface ScopeItem {
  id: string;
  scope_block_id: string;
  area_label: string | null;
  group_label: string | null;
  category: BudgetCategory;
  cost_code_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  markup_percent: number;
  line_total: number;
  notes?: string | null;
  sort_order?: number;
}

export interface ScopeBlockHeader {
  id: string;
  title: string;
  description?: string | null;
  sort_order?: number | null;
}

export interface EstimateEditorBlock {
  block: ScopeBlockHeader;
  items: ScopeItem[];
}

interface CostItemDB {
  id: string;
  scope_block_id: string;
  category: string;
  cost_code_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  markup_percent: number;
  line_total: number;
  notes: string | null;
  sort_order: number;
  area_label?: string | null;
  group_label?: string | null;
}

interface ScopeBlockDB {
  id: string;
  title: string | null;
  description: string | null;
  block_type: string;
  sort_order: number;
  scope_block_cost_items: CostItemDB[];
}

function transformToEditorBlocks(dbBlocks: ScopeBlockDB[]): EstimateEditorBlock[] {
  return dbBlocks.map((block) => ({
    block: {
      id: block.id,
      title: block.title || "Untitled Section",
      description: block.description,
      sort_order: block.sort_order,
    },
    items: (block.scope_block_cost_items || []).map((item) => ({
      id: item.id,
      scope_block_id: item.scope_block_id,
      area_label: item.area_label ?? null,
      group_label: item.group_label ?? null,
      category: (item.category as BudgetCategory) || "labor",
      cost_code_id: item.cost_code_id,
      description: item.description || "",
      quantity: item.quantity || 0,
      unit: item.unit || "ea",
      unit_price: item.unit_price || 0,
      markup_percent: item.markup_percent || 0,
      line_total: item.line_total || 0,
      notes: item.notes,
      sort_order: item.sort_order,
    })),
  }));
}

// Reorder payload types
export interface ReorderItemPayload {
  id: string;
  sort_order: number;
  area_label: string | null;
  group_label: string | null;
}

export interface ReorderSectionPayload {
  id: string;
  sort_order: number;
}

export function useEstimateBlocks(estimateId: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch scope blocks with cost items
  const {
    data: blocks = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["estimate-blocks", estimateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scope_blocks")
        .select(`
          id, title, description, block_type, sort_order,
          scope_block_cost_items(*)
        `)
        .eq("entity_type", "estimate")
        .eq("entity_id", estimateId!)
        .eq("block_type", "cost_items")
        .order("sort_order", { ascending: true });
      if (error) throw error;

      const sorted = (data || []).map((block) => ({
        ...block,
        scope_block_cost_items: (block.scope_block_cost_items || []).sort(
          (a: CostItemDB, b: CostItemDB) => (a.sort_order || 0) - (b.sort_order || 0)
        ),
      })) as ScopeBlockDB[];

      return transformToEditorBlocks(sorted);
    },
    enabled: !!estimateId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Create item mutation
  const createItemMutation = useMutation({
    mutationFn: async ({
      blockId,
      areaLabel,
      groupLabel,
    }: {
      blockId: string;
      areaLabel?: string | null;
      groupLabel?: string | null;
    }) => {
      const { data: existingItems } = await supabase
        .from("scope_block_cost_items")
        .select("sort_order")
        .eq("scope_block_id", blockId)
        .order("sort_order", { ascending: false })
        .limit(1);
      
      const maxOrder = existingItems?.[0]?.sort_order ?? -1;
      const unassignedId = await getUnassignedCostCodeId();
      
      const { data, error } = await supabase
        .from("scope_block_cost_items")
        .insert({
          scope_block_id: blockId,
          category: "labor",
          cost_code_id: unassignedId,
          description: "New Item",
          quantity: 1,
          unit: "ea",
          unit_price: 0,
          markup_percent: 0,
          line_total: 0,
          area_label: areaLabel ?? null,
          group_label: groupLabel ?? null,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-blocks", estimateId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to create item: " + error.message);
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<ScopeItem> & { id: string }) => {
      let finalUpdates: any = { ...updates };
      
      if (updates.quantity !== undefined) {
        finalUpdates.quantity = Math.max(0, updates.quantity || 0);
      }
      if (updates.unit_price !== undefined) {
        finalUpdates.unit_price = Math.max(0, updates.unit_price || 0);
      }
      if (updates.markup_percent !== undefined) {
        finalUpdates.markup_percent = Math.max(0, updates.markup_percent || 0);
      }
      
      if (
        updates.quantity !== undefined ||
        updates.unit_price !== undefined ||
        updates.markup_percent !== undefined
      ) {
        const { data: current } = await supabase
          .from("scope_block_cost_items")
          .select("quantity, unit_price, markup_percent")
          .eq("id", id)
          .single();

        if (current) {
          const qty = Math.max(0, finalUpdates.quantity ?? current.quantity ?? 0);
          const unitPrice = Math.max(0, finalUpdates.unit_price ?? current.unit_price ?? 0);
          const markup = Math.max(0, finalUpdates.markup_percent ?? current.markup_percent ?? 0);
          finalUpdates.line_total = qty * unitPrice * (1 + markup / 100);
        }
      }

      const { data, error } = await supabase
        .from("scope_block_cost_items")
        .update(finalUpdates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-blocks", estimateId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update item: " + error.message);
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scope_block_cost_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-blocks", estimateId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete item: " + error.message);
    },
  });

  // Batch rename area
  const renameAreaMutation = useMutation({
    mutationFn: async ({
      blockId,
      oldName,
      newName,
    }: {
      blockId: string;
      oldName: string | null;
      newName: string | null;
    }) => {
      let query = supabase
        .from("scope_block_cost_items")
        .update({ area_label: newName })
        .eq("scope_block_id", blockId);
      
      if (oldName === null) {
        query = query.is("area_label", null);
      } else {
        query = query.eq("area_label", oldName);
      }
      
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-blocks", estimateId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to rename area: " + error.message);
    },
  });

  // Batch rename group
  const renameGroupMutation = useMutation({
    mutationFn: async ({
      blockId,
      areaLabel,
      oldGroup,
      newGroup,
    }: {
      blockId: string;
      areaLabel: string | null;
      oldGroup: string | null;
      newGroup: string | null;
    }) => {
      let query = supabase
        .from("scope_block_cost_items")
        .update({ group_label: newGroup })
        .eq("scope_block_id", blockId);

      if (areaLabel === null) {
        query = query.is("area_label", null);
      } else {
        query = query.eq("area_label", areaLabel);
      }

      if (oldGroup === null) {
        query = query.is("group_label", null);
      } else {
        query = query.eq("group_label", oldGroup);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-blocks", estimateId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to rename group: " + error.message);
    },
  });

  // ====== REORDER MUTATIONS ======

  // Reorder items within a block (batch update sort_order, area_label, group_label)
  const reorderItemsMutation = useMutation({
    mutationFn: async ({
      blockId,
      items,
    }: {
      blockId: string;
      items: ReorderItemPayload[];
    }) => {
      // Use upsert to batch update multiple items
      const updates = items.map((item) => ({
        id: item.id,
        scope_block_id: blockId,
        sort_order: item.sort_order,
        area_label: item.area_label,
        group_label: item.group_label,
      }));

      // Batch update using multiple individual updates (Supabase doesn't support bulk upsert on id)
      const promises = updates.map((update) =>
        supabase
          .from("scope_block_cost_items")
          .update({
            sort_order: update.sort_order,
            area_label: update.area_label,
            group_label: update.group_label,
          })
          .eq("id", update.id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error?.message || "Failed to reorder items");
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to reorder items: " + error.message);
      // Invalidate to restore correct order
      queryClient.invalidateQueries({ queryKey: ["estimate-blocks", estimateId] });
    },
    onSuccess: () => {
      // Silently invalidate to confirm order
      queryClient.invalidateQueries({ queryKey: ["estimate-blocks", estimateId] });
    },
  });

  // Reorder sections (scope_blocks)
  const reorderSectionsMutation = useMutation({
    mutationFn: async (sections: ReorderSectionPayload[]) => {
      const promises = sections.map((section) =>
        supabase
          .from("scope_blocks")
          .update({ sort_order: section.sort_order })
          .eq("id", section.id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error?.message || "Failed to reorder sections");
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to reorder sections: " + error.message);
      queryClient.invalidateQueries({ queryKey: ["estimate-blocks", estimateId] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-blocks", estimateId] });
    },
  });

  // Callbacks
  const onItemCreate = useCallback(
    (blockId: string, areaLabel?: string | null, groupLabel?: string | null) => {
      createItemMutation.mutate({ blockId, areaLabel, groupLabel });
    },
    [createItemMutation]
  );

  const onItemUpdate = useCallback(
    (itemId: string, patch: Partial<ScopeItem>) => {
      updateItemMutation.mutate({ id: itemId, ...patch });
    },
    [updateItemMutation]
  );

  const onItemDelete = useCallback(
    (itemId: string) => {
      deleteItemMutation.mutate(itemId);
    },
    [deleteItemMutation]
  );

  const onAreaRename = useCallback(
    (blockId: string, oldName: string | null, newName: string | null) => {
      renameAreaMutation.mutate({ blockId, oldName, newName });
    },
    [renameAreaMutation]
  );

  const onGroupRename = useCallback(
    (
      blockId: string,
      areaLabel: string | null,
      oldGroup: string | null,
      newGroup: string | null
    ) => {
      renameGroupMutation.mutate({ blockId, areaLabel, oldGroup, newGroup });
    },
    [renameGroupMutation]
  );

  const onReorderItems = useCallback(
    (blockId: string, items: ReorderItemPayload[]) => {
      reorderItemsMutation.mutate({ blockId, items });
    },
    [reorderItemsMutation]
  );

  const onReorderSections = useCallback(
    (sections: ReorderSectionPayload[]) => {
      reorderSectionsMutation.mutate(sections);
    },
    [reorderSectionsMutation]
  );

  const isMutating =
    createItemMutation.isPending ||
    updateItemMutation.isPending ||
    deleteItemMutation.isPending ||
    renameAreaMutation.isPending ||
    renameGroupMutation.isPending ||
    reorderItemsMutation.isPending ||
    reorderSectionsMutation.isPending;

  return {
    blocks,
    isLoading,
    error,
    isMutating,
    onItemCreate,
    onItemUpdate,
    onItemDelete,
    onAreaRename,
    onGroupRename,
    onReorderItems,
    onReorderSections,
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: ["estimate-blocks", estimateId] }),
  };
}
