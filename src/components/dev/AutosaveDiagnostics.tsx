// src/components/dev/AutosaveDiagnostics.tsx
// DEV-ONLY: Autosave diagnostic overlay for debugging save issues
// Renders only in import.meta.env.DEV mode

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Copy, XCircle, RotateCw, AlertTriangle } from 'lucide-react';
import { devIsForceServerErrorEnabled, devSetForceServerErrorEnabled } from '@/lib/dev/forceServerError';

export interface AutosaveDiagnosticsData {
  // Autosave state
  status: 'saved' | 'saving' | 'dirty' | 'error' | 'idle';
  errorMessage: string | null;
  
  // Stats
  pendingUpdatesCount: number;
  isFlushing: boolean;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastPayloadBytes: number;
  lastResponseCount: number;
  lastDirtyReason: string | null;
  
  // Proposal/Estimate context
  documentType: 'proposal' | 'estimate';
  documentId: string | null;
  projectId: string | null;
  companyId: string | null;
  
  // Contract info (for proposals)
  contractType?: string | null;
  billingBasis?: string | null;
  hasBaseline?: boolean;
  
  // Actions
  onRetry?: () => void;
  onFlush?: () => void;
}

interface AutosaveDiagnosticsProps {
  data: AutosaveDiagnosticsData;
}

export function AutosaveDiagnostics({ data }: AutosaveDiagnosticsProps) {
  // Only render in DEV mode
  if (!import.meta.env.DEV) {
    return null;
  }

  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [forceError, setForceError] = useState(() => devIsForceServerErrorEnabled());

  useEffect(() => {
    // Keep UI in sync if toggled in another tab.
    const onStorage = () => setForceError(devIsForceServerErrorEnabled());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const getStatusColor = () => {
    switch (data.status) {
      case 'saved':
        return 'bg-green-500';
      case 'saving':
        return 'bg-blue-500 animate-pulse';
      case 'dirty':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy diagnostics', e);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm">
      {/* Collapsed indicator */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-white text-xs font-mono ${getStatusColor()}`}
      >
        <span className="uppercase font-bold">{data.status}</span>
        {forceError && (
          <span className="bg-black/30 px-1.5 py-0.5 rounded border border-white/30">
            FORCE_ERR
          </span>
        )}
        {data.pendingUpdatesCount > 0 && (
          <span className="bg-white/20 px-1.5 py-0.5 rounded">
            {data.pendingUpdatesCount} pending
          </span>
        )}
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="mt-2 bg-gray-900 text-gray-100 rounded-lg shadow-xl text-xs font-mono p-3 space-y-3 max-h-96 overflow-auto">
          <div className="flex items-center justify-between border-b border-gray-700 pb-2">
            <span className="font-bold text-yellow-400">
              🛠 {data.documentType.toUpperCase()} AUTOSAVE
            </span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[10px] text-gray-200">
                <input
                  type="checkbox"
                  checked={forceError}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setForceError(next);
                    devSetForceServerErrorEnabled(next);
                  }}
                />
                Force server error
              </label>
              <button
                onClick={copyDiagnostics}
                className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Error display */}
          {data.status === 'error' && data.errorMessage && (
            <div className="bg-red-900/50 border border-red-700 rounded p-2 space-y-2">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-red-400">SAVE FAILED</div>
                  <div className="text-red-200 mt-1 break-words">{data.errorMessage}</div>
                </div>
              </div>
              {data.onRetry && (
                <button
                  onClick={data.onRetry}
                  className="w-full mt-2 px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded flex items-center justify-center gap-1"
                >
                  <RotateCw className="w-3 h-3" />
                  Retry Save
                </button>
              )}
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatRow label="Status" value={data.status} />
            <StatRow label="Document" value={data.documentType} />
            <StatRow label="ID" value={data.documentId || '—'} truncate />
            <StatRow label="Project" value={data.projectId || '—'} truncate />
            <StatRow label="Company" value={data.companyId || '—'} truncate />
            <StatRow label="Pending" value={String(data.pendingUpdatesCount)} />
            <StatRow label="Flushing" value={data.isFlushing ? 'Yes' : 'No'} />
            <StatRow label="Payload" value={`${data.lastPayloadBytes} bytes`} />
            <StatRow label="Response" value={`${data.lastResponseCount} rows`} />
            <StatRow label="Last Save" value={data.lastSuccessAt || 'Never'} />
            <StatRow label="Last Error" value={data.lastErrorAt || 'Never'} />
            <StatRow label="Dirty Reason" value={data.lastDirtyReason || '—'} />
          </div>

          {/* Contract info (proposals only) */}
          {data.documentType === 'proposal' && (
            <>
              <div className="border-t border-gray-700 pt-2 mt-2">
                <div className="font-bold text-yellow-400 mb-1">CONTRACT / BILLING</div>
                <div className="grid grid-cols-2 gap-2">
                  <StatRow label="Contract Type" value={data.contractType || 'Not set'} />
                  <StatRow label="Billing Basis" value={data.billingBasis || 'Not set'} />
                  <StatRow label="Has Baseline" value={data.hasBaseline ? 'Yes' : 'No'} />
                </div>
                {!data.hasBaseline && (data.contractType || data.billingBasis) && (
                  <div className="mt-2 flex items-start gap-1 text-amber-400">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>Baseline not created — billing basis should still be shown/derived</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="border-t border-gray-700 pt-2 flex gap-2">
            {data.onFlush && (
              <button
                onClick={data.onFlush}
                className="flex-1 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded flex items-center justify-center gap-1"
              >
                Flush Now
              </button>
            )}
            {data.onRetry && data.status === 'error' && (
              <button
                onClick={data.onRetry}
                className="flex-1 px-3 py-1.5 bg-amber-700 hover:bg-amber-600 rounded flex items-center justify-center gap-1"
              >
                <RotateCw className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, truncate = false }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-400">{label}:</span>
      <span className={`text-white ${truncate ? 'truncate max-w-[120px]' : ''}`} title={truncate ? value : undefined}>
        {value}
      </span>
    </div>
  );
}

// Export a helper to collect diagnostics from hooks
export function collectAutosaveDiagnostics(opts: {
  documentType: 'proposal' | 'estimate';
  documentId: string | null;
  projectId: string | null;
  companyId: string | null;
  status: 'saved' | 'saving' | 'dirty' | 'error' | 'idle';
  errorMessage: string | null;
  contractType?: string | null;
  billingBasis?: string | null;
  hasBaseline?: boolean;
  onRetry?: () => void;
  onFlush?: () => void;
}): AutosaveDiagnosticsData {
  return {
    ...opts,
    pendingUpdatesCount: 0,
    isFlushing: opts.status === 'saving',
    lastSuccessAt: opts.status === 'saved' ? new Date().toISOString() : null,
    lastErrorAt: opts.status === 'error' ? new Date().toISOString() : null,
    lastPayloadBytes: 0,
    lastResponseCount: 0,
    lastDirtyReason: null,
  };
}

