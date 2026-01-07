// src/hooks/useItemAutosave.ts
// Production-grade autosave with:
// - Batch saves (single RPC call for multiple rows)
// - Optimistic locking (updated_at conflict detection)
// - Smart debouncing with flush
// - NO automatic retries (manual retry only)
// - Memory-safe cleanup

import { useCallback, useRef, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error" | "conflict";

export interface RowSaveState {
  status: SaveStatus;
  error?: string;
  lastSaved?: Date;
  serverUpdatedAt?: string; // For conflict resolution
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
  expected_updated_at?: string; // For optimistic locking
}

interface BatchResult {
  id: string;
  success: boolean;
  error?: string;
  updated_at?: string;
  server_updated_at?: string;
}

// Configuration
const DEBOUNCE_MS = 400; // Faster debounce for better UX
const BATCH_FLUSH_MS = 100; // Micro-batch window
const SAVED_DISPLAY_MS = 1500;

export function useItemAutosave(estimateId: string | undefined) {
  const queryClient = useQueryClient();
  const [rowStates, setRowStates] = useState<Map<string, RowSaveState>>(new Map());
  
  // Refs for managing async state
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingUpdates = useRef<Map<string, ItemUpdate>>(new Map());
  const savedTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const batchFlushTimer = useRef<NodeJS.Timeout | null>(null);
  const isFlushing = useRef(false);
  const mountedRef = useRef(true);
  
  // Track updated_at for optimistic locking
  const lastKnownUpdates = useRef<Map<string, string>>(new Map());

  // DEV / diagnostics
  const lastBatchResultsRef = useRef<BatchResult[] | null>(null);
  const lastBatchErrorRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      debounceTimers.current.forEach((timer) => clearTimeout(timer));
      savedTimers.current.forEach((timer) => clearTimeout(timer));
      if (batchFlushTimer.current) clearTimeout(batchFlushTimer.current);
    };
  }, []);

  // Set row state helper (safe for unmount)
  const setRowState = useCallback((id: string, state: Partial<RowSaveState>) => {
    if (!mountedRef.current) return;
    setRowStates((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(id) || { status: "idle" };
      newMap.set(id, { ...existing, ...state });
      return newMap;
    });
  }, []);

  // Clear row state after successful save
  const clearSavedState = useCallback((id: string, updatedAt?: string) => {
    const existingTimer = savedTimers.current.get(id);
    if (existingTimer) clearTimeout(existingTimer);

    // Track the new updated_at for future optimistic locking
    if (updatedAt) {
      lastKnownUpdates.current.set(id, updatedAt);
    }

    setRowState(id, {
      status: "saved",
      lastSaved: new Date(),
      error: undefined,
    });

    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setRowState(id, { status: "idle" });
      }
    }, SAVED_DISPLAY_MS);
    savedTimers.current.set(id, timer);
  }, [setRowState]);

  // Batch flush - saves all pending updates in a single RPC call
  // CRITICAL: Failed edits are RESTORED to pendingUpdates so they are never lost.
  const flushBatch = useCallback(async () => {
    if (isFlushing.current || pendingUpdates.current.size === 0) return;
    
    isFlushing.current = true;
    
    // Collect all pending updates and create snapshot map for restoration
    const updates = Array.from(pendingUpdates.current.values());
    const updatesById = new Map<string, ItemUpdate>();
    updates.forEach((u) => updatesById.set(u.id, u));
    const itemIds = updates.map((u) => u.id);

    // Clear pending (we have a snapshot to restore from on failure)
    pendingUpdates.current.clear();
    
    // Mark all as saving
    itemIds.forEach(id => setRowState(id, { status: "saving", error: undefined }));
    
    try {
      lastBatchErrorRef.current = null;

      // Add expected_updated_at for optimistic locking
      const itemsWithLocking = updates.map(update => ({
        ...update,
        expected_updated_at: lastKnownUpdates.current.get(update.id) || null,
      }));
      
      // Single RPC call for all updates
      const { data, error } = await (supabase as any).rpc('batch_upsert_cost_items', {
        p_items: itemsWithLocking
      });
      
      if (error) throw error;
      
      const results: BatchResult[] = data || [];
      lastBatchResultsRef.current = results;

      let failureCount = 0;
      
      // Process results
      results.forEach((result) => {
        if (result.success) {
          // Only clear saved state on explicit success
          clearSavedState(result.id, result.updated_at);
          return;
        }

        // RESTORE the client edit so it can't be lost
        const original = updatesById.get(result.id);
        if (original) {
          pendingUpdates.current.set(result.id, original);
        }
        failureCount++;

        if (result.error === 'CONFLICT') {
          setRowState(result.id, {
            status: "conflict",
            error: "Another user modified this row",
            serverUpdatedAt: result.server_updated_at,
          });
        } else {
          setRowState(result.id, {
            status: "error",
            error: result.error || "Save failed",
          });
        }
      });

      // If server returned nothing for some ids, treat as failure + restore
      const returnedIds = new Set(results.map((r) => r.id));
      updatesById.forEach((u, id) => {
        if (!returnedIds.has(id)) {
          failureCount++;
          pendingUpdates.current.set(id, u);
          setRowState(id, { status: "error", error: "No response from server for this row" });
        }
      });

      // Single consolidated error toast if failures
      if (failureCount > 0) {
        toast.error(`Save failed (${failureCount}) — your edits are kept locally`);
      }
      
      // IMPORTANT: do not invalidate/refetch here; local UI is source of truth.
      
    } catch (error) {
      console.error("Batch save error:", error);
      const msg = error instanceof Error ? error.message : String(error);
      lastBatchErrorRef.current = msg || "Network error";
      lastBatchResultsRef.current = null;

      // RESTORE ALL pending edits (critical)
      updatesById.forEach((u, id) => pendingUpdates.current.set(id, u));

      // Mark all as error
      itemIds.forEach((id) => {
        setRowState(id, { status: "error", error: msg || "Network error" });
      });

      toast.error(`Save failed — your edits are kept locally`);
    } finally {
      isFlushing.current = false;

      // NOTE: Do NOT auto-schedule another flush on failures.
      // User must change again or click retry.
    }
  }, [setRowState, clearSavedState]);

  // Schedule a batch flush with micro-batching window
  const scheduleBatchFlush = useCallback(() => {
    if (batchFlushTimer.current) return; // Already scheduled
    
    batchFlushTimer.current = setTimeout(() => {
      batchFlushTimer.current = null;
      flushBatch();
    }, BATCH_FLUSH_MS);
  }, [flushBatch]);

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
      debounceTimers.current.delete(id);
      scheduleBatchFlush();
    }, DEBOUNCE_MS);
    debounceTimers.current.set(id, timer);
  }, [setRowState, scheduleBatchFlush]);

  // Immediate save (for dropdowns/selects)
  const saveImmediate = useCallback((update: ItemUpdate) => {
    const { id } = update;
    
    // Clear any pending debounced save
    const existingTimer = debounceTimers.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      debounceTimers.current.delete(id);
    }
    
    // Merge with pending and trigger immediate flush
    const existing = pendingUpdates.current.get(id) || { id };
    pendingUpdates.current.set(id, { ...existing, ...update });
    
    setRowState(id, { status: "dirty" });
    
    // Cancel any scheduled batch and flush now
    if (batchFlushTimer.current) {
      clearTimeout(batchFlushTimer.current);
      batchFlushTimer.current = null;
    }
    flushBatch();
  }, [setRowState, flushBatch]);

  // Retry a failed save
  const retrySave = useCallback((id: string, currentValues: ItemUpdate) => {
    setRowState(id, { status: "dirty", error: undefined });
    pendingUpdates.current.set(id, { ...currentValues, id });
    scheduleBatchFlush();
  }, [setRowState, scheduleBatchFlush]);

  const retryAll = useCallback((rows: Array<{ id: string; values: ItemUpdate }>) => {
    rows.forEach(({ id, values }) => {
      setRowState(id, { status: "dirty", error: undefined });
      pendingUpdates.current.set(id, { ...values, id });
    });
    scheduleBatchFlush();
  }, [setRowState, scheduleBatchFlush]);

  // Accept server version (for conflict resolution)
  const acceptServerVersion = useCallback((id: string, serverUpdatedAt: string) => {
    lastKnownUpdates.current.set(id, serverUpdatedAt);
    setRowState(id, { status: "idle", error: undefined });
    // Trigger refetch to get server data
    if (estimateId) {
      queryClient.invalidateQueries({ 
        queryKey: ["scope-blocks", "estimate", estimateId]
      });
    }
  }, [estimateId, queryClient, setRowState]);

  // Force save local version (for conflict resolution)
  const forceLocalVersion = useCallback((id: string, currentValues: ItemUpdate) => {
    // Clear the expected_updated_at to force overwrite
    lastKnownUpdates.current.delete(id);
    setRowState(id, { status: "dirty", error: undefined });
    pendingUpdates.current.set(id, { ...currentValues, id });
    scheduleBatchFlush();
  }, [setRowState, scheduleBatchFlush]);

  // Flush all pending saves (for navigation)
  const flushPendingSaves = useCallback(async () => {
    // Clear all debounce timers
    debounceTimers.current.forEach((timer) => clearTimeout(timer));
    debounceTimers.current.clear();
    
    // Cancel scheduled batch
    if (batchFlushTimer.current) {
      clearTimeout(batchFlushTimer.current);
      batchFlushTimer.current = null;
    }
    
    // Flush now
    await flushBatch();
    
    // Wait for any in-flight saves
    let attempts = 0;
    while (isFlushing.current && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    return !isFlushing.current;
  }, [flushBatch]);

  // Get row state
  const getRowState = useCallback((id: string): RowSaveState => {
    return rowStates.get(id) || { status: "idle" };
  }, [rowStates]);

  // Check if any rows have pending changes
  const hasPendingChanges = useCallback(() => {
    return (
      pendingUpdates.current.size > 0 ||
      isFlushing.current ||
      Array.from(rowStates.values()).some(
        (s) => s.status === "dirty" || s.status === "saving"
      )
    );
  }, [rowStates]);

  // Check if any rows have errors
  const hasErrors = useCallback(() => {
    return Array.from(rowStates.values()).some(
      (s) => s.status === "error" || s.status === "conflict"
    );
  }, [rowStates]);

  // Get global save status
  const getGlobalStatus = useCallback((): SaveStatus => {
    const states = Array.from(rowStates.values());
    if (states.some((s) => s.status === "error")) return "error";
    if (states.some((s) => s.status === "conflict")) return "conflict";
    if (states.some((s) => s.status === "saving") || isFlushing.current) return "saving";
    if (states.some((s) => s.status === "dirty") || pendingUpdates.current.size > 0) return "dirty";
    if (states.some((s) => s.status === "saved")) return "saved";
    return "idle";
  }, [rowStates]);

  // Cleanup helper (called on unmount)
  const cleanup = useCallback(() => {
    debounceTimers.current.forEach((timer) => clearTimeout(timer));
    savedTimers.current.forEach((timer) => clearTimeout(timer));
    if (batchFlushTimer.current) clearTimeout(batchFlushTimer.current);
  }, []);

  const reset = useCallback(() => {
    debounceTimers.current.forEach((timer) => clearTimeout(timer));
    debounceTimers.current.clear();
    savedTimers.current.forEach((timer) => clearTimeout(timer));
    savedTimers.current.clear();
    if (batchFlushTimer.current) {
      clearTimeout(batchFlushTimer.current);
      batchFlushTimer.current = null;
    }
    pendingUpdates.current.clear();
    lastBatchResultsRef.current = null;
    lastBatchErrorRef.current = null;
    setRowStates(new Map());
  }, []);

  const getDiagnostics = useCallback(() => ({
    pendingCount: pendingUpdates.current.size,
    pendingUpdates: Array.from(pendingUpdates.current.values()),
    rowStates: Array.from(rowStates.entries()).map(([id, s]) => ({ id, ...s })),
    isFlushing: isFlushing.current,
    lastKnownUpdates: Array.from(lastKnownUpdates.current.entries()).map(([id, ts]) => ({ id, ts })),
    lastBatchResults: lastBatchResultsRef.current,
    lastBatchError: lastBatchErrorRef.current,
  }), [rowStates]);

  return {
    queueUpdate,
    saveImmediate,
    retrySave,
    retryAll,
    acceptServerVersion,
    forceLocalVersion,
    flushPendingSaves,
    getRowState,
    hasPendingChanges,
    hasErrors,
    getGlobalStatus,
    cleanup,
    reset,
    isSaving: isFlushing.current,
    getDiagnostics,
  };
}
