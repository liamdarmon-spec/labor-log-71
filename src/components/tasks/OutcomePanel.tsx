import { useState } from 'react';
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
  OUTCOME_TYPES,
  OUTCOME_METHODS,
  getOutcomeTypeDisplay,
  getStateDisplay,
} from '@/hooks/useOutcomes';

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

  const { data: outcomes = [], isLoading: outcomesLoading } = useOutcomes(subjectType, subjectId);
  const { data: subjectState, isLoading: stateLoading } = useSubjectState(subjectType, subjectId);
  const recordOutcome = useRecordOutcome();

  // If no subject linked, don't show the panel
  if (!subjectType || !subjectId) {
    return null;
  }

  const stateDisplay = subjectState ? getStateDisplay(subjectState.state) : null;
  
  // Get available outcome types for this subject type
  const availableOutcomeTypes = Object.entries(OUTCOME_TYPES)
    .filter(([key]) => {
      // Filter outcome types based on subject type
      if (subjectType === 'project') {
        return ['crew_scheduled', 'client_notified', 'client_confirmed', 'crew_arrived', 'work_completed', 'final_payment_received'].includes(key);
      }
      if (subjectType === 'proposal') {
        return ['sent_to_client', 'client_viewed', 'client_accepted', 'client_declined'].includes(key);
      }
      if (subjectType === 'schedule_block') {
        return ['client_notified', 'client_confirmed', 'crew_arrived', 'work_completed'].includes(key);
      }
      return true;
    });

  const handleRecordOutcome = async () => {
    if (!selectedOutcomeType) return;

    await recordOutcome.mutateAsync({
      subjectType,
      subjectId,
      outcomeType: selectedOutcomeType,
      method: selectedMethod || undefined,
      metadata: notes ? { notes } : undefined,
    });

    // Reset form
    setSelectedOutcomeType('');
    setSelectedMethod('');
    setNotes('');
    setIsRecordingOpen(false);
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
        {/* Linked Subject */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Linked to:</span>
          <Badge variant="outline" className="font-normal">
            {subjectLabel || `${subjectType} • ${subjectId.slice(0, 8)}...`}
          </Badge>
        </div>

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
              {/* Outcome Type */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">What happened?</Label>
                <Select value={selectedOutcomeType} onValueChange={setSelectedOutcomeType}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select outcome..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOutcomeTypes.map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex flex-col">
                          <span>{info.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedOutcomeType && (
                  <p className="text-[10px] text-muted-foreground">
                    {OUTCOME_TYPES[selectedOutcomeType]?.description}
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
                  disabled={!selectedOutcomeType || recordOutcome.isPending}
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

