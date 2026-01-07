/**
 * DEV ONLY autosave debug overlay.
 *
 * Enable:
 *   localStorage.setItem("autosaveDebug","1"); location.reload();
 * Or:
 *   Add ?autosaveDebug=1 to the URL
 */

import { useEffect, useMemo, useState } from "react";
import type { AutosaveDebugSnapshot } from "@/hooks/useItemAutosave";

type AutosaveLike = {
  __debug?: {
    getSnapshot?: () => AutosaveDebugSnapshot;
  };
};

export function AutosaveDebugPanel({ autosave }: { autosave: AutosaveLike }) {
  const enabled = useMemo(() => {
    if (!import.meta.env.DEV) return false;
    try {
      const qs = new URLSearchParams(window.location.search);
      const fromQuery = qs.get("autosaveDebug") === "1";
      const fromStorage = window.localStorage?.getItem("autosaveDebug") === "1";
      return fromQuery || fromStorage;
    } catch {
      return false;
    }
  }, []);

  const [snapshot, setSnapshot] = useState<AutosaveDebugSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const getSnapshot = autosave?.__debug?.getSnapshot;
    if (!getSnapshot) {
      setErr("autosave.__debug.getSnapshot is missing");
      return;
    }

    let mounted = true;
    const tick = () => {
      try {
        const next = getSnapshot();
        if (mounted) {
          setSnapshot(next);
          setErr(null);
        }
      } catch (e) {
        if (mounted) setErr(e instanceof Error ? e.message : String(e));
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [enabled, autosave]);

  if (!enabled) return null;

  const disable = () => {
    try {
      window.localStorage?.removeItem("autosaveDebug");
    } catch {
      // noop
    }
    window.location.reload();
  };

  const format = (v: unknown) => {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        width: 560,
        maxWidth: "calc(100vw - 24px)",
        maxHeight: "calc(100vh - 24px)",
        overflow: "auto",
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 12,
        lineHeight: 1.25,
        background: "rgba(10, 10, 10, 0.92)",
        color: "#e5e7eb",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        padding: 12,
        zIndex: 99999,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Autosave Debug</div>
        <button
          onClick={disable}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#e5e7eb",
            padding: "6px 10px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          disable
        </button>
      </div>

      {err ? (
        <div style={{ marginTop: 10, color: "#fca5a5" }}>{err}</div>
      ) : snapshot ? (
        <div style={{ marginTop: 10 }}>
          <details open>
            <summary style={{ cursor: "pointer" }}>summary</summary>
            <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
              {format({
                ts: snapshot.ts,
                estimateId: snapshot.estimateId,
                isFlushing: snapshot.isFlushing,
                pendingCount: snapshot.pendingCount,
                debouncedCount: snapshot.debouncedCount,
                savedTimersCount: snapshot.savedTimersCount,
                batchFlushScheduled: snapshot.batchFlushScheduled,
              })}
            </pre>
          </details>

          <details>
            <summary style={{ cursor: "pointer" }}>row states ({snapshot.rowStates.length})</summary>
            <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{format(snapshot.rowStates)}</pre>
          </details>

          <details>
            <summary style={{ cursor: "pointer" }}>
              pending updates ({snapshot.pendingUpdates.length})
            </summary>
            <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{format(snapshot.pendingUpdates)}</pre>
          </details>

          <details>
            <summary style={{ cursor: "pointer" }}>
              lastKnown updated_at ({snapshot.lastKnownUpdatedAt.length})
            </summary>
            <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{format(snapshot.lastKnownUpdatedAt)}</pre>
          </details>
        </div>
      ) : (
        <div style={{ marginTop: 10, color: "#fde68a" }}>waiting for snapshot…</div>
      )}
    </div>
  );
}


