# Billing Gating Proof

This document proves that the billing gating system is enforced at the **database level** and cannot be bypassed by UI/API misuse.

## Canonical Approval Signal

The canonical approval signal for proposals is:

| Field | Type | Meaning |
|-------|------|---------|
| `acceptance_status` | text | 'accepted' = approved |
| `approved_at` | timestamptz | Timestamp of approval |
| `billing_readiness` | text | 'locked' = billing config frozen |
| `billing_basis` | text | 'payment_schedule' or 'sov' |

**Invariant**: When `acceptance_status = 'accepted'`, ALL of the above fields are set by the approval trigger.

---

## Trigger Matrix

### Table: `proposals`

| Operation | Trigger | Condition | Result |
|-----------|---------|-----------|--------|
| INSERT | `enforce_proposal_billing_on_insert` | `acceptance_status='accepted'` + `contract_type='milestone'` | **BLOCKED** - must create proposal first, add milestones, then approve |
| INSERT | `enforce_proposal_billing_on_insert` | `acceptance_status='accepted'` + `contract_type='sov'/'progress_billing'` | **BLOCKED** - must create proposal first, add SOV, then approve |
| INSERT | `enforce_proposal_billing_on_insert` | `acceptance_status='accepted'` + `contract_type='fixed_price'` | **ALLOWED** - sets `billing_readiness='locked'`, `billing_basis` |
| UPDATE | `enforce_proposal_billing_on_approval` | `acceptance_status` → 'accepted' | **BLOCKED** if milestones/SOV don't sum to total; **ALLOWED** if valid |
| UPDATE | `prevent_contract_type_change_after_approval` | Already accepted + changing `contract_type` | **BLOCKED** |
| UPDATE | `prevent_contract_type_change_after_approval` | Already accepted + changing `billing_basis` | **BLOCKED** |
| UPDATE | `prevent_contract_type_change_after_approval` | Already accepted + changing `billing_readiness` from 'locked' | **BLOCKED** |

### Table: `payment_schedules`

| Operation | Trigger | Condition | Result |
|-----------|---------|-----------|--------|
| INSERT | `block_billing_schedule_mutation_after_acceptance` | Linked proposal accepted | **BLOCKED** |
| UPDATE | `block_billing_schedule_mutation_after_acceptance` | Linked proposal accepted | **BLOCKED** |
| DELETE | `block_billing_schedule_mutation_after_acceptance` | Linked proposal accepted | **BLOCKED** |

### Table: `payment_schedule_items`

| Operation | Trigger | Condition | Result |
|-----------|---------|-----------|--------|
| INSERT | `block_billing_schedule_mutation_after_acceptance` | Linked proposal accepted | **BLOCKED** |
| UPDATE | `block_billing_schedule_mutation_after_acceptance` | Linked proposal accepted | **BLOCKED** |
| DELETE | `block_billing_schedule_mutation_after_acceptance` | Linked proposal accepted | **BLOCKED** |

### Table: `sov_items`

| Operation | Trigger | Condition | Result |
|-----------|---------|-----------|--------|
| INSERT | `block_sov_mutation_after_acceptance` | Linked proposal accepted | **BLOCKED** |
| UPDATE | `block_sov_mutation_after_acceptance` | Linked proposal accepted | **BLOCKED** |
| DELETE | `block_sov_mutation_after_acceptance` | Linked proposal accepted | **BLOCKED** |

---

## Exception Messages

| Trigger Function | Error Code | Message |
|------------------|------------|---------|
| `tg_enforce_proposal_billing_on_insert` | check_violation | "Cannot insert an already-accepted milestone proposal. Create proposal first, add milestones, then approve." |
| `tg_enforce_proposal_billing_on_insert` | check_violation | "Cannot insert an already-accepted SOV/progress_billing proposal. Create proposal first, add SOV items, then approve." |
| `tg_enforce_proposal_billing_on_approval` | check_violation | "Cannot approve milestone proposal: milestone sum ($X) does not equal proposal total ($Y). Difference: $Z" |
| `tg_enforce_proposal_billing_on_approval` | check_violation | "Cannot approve SOV proposal: SOV sum ($X) does not equal proposal total ($Y). Difference: $Z" |
| `tg_prevent_contract_type_change_after_approval` | check_violation | "Cannot modify contract_type after proposal approval. Contract type is locked at: X" |
| `tg_block_billing_schedule_mutation_after_acceptance` | check_violation | "Cannot modify billing schedule for accepted proposal X. Create a change order or new revision instead." |
| `tg_block_sov_mutation_after_acceptance` | check_violation | "Cannot modify SOV for accepted proposal X. Create a change order or new revision instead." |

---

## Escape Hatch

For legitimate change order processing, use the controlled RPC:

```sql
SELECT public.apply_billing_revision(
  p_proposal_id := 'uuid',
  p_operation := 'update',
  p_table_name := 'payment_schedule_items',
  p_reason := 'CO-001: Added exterior work',
  p_payload := '{"item_id": "...", "new_amount": 5000}'::jsonb
);
```

This:
1. Validates tenant membership
2. Logs to `billing_revision_audit` table
3. Sets `app.billing_revision_mode = 'on'` for this transaction only

---

## Example SQL: FAIL Cases

### 1. INSERT accepted milestone proposal without milestones

```sql
-- EXPECTED: ERROR with "Cannot insert an already-accepted milestone proposal"
INSERT INTO public.proposals (
  id, project_id, title, status, acceptance_status, contract_type, company_id
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.projects LIMIT 1),
  'Test Milestone Proposal',
  'accepted',
  'accepted',
  'milestone',
  (SELECT company_id FROM public.projects LIMIT 1)
);
```

### 2. UPDATE to accepted without valid milestones

```sql
-- Setup: create draft milestone proposal
INSERT INTO public.proposals (
  id, project_id, title, status, acceptance_status, contract_type, company_id, total_amount
) VALUES (
  'test-proposal-id',
  (SELECT id FROM public.projects LIMIT 1),
  'Test Proposal',
  'draft',
  'pending',
  'milestone',
  (SELECT company_id FROM public.projects LIMIT 1),
  10000
);

-- EXPECTED: ERROR with "milestone sum ($0) does not equal proposal total ($10000)"
UPDATE public.proposals SET acceptance_status = 'accepted' WHERE id = 'test-proposal-id';

-- Cleanup
DELETE FROM public.proposals WHERE id = 'test-proposal-id';
```

### 3. DELETE milestone after acceptance

```sql
-- Find an accepted milestone proposal with items
SELECT psi.id as item_id, p.id as proposal_id
FROM public.payment_schedule_items psi
JOIN public.payment_schedules ps ON ps.id = psi.payment_schedule_id
JOIN public.proposals p ON p.id = ps.proposal_id
WHERE p.acceptance_status = 'accepted' AND p.contract_type = 'milestone'
LIMIT 1;

-- EXPECTED: ERROR with "Cannot modify billing schedule for accepted proposal"
DELETE FROM public.payment_schedule_items WHERE id = '<item_id from above>';
```

---

## Example SQL: PASS Cases

### 1. INSERT accepted fixed_price proposal

```sql
-- EXPECTED: SUCCESS
INSERT INTO public.proposals (
  id, project_id, title, status, acceptance_status, contract_type, company_id
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.projects LIMIT 1),
  'Test Fixed Price Proposal',
  'accepted',
  'accepted',
  'fixed_price',
  (SELECT company_id FROM public.projects LIMIT 1)
)
RETURNING id, billing_readiness, billing_basis, approved_at;

-- Should return: billing_readiness='locked', billing_basis='payment_schedule', approved_at=now()
```

### 2. Approve properly configured milestone proposal

```sql
-- Setup: create draft proposal with matching milestones
DO $$
DECLARE
  v_proposal_id uuid := gen_random_uuid();
  v_schedule_id uuid := gen_random_uuid();
  v_project_id uuid;
  v_company_id uuid;
BEGIN
  SELECT id, company_id INTO v_project_id, v_company_id FROM public.projects LIMIT 1;
  
  INSERT INTO public.proposals (id, project_id, title, status, acceptance_status, contract_type, company_id, total_amount)
  VALUES (v_proposal_id, v_project_id, 'Test', 'draft', 'pending', 'milestone', v_company_id, 10000);
  
  INSERT INTO public.payment_schedules (id, project_id, proposal_id)
  VALUES (v_schedule_id, v_project_id, v_proposal_id);
  
  INSERT INTO public.payment_schedule_items (payment_schedule_id, title, scheduled_amount)
  VALUES (v_schedule_id, 'Milestone 1', 10000);
  
  -- EXPECTED: SUCCESS
  UPDATE public.proposals SET acceptance_status = 'accepted' WHERE id = v_proposal_id;
  
  RAISE NOTICE 'Approval succeeded!';
  
  -- Cleanup
  DELETE FROM public.proposals WHERE id = v_proposal_id;
END $$;
```

---

## Verification Commands

Run the verification script:

```bash
# Copy supabase/verification/verify_billing_gating.sql into Supabase SQL Editor and execute
```

Or use the self-test functions directly:

```sql
SELECT * FROM public.test_billing_insert_gating();
SELECT * FROM public.test_billing_update_gating();
SELECT * FROM public.test_post_acceptance_mutation_blocked();
```

All tests should return `passed: true`.

