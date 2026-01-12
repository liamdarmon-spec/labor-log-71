import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { devMaybeForceError } from '@/lib/dev/forceServerError';

export type ProposalAutosaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

export type ProposalAutosaveAck = {
  proposal_id: string;
  draft_version: number;
  updated_at: string;
};

type Options<TPayload> = {
  companyId: string | null | undefined;
  proposalId: string;
  projectId: string;
  getSnapshot: () => TPayload;
  onServerAck?: (ack: ProposalAutosaveAck) => void;
  debounceMs?: number;
};

function stableHash(input: unknown): string {
  // Fast, stable hash from JSON string (djb2)
  const s = JSON.stringify(input);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

export function useProposalAutosave<TPayload>(opts: Options<TPayload>) {
  const {
    companyId,
    proposalId,
    projectId,
    getSnapshot,
    onServerAck,
    debounceMs = 1000,
  } = opts;

  const [status, setStatus] = useState<ProposalAutosaveStatus>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const expectedVersionRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const queuedHashRef = useRef<string | null>(null);
  const lastSavedHashRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPayloadBytesRef = useRef<number>(0);
  const lastPayloadKeysSampleRef = useRef<string[]>([]);

  const canSave = useMemo(() => !!companyId && !!proposalId && !!projectId, [companyId, proposalId, projectId]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => clearTimer, []);

  const saveNow = useCallback(async () => {
    if (!canSave) {
      setStatus('error');
      setErrorMessage('Cannot save: missing company_id / proposalId / projectId');
      return;
    }
    if (inFlightRef.current) return;

    const payload = getSnapshot();
    const hash = stableHash(payload);
    try {
      lastPayloadBytesRef.current = JSON.stringify(payload).length;
    } catch {
      lastPayloadBytesRef.current = 0;
    }
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      lastPayloadKeysSampleRef.current = Object.keys(payload as any).slice(0, 12);
    } else {
      lastPayloadKeysSampleRef.current = [];
    }

    // No-op if unchanged
    if (lastSavedHashRef.current === hash) {
      setStatus('saved');
      setErrorMessage(null);
      return;
    }

    inFlightRef.current = true;
    setStatus('saving');
    setErrorMessage(null);

    try {
      // DEV: Check for forced error BEFORE making the RPC call
      const forcedError = devMaybeForceError();
      if (forcedError) {
        throw new Error(forcedError.error.message);
      }
      
      const { data, error } = await (supabase as any).rpc('upsert_proposal_draft', {
        p_company_id: companyId,
        p_proposal_id: proposalId,
        p_project_id: projectId,
        p_payload: payload,
        p_expected_version: expectedVersionRef.current,
      });

      if (error) {
        throw error;
      }

      // RPC returns out_proposal_id, out_draft_version, out_updated_at (prefixed to avoid ambiguity)
      const ack = (Array.isArray(data) ? data[0] : data) as any;
      // IMPORTANT: do NOT shadow the outer `proposalId` (would cause TDZ errors earlier in this try block).
      const serverProposalId = ack?.out_proposal_id ?? ack?.proposal_id;
      const draftVersion = ack?.out_draft_version ?? ack?.draft_version;
      const updatedAt = ack?.out_updated_at ?? ack?.updated_at;
      if (!serverProposalId) {
        throw new Error('Invalid server response from upsert_proposal_draft');
      }

      expectedVersionRef.current = Number(draftVersion);
      lastSavedHashRef.current = hash;
      setStatus('saved');
      setErrorMessage(null);
      onServerAck?.({
        proposal_id: serverProposalId,
        draft_version: Number(draftVersion),
        updated_at: updatedAt,
      });
    } catch (e: any) {
      const msg = e?.message || 'Failed to save';
      setStatus('error');
      setErrorMessage(msg);
    } finally {
      inFlightRef.current = false;

      // If changes queued during flight, run exactly one follow-up save
      if (queuedHashRef.current && queuedHashRef.current !== lastSavedHashRef.current) {
        queuedHashRef.current = null;
        // Avoid re-entrant; schedule microtask
        setTimeout(() => {
          void saveNow();
        }, 0);
      } else {
        queuedHashRef.current = null;
      }
    }
  }, [canSave, companyId, proposalId, projectId, getSnapshot, onServerAck]);

  const markDirtyAndSchedule = useCallback(() => {
    if (!canSave) {
      // Fail loud: user is editing but we cannot persist.
      setStatus('error');
      setErrorMessage('Cannot autosave: missing company_id / proposalId / projectId');
      return;
    }

    const payload = getSnapshot();
    const hash = stableHash(payload);

    if (lastSavedHashRef.current === hash) {
      setStatus('saved');
      setErrorMessage(null);
      return;
    }

    // If a save is in flight, queue exactly one follow-up (latest snapshot hash)
    if (inFlightRef.current) {
      queuedHashRef.current = hash;
      setStatus('saving'); // still saving overall
      return;
    }

    setStatus('dirty');
    setErrorMessage(null);
    clearTimer();
    timerRef.current = setTimeout(() => {
      void saveNow();
    }, debounceMs);
  }, [canSave, debounceMs, getSnapshot, saveNow]);

  const retry = useCallback(() => {
    clearTimer();
    void saveNow();
  }, [saveNow]);

  return {
    status,
    errorMessage,
    markDirtyAndSchedule,
    saveNow,
    retry,
    setExpectedVersion: (v: number | null) => {
      expectedVersionRef.current = v;
    },
    setLastSavedFromSnapshot: () => {
      const hash = stableHash(getSnapshot());
      lastSavedHashRef.current = hash;
      setStatus('saved');
      setErrorMessage(null);
    },
    // DEV diagnostics (best-effort)
    getDiagnostics: () => ({
      lastPayloadBytes: lastPayloadBytesRef.current,
      lastPayloadKeysSample: lastPayloadKeysSampleRef.current,
    }),
  };
}


