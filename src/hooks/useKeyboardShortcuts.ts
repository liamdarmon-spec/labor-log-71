/**
 * useKeyboardShortcuts - Global and local keyboard shortcuts
 * 
 * North Star Alignment:
 * - "Fast keyboard inputs"
 * - "The system must survive... 100 rapid edits"
 */

import { useEffect, useCallback, useRef } from "react";

type ModifierKey = "meta" | "ctrl" | "alt" | "shift";
type ShortcutHandler = (e: KeyboardEvent) => void;

interface Shortcut {
  key: string;
  modifiers?: ModifierKey[];
  handler: ShortcutHandler;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
  /** Only trigger when this element or its children are focused */
  scope?: "global" | "form" | "dialog";
  /** Description for help menu */
  description?: string;
}

interface UseKeyboardShortcutsOptions {
  /** Enable/disable all shortcuts */
  enabled?: boolean;
  /** Shortcuts to register */
  shortcuts: Shortcut[];
}

/**
 * Check if the current focus is inside a text input
 */
function isInTextInput(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  
  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea") return true;
  if (target.isContentEditable) return true;
  
  return false;
}

/**
 * Check if a modifier combination matches
 */
function modifiersMatch(e: KeyboardEvent, modifiers: ModifierKey[] = []): boolean {
  const expected = {
    meta: modifiers.includes("meta"),
    ctrl: modifiers.includes("ctrl"),
    alt: modifiers.includes("alt"),
    shift: modifiers.includes("shift"),
  };

  return (
    e.metaKey === expected.meta &&
    e.ctrlKey === expected.ctrl &&
    e.altKey === expected.alt &&
    e.shiftKey === expected.shift
  );
}

export function useKeyboardShortcuts({
  enabled = true,
  shortcuts,
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      for (const shortcut of shortcutsRef.current) {
        const shortcutKey = shortcut.key.toLowerCase();
        
        // Check key match
        if (key !== shortcutKey) continue;
        
        // Check modifiers
        if (!modifiersMatch(e, shortcut.modifiers)) continue;
        
        // Check scope
        if (shortcut.scope === "form" && !isInTextInput(e.target)) continue;
        
        // Don't trigger shortcuts when typing in inputs (unless scope is "form")
        if (shortcut.scope !== "form" && isInTextInput(e.target)) {
          // Exception: Meta/Ctrl shortcuts should still work in inputs
          if (!e.metaKey && !e.ctrlKey) continue;
        }
        
        // Prevent default if specified
        if (shortcut.preventDefault !== false) {
          e.preventDefault();
        }
        
        shortcut.handler(e);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}

/**
 * Common shortcut for submitting forms with ⌘+Enter
 */
export function useFormSubmitShortcut(
  onSubmit: () => void,
  enabled = true
) {
  useKeyboardShortcuts({
    enabled,
    shortcuts: [
      {
        key: "Enter",
        modifiers: ["meta"],
        handler: onSubmit,
        description: "Submit form",
      },
      {
        key: "Enter",
        modifiers: ["ctrl"],
        handler: onSubmit,
        description: "Submit form",
      },
    ],
  });
}

/**
 * Common shortcut for closing dialogs with Escape
 */
export function useEscapeShortcut(
  onEscape: () => void,
  enabled = true
) {
  useKeyboardShortcuts({
    enabled,
    shortcuts: [
      {
        key: "Escape",
        handler: onEscape,
        description: "Close/Cancel",
      },
    ],
  });
}

/**
 * Hook for creating new items with ⌘+N
 */
export function useNewItemShortcut(
  onCreate: () => void,
  enabled = true
) {
  useKeyboardShortcuts({
    enabled,
    shortcuts: [
      {
        key: "n",
        modifiers: ["meta"],
        handler: onCreate,
        description: "Create new item",
      },
      {
        key: "n",
        modifiers: ["ctrl"],
        handler: onCreate,
        description: "Create new item",
      },
    ],
  });
}

/**
 * Hook for save shortcut ⌘+S
 */
export function useSaveShortcut(
  onSave: () => void,
  enabled = true
) {
  useKeyboardShortcuts({
    enabled,
    shortcuts: [
      {
        key: "s",
        modifiers: ["meta"],
        handler: onSave,
        description: "Save",
      },
      {
        key: "s",
        modifiers: ["ctrl"],
        handler: onSave,
        description: "Save",
      },
    ],
  });
}

/**
 * Hook for undo shortcut ⌘+Z
 */
export function useUndoShortcut(
  onUndo: () => void,
  enabled = true
) {
  useKeyboardShortcuts({
    enabled,
    shortcuts: [
      {
        key: "z",
        modifiers: ["meta"],
        handler: onUndo,
        description: "Undo",
      },
      {
        key: "z",
        modifiers: ["ctrl"],
        handler: onUndo,
        description: "Undo",
      },
    ],
  });
}

/**
 * Format a shortcut for display
 */
export function formatShortcut(
  key: string,
  modifiers: ModifierKey[] = []
): string {
  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
  
  const modSymbols: Record<ModifierKey, string> = {
    meta: isMac ? "⌘" : "Ctrl",
    ctrl: isMac ? "⌃" : "Ctrl",
    alt: isMac ? "⌥" : "Alt",
    shift: "⇧",
  };
  
  const parts = modifiers.map((m) => modSymbols[m]);
  parts.push(key.toUpperCase());
  
  return parts.join(isMac ? "" : "+");
}
