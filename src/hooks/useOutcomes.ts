import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCompany } from '@/company/CompanyProvider';

// =============================================================================
// Core Law: Outcomes hooks
// =============================================================================
// Outcomes = facts (immutable events). Timestamped. Attributed. Cannot be undone.
// States = derived ONLY from outcomes. Never manually set.
// =============================================================================

export interface Outcome {
  id: string;
  company_id: string;
  subject_type: string;
  subject_id: string;
  outcome_type: string;
  occurred_at: string;
  recorded_by: string;
  method: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SubjectState {
  company_id: string;
  subject_type: string;
  subject_id: string;
  state: string;
  precedence: number;
  description: string | null;
  computed_at: string;
}

export interface OutcomeTypeInfo {
  outcome_type: string;
  label?: string | null;
  description?: string | null;
  is_repeatable?: boolean | null;
  is_terminal?: boolean | null;
  sort_order?: number | null;
  leads_to_state?: string | null;
}

export type OutcomesSystemStatus = 'online' | 'not_enabled' | 'error' | 'loading';

export interface CoreLawHealthcheck {
  ok: boolean;
  missing: string[];
  version: string;
  server_time: string;
}

// Outcome type display configuration
export const OUTCOME_TYPES: Record<string, { label: string; description: string; icon?: string }> = {
  // Project outcomes
  crew_scheduled: { label: 'Crew Scheduled', description: 'Crew has been assigned and scheduled' },
  client_notified: { label: 'Client Notified', description: 'Client has been notified about the schedule' },
  client_confirmed: { label: 'Client Confirmed', description: 'Client confirmed the scheduled time' },
  crew_arrived: { label: 'Crew Arrived', description: 'Crew arrived at the job site' },
  work_completed: { label: 'Work Completed', description: 'All work has been completed' },
  final_payment_received: { label: 'Final Payment Received', description: 'Final payment has been received' },
  // Proposal outcomes
  sent_to_client: { label: 'Sent to Client', description: 'Proposal was sent to the client' },
  client_viewed: { label: 'Client Viewed', description: 'Client viewed the proposal' },
  client_accepted: { label: 'Client Accepted', description: 'Client accepted the proposal' },
  client_declined: { label: 'Client Declined', description: 'Client declined the proposal' },
};

// Communication methods
export const OUTCOME_METHODS = [
  { value: 'in_person', label: 'In Person' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'sms', label: 'Text Message' },
  { value: 'email', label: 'Email' },
  { value: 'system', label: 'System (Automatic)' },
] as const;

// State display configuration
export const STATE_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; color?: string }> = {
  // Project states
  unscheduled: { label: 'Unscheduled', variant: 'outline', color: 'text-muted-foreground' },
  scheduled: { label: 'Scheduled', variant: 'secondary', color: 'text-blue-600' },
  ready_to_start: { label: 'Ready to Start', variant: 'secondary', color: 'text-amber-600' },
  in_progress: { label: 'In Progress', variant: 'default', color: 'text-emerald-600' },
  work_completed: { label: 'Completed', variant: 'default', color: 'text-green-600' },
  closed: { label: 'Closed', variant: 'outline', color: 'text-muted-foreground' },
  // Proposal states
  draft: { label: 'Draft', variant: 'outline' },
  sent: { label: 'Sent', variant: 'secondary', color: 'text-blue-600' },
  viewed: { label: 'Viewed', variant: 'secondary', color: 'text-amber-600' },
  accepted: { label: 'Accepted', variant: 'default', color: 'text-emerald-600' },
  declined: { label: 'Declined', variant: 'destructive' },
};

/**
 * Hook to list outcomes for a subject
 */
export function useOutcomes(subjectType: string | null, subjectId: string | null) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['outcomes', activeCompanyId, subjectType, subjectId],
    queryFn: async () => {
      if (!subjectType || !subjectId) return [];

      const { data, error } = await supabase.rpc('list_outcomes', {
        p_subject_type: subjectType,
        p_subject_id: subjectId,
        p_limit: 50,
      });

      if (error) throw error;
      return (data || []) as Outcome[];
    },
    enabled: !!subjectType && !!subjectId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get derived state for a subject
 */
export function useSubjectState(subjectType: string | null, subjectId: string | null) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['subject-state', activeCompanyId, subjectType, subjectId],
    queryFn: async () => {
      if (!subjectType || !subjectId) return null;

      const { data, error } = await supabase.rpc('get_subject_state', {
        p_subject_type: subjectType,
        p_subject_id: subjectId,
      });

      if (error) throw error;
      return (data?.[0] || null) as SubjectState | null;
    },
    enabled: !!subjectType && !!subjectId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Batch fetch subject states for many subjects (prevents per-card query spam).
 * Returns a map keyed by `${subject_type}:${subject_id}`.
 */
export function useSubjectStatesBatch(subjects: Array<{ subject_type: string; subject_id: string }>) {
  const { activeCompanyId } = useCompany();
  const normalized = subjects
    .filter((s) => !!s.subject_type && !!s.subject_id)
    .map((s) => ({ subject_type: s.subject_type, subject_id: s.subject_id }));

  return useQuery({
    queryKey: ['subject-states-batch', activeCompanyId, normalized],
    queryFn: async () => {
      if (normalized.length === 0) return new Map<string, SubjectState>();

      const { data, error } = await supabase.rpc('list_subject_states', {
        p_subjects: normalized,
      });
      if (error) throw error;

      const rows = (data || []) as SubjectState[];
      const map = new Map<string, SubjectState>();
      rows.forEach((r) => map.set(`${r.subject_type}:${r.subject_id}`, r));
      return map;
    },
    enabled: normalized.length > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get available outcome types for a subject type
 */
export function useAvailableOutcomeTypes(subjectType: string | null) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ['outcome-types', activeCompanyId, subjectType],
    queryFn: async () => {
      if (!subjectType) return [];

      const { data, error } = await supabase.rpc('get_available_outcome_types', {
        p_subject_type: subjectType,
      });

      if (error) throw error;
      return (data || []) as OutcomeTypeInfo[];
    },
    enabled: !!subjectType,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function isBackendNotEnabledError(err: unknown): boolean {
  const msg = String((err as any)?.message || '').toLowerCase();
  return (
    msg.includes('function') && msg.includes('does not exist')
  ) || msg.includes('schema cache') || msg.includes('not found');
}

/**
 * DEV helper: Core Law backend healthcheck
 */
export function useCoreLawHealthcheck(enabled: boolean) {
  return useQuery({
    queryKey: ['core-law-healthcheck'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('core_law_healthcheck');
      if (error) throw error;
      return data as CoreLawHealthcheck;
    },
    enabled,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export type OutcomePayload = {
  subjectType: string;
  subjectId: string;
  outcomeType: string;
  occurredAt?: string;
  method?: string;
  metadata?: Record<string, unknown>;
};

export type SchedulingOutcomeInput = {
  subjectType: string;
  subjectId: string;
  outcomeType: 'crew_scheduled' | 'vendor_scheduled' | 'subcontractor_scheduled';
  scheduledFor: string; // ISO
  party?: string;
};

export type CommunicationOutcomeInput = {
  subjectType: string;
  subjectId: string;
  outcomeType: 'client_notified' | 'followed_up' | 'vendor_contacted';
  method: 'phone' | 'sms' | 'email';
  note?: string;
};

export type ExecutionOutcomeInput = {
  subjectType: string;
  subjectId: string;
  outcomeType: 'crew_arrived' | 'work_started' | 'work_completed';
};

export type OutcomeErrorDetails = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  raw?: unknown;
};

export function toOutcomeErrorDetails(err: unknown): OutcomeErrorDetails {
  // Supabase errors are typically PostgrestError-like.
  const anyErr = err as any;
  return {
    message: anyErr?.message || 'Unknown error',
    code: anyErr?.code,
    details: anyErr?.details,
    hint: anyErr?.hint,
    raw: err,
  };
}

/**
 * Hook to record a new outcome
 */
export function useRecordOutcome() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();

  return useMutation({
    mutationFn: async ({ subjectType, subjectId, outcomeType, occurredAt, method, metadata }: OutcomePayload) => {
      const payload = {
        subjectType,
        subjectId,
        outcomeType,
        occurredAt,
        method,
        metadata,
      };

      // DEV-only: capture last payload for debugging
      if (import.meta.env.DEV) {
        (window as any).__coreLawLastOutcomePayload = payload;
      }

      const { data, error } = await supabase.rpc('record_outcome', {
        p_subject_type: subjectType,
        p_subject_id: subjectId,
        p_outcome_type: outcomeType,
        p_company_id: activeCompanyId || undefined,
        p_occurred_at: occurredAt || new Date().toISOString(),
        p_method: method || null,
        p_metadata: metadata || {},
      });

      if (error) throw error;
      return data as Outcome;
    },
    onSuccess: (created, variables) => {
      // Optimistically update timeline immediately (then refetch to reconcile).
      queryClient.setQueryData(['outcomes', activeCompanyId, variables.subjectType, variables.subjectId], (prev: any) => {
        const prevArr = Array.isArray(prev) ? prev : [];
        // Prepend, dedupe by id.
        const next = [created, ...prevArr.filter((o: any) => o?.id !== created.id)];
        return next;
      });

      queryClient.invalidateQueries({ queryKey: ['outcomes', activeCompanyId, variables.subjectType, variables.subjectId] });
      queryClient.invalidateQueries({ queryKey: ['subject-state', activeCompanyId, variables.subjectType, variables.subjectId] });
      queryClient.invalidateQueries({ queryKey: ['subject-states-batch'] });

      const typeInfo = OUTCOME_TYPES[variables.outcomeType];
      toast.success(`Outcome recorded: ${typeInfo?.label || variables.outcomeType}`);
    },
    onError: (error) => {
      console.error('Failed to record outcome:', error);
      toast.error('Failed to record outcome');
    },
  });
}

/**
 * Higher-level outcome actions that match the Tasks UX.
 * Includes a lightweight idempotency guard to prevent double-click duplicates.
 */
export function useOutcomeActions() {
  const record = useRecordOutcome();
  const lastKeyRef = useRef<string | null>(null);
  const lastKeyAtRef = useRef<number>(0);

  const guard = async (key: string, fn: () => Promise<any>) => {
    const now = Date.now();
    if (lastKeyRef.current === key && now - lastKeyAtRef.current < 1500) return;
    lastKeyRef.current = key;
    lastKeyAtRef.current = now;
    return await fn();
  };

  return {
    isPending: record.isPending,
    recordGeneric: async (payload: OutcomePayload) =>
      guard(`${payload.subjectType}:${payload.subjectId}:${payload.outcomeType}:${payload.method ?? ''}`, () =>
        record.mutateAsync(payload)
      ),
    recordSchedulingOutcome: async (input: SchedulingOutcomeInput) =>
      guard(`${input.subjectType}:${input.subjectId}:${input.outcomeType}`, () =>
        record.mutateAsync({
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          outcomeType: input.outcomeType,
          occurredAt: new Date().toISOString(),
          metadata: {
            scheduled_for: input.scheduledFor,
            responsible_party: input.party ?? null,
          },
        })
      ),
    recordCommunicationOutcome: async (input: CommunicationOutcomeInput) =>
      guard(`${input.subjectType}:${input.subjectId}:${input.outcomeType}:${input.method}`, () =>
        record.mutateAsync({
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          outcomeType: input.outcomeType,
          occurredAt: new Date().toISOString(),
          method: input.method,
          metadata: input.note ? { notes: input.note } : {},
        })
      ),
    recordExecutionOutcome: async (input: ExecutionOutcomeInput) =>
      guard(`${input.subjectType}:${input.subjectId}:${input.outcomeType}`, () =>
        record.mutateAsync({
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          outcomeType: input.outcomeType,
          occurredAt: new Date().toISOString(),
        })
      ),
  };
}

/**
 * Get display info for an outcome type
 */
export function getOutcomeTypeDisplay(outcomeType: string) {
  return OUTCOME_TYPES[outcomeType] || { 
    label: outcomeType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
    description: '' 
  };
}

/**
 * Get display info for a state
 */
export function getStateDisplay(state: string) {
  return STATE_BADGES[state] || { 
    label: state.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
    variant: 'outline' as const 
  };
}

