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
 * DEV-only injection to guarantee a server/RPC failure on demand.
 *
 * We intentionally do NOT mutate row payloads (arrays) to avoid client-side crashes.
 * Instead, we add an extra RPC argument key, causing PostgREST to fail schema cache lookup:
 *   "Could not find function ... with the given arguments"
 *
 * This is deterministic and does not depend on DB constraints or casting behavior.
 */
export function devMaybeInjectBadPayload<TPayload>(payload: TPayload): TPayload {
  if (!devIsForceServerErrorEnabled()) return payload;

  // Only safe for object payloads (e.g. RPC args object).
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return { ...(payload as any), p___force_fail___: true } as TPayload;
  }

  return payload;
}


