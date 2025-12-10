// useUndoStack.ts - Generic undo/redo stack hook for local state management
// Stores immutable snapshots with configurable max history

import { useState, useCallback, useRef } from "react";

interface UndoStackState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UseUndoStackOptions {
  maxHistory?: number;
}

interface UseUndoStackReturn<T> {
  /** Current state value */
  state: T;
  /** Update state and push previous to undo stack */
  setState: (newState: T | ((prev: T) => T)) => void;
  /** Undo to previous state */
  undo: () => void;
  /** Redo to next state */
  redo: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Reset the stack with a new initial state (clears history) */
  reset: (newState: T) => void;
  /** Get the current state without subscribing (for external sync) */
  getState: () => T;
  /** Number of items in undo stack */
  undoCount: number;
  /** Number of items in redo stack */
  redoCount: number;
}

/**
 * useUndoStack - A generic hook for managing undo/redo state
 * 
 * @param initialState - The initial state value
 * @param options - Configuration options (maxHistory defaults to 20)
 * @returns Object with state, setState, undo, redo, and status flags
 * 
 * @example
 * const { state, setState, undo, redo, canUndo, canRedo } = useUndoStack(initialBlocks, { maxHistory: 20 });
 * 
 * // Update state (automatically pushes to undo stack)
 * setState(newBlocks);
 * 
 * // Undo last change
 * if (canUndo) undo();
 * 
 * // Redo undone change
 * if (canRedo) redo();
 */
export function useUndoStack<T>(
  initialState: T,
  options: UseUndoStackOptions = {}
): UseUndoStackReturn<T> {
  const { maxHistory = 20 } = options;

  const [stack, setStack] = useState<UndoStackState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  // Keep a ref to the current state for getState() without re-renders
  const stateRef = useRef<T>(initialState);
  stateRef.current = stack.present;

  const setState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      setStack((current) => {
        const resolvedNewState =
          typeof newState === "function"
            ? (newState as (prev: T) => T)(current.present)
            : newState;

        // Don't push to history if the state is the same (shallow comparison)
        if (resolvedNewState === current.present) {
          return current;
        }

        // Trim past to maxHistory - 1 (to make room for current)
        const newPast = [...current.past, current.present].slice(-maxHistory);

        return {
          past: newPast,
          present: resolvedNewState,
          future: [], // Clear future on new changes
        };
      });
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    setStack((current) => {
      if (current.past.length === 0) return current;

      const previous = current.past[current.past.length - 1];
      const newPast = current.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [current.present, ...current.future].slice(0, maxHistory),
      };
    });
  }, [maxHistory]);

  const redo = useCallback(() => {
    setStack((current) => {
      if (current.future.length === 0) return current;

      const next = current.future[0];
      const newFuture = current.future.slice(1);

      return {
        past: [...current.past, current.present].slice(-maxHistory),
        present: next,
        future: newFuture,
      };
    });
  }, [maxHistory]);

  const reset = useCallback((newState: T) => {
    setStack({
      past: [],
      present: newState,
      future: [],
    });
  }, []);

  const getState = useCallback(() => stateRef.current, []);

  return {
    state: stack.present,
    setState,
    undo,
    redo,
    canUndo: stack.past.length > 0,
    canRedo: stack.future.length > 0,
    reset,
    getState,
    undoCount: stack.past.length,
    redoCount: stack.future.length,
  };
}

export default useUndoStack;
