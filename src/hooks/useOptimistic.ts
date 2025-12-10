/**
 * Optimistic Update Hooks
 * 
 * Provides utilities for optimistic UI updates with automatic rollback.
 * Makes the UI feel instant while data syncs in the background.
 */

import { useState, useCallback, useRef } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface OptimisticState<T> {
  /** Current value (may be optimistic) */
  value: T;
  /** Whether an optimistic update is pending */
  isPending: boolean;
  /** Apply an optimistic update */
  optimisticUpdate: (newValue: T, asyncOperation: () => Promise<void>) => Promise<void>;
  /** Reset to original value */
  reset: () => void;
}

export interface OptimisticListState<T> {
  /** Current list (may include optimistic items) */
  items: T[];
  /** IDs of items with pending operations */
  pendingIds: Set<string>;
  /** Optimistically add an item */
  optimisticAdd: (item: T, asyncOperation: () => Promise<void>) => Promise<void>;
  /** Optimistically update an item */
  optimisticUpdate: (id: string, updates: Partial<T>, asyncOperation: () => Promise<void>) => Promise<void>;
  /** Optimistically remove an item */
  optimisticRemove: (id: string, asyncOperation: () => Promise<void>) => Promise<void>;
}

// ============================================================================
// SINGLE VALUE OPTIMISTIC HOOK
// ============================================================================

/**
 * Hook for optimistic updates of a single value
 * 
 * @example
 * const { value, isPending, optimisticUpdate } = useOptimisticValue(project.name);
 * 
 * const handleRename = async (newName: string) => {
 *   await optimisticUpdate(newName, async () => {
 *     await updateProject({ id: project.id, name: newName });
 *   });
 * };
 */
export function useOptimisticValue<T>(initialValue: T): OptimisticState<T> {
  const [value, setValue] = useState<T>(initialValue);
  const [isPending, setIsPending] = useState(false);
  const originalValueRef = useRef<T>(initialValue);

  const optimisticUpdate = useCallback(async (
    newValue: T,
    asyncOperation: () => Promise<void>
  ) => {
    // Store original for rollback
    originalValueRef.current = value;
    
    // Apply optimistic update
    setValue(newValue);
    setIsPending(true);

    try {
      await asyncOperation();
      // Success - the optimistic value is now the real value
      originalValueRef.current = newValue;
    } catch (error) {
      // Rollback on error
      setValue(originalValueRef.current);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, [value]);

  const reset = useCallback(() => {
    setValue(originalValueRef.current);
    setIsPending(false);
  }, []);

  return {
    value,
    isPending,
    optimisticUpdate,
    reset,
  };
}

// ============================================================================
// LIST OPTIMISTIC HOOK
// ============================================================================

/**
 * Hook for optimistic updates of a list
 * 
 * @example
 * const { items, pendingIds, optimisticAdd, optimisticUpdate, optimisticRemove } = 
 *   useOptimisticList(tasks, task => task.id);
 * 
 * const handleAddTask = async (task: Task) => {
 *   await optimisticAdd(task, async () => {
 *     await createTask(task);
 *   });
 * };
 */
export function useOptimisticList<T extends { id: string }>(
  initialItems: T[],
  getId: (item: T) => string = (item) => item.id
): OptimisticListState<T> {
  const [items, setItems] = useState<T[]>(initialItems);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const originalItemsRef = useRef<T[]>(initialItems);

  // Sync with external changes
  const syncWithExternal = useCallback((newItems: T[]) => {
    setItems(prev => {
      // Keep optimistic items that aren't in the new data
      const pendingItems = prev.filter(item => pendingIds.has(getId(item)));
      const mergedItems = [...newItems];
      
      // Add pending items that don't exist in new data
      for (const pendingItem of pendingItems) {
        if (!newItems.some(item => getId(item) === getId(pendingItem))) {
          mergedItems.push(pendingItem);
        }
      }
      
      return mergedItems;
    });
    originalItemsRef.current = newItems;
  }, [pendingIds, getId]);

  const optimisticAdd = useCallback(async (
    item: T,
    asyncOperation: () => Promise<void>
  ) => {
    const id = getId(item);
    
    // Apply optimistic add
    setItems(prev => [...prev, item]);
    setPendingIds(prev => new Set([...prev, id]));

    try {
      await asyncOperation();
      // Success - remove from pending
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      // Rollback - remove the optimistically added item
      setItems(prev => prev.filter(i => getId(i) !== id));
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      throw error;
    }
  }, [getId]);

  const optimisticUpdate = useCallback(async (
    id: string,
    updates: Partial<T>,
    asyncOperation: () => Promise<void>
  ) => {
    // Store original for rollback
    const originalItem = items.find(item => getId(item) === id);
    if (!originalItem) return;

    // Apply optimistic update
    setItems(prev => prev.map(item => 
      getId(item) === id ? { ...item, ...updates } : item
    ));
    setPendingIds(prev => new Set([...prev, id]));

    try {
      await asyncOperation();
      // Success - remove from pending
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      // Rollback
      setItems(prev => prev.map(item => 
        getId(item) === id ? originalItem : item
      ));
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      throw error;
    }
  }, [items, getId]);

  const optimisticRemove = useCallback(async (
    id: string,
    asyncOperation: () => Promise<void>
  ) => {
    // Store original for rollback
    const originalItem = items.find(item => getId(item) === id);
    if (!originalItem) return;

    // Apply optimistic remove
    setItems(prev => prev.filter(item => getId(item) !== id));
    setPendingIds(prev => new Set([...prev, id]));

    try {
      await asyncOperation();
      // Success - remove from pending
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      // Rollback - add the item back
      setItems(prev => [...prev, originalItem]);
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      throw error;
    }
  }, [items, getId]);

  return {
    items,
    pendingIds,
    optimisticAdd,
    optimisticUpdate,
    optimisticRemove,
  };
}

// ============================================================================
// QUERY CACHE OPTIMISTIC UPDATES
// ============================================================================

/**
 * Hook for optimistic updates that work directly with React Query cache
 * 
 * @example
 * const { updateCache, addToCache, removeFromCache } = useOptimisticCache(['projects']);
 * 
 * // Update a project optimistically
 * await updateCache(
 *   project.id,
 *   { name: 'New Name' },
 *   () => updateProjectMutation.mutateAsync({ id: project.id, name: 'New Name' })
 * );
 */
export function useOptimisticCache<T extends { id: string }>(queryKey: QueryKey) {
  const queryClient = useQueryClient();

  const updateCache = useCallback(async (
    id: string,
    updates: Partial<T>,
    asyncOperation: () => Promise<void>,
    options?: { successMessage?: string; errorMessage?: string }
  ) => {
    // Snapshot previous value
    const previousData = queryClient.getQueryData<T[]>(queryKey);
    
    // Optimistically update
    queryClient.setQueryData<T[]>(queryKey, (old) => 
      old?.map(item => item.id === id ? { ...item, ...updates } : item)
    );

    try {
      await asyncOperation();
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
    } catch (error) {
      // Rollback
      queryClient.setQueryData(queryKey, previousData);
      if (options?.errorMessage) {
        toast.error(options.errorMessage);
      }
      throw error;
    }
  }, [queryClient, queryKey]);

  const addToCache = useCallback(async (
    item: T,
    asyncOperation: () => Promise<T>,
    options?: { successMessage?: string; errorMessage?: string }
  ) => {
    // Snapshot previous value
    const previousData = queryClient.getQueryData<T[]>(queryKey);
    
    // Optimistically add
    queryClient.setQueryData<T[]>(queryKey, (old) => [...(old || []), item]);

    try {
      const result = await asyncOperation();
      // Update with real item from server
      queryClient.setQueryData<T[]>(queryKey, (old) => 
        old?.map(i => i.id === item.id ? result : i)
      );
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      return result;
    } catch (error) {
      // Rollback
      queryClient.setQueryData(queryKey, previousData);
      if (options?.errorMessage) {
        toast.error(options.errorMessage);
      }
      throw error;
    }
  }, [queryClient, queryKey]);

  const removeFromCache = useCallback(async (
    id: string,
    asyncOperation: () => Promise<void>,
    options?: { successMessage?: string; errorMessage?: string }
  ) => {
    // Snapshot previous value
    const previousData = queryClient.getQueryData<T[]>(queryKey);
    
    // Optimistically remove
    queryClient.setQueryData<T[]>(queryKey, (old) => 
      old?.filter(item => item.id !== id)
    );

    try {
      await asyncOperation();
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
    } catch (error) {
      // Rollback
      queryClient.setQueryData(queryKey, previousData);
      if (options?.errorMessage) {
        toast.error(options.errorMessage);
      }
      throw error;
    }
  }, [queryClient, queryKey]);

  return {
    updateCache,
    addToCache,
    removeFromCache,
  };
}

// ============================================================================
// DEBOUNCED OPTIMISTIC UPDATE
// ============================================================================

/**
 * Hook for debounced optimistic updates
 * Useful for auto-save scenarios where you don't want to save on every keystroke
 * 
 * @example
 * const { value, setValue, isPending } = useDebouncedOptimistic(
 *   initialDescription,
 *   async (newValue) => {
 *     await updateProject({ id, description: newValue });
 *   },
 *   500 // 500ms debounce
 * );
 */
export function useDebouncedOptimistic<T>(
  initialValue: T,
  onSave: (value: T) => Promise<void>,
  delay: number = 500
): {
  value: T;
  setValue: (value: T) => void;
  isPending: boolean;
  flush: () => Promise<void>;
} {
  const [value, setValueState] = useState<T>(initialValue);
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingValueRef = useRef<T | null>(null);

  const flush = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (pendingValueRef.current !== null) {
      setIsPending(true);
      try {
        await onSave(pendingValueRef.current);
      } finally {
        setIsPending(false);
        pendingValueRef.current = null;
      }
    }
  }, [onSave]);

  const setValue = useCallback((newValue: T) => {
    setValueState(newValue);
    pendingValueRef.current = newValue;
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      setIsPending(true);
      try {
        await onSave(newValue);
        pendingValueRef.current = null;
      } catch (error) {
        console.error('Auto-save failed:', error);
        toast.error('Failed to save changes');
      } finally {
        setIsPending(false);
      }
    }, delay);
  }, [onSave, delay]);

  return {
    value,
    setValue,
    isPending,
    flush,
  };
}

export default useOptimisticValue;
