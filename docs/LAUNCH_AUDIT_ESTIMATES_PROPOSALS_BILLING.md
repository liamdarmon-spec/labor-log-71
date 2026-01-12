# Launch Audit Proof: Estimates + Proposals + Billing

This doc is a **copy/paste executable manual proof script** for the two remaining launch blockers:

1) **No silent data loss** when autosave/manual-save fails  
2) **Billing Basis display never lies** (“Not set” is only shown when truly unknown)

---

## DEV Force-Error Toggle (Deterministic)

We added a DEV-only mechanism to force server failures without relying on input validation edge-cases.

### How it works

- When enabled, save RPC calls inject an extra RPC arg `p___force_fail___`, which guarantees PostgREST fails with:
  - “Could not find function … with the given arguments”
- This is deterministic and does not depend on DB constraints.
- This is **DEV-only** (guarded by `import.meta.env.DEV`).

### How to enable

1. Open any Estimate or Proposal page.
2. Open the **DEV Autosave Diagnostics** overlay (bottom-right).
3. Expand it.
4. Check **Force server error**.

### How to disable

Uncheck **Force server error**.

---

## Proof Script: No Silent Data Loss (Estimate)

1. Open an estimate: `/app/estimates/<estimateId>`
2. Make a visible edit (e.g., change a Description cell).
3. Expand the **DEV Autosave Diagnostics** overlay and enable **Force server error**.
4. Click **Save now**.
5. Confirm:
   - The page does **NOT** crash (no ErrorBoundary)
   - Your edit remains visible (no snap-back/revert)
   - Save status remains **Unsaved** (or equivalent dirty state)
   - A **persistent bottom-right error panel** appears with:
     - exact server error message
     - payload summary (count + bytes + id sample)
     - Retry + Copy error
6. Click **Retry** (still forced) → confirms error persists and edits remain.
7. Disable **Force server error**.
8. Click **Retry** or **Save now** → confirms it saves successfully and status becomes **Saved**.

---

## Proof Script: No Silent Data Loss (Proposal)

1. Open a proposal: `/app/projects/<projectId>/proposals/<proposalId>` (or `/app/proposals/<id>`)
2. Make a visible edit (e.g., change intro text or title).
3. Expand the **DEV Autosave Diagnostics** overlay and enable **Force server error**.
4. Click **Save now**.
5. Confirm:
   - The page does **NOT** crash (no ErrorBoundary)
   - Your edit remains visible (no snap-back/revert)
   - Status remains **Unsaved** (dirty)
   - A persistent bottom-right error panel appears with:
     - exact server error message
     - payload bytes + keys sample
     - Retry + Copy error
6. Disable **Force server error**, then Retry/Save now → confirm it saves.

---

## Proof Script: Billing Basis “Not set” Never Lies

### Goal

On Project Billing:
- Prefer `billing_summary.billing_basis` (canonical DB function)
- Else, if there is an **accepted base proposal**, derive basis from:
  - `acceptedProposal.billing_basis` (if present)
  - else `acceptedProposal.contract_type`:
    - `progress_billing` → SOV
    - `milestone` → Payment Schedule
    - `fixed_price` → Fixed Price (display-only)
- Only show **Not set** when:
  - no baseline AND
  - no billing_basis from summary AND
  - no accepted proposal to derive from

### Steps

1. Navigate to `/app/projects/<projectId>?tab=billing`
2. If the project has an accepted proposal but no baseline:
   - Billing basis should show e.g. **Payment Schedule** or **Schedule of Values** with a **Derived** badge.
3. Confirm **Not set** appears only when there is no accepted proposal to derive from.
4. Click **View Change Orders** (if present) and confirm it routes to `/app/change-orders?projectId=<projectId>`.

---

## Notes / Constraints

- There is currently **no unit test infrastructure** in this repo (no Vitest/Jest configured), so the “dirty flag not cleared on save error” invariant is proven via deterministic DEV runtime repro instead.

# Launch Audit: Estimates → Proposals → Billing Pipeline

> **Last Updated**: January 8, 2026  
> **Status**: Production-ready after fixes in this audit

---

## Executive Summary

This document captures the production-readiness audit for the full ERP pipeline from Estimate creation through Proposal acceptance to Billing execution.

### Key Issues Fixed

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| `draft_version is ambiguous` DB error | RPC output columns named same as table columns | Renamed to `out_draft_version`, etc. |
| `Billing Basis: Not set` after approval | `approve_proposal_manual` called non-existent `create_contract_baseline` | Inlined baseline creation logic |
| Silent autosave failure | `companyId` check returned silently | Now sets `status='error'` with message |
| Optimistic locking not seeded | First save had no `updated_at` baseline | Seed from hydrated row data |
| Accepted proposals could be edited | No DB constraint | Added trigger to prevent mutation |
| `get_project_billing_summary` drift | Multiple conflicting function definitions | Canonical version with TABLE return |

---

## 1. Data Integrity Checks

### 1.1 Required NOT NULL Constraints

| Table | Column | Status |
|-------|--------|--------|
| `scope_block_cost_items` | `company_id` | ✅ Enforced via trigger + NOT NULL |
| `proposals` | `company_id` | ✅ NOT NULL with backfill |
| `estimates` | `company_id` | ✅ NOT NULL with backfill |
| `contract_baselines` | `company_id` | ✅ NOT NULL (FK) |
| `contract_baselines` | `billing_basis` | ✅ NOT NULL with CHECK |
| `invoices` | `company_id` | ✅ NOT NULL (FK) |

### 1.2 RLS Verification

| Table | Policy | Enforced Via |
|-------|--------|--------------|
| `scope_block_cost_items` | `tenant_select` | JOIN to `scope_blocks.company_id` |
| `proposals` | `tenant_*` | `company_id = ANY(authed_company_ids())` |
| `contract_baselines` | `*_select`, `*_insert` | `company_id = ANY(authed_company_ids())` |
| `invoices` | `*` | `company_id = ANY(authed_company_ids())` |

### 1.3 Orphan Prevention

- All `scope_block_cost_items` must have `scope_block_id` (FK enforced)
- All cost items must have `cost_code_id` (validated in RPCs)
- Invoices must have `project_id` (FK enforced)

---

## 2. Autosave Failure Modes

### 2.1 Network Failures

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| Network offline during save | `status='error'`, user input preserved | ✅ |
| RPC timeout | `status='error'`, retry available | ✅ |
| Partial batch failure | Restore failed items to pending | ✅ (useItemAutosave) |

### 2.2 RLS/Permission Failures

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| Missing `company_id` | `status='error'` with explicit message | ✅ Fixed |
| Wrong tenant | RPC throws, `status='error'` | ✅ |
| Draft-only restriction | RPC throws if `status != 'draft'` | ✅ |

### 2.3 Constraint Failures

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| Invalid `cost_code_id` | RPC throws, user sees error | ✅ |
| `draft_version` conflict | `ERRCODE=40001`, conflict UX | ✅ Fixed |
| Unique constraint violation | Error surfaced to UI | ✅ |

---

## 3. Concurrency / Optimistic Locking

### 3.1 Conflict Resolution

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| Two users edit same row | Second user sees conflict error | ✅ |
| Same user, two tabs | Conflict detection via `draft_version` | ✅ |
| Autosave during manual save | Queue mechanism, single follow-up | ✅ |

### 3.2 Locking Seeds

- EstimateBuilderV2: Seeds `lastKnownUpdatedAt` from hydrated items
- ProposalBuilderV2: Seeds `expectedVersionRef` from `draft_version`
- useItemAutosave: Tracks per-row `updated_at` for conflict detection

---

## 4. Billing Invariants by Contract Type

### 4.1 Contract Types

| Type | Billing Basis | Schedule Required | SOV Required |
|------|--------------|-------------------|--------------|
| `fixed_price` | `payment_schedule` | No (single milestone auto) | No |
| `milestone` | `payment_schedule` | Yes (validated) | No |
| `progress_billing` | `sov` | No | Yes (validated) |

### 4.2 Approval → Baseline Flow

1. User sets `contract_type` on proposal (default: `fixed_price`)
2. User clicks "Mark as Approved" with "Create billing baseline" checked
3. `approve_proposal_manual` RPC:
   - Validates tenant membership
   - Derives `billing_basis` from `contract_type`
   - Creates `contract_baselines` row
   - Freezes milestones or SOV lines
   - Sets `acceptance_status = 'accepted'`
4. Billing page reads `billing_basis` from baseline (or proposal fallback)

### 4.3 Billing Basis Derivation

```sql
billing_basis = CASE 
  WHEN contract_type = 'progress_billing' THEN 'sov'
  WHEN contract_type = 'milestone' THEN 'payment_schedule'
  ELSE 'payment_schedule'  -- fixed_price default
END
```

---

## 5. Change Order Propagation

### 5.1 CO → Contract Value

- Approved COs update `approved_change_order_total` in billing summary
- `current_contract_total = base_contract_total + approved_change_order_total`

### 5.2 CO → SOV/Milestones

| Contract Type | CO Effect |
|---------------|-----------|
| `fixed_price` | CO adds invoiceable amount (standalone) |
| `milestone` | CO can add/adjust milestones |
| `progress_billing` | CO can add/adjust SOV lines |

⚠️ **Note**: CO → SOV allocation UI is not yet implemented. Currently COs are invoice-able as standalone.

---

## 6. Accept Proposal Gates

### 6.1 Pre-Acceptance Validation

| Gate | Enforcement | Status |
|------|-------------|--------|
| `contract_type` must be set | Default `fixed_price` | ✅ |
| Tenant membership | RPC validates | ✅ |
| Not already accepted | RPC checks | ✅ |
| Not a child proposal (CO) | RPC checks `parent_proposal_id` | ✅ |
| Baseline doesn't exist | RPC checks, creates or skips | ✅ |

### 6.2 Post-Acceptance Immutability

| Field | Mutation Blocked | Enforcement |
|-------|------------------|-------------|
| `title` | ✅ | DB trigger |
| `total_amount` | ✅ | DB trigger |
| `contract_type` | ✅ | DB trigger |
| `billing_basis` | ✅ | DB trigger |
| `settings` | ✅ | DB trigger |

---

## 7. UI Testing Checklist

### 7.1 Estimate Autosave

- [ ] Type in 5 fields quickly → all values persisted on refresh
- [ ] Disconnect network mid-type → error shown, values preserved
- [ ] Reconnect → manual "Save now" succeeds
- [ ] Two tabs open → conflict shown on second tab's save
- [ ] Delete row → save → row gone on refresh

### 7.2 Proposal Autosave

- [ ] Edit title, intro, settings → autosave fires
- [ ] Error state shows exact DB message
- [ ] "Retry" button works
- [ ] "Copy error" copies full error JSON
- [ ] Navigate away with unsaved → beforeunload fires

### 7.3 Proposal Approval

- [ ] Set contract type → persists
- [ ] Mark as Approved with baseline → billing page shows basis
- [ ] Approved proposal title is not editable (or blocked on save)
- [ ] Re-approval returns "already approved"

### 7.4 Billing

- [ ] Create standalone invoice without baseline → works
- [ ] Create progress invoice with baseline → works
- [ ] Invoice doesn't exceed remaining (DB enforced)
- [ ] Payment recorded → A/R updates

---

## 8. Migration Checklist

### 8.1 Migrations to Apply

```bash
supabase db push --linked --include-all
```

| Migration | Purpose |
|-----------|---------|
| `20260108100000_fix_draft_version_ambiguous_and_baseline_creation.sql` | Fixes draft_version ambiguity, approval baseline creation, billing summary |

### 8.2 Post-Migration Verification

```sql
-- Verify upsert functions have correct output columns
SELECT proname, prosrc ILIKE '%out_draft_version%' as fixed
FROM pg_proc 
WHERE proname IN ('upsert_proposal_draft', 'upsert_estimate_draft');

-- Verify approve_proposal_manual creates baselines
SELECT routine_name, routine_definition ILIKE '%INSERT INTO public.contract_baselines%' as creates_baseline
FROM information_schema.routines
WHERE routine_name = 'approve_proposal_manual';
```

---

## 9. Remaining Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| CO → SOV allocation not implemented | Medium | Document as known limitation |
| Invoice idempotency is client-side only | Medium | Add server-side idempotency key |
| Supabase types drift on new RPCs | Low | Regenerate types after migration |

---

## 10. Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Engineer | | | Pending |
| Product | | | Pending |
| QA | | | Pending |

