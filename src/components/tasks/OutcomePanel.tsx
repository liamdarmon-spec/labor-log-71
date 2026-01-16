import { useMemo, useRef, useState } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Copy,
  History,
  Loader2,
  MessageCircle,
  Notebook,
  RefreshCw,
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
// Job Log Panel (Core Law: Tasks = intent, Outcomes = facts, States = derived)
// =============================================================================
// This panel is the primary surface for logging what actually happened.
// It uses calm, contractor-friendly language and progressive disclosure.
// =============================================================================

interface OutcomePanelProps {
  subjectType: string | null;
  subjectId: string | null;
  subjectLabel?: string;
  enabled?: boolean;
}

type CommMethod = 'phone' | 'sms' | 'email';

// STATE BADGE RULES:
// - Never show "unscheduled" - if nothing happened, show nothing
// - Only show positive states (Scheduled, In Progress, Completed)
const HIDDEN_STATES = new Set(['unscheduled', 'draft', 'not_started']);

export function OutcomePanel({ subjectType, subjectId, subjectLabel, enabled = true }: OutcomePanelProps) {
  const { data: outcomes = [], isLoading: outcomesLoading } = useOutcomes(
    enabled ? subjectType : null,
    enabled ? subjectId : null
  );
  const { data: subjectState } = useSubjectState(enabled ? subjectType : null, enabled ? subjectId : null);
  const { data: health, refetch: refetchHealth } = useCoreLawHealthcheck(enabled);
  const {
    error: outcomeTypesError,
    refetch: refetchOutcomeTypes,
  } = useAvailableOutcomeTypes(enabled ? subjectType : null);

  const actions = useOutcomeActions();
  const isBusy = actions.isPending;

  // Derived booleans
  const hasAnyOutcomes = outcomes.length > 0;
  const recordedTypes = useMemo(() => new Set(outcomes.map((o) => o.outcome_type)), [outcomes]);

  const hasSchedulingOutcome = useMemo(() => {
    return (
      recordedTypes.has('crew_scheduled') ||
      recordedTypes.has('vendor_scheduled') ||
      recordedTypes.has('subcontractor_scheduled')
    );
  }, [recordedTypes]);

  const hasCommunicationOutcome = useMemo(() => {
    return recordedTypes.has('client_notified') || recordedTypes.has('followed_up') || recordedTypes.has('vendor_contacted');
  }, [recordedTypes]);

  // Expand by default only if outcomes exist; collapse if empty
  const [isExpanded, setIsExpanded] = useState(hasAnyOutcomes);
  const [scheduleDraft, setScheduleDraft] = useState<{
    outcomeType: string;
    scheduledFor: string;
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

  if (!subjectType || !subjectId) return null;

  const backendNotEnabled =
    !enabled ||
    (health && health.ok === false) ||
    (!!outcomeTypesError && isBackendNotEnabledError(outcomeTypesError));

  if (!backendNotEnabled && !outcomeTypesError) {
    hasEverOnlineRef.current = true;
  }
  const hasRuntimeError = !!outcomeTypesError && hasEverOnlineRef.current;

  // State display - hide confusing states like "unscheduled"
  const stateDisplay = subjectState && !HIDDEN_STATES.has(subjectState.state)
    ? getStateDisplay(subjectState.state)
    : null;

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

  // Outcome definitions - only show unrecorded ones (hide completed)
  const scheduleOptions = [
    { key: 'crew_scheduled', label: 'Crew scheduled' },
    { key: 'vendor_scheduled', label: 'Vendor scheduled' },
    { key: 'subcontractor_scheduled', label: 'Sub scheduled' },
  ].filter((t) => !recordedTypes.has(t.key));

  const communicationOptions = [
    { key: 'client_notified', label: 'Client notified' },
    { key: 'followed_up', label: 'Followed up' },
    { key: 'vendor_contacted', label: 'Vendor contacted' },
  ];

  const executionOptions = [
    { key: 'crew_arrived', label: 'Crew arrived' },
    { key: 'work_started', label: 'Work started' },
    { key: 'work_completed', label: 'Work completed' },
  ].filter((t) => !recordedTypes.has(t.key));

  // Summary line for collapsed state
  const summaryText = hasAnyOutcomes
    ? `${outcomes.length} update${outcomes.length === 1 ? '' : 's'}`
    : 'Nothing logged yet';

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full py-3 px-1 text-left hover:bg-muted/50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Notebook className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Job log</span>
              {!isExpanded && (
                <span className="text-xs text-muted-foreground">— {summaryText}</span>
              )}
              {stateDisplay && (
                <Badge
                  variant={stateDisplay.variant}
                  className={cn('text-[10px] ml-1', stateDisplay.color)}
                >
                  {stateDisplay.label}
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 pt-2">
          {/* Backend not enabled: calm message, no scary badges */}
          {backendNotEnabled ? (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
              <div className="text-sm font-medium">Job logging isn't available here yet.</div>
              <div className="text-xs text-muted-foreground">
                Tasks work normally. When enabled, you can log what happened to keep everyone in sync.
              </div>
              {import.meta.env.DEV && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 mt-2"
                  onClick={() => {
                    refetchHealth();
                    refetchOutcomeTypes();
                  }}
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry (dev)
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Error (only show if something actually failed) */}
              {lastError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    Couldn't save
                  </div>
                  <div className="text-xs text-muted-foreground">{lastError.message}</div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(JSON.stringify({ error: lastError, payload: lastPayload }, null, 2));
                        } catch {}
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={async () => {
                        if (!lastPayload) return;
                        await recordOnce(`retry`, async () => {
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

              {/* Saving indicator (subtle) */}
              {isBusy && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving…
                </div>
              )}
              {!isBusy && lastSavedAt && (
                <div className="text-[11px] text-muted-foreground">
                  Saved {formatDistanceToNow(parseISO(lastSavedAt), { addSuffix: true })}
                </div>
              )}

              {/* Status line (only show if there's a meaningful state) */}
              {stateDisplay && (
                <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                  <span className="text-sm">Status</span>
                  <Badge variant={stateDisplay.variant} className={cn('text-[11px]', stateDisplay.color)}>
                    {stateDisplay.label}
                  </Badge>
                </div>
              )}

              {/* PROGRESSIVE DISCLOSURE: Actions */}
              <div className="space-y-4">
                {/* Step 1: Scheduling (always visible if there are unrecorded options) */}
                {scheduleOptions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        When was it scheduled?
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {scheduleOptions.map((t) => (
                        <Button
                          key={t.key}
                          type="button"
                          variant="outline"
                          className="h-10 justify-start"
                          disabled={hasRuntimeError || isBusy}
                          onClick={() => setScheduleDraft({ outcomeType: t.key, scheduledFor: '', party: '' })}
                        >
                          {t.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Communication (unlocked after scheduling) */}
                {hasSchedulingOutcome && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Who was contacted?
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {communicationOptions.map((t) => (
                        <Button
                          key={t.key}
                          type="button"
                          variant="outline"
                          className="h-10 justify-start"
                          disabled={hasRuntimeError || isBusy}
                          onClick={() => setCommDraft({ outcomeType: t.key, method: 'phone', note: '' })}
                        >
                          {t.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Execution (unlocked after communication) */}
                {hasCommunicationOutcome && executionOptions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        What happened on site?
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {executionOptions.map((t) => (
                        <AlertDialog key={t.key}>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 justify-start"
                              disabled={hasRuntimeError || isBusy}
                            >
                              {t.label}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Log: {t.label}?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <div className="text-sm text-muted-foreground">
                              This can't be undone. Only log this if it actually happened.
                            </div>
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
                                Yes, log it
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hint when nothing is unlocked yet */}
                {!hasSchedulingOutcome && scheduleOptions.length === 0 && (
                  <div className="text-xs text-muted-foreground py-2">
                    All scheduling options have been logged.
                  </div>
                )}
              </div>

              {/* Timeline (only when outcomes exist) */}
              {hasAnyOutcomes && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <History className="w-3.5 h-3.5" />
                      What's happened
                    </div>

                    {outcomesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading…
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
                                      {methodLabel && <span>via {methodLabel}</span>}
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    {format(parseISO(outcome.occurred_at), 'MMM d, h:mm a')}
                                  </span>
                                </div>
                                {(outcome.metadata as any)?.notes && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">
                                    "{String((outcome.metadata as any).notes)}"
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Scheduling modal */}
      <Dialog open={!!scheduleDraft} onOpenChange={(o) => !o && setScheduleDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {scheduleDraft ? getOutcomeTypeDisplay(scheduleDraft.outcomeType).label : 'Schedule'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">When? (required)</Label>
              <Input
                type="datetime-local"
                value={scheduleDraft?.scheduledFor ?? ''}
                onChange={(e) => setScheduleDraft((p) => (p ? { ...p, scheduledFor: e.target.value } : p))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Who's responsible? (optional)</Label>
              <Input
                value={scheduleDraft?.party ?? ''}
                onChange={(e) => setScheduleDraft((p) => (p ? { ...p, party: e.target.value } : p))}
                placeholder="Name, crew, or vendor"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDraft(null)} disabled={isBusy}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!scheduleDraft?.scheduledFor) return;
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
              disabled={isBusy || !scheduleDraft?.scheduledFor}
            >
              {isBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Log it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Communication modal */}
      <Dialog open={!!commDraft} onOpenChange={(o) => !o && setCommDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {commDraft ? getOutcomeTypeDisplay(commDraft.outcomeType).label : 'Contact'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">How? (required)</Label>
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
              <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
              <Textarea
                value={commDraft?.note ?? ''}
                onChange={(e) => setCommDraft((p) => (p ? { ...p, note: e.target.value } : p))}
                placeholder="What was discussed?"
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
              disabled={isBusy}
            >
              {isBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Log it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
