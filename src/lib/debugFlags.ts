export type DebugFlags = {
  forceError?: boolean;
  forceConflict?: boolean;
  forceLatencyMs?: number;
};

const STORAGE_KEY = 'APP_DEBUG_FLAGS';

export function getDebugFlags(): DebugFlags | undefined {
  if (!import.meta.env.DEV) return undefined;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return undefined;
    return parsed as DebugFlags;
  } catch {
    return undefined;
  }
}

export function setDebugFlags(next: DebugFlags | undefined) {
  if (!import.meta.env.DEV) return;
  try {
    if (!next) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // noop
  }
}

export function updateDebugFlags(patch: Partial<DebugFlags>) {
  const cur = getDebugFlags() || {};
  const next: DebugFlags = { ...cur, ...patch };
  const cleaned: DebugFlags = {};
  if (typeof next.forceError === 'boolean') cleaned.forceError = next.forceError;
  if (typeof next.forceConflict === 'boolean') cleaned.forceConflict = next.forceConflict;
  if (typeof next.forceLatencyMs === 'number') cleaned.forceLatencyMs = next.forceLatencyMs;
  if (Object.keys(cleaned).length === 0) setDebugFlags(undefined);
  else setDebugFlags(cleaned);
}


