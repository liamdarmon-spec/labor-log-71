import { useMemo, useRef, useState } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Copy,
  FileText,
  FolderOpen,
  History,
  Loader2,
  MessageCircle,
  RefreshCw,
  Target,
} from 'lucide-react';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

import { cn } from '@/lib/utils';
import { assertNonEmptySelectValue } from '@/lib/ui/safeSelect';
import {
  OUTCOME_METHODS,
  getOutcomeTypeDisplay,
  getStateDisplay,
  isBackendNotEnabledError,
  toOutcomeErrorDetails,
  useAvailableOutcomeTypes,
  useCoreLawHealthcheck,
  useOutcomeActions,
  useOutcomes,
  useSubjectState,
} from '@/hooks/useOutcomes';

// =============================================================================
// Core Law Outcome Panel
// =============================================================================
// Tasks = intent. Outcomes = immutable facts. States = derived gates (read-only).
// This panel makes outcomes the primary interaction surface for “work actually happening”.
// =============================================================================

interface OutcomePanelProps {
  subjectType: string | null;
  subjectId: string | null;
  subjectLabel?: string;
  enabled?: boolean;
}

type CommMethod = 'phone' | 'sms' | 'email';

export function OutcomePanel({ subjectType, subjectId, subjectLabel, enabled = true }: OutcomePanelProps) {
  // Render safety: never crash the drawer (Radix can throw hard on invalid select items).
  try {
    // no-op
  } catch {
    return null;
  }

  const [isExpanded, setIsExpanded] = useState(true);
  const [scheduleDraft, setScheduleDraft] = useState<{
    outcomeType: string;
    scheduledFor: string; // datetime-local
    party: string;
  } | null>(null);
  const [commDraft, setCommDraft] = useState<{
    outcomeType: string;
    method: CommMethod;
    note: string;
  } | null>(null);

  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<ReturnType<typeof toOutcomeErrorDetails> | null>(null);
  const [lastPayload, setLastPayload] = useState<any>(null);
  const hasEverOnlineRef = useRef(false);
  const inFlightKeyRef = useRef<string | null>(null);

  const { data: outcomes = [], isLoading: outcomesLoading, error: outcomesError } = useOutcomes(
    enabled ? subjectType : null,
    enabled ? subjectId : null
  );
  const { data: subjectState } = useSubjectState(enabled ? subjectType : null, enabled ? subjectId : null);
  const { data: health, refetch: refetchHealth } = useCoreLawHealthcheck(enabled);
  const {
    data: outcomeTypeRows = [],
    isLoading: outcomeTypesLoading,
    error: outcomeTypesError,
    refetch: refetchOutcomeTypes,
  } = useAvailableOutcomeTypes(enabled ? subjectType : null);

  const actions = useOutcomeActions();
  const isBusy = actions.isPending;

  if (!subjectType || !subjectId) return null;

  const backendNotEnabled =
    !enabled ||
    (health && health.ok === false) ||
    (!!outcomeTypesError && isBackendNotEnabledError(outcomeTypesError));

  if (!backendNotEnabled && !outcomeTypesError) {
    hasEverOnlineRef.current = true;
  }
  const hasRuntimeError = !!outcomeTypesError && hasEverOnlineRef.current;

  const stateDisplay = subjectState ? getStateDisplay(subjectState.state) : null;

  const availableOutcomeTypes = useMemo(() => {
    return (outcomeTypeRows || []).slice().sort((a: any, b: any) => {
      const as = (a?.sort_order ?? 0) as number;
      const bs = (b?.sort_order ?? 0) as number;
      if (as !== bs) return as - bs;
      return String(a?.outcome_type || '').localeCompare(String(b?.outcome_type || ''));
    });
  }, [outcomeTypeRows]);

  const recordedTypes = useMemo(() => new Set(outcomes.map((o) => o.outcome_type)), [outcomes]);

  const recordOnce = async (key: string, fn: () => Promise<void>) => {
    if (inFlightKeyRef.current === key) return;
    inFlightKeyRef.current = key;
    setLastError(null);
    try {
      await fn();
      setLastSavedAt(new Date().toISOString());
    } catch (e) {
      setLastError(toOutcomeErrorDetails(e));
    } finally {
      inFlightKeyRef.current = null;
    }
  };

  const scheduleToggles = [
    { key: 'crew_scheduled', label: 'Crew Scheduled' },
    { key: 'vendor_scheduled', label: 'Vendor Scheduled' },
    { key: 'subcontractor_scheduled', label: 'Subcontractor Scheduled' },
  ];

  const communicationActions = [
    { key: 'client_notified', label: 'Client Notified' },
    { key: 'followed_up', label: 'Followed Up' },
    { key: 'vendor_contacted', label: 'Vendor Contacted' },
  ];

  const executionActions = [
    { key: 'crew_arrived', label: 'Crew Arrived' },
    { key: 'work_started', label: 'Work Started' },
    { key: 'work_completed', label: 'Work Completed' },
  ];

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full py-3 px-1 text-left hover:bg-muted/50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Reality Status</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 pt-2">
          {/* Outcomes system readiness (calm) */}
          <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outcomes system</div>
              <Badge
                variant={backendNotEnabled ? 'outline' : hasRuntimeError ? 'destructive' : 'secondary'}
                className="text-[10px]"
              >
                {hasRuntimeError ? 'Error' : backendNotEnabled ? 'Not enabled' : 'Online'}
              </Badge>
            </div>
            {backendNotEnabled ? (
              <div className="text-xs text-muted-foreground">
                Outcomes aren’t available in this environment yet. Tasks still work normally.
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Record outcomes to reflect reality. States update automatically.
              </div>
            )}
            {backendNotEnabled && (
              <details className="text-[11px] text-muted-foreground">
                <summary className="cursor-pointer">Troubleshooting</summary>
                <div className="mt-1">
                  If you just ran migrations, refresh. If schema cache is stale, run{' '}
                  <span className="font-mono">select pg_notify('pgrst','reload schema');</span>
                </div>
              </details>
            )}
            <div className="pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  refetchHealth();
                  refetchOutcomeTypes();
                }}
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Applies to (read-only) */}
          <div className="rounded-lg border bg-background p-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Applies to</div>
            <div className="flex items-center gap-2 text-sm">
              {subjectType === 'project' ? (
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
              ) : (
                <FileText className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="font-medium">{subjectType === 'project' ? 'Project' : subjectType}</span>
              <span className="text-muted-foreground">{subjectLabel || subjectId.slice(0, 8)}</span>
              {subjectType === 'project' && (
                <a
                  href={`/app/projects/${subjectId}`}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  View
                </a>
              )}
            </div>
          </div>

          {/* Saving indicator */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-muted-foreground">
              {isBusy ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving…
                </span>
              ) : lastSavedAt ? (
                <span>Last saved {formatDistanceToNow(parseISO(lastSavedAt), { addSuffix: true })}</span>
              ) : (
                <span />
              )}
            </div>
          </div>

          {/* Fail-loud error */}
          {lastError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertTriangle className="w-4 h-4" />
                Outcome failed to record
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>
                  <span className="font-medium">Message:</span> {lastError.message}
                </div>
                {lastError.code && (
                  <div>
                    <span className="font-medium">Code:</span> {lastError.code}
                  </div>
                )}
                {lastError.details && (
                  <div>
                    <span className="font-medium">Details:</span> {lastError.details}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={async () => {
                    const text = JSON.stringify({ error: lastError, payload: lastPayload }, null, 2);
                    try {
                      await navigator.clipboard.writeText(text);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy error
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={async () => {
                    if (!lastPayload) return;
                    await recordOnce(`retry:${subjectType}:${subjectId}`, async () => {
                      await actions.recordGeneric(lastPayload);
                    });
                  }}
                  disabled={!lastPayload || isBusy}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Reality state line (derived only) */}
          <div className="flex items-center justify-between rounded-lg border bg-background p-3">
            <span className="text-sm">Reality state:</span>
            {backendNotEnabled ? (
              <Badge variant="outline" className="text-[11px]">
                Unavailable
              </Badge>
            ) : stateDisplay ? (
              <Badge variant={stateDisplay.variant} className={cn('text-[11px]', stateDisplay.color)}>
                {stateDisplay.label}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[11px]">
                Not started
              </Badge>
            )}
          </div>

          <Separator />

          {/* Outcome actions (primary interaction) */}
          <div className="space-y-4">
            {/* Scheduling (toggles) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-muted-foreground" />
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scheduling</div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {scheduleToggles.map((t) => {
                  const on = recordedTypes.has(t.key);
                  return (
                    <Button
                      key={t.key}
                      type="button"
                      variant={on ? 'secondary' : 'outline'}
                      className="h-10 justify-between"
                      disabled={backendNotEnabled || hasRuntimeError || on || isBusy}
                      onClick={() => setScheduleDraft({ outcomeType: t.key, scheduledFor: '', party: '' })}
                      title={on ? 'Recorded (outcomes are immutable)' : undefined}
                    >
                      <span className="text-sm">{t.label}</span>
                      <span className="text-[11px] text-muted-foreground">{on ? 'On' : 'Off'}</span>
                    </Button>
                  );
                })}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Scheduling outcomes are binary. Recording is append-only (no undo).
              </div>
            </div>

            {/* Communication (actions) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Communication</div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {communicationActions.map((t) => (
                  <Button
                    key={t.key}
                    type="button"
                    variant="outline"
                    className="h-10 justify-start"
                    disabled={backendNotEnabled || hasRuntimeError || isBusy}
                    onClick={() => setCommDraft({ outcomeType: t.key, method: 'phone', note: '' })}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Execution (actions) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Execution</div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {executionActions.map((t) => {
                  const already = recordedTypes.has(t.key);
                  return (
                    <AlertDialog key={t.key}>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant={already ? 'secondary' : 'outline'}
                          className="h-10 justify-start"
                          disabled={backendNotEnabled || hasRuntimeError || isBusy || already}
                          title={already ? 'Recorded (no undo)' : undefined}
                        >
                          {t.label}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm: {t.label}</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              const key = `${subjectType}:${subjectId}:${t.key}`;
                              await recordOnce(key, async () => {
                                setLastPayload({ subjectType, subjectId, outcomeType: t.key });
                                await actions.recordExecutionOutcome({ subjectType, subjectId, outcomeType: t.key });
                              });
                            }}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Confirm
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  );
                })}
              </div>
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <History className="w-3.5 h-3.5" />
              Timeline
            </Label>

            {outcomesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading…
              </div>
            ) : outcomesError ? (
              <div className="py-6 text-center">
                <AlertTriangle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Outcomes unavailable</p>
              </div>
            ) : outcomes.length === 0 ? (
              <div className="py-6 text-center">
                <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No outcomes recorded yet</p>
              </div>
            ) : (
              <div className="space-y-0">
                {outcomes.map((outcome, index) => {
                  const typeInfo = getOutcomeTypeDisplay(outcome.outcome_type);
                  const isLast = index === outcomes.length - 1;
                  const methodLabel = outcome.method
                    ? OUTCOME_METHODS.find((m) => m.value === outcome.method)?.label
                    : null;

                  return (
                    <div key={outcome.id} className="relative flex gap-3">
                      {!isLast && <div className="absolute left-[9px] top-5 w-px h-[calc(100%-4px)] bg-border" />}
                      <div className="relative z-10 mt-1.5 w-[18px] h-[18px] rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </div>
                      <div className="flex-1 pb-4 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{typeInfo.label}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span>{formatDistanceToNow(parseISO(outcome.occurred_at), { addSuffix: true })}</span>
                              {methodLabel && <span>{methodLabel}</span>}
                              {outcome.recorded_by && <span>by {String(outcome.recorded_by).slice(0, 6)}</span>}
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {format(parseISO(outcome.occurred_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        {(outcome.metadata as any)?.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{String((outcome.metadata as any).notes)}"</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Scheduling inline modal */}
      <Dialog open={!!scheduleDraft} onOpenChange={(o) => !o && setScheduleDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{scheduleDraft ? getOutcomeTypeDisplay(scheduleDraft.outcomeType).label : 'Schedule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Scheduled date/time (required)</Label>
              <Input
                type="datetime-local"
                value={scheduleDraft?.scheduledFor ?? ''}
                onChange={(e) => setScheduleDraft((p) => (p ? { ...p, scheduledFor: e.target.value } : p))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Responsible party (optional)</Label>
              <Input
                value={scheduleDraft?.party ?? ''}
                onChange={(e) => setScheduleDraft((p) => (p ? { ...p, party: e.target.value } : p))}
                placeholder="Name / vendor / crew"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDraft(null)} disabled={isBusy}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!scheduleDraft) return;
                if (!scheduleDraft.scheduledFor) return;
                const key = `${subjectType}:${subjectId}:${scheduleDraft.outcomeType}`;
                await recordOnce(key, async () => {
                  const scheduledIso = new Date(scheduleDraft.scheduledFor).toISOString();
                  const payload = {
                    subjectType,
                    subjectId,
                    outcomeType: scheduleDraft.outcomeType,
                    scheduledFor: scheduledIso,
                    party: scheduleDraft.party || undefined,
                  };
                  setLastPayload(payload);
                  await actions.recordSchedulingOutcome(payload);
                  setScheduleDraft(null);
                });
              }}
              disabled={isBusy || !scheduleDraft?.scheduledFor || backendNotEnabled || hasRuntimeError}
            >
              {isBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Communication modal */}
      <Dialog open={!!commDraft} onOpenChange={(o) => !o && setCommDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{commDraft ? getOutcomeTypeDisplay(commDraft.outcomeType).label : 'Communication'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Method (required)</Label>
              <Select
                value={commDraft?.method ?? 'phone'}
                onValueChange={(v) => setCommDraft((p) => (p ? { ...p, method: v as CommMethod } : p))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {['phone', 'sms', 'email'].map((v) => {
                    assertNonEmptySelectValue(v, 'Communication method');
                    const label = OUTCOME_METHODS.find((m) => m.value === v)?.label || v;
                    return (
                      <SelectItem key={v} value={v}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Note (optional)</Label>
              <Textarea
                value={commDraft?.note ?? ''}
                onChange={(e) => setCommDraft((p) => (p ? { ...p, note: e.target.value } : p))}
                placeholder="Optional note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommDraft(null)} disabled={isBusy}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!commDraft) return;
                const key = `${subjectType}:${subjectId}:${commDraft.outcomeType}:${commDraft.method}`;
                await recordOnce(key, async () => {
                  const payload = {
                    subjectType,
                    subjectId,
                    outcomeType: commDraft.outcomeType,
                    method: commDraft.method,
                    note: commDraft.note || undefined,
                  };
                  setLastPayload(payload);
                  await actions.recordCommunicationOutcome(payload);
                  setCommDraft(null);
                });
              }}
              disabled={isBusy || backendNotEnabled || hasRuntimeError}
            >
              {isBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


