// src/lib/dev/forceServerError.ts
// DEV-ONLY helper to deterministically force Supabase RPC failures.
//
// Goal: make save-failure reproduction deterministic so we can prove:
// - no silent data loss
// - persistent error surface
//
// This MUST be impossible in production builds.

export const DEV_FORCE_SAVE_ERROR_KEY = 'DEV_FORCE_SAVE_ERROR';

export function devIsForceServerErrorEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return localStorage.getItem(DEV_FORCE_SAVE_ERROR_KEY) === '1';
  } catch {
    return false;
  }
}

export function devSetForceServerErrorEnabled(enabled: boolean): void {
  if (!import.meta.env.DEV) return;
  try {
    if (enabled) localStorage.setItem(DEV_FORCE_SAVE_ERROR_KEY, '1');
    else localStorage.removeItem(DEV_FORCE_SAVE_ERROR_KEY);
  } catch {
    // noop
  }
}

/**
 * Returns a synthetic Supabase error response if force-error is enabled.
 * Use this INSTEAD of calling the actual RPC.
 *
 * @returns null if force-error is disabled (proceed with real call),
 *          or { data: null, error: {...} } if force-error is enabled.
 */
export function devMaybeForceError(): { data: null; error: { message: string; code: string; details: string } } | null {
  if (!devIsForceServerErrorEnabled()) return null;

  // Return a synthetic error that looks like a real Supabase/PostgREST error
  return {
    data: null,
    error: {
      message: '[DEV] Forced server error for testing',
      code: 'DEV_FORCE_ERROR',
      details: 'This error was injected by the "Force server error" checkbox. Uncheck it to resume normal saves.',
    },
  };
}

/**
 * @deprecated Use devMaybeForceError() instead.
 * This approach doesn't work because PostgreSQL ignores unknown keys in RPC args.
 */
export function devMaybeInjectBadPayload<TPayload>(payload: TPayload): TPayload {
  // Kept for backwards compat but now a no-op
  return payload;
}


