import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type EstimateAutosaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

export type EstimateAutosaveAck = {
  estimate_id: string;
  draft_version: number;
  updated_at: string;
};

type Options<TPayload> = {
  companyId: string | null | undefined;
  estimateId: string;
  projectId: string;
  getSnapshot: () => TPayload;
  onServerAck?: (ack: EstimateAutosaveAck) => void;
  debounceMs?: number;
};

function stableHash(input: unknown): string {
  const s = JSON.stringify(input);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

export function useEstimateAutosave<TPayload>(opts: Options<TPayload>) {
  const { companyId, estimateId, projectId, getSnapshot, onServerAck, debounceMs = 1000 } = opts;

  const [status, setStatus] = useState<EstimateAutosaveStatus>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const expectedVersionRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const queuedHashRef = useRef<string | null>(null);
  const lastSavedHashRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSave = useMemo(() => !!companyId && !!estimateId && !!projectId, [companyId, estimateId, projectId]);

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
      setErrorMessage('Cannot save: missing company_id / estimateId / projectId');
      return;
    }
    if (inFlightRef.current) return;

    const payload = getSnapshot();
    const hash = stableHash(payload);

    if (lastSavedHashRef.current === hash) {
      setStatus('saved');
      setErrorMessage(null);
      return;
    }

    inFlightRef.current = true;
    setStatus('saving');
    setErrorMessage(null);

    try {
      const { data, error } = await (supabase as any).rpc('upsert_estimate_draft', {
        p_company_id: companyId,
        p_estimate_id: estimateId,
        p_project_id: projectId,
        p_payload: payload,
        p_expected_version: expectedVersionRef.current,
      });

      if (error) throw error;

      // RPC returns out_estimate_id, out_draft_version, out_updated_at (prefixed to avoid ambiguity)
      const ack = (Array.isArray(data) ? data[0] : data) as any;
      const estimateIdVal = ack?.out_estimate_id ?? ack?.estimate_id;
      const draftVersion = ack?.out_draft_version ?? ack?.draft_version;
      const updatedAt = ack?.out_updated_at ?? ack?.updated_at;
      if (!estimateIdVal) throw new Error('Invalid server response from upsert_estimate_draft');

      expectedVersionRef.current = Number(draftVersion);
      lastSavedHashRef.current = hash;
      setStatus('saved');
      setErrorMessage(null);
      onServerAck?.({
        estimate_id: estimateIdVal,
        draft_version: Number(draftVersion),
        updated_at: updatedAt,
      });
    } catch (e: any) {
      setStatus('error');
      setErrorMessage(e?.message || 'Failed to save');
    } finally {
      inFlightRef.current = false;

      if (queuedHashRef.current && queuedHashRef.current !== lastSavedHashRef.current) {
        queuedHashRef.current = null;
        setTimeout(() => void saveNow(), 0);
      } else {
        queuedHashRef.current = null;
      }
    }
  }, [canSave, companyId, estimateId, projectId, getSnapshot, onServerAck]);

  const markDirtyAndSchedule = useCallback(() => {
    if (!canSave) {
      setStatus('error');
      setErrorMessage('Cannot autosave: missing company_id / estimateId / projectId');
      return;
    }

    const payload = getSnapshot();
    const hash = stableHash(payload);

    if (lastSavedHashRef.current === hash) {
      setStatus('saved');
      setErrorMessage(null);
      return;
    }

    if (inFlightRef.current) {
      queuedHashRef.current = hash;
      setStatus('saving');
      return;
    }

    setStatus('dirty');
    setErrorMessage(null);
    clearTimer();
    timerRef.current = setTimeout(() => void saveNow(), debounceMs);
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
      lastSavedHashRef.current = stableHash(getSnapshot());
      setStatus('saved');
      setErrorMessage(null);
    },
  };
}


