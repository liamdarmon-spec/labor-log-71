/**
 * undoableAction - Execute actions with undo capability
 * 
 * North Star Alignment:
 * - "Undo-friendly"
 * - "No double-click confusion"
 * - "No hidden mutations"
 */

import { toast } from "sonner";

interface UndoableActionOptions<T> {
  /** Execute the action (e.g., delete) */
  execute: () => Promise<T>;
  /** Undo the action (e.g., restore) */
  undo: (result: T) => Promise<void>;
  /** Success message */
  successMessage: string;
  /** Message shown when undoing */
  undoingMessage?: string;
  /** Message shown after successful undo */
  undoneMessage?: string;
  /** Error message if action fails */
  errorMessage?: string;
  /** Duration to show undo toast (ms) */
  undoDuration?: number;
}

/**
 * Execute an action with automatic undo capability via toast
 * 
 * Example:
 * ```ts
 * await undoableAction({
 *   execute: () => deleteTimeLog(id),
 *   undo: (deletedLog) => restoreTimeLog(deletedLog),
 *   successMessage: "Time log deleted",
 *   undoneMessage: "Time log restored",
 * });
 * ```
 */
export async function undoableAction<T>({
  execute,
  undo,
  successMessage,
  undoingMessage = "Undoing...",
  undoneMessage = "Action undone",
  errorMessage = "Action failed",
  undoDuration = 5000,
}: UndoableActionOptions<T>): Promise<{ success: boolean; result?: T }> {
  let result: T;
  let hasUndone = false;

  try {
    // Execute the action
    result = await execute();
  } catch (error) {
    toast.error(errorMessage, {
      description: error instanceof Error ? error.message : "Unknown error",
    });
    return { success: false };
  }

  // Show success toast with undo button
  toast.success(successMessage, {
    duration: undoDuration,
    action: {
      label: "Undo",
      onClick: async () => {
        if (hasUndone) return; // Prevent double-undo
        hasUndone = true;

        const undoToast = toast.loading(undoingMessage);
        
        try {
          await undo(result);
          toast.success(undoneMessage, { id: undoToast });
        } catch (error) {
          toast.error("Failed to undo", {
            id: undoToast,
            description: error instanceof Error ? error.message : "Unknown error",
          });
        }
      },
    },
  });

  return { success: true, result };
}

/**
 * Helper for soft-delete patterns where we just update a flag
 */
export async function undoableSoftDelete({
  entityName,
  deleteAction,
  restoreAction,
}: {
  entityName: string;
  deleteAction: () => Promise<void>;
  restoreAction: () => Promise<void>;
}) {
  return undoableAction({
    execute: async () => {
      await deleteAction();
      return true;
    },
    undo: async () => {
      await restoreAction();
    },
    successMessage: `${entityName} deleted`,
    undoneMessage: `${entityName} restored`,
  });
}

/**
 * Batch undoable action for multiple items
 */
export async function undoableBatchAction<T>({
  items,
  execute,
  undo,
  successMessage,
  undoneMessage,
}: {
  items: T[];
  execute: (item: T) => Promise<void>;
  undo: (item: T) => Promise<void>;
  successMessage: (count: number) => string;
  undoneMessage: (count: number) => string;
}) {
  const results: { item: T; success: boolean }[] = [];
  let hasUndone = false;

  // Execute all actions
  for (const item of items) {
    try {
      await execute(item);
      results.push({ item, success: true });
    } catch {
      results.push({ item, success: false });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  
  if (successCount === 0) {
    toast.error("Action failed for all items");
    return { success: false, results };
  }

  // Show success toast with undo
  toast.success(successMessage(successCount), {
    duration: 5000,
    action: {
      label: "Undo All",
      onClick: async () => {
        if (hasUndone) return;
        hasUndone = true;

        const undoToast = toast.loading("Undoing...");
        let undoSuccess = 0;

        for (const { item, success } of results) {
          if (success) {
            try {
              await undo(item);
              undoSuccess++;
            } catch {
              // Continue undoing others
            }
          }
        }

        if (undoSuccess === successCount) {
          toast.success(undoneMessage(undoSuccess), { id: undoToast });
        } else {
          toast.warning(`Partially undone (${undoSuccess}/${successCount})`, {
            id: undoToast,
          });
        }
      },
    },
  });

  return { success: true, results };
}
