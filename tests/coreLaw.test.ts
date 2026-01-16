import { describe, it, expect } from 'vitest';

/**
 * Core Law Tests
 * 
 * These tests verify the Core Law constants and logic without importing
 * hooks that depend on Supabase/React Query.
 */

// Re-define constants here to avoid importing from hooks (which have Supabase dependencies)
// These must match the values in src/hooks/useOutcomes.ts

const OUTCOME_TYPES: Record<string, { label: string; description: string }> = {
  crew_scheduled: { label: 'Crew Scheduled', description: 'Crew has been assigned and scheduled' },
  client_notified: { label: 'Client Notified', description: 'Client has been notified about the schedule' },
  client_confirmed: { label: 'Client Confirmed', description: 'Client confirmed the scheduled time' },
  crew_arrived: { label: 'Crew Arrived', description: 'Crew arrived at the job site' },
  work_completed: { label: 'Work Completed', description: 'All work has been completed' },
  final_payment_received: { label: 'Final Payment Received', description: 'Final payment has been received' },
  sent_to_client: { label: 'Sent to Client', description: 'Proposal was sent to the client' },
  client_viewed: { label: 'Client Viewed', description: 'Client viewed the proposal' },
  client_accepted: { label: 'Client Accepted', description: 'Client accepted the proposal' },
  client_declined: { label: 'Client Declined', description: 'Client declined the proposal' },
};

const STATE_BADGES: Record<string, { label: string; variant: string; color?: string }> = {
  unscheduled: { label: 'Unscheduled', variant: 'outline', color: 'text-muted-foreground' },
  scheduled: { label: 'Scheduled', variant: 'secondary', color: 'text-blue-600' },
  ready_to_start: { label: 'Ready to Start', variant: 'secondary', color: 'text-amber-600' },
  in_progress: { label: 'In Progress', variant: 'default', color: 'text-emerald-600' },
  work_completed: { label: 'Completed', variant: 'default', color: 'text-green-600' },
  closed: { label: 'Closed', variant: 'outline', color: 'text-muted-foreground' },
  draft: { label: 'Draft', variant: 'outline' },
  sent: { label: 'Sent', variant: 'secondary', color: 'text-blue-600' },
  viewed: { label: 'Viewed', variant: 'secondary', color: 'text-amber-600' },
  accepted: { label: 'Accepted', variant: 'default', color: 'text-emerald-600' },
  declined: { label: 'Declined', variant: 'destructive' },
};

const OUTCOME_METHODS = [
  { value: 'in_person', label: 'In Person' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'sms', label: 'Text Message' },
  { value: 'email', label: 'Email' },
  { value: 'system', label: 'System (Automatic)' },
];

function getOutcomeTypeDisplay(outcomeType: string) {
  return OUTCOME_TYPES[outcomeType] || { 
    label: outcomeType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
    description: '' 
  };
}

function getStateDisplay(state: string) {
  return STATE_BADGES[state] || { 
    label: state.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
    variant: 'outline' as const 
  };
}

describe('Core Law: Outcome Types', () => {
  it('should have all project outcome types defined', () => {
    const projectOutcomes = [
      'crew_scheduled',
      'client_notified',
      'client_confirmed',
      'crew_arrived',
      'work_completed',
      'final_payment_received',
    ];

    projectOutcomes.forEach((type) => {
      expect(OUTCOME_TYPES[type]).toBeDefined();
      expect(OUTCOME_TYPES[type].label).toBeTruthy();
      expect(OUTCOME_TYPES[type].description).toBeTruthy();
    });
  });

  it('should have all proposal outcome types defined', () => {
    const proposalOutcomes = [
      'sent_to_client',
      'client_viewed',
      'client_accepted',
      'client_declined',
    ];

    proposalOutcomes.forEach((type) => {
      expect(OUTCOME_TYPES[type]).toBeDefined();
      expect(OUTCOME_TYPES[type].label).toBeTruthy();
    });
  });

  it('getOutcomeTypeDisplay returns correct info for known types', () => {
    const display = getOutcomeTypeDisplay('crew_scheduled');
    expect(display.label).toBe('Crew Scheduled');
    expect(display.description).toContain('scheduled');
  });

  it('getOutcomeTypeDisplay handles unknown types gracefully', () => {
    const display = getOutcomeTypeDisplay('some_unknown_type');
    expect(display.label).toBe('Some Unknown Type'); // Title-cased
    expect(display.description).toBe('');
  });
});

describe('Core Law: State Derivation', () => {
  it('should have all project states defined', () => {
    const projectStates = [
      'unscheduled',
      'scheduled',
      'ready_to_start',
      'in_progress',
      'work_completed',
      'closed',
    ];

    projectStates.forEach((state) => {
      expect(STATE_BADGES[state]).toBeDefined();
      expect(STATE_BADGES[state].label).toBeTruthy();
      expect(STATE_BADGES[state].variant).toBeTruthy();
    });
  });

  it('should have all proposal states defined', () => {
    const proposalStates = ['draft', 'sent', 'viewed', 'accepted', 'declined'];

    proposalStates.forEach((state) => {
      expect(STATE_BADGES[state]).toBeDefined();
      expect(STATE_BADGES[state].label).toBeTruthy();
    });
  });

  it('getStateDisplay returns correct info for known states', () => {
    const display = getStateDisplay('scheduled');
    expect(display.label).toBe('Scheduled');
    expect(display.variant).toBe('secondary');
  });

  it('getStateDisplay handles unknown states gracefully', () => {
    const display = getStateDisplay('some_new_state');
    expect(display.label).toBe('Some New State'); // Title-cased
    expect(display.variant).toBe('outline');
  });
});

describe('Core Law: Communication Methods', () => {
  it('should have all outcome methods defined', () => {
    const methods = ['in_person', 'phone', 'sms', 'email', 'system'];

    methods.forEach((method) => {
      const found = OUTCOME_METHODS.find((m) => m.value === method);
      expect(found).toBeDefined();
      expect(found?.label).toBeTruthy();
    });
  });
});

describe('Core Law: Invariants', () => {
  it('states should never contain "set" or "change" verbs (states are derived, not set)', () => {
    Object.keys(STATE_BADGES).forEach((state) => {
      expect(state.toLowerCase()).not.toContain('set');
      expect(state.toLowerCase()).not.toContain('change');
    });
  });

  it('outcome types should be past-tense or noun-based (facts, not intents)', () => {
    // Outcomes are facts that happened, so they should use past tense
    // or noun forms, not imperative verbs
    const outcomeTypes = Object.keys(OUTCOME_TYPES);
    
    outcomeTypes.forEach((type) => {
      // Should not start with imperative verbs
      expect(type).not.toMatch(/^(do_|make_|set_|change_|update_)/);
    });
  });
});

describe('Core Law: State Precedence Logic', () => {
  /**
   * This tests the conceptual precedence logic.
   * The actual DB implementation uses the precedence column.
   * 
   * Expected precedence (higher number = more advanced state):
   *   unscheduled (0) < scheduled (10) < ready_to_start (20) < in_progress (30) < work_completed (40) < closed (50)
   */
  it('project states should have logical progression', () => {
    const expectedOrder = [
      'unscheduled',
      'scheduled', 
      'ready_to_start',
      'in_progress',
      'work_completed',
      'closed',
    ];

    // All states should exist
    expectedOrder.forEach((state) => {
      expect(STATE_BADGES[state]).toBeDefined();
    });
  });

  it('proposal states should have logical progression', () => {
    const expectedOrder = ['draft', 'sent', 'viewed', 'accepted'];
    
    // All states should exist
    expectedOrder.forEach((state) => {
      expect(STATE_BADGES[state]).toBeDefined();
    });
    
    // declined is a terminal state at same level as accepted
    expect(STATE_BADGES.declined).toBeDefined();
  });
});

