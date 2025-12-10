// src/hooks/useItemAutosave.ts
// Per-row autosave with debounce, status tracking, and retry capability

import { useCallback, useEffect, useRef, useState } from "react";
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
const DEBOUNCE_MS_ZERO_COST = 300; // Faster debounce for $0 items
const SAVED_DISPLAY_MS = 2000;

export function useItemAutosave(estimateId: string | undefined) {
  const queryClient = useQueryClient();
  const [rowStates, setRowStates] = useState<Map<string, RowSaveState>>(new Map());
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingUpdates = useRef<Map<string, ItemUpdate>>(new Map());
  const savedTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isMountedRef = useRef(true);

  // Automatic cleanup on unmount - prevents memory leaks
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      // Mark as unmounted to prevent state updates after cleanup
      isMountedRef.current = false;
      
      // Clear all debounce timers
      debounceTimers.current.forEach((timer) => clearTimeout(timer));
      debounceTimers.current.clear();
      
      // Clear all saved state display timers
      savedTimers.current.forEach((timer) => clearTimeout(timer));
      savedTimers.current.clear();
      
      // Clear pending updates
      pendingUpdates.current.clear();
    };
  }, []);

  // Set row state helper with mounted check
  const setRowState = useCallback((id: string, state: Partial<RowSaveState>) => {
    // Prevent state updates after component unmounts
    if (!isMountedRef.current) return;
    
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
          .maybeSingle();

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
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Cost item not found');
      }
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
    const { id, unit_price } = update;

    // Merge with any pending update for this row
    const existing = pendingUpdates.current.get(id) || { id };
    const merged = { ...existing, ...update };
    pendingUpdates.current.set(id, merged);

    // Mark as dirty immediately
    setRowState(id, { status: "dirty" });

    // Clear existing debounce timer
    const existingTimer = debounceTimers.current.get(id);
    if (existingTimer) clearTimeout(existingTimer);

    // Determine debounce time: faster for $0 items or when unit_price is 0/null
    const finalUnitPrice = unit_price ?? existing.unit_price ?? 0;
    const isZeroCost = finalUnitPrice === 0 || finalUnitPrice === null;
    const debounceTime = isZeroCost ? DEBOUNCE_MS_ZERO_COST : DEBOUNCE_MS;

    // Set new debounce timer
    const timer = setTimeout(() => {
      const finalUpdate = pendingUpdates.current.get(id);
      if (finalUpdate) {
        pendingUpdates.current.delete(id);
        saveMutation.mutate(finalUpdate);
      }
    }, debounceTime);
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

  return {
    queueUpdate,
    saveImmediate,
    retrySave,
    flushPendingSaves,
    getRowState,
    hasPendingChanges,
    hasErrors,
    getGlobalStatus,
    isSaving: saveMutation.isPending,
    // cleanup is now automatic via useEffect - no need to export
  };
}
