// src/hooks/useItemAutosave.ts
// Per-row autosave with debounce, status tracking, and retry capability

import { useCallback, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export interface RowSaveState {
  status: SaveStatus;
  error?: string;
  lastSaved?: Date;
}

export interface ItemUpdate {
  id: string;
  category?: string;
  cost_code_id?: string | null;
  description?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  markup_percent?: number;
  area_label?: string | null;
  group_label?: string | null;
  sort_order?: number;
  scope_block_id?: string;
}

const DEBOUNCE_MS = 600;
const SAVED_DISPLAY_MS = 2000;

export function useItemAutosave(estimateId: string | undefined) {
  const queryClient = useQueryClient();
  const [rowStates, setRowStates] = useState<Map<string, RowSaveState>>(new Map());
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingUpdates = useRef<Map<string, ItemUpdate>>(new Map());
  const savedTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Set row state helper
  const setRowState = useCallback((id: string, state: Partial<RowSaveState>) => {
    setRowStates((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(id) || { status: "idle" };
      newMap.set(id, { ...existing, ...state });
      return newMap;
    });
  }, []);

  // Clear row state after successful save
  const clearSavedState = useCallback((id: string) => {
    // Clear any existing timer
    const existingTimer = savedTimers.current.get(id);
    if (existingTimer) clearTimeout(existingTimer);

    // Set saved state
    setRowState(id, { status: "saved", lastSaved: new Date(), error: undefined });

    // Clear after display duration
    const timer = setTimeout(() => {
      setRowState(id, { status: "idle" });
    }, SAVED_DISPLAY_MS);
    savedTimers.current.set(id, timer);
  }, [setRowState]);

  // Mutation for saving item updates
  const saveMutation = useMutation({
    mutationFn: async (update: ItemUpdate) => {
      const { id, ...fields } = update;
      
      // Calculate line_total if numeric fields changed
      let finalFields: any = { ...fields };
      
      if (
        fields.quantity !== undefined ||
        fields.unit_price !== undefined ||
        fields.markup_percent !== undefined
      ) {
        // Get current values to compute line_total
        const { data: current } = await supabase
          .from("scope_block_cost_items")
          .select("quantity, unit_price, markup_percent")
          .eq("id", id)
          .single();

        if (current) {
          const qty = fields.quantity ?? current.quantity ?? 0;
          const price = fields.unit_price ?? current.unit_price ?? 0;
          const markup = fields.markup_percent ?? current.markup_percent ?? 0;
          finalFields.line_total = qty * price * (1 + markup / 100);
        }
      }

      const { data, error } = await supabase
        .from("scope_block_cost_items")
        .update(finalFields)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { id, data };
    },
    onMutate: async (update) => {
      setRowState(update.id, { status: "saving", error: undefined });
    },
    onSuccess: ({ id }) => {
      clearSavedState(id);
      // Light invalidation - don't force refetch, just mark stale
      queryClient.invalidateQueries({ 
        queryKey: ["scope-blocks", "estimate", estimateId],
        refetchType: "none" // Don't auto-refetch
      });
    },
    onError: (error: Error, update) => {
      setRowState(update.id, { 
        status: "error", 
        error: error.message || "Save failed" 
      });
    },
  });

  // Queue an update with debounce
  const queueUpdate = useCallback((update: ItemUpdate) => {
    const { id } = update;

    // Merge with any pending update for this row
    const existing = pendingUpdates.current.get(id) || { id };
    pendingUpdates.current.set(id, { ...existing, ...update });

    // Mark as dirty immediately
    setRowState(id, { status: "dirty" });

    // Clear existing debounce timer
    const existingTimer = debounceTimers.current.get(id);
    if (existingTimer) clearTimeout(existingTimer);

    // Set new debounce timer
    const timer = setTimeout(() => {
      const finalUpdate = pendingUpdates.current.get(id);
      if (finalUpdate) {
        pendingUpdates.current.delete(id);
        saveMutation.mutate(finalUpdate);
      }
    }, DEBOUNCE_MS);
    debounceTimers.current.set(id, timer);
  }, [saveMutation, setRowState]);

  // Immediate save (for dropdowns/selects)
  const saveImmediate = useCallback((update: ItemUpdate) => {
    const { id } = update;
    
    // Clear any pending debounced save
    const existingTimer = debounceTimers.current.get(id);
    if (existingTimer) clearTimeout(existingTimer);
    
    // Merge with pending and save immediately
    const existing = pendingUpdates.current.get(id) || { id };
    const finalUpdate = { ...existing, ...update };
    pendingUpdates.current.delete(id);
    
    saveMutation.mutate(finalUpdate);
  }, [saveMutation]);

  // Retry a failed save
  const retrySave = useCallback((id: string, currentValues: ItemUpdate) => {
    saveMutation.mutate({ ...currentValues, id });
  }, [saveMutation]);

  // Flush all pending saves (for navigation)
  const flushPendingSaves = useCallback(async () => {
    const pending = Array.from(pendingUpdates.current.values());
    
    // Clear all timers
    debounceTimers.current.forEach((timer) => clearTimeout(timer));
    debounceTimers.current.clear();
    pendingUpdates.current.clear();

    if (pending.length === 0) return true;

    try {
      await Promise.all(
        pending.map((update) =>
          supabase
            .from("scope_block_cost_items")
            .update(update)
            .eq("id", update.id)
        )
      );
      return true;
    } catch {
      return false;
    }
  }, []);

  // Get row state
  const getRowState = useCallback((id: string): RowSaveState => {
    return rowStates.get(id) || { status: "idle" };
  }, [rowStates]);

  // Check if any rows have pending changes
  const hasPendingChanges = useCallback(() => {
    return (
      pendingUpdates.current.size > 0 ||
      saveMutation.isPending ||
      Array.from(rowStates.values()).some(
        (s) => s.status === "dirty" || s.status === "saving"
      )
    );
  }, [rowStates, saveMutation.isPending]);

  // Check if any rows have errors
  const hasErrors = useCallback(() => {
    return Array.from(rowStates.values()).some((s) => s.status === "error");
  }, [rowStates]);

  // Get global save status
  const getGlobalStatus = useCallback((): SaveStatus => {
    const states = Array.from(rowStates.values());
    if (states.some((s) => s.status === "error")) return "error";
    if (states.some((s) => s.status === "saving") || saveMutation.isPending) return "saving";
    if (states.some((s) => s.status === "dirty") || pendingUpdates.current.size > 0) return "dirty";
    if (states.some((s) => s.status === "saved")) return "saved";
    return "idle";
  }, [rowStates, saveMutation.isPending]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    debounceTimers.current.forEach((timer) => clearTimeout(timer));
    savedTimers.current.forEach((timer) => clearTimeout(timer));
  }, []);

  return {
    queueUpdate,
    saveImmediate,
    retrySave,
    flushPendingSaves,
    getRowState,
    hasPendingChanges,
    hasErrors,
    getGlobalStatus,
    cleanup,
    isSaving: saveMutation.isPending,
  };
}
