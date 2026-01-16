import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { 
  ChevronDown, 
  ChevronRight, 
  Target, 
  History, 
  Plus, 
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Copy,
  RefreshCw,
  MessageSquare,
  Phone,
  Mail,
  User,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useOutcomes, 
  useSubjectState, 
  useRecordOutcome,
  OUTCOME_METHODS,
  getOutcomeTypeDisplay,
  getStateDisplay,
  toOutcomeErrorDetails,
  useAvailableOutcomeTypes,
} from '@/hooks/useOutcomes';
import { CoreLawHealthcheckPanel } from '@/components/dev/CoreLawHealthcheckPanel';

// =============================================================================
// Core Law: Outcome Panel for TaskDetailDrawer
// =============================================================================
// This panel shows:
// 1. Linked subject (if task has subject_type + subject_id)
// 2. Derived reality state (read-only, computed from outcomes)
// 3. Record outcome action (the ONLY way to change state)
// 4. Timeline of recorded outcomes
// =============================================================================

interface OutcomePanelProps {
  subjectType: string | null;
  subjectId: string | null;
  subjectLabel?: string;
}

const METHOD_ICONS: Record<string, React.ElementType> = {
  in_person: User,
  phone: Phone,
  sms: MessageSquare,
  email: Mail,
  system: Zap,
};

export function OutcomePanel({ subjectType, subjectId, subjectLabel }: OutcomePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRecordingOpen, setIsRecordingOpen] = useState(false);
  const [selectedOutcomeType, setSelectedOutcomeType] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<ReturnType<typeof toOutcomeErrorDetails> | null>(null);
  const [lastPayload, setLastPayload] = useState<{
    subjectType: string;
    subjectId: string;
    outcomeType: string;
    method?: string;
    metadata?: Record<string, unknown>;
  } | null>(null);

  const { data: outcomes = [], isLoading: outcomesLoading } = useOutcomes(subjectType, subjectId);
  const { data: subjectState, isLoading: stateLoading } = useSubjectState(subjectType, subjectId);
  const { data: outcomeTypeRows = [], isLoading: outcomeTypesLoading, error: outcomeTypesError } =
    useAvailableOutcomeTypes(subjectType);
  const recordOutcome = useRecordOutcome();

  // If no subject linked, don't show the panel
  if (!subjectType || !subjectId) {
    return null;
  }

  const stateDisplay = subjectState ? getStateDisplay(subjectState.state) : null;

  const availableOutcomeTypes = useMemo(() => {
    // Registry-driven list. If backend isn't migrated, this will be empty and we show a clear error.
    return (outcomeTypeRows || []).slice().sort((a: any, b: any) => {
      const as = (a?.sort_order ?? 0) as number;
      const bs = (b?.sort_order ?? 0) as number;
      if (as !== bs) return as - bs;
      return String(a?.outcome_type || '').localeCompare(String(b?.outcome_type || ''));
    });
  }, [outcomeTypeRows]);

  const handleRecordOutcome = async () => {
    if (!selectedOutcomeType) return;

    const payload = {
      subjectType,
      subjectId,
      outcomeType: selectedOutcomeType,
      method: selectedMethod || undefined,
      metadata: notes ? { notes } : undefined,
    };

    setLastPayload(payload);
    setLastError(null);

    try {
      await recordOutcome.mutateAsync(payload);
      setLastSavedAt(new Date().toISOString());
      setLastError(null);

      // Reset form only on success
      setSelectedOutcomeType('');
      setSelectedMethod('');
      setNotes('');
      setIsRecordingOpen(false);
    } catch (e) {
      // Fail-loud: keep user input, keep drawer open, show persistent inline error.
      setLastError(toOutcomeErrorDetails(e));
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-between w-full py-3 px-1 text-left hover:bg-muted/50 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Reality Status</span>
            {stateDisplay && (
              <Badge 
                variant={stateDisplay.variant} 
                className={cn('text-[10px]', stateDisplay.color)}
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
        {import.meta.env.DEV && <CoreLawHealthcheckPanel />}

        {/* Linked Subject */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Linked to:</span>
          <Badge variant="outline" className="font-normal">
            {subjectLabel || `${subjectType} • ${subjectId.slice(0, 8)}...`}
          </Badge>
        </div>

        {/* Save indicator + last error (fail-loud) */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground">
            {recordOutcome.isPending ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving…
              </span>
            ) : lastSavedAt ? (
              <span>
                Last saved {formatDistanceToNow(parseISO(lastSavedAt), { addSuffix: true })}
              </span>
            ) : (
              <span />
            )}
          </div>
        </div>

        {lastError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="w-4 h-4" />
              Outcome failed to record
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div><span className="font-medium">Message:</span> {lastError.message}</div>
              {lastError.code && <div><span className="font-medium">Code:</span> {lastError.code}</div>}
              {lastError.details && <div><span className="font-medium">Details:</span> {lastError.details}</div>}
              {lastError.hint && <div><span className="font-medium">Hint:</span> {lastError.hint}</div>}
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
                    // no-op; clipboard might be denied
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
                  setLastError(null);
                  try {
                    await recordOutcome.mutateAsync(lastPayload);
                    setLastSavedAt(new Date().toISOString());
                  } catch (e) {
                    setLastError(toOutcomeErrorDetails(e));
                  }
                }}
                disabled={!lastPayload || recordOutcome.isPending}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Current State (Derived) */}
        {stateLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading state...
          </div>
        ) : subjectState ? (
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Current Reality</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {subjectState.description || `State: ${subjectState.state}`}
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-muted/30 border border-dashed">
            <p className="text-xs text-muted-foreground text-center">
              No outcomes recorded yet. Reality state is undefined.
            </p>
          </div>
        )}

        <Separator />

        {/* Record Outcome Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Plus className="w-3.5 h-3.5" />
              Record Outcome
            </Label>
            {!isRecordingOpen && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setIsRecordingOpen(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                New
              </Button>
            )}
          </div>

          {isRecordingOpen && (
            <div className="space-y-3 p-3 rounded-lg border bg-background">
              {outcomeTypesError && (
                <div className="rounded-md border border-amber-300/30 bg-amber-50/30 p-2 text-xs text-muted-foreground">
                  Backend is missing Core Law migrations (or PostgREST schema cache is stale). Try refreshing after `supabase db push`.
                </div>
              )}

              {/* Outcome Type */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">What happened?</Label>
                <Select value={selectedOutcomeType} onValueChange={setSelectedOutcomeType}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={outcomeTypesLoading ? 'Loading outcomes…' : 'Select outcome…'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOutcomeTypes.map((row: any) => (
                      <SelectItem key={row.outcome_type} value={row.outcome_type}>
                        <span className="flex flex-col">
                          <span>{row.label || getOutcomeTypeDisplay(row.outcome_type).label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedOutcomeType && (
                  <p className="text-[10px] text-muted-foreground">
                    {availableOutcomeTypes.find((r: any) => r.outcome_type === selectedOutcomeType)?.description ||
                      getOutcomeTypeDisplay(selectedOutcomeType).description}
                  </p>
                )}
              </div>

              {/* Method (optional) */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">How? (optional)</Label>
                <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select method..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not specified</SelectItem>
                    {OUTCOME_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes (optional) */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional details..."
                  className="min-h-[60px] text-sm resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setIsRecordingOpen(false);
                    setSelectedOutcomeType('');
                    setSelectedMethod('');
                    setNotes('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleRecordOutcome}
                  disabled={!selectedOutcomeType || recordOutcome.isPending || availableOutcomeTypes.length === 0}
                >
                  {recordOutcome.isPending ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  )}
                  Record
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Outcome Timeline */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <History className="w-3.5 h-3.5" />
            Timeline
          </Label>

          {outcomesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading timeline...
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
                const MethodIcon = outcome.method ? METHOD_ICONS[outcome.method] : null;
                const isLast = index === outcomes.length - 1;

                return (
                  <div key={outcome.id} className="relative flex gap-3">
                    {/* Timeline line */}
                    {!isLast && (
                      <div className="absolute left-[9px] top-5 w-px h-[calc(100%-4px)] bg-border" />
                    )}
                    
                    {/* Dot */}
                    <div className="relative z-10 mt-1.5 w-[18px] h-[18px] rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{typeInfo.label}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{formatDistanceToNow(parseISO(outcome.occurred_at), { addSuffix: true })}</span>
                            {MethodIcon && (
                              <span className="flex items-center gap-0.5">
                                <MethodIcon className="w-2.5 h-2.5" />
                                {OUTCOME_METHODS.find(m => m.value === outcome.method)?.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {format(parseISO(outcome.occurred_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      {(outcome.metadata as Record<string, unknown>)?.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          "{(outcome.metadata as Record<string, unknown>).notes}"
                        </p>
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
  );
}

