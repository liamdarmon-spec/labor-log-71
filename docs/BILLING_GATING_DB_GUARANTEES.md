# Billing Gating DB Guarantees

## Summary

After migration `20260108120000_close_billing_gating_p0_gaps.sql`, it is **DB-impossible** for:

1. A proposal to be accepted/approved while `billing_basis` is NULL
2. A proposal to be accepted/approved while required milestones/SOV are missing
3. Milestones or SOV items to be mutated after a proposal is accepted (without explicit CO escape hatch)

## Implementation Details

### Triggers on `public.proposals`

| Trigger | Event | Function | Purpose |
|---------|-------|----------|---------|
| `enforce_proposal_billing_on_insert` | BEFORE INSERT | `tg_enforce_proposal_billing_on_insert()` | Block INSERTing already-accepted proposals (except fixed_price) |
| `enforce_proposal_billing_on_approval` | BEFORE UPDATE | `tg_enforce_proposal_billing_on_approval()` | Validate billing config on acceptance transition |
| `prevent_contract_type_change_after_approval` | BEFORE UPDATE | `tg_prevent_contract_type_change_after_approval()` | Lock contract_type/billing_basis after approval |

### Triggers on Billing Tables

| Table | Trigger | Function | Purpose |
|-------|---------|----------|---------|
| `payment_schedules` | `block_billing_schedule_mutation_after_acceptance` | `tg_block_billing_schedule_mutation_after_acceptance()` | Block edits when proposal accepted |
| `payment_schedule_items` | `block_billing_schedule_mutation_after_acceptance` | `tg_block_billing_schedule_mutation_after_acceptance()` | Block edits when proposal accepted |
| `sov_items` | `block_sov_mutation_after_acceptance` | `tg_block_sov_mutation_after_acceptance()` | Block edits when proposal accepted |

### Escape Hatch for Change Orders

To allow controlled mutation during CO processing, set:

```sql
SET LOCAL app.billing_revision_mode = 'on';
-- perform edits
RESET app.billing_revision_mode;
```

This should only be used inside controlled RPCs for change order application.

---

## SQL Validation Queries

Copy/paste this block into Supabase SQL Editor to validate:

```sql
-- =========================
-- 0) Column presence
-- =========================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'proposals'
  AND column_name IN ('acceptance_status', 'approved_at', 'billing_basis', 'contract_type', 'billing_readiness')
ORDER BY column_name;

-- =========================
-- 1) Find accepted proposals with missing/invalid config
-- =========================
SELECT id, company_id, project_id, acceptance_status, approved_at, 
       contract_type, billing_basis, billing_readiness
FROM public.proposals
WHERE acceptance_status = 'accepted'
  AND (
    contract_type IS NULL
    OR contract_type NOT IN ('fixed_price', 'milestone', 'progress_billing', 'sov')
    OR billing_basis IS NULL
    OR billing_readiness IS DISTINCT FROM 'locked'
  )
ORDER BY approved_at DESC NULLS LAST;

-- =========================
-- 2) Milestone contracts with 0 milestones
-- =========================
SELECT p.id AS proposal_id, p.company_id, p.project_id, p.contract_type, 
       COUNT(psi.id) AS milestone_count
FROM public.proposals p
LEFT JOIN public.payment_schedules ps ON ps.proposal_id = p.id
LEFT JOIN public.payment_schedule_items psi ON psi.payment_schedule_id = ps.id
  AND NOT COALESCE(psi.is_archived, false)
WHERE p.acceptance_status = 'accepted'
  AND p.contract_type = 'milestone'
GROUP BY p.id, p.company_id, p.project_id, p.contract_type
HAVING COUNT(psi.id) = 0;

-- =========================
-- 3) SOV contracts where total != proposal total
-- =========================
WITH sov_sum AS (
  SELECT p.id AS proposal_id, p.company_id, p.project_id, p.contract_type,
    COALESCE(SUM(COALESCE(si.scheduled_value, 0)), 0) AS sov_total,
    COALESCE(p.total_amount, 0) AS proposal_total
  FROM public.proposals p
  LEFT JOIN public.sov_items si ON si.proposal_id = p.id
    AND NOT COALESCE(si.is_archived, false)
  WHERE p.acceptance_status = 'accepted'
    AND p.contract_type IN ('sov', 'progress_billing')
  GROUP BY p.id, p.company_id, p.project_id, p.contract_type, p.total_amount
)
SELECT *
FROM sov_sum
WHERE sov_total = 0 OR ABS(sov_total - proposal_total) >= 0.01;

-- =========================
-- 4) Confirm triggers exist and are enabled
-- =========================
SELECT t.tgname, t.tgenabled,
  CASE t.tgenabled
    WHEN 'O' THEN 'enabled (origin)'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'R' THEN 'enabled (replica)'
    WHEN 'A' THEN 'enabled (always)'
    ELSE t.tgenabled::text
  END AS status,
  pg_get_triggerdef(t.oid, true) AS trigger_def
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('proposals', 'payment_schedules', 'payment_schedule_items', 'sov_items')
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- =========================
-- 5) Confirm functions exist
-- =========================
SELECT n.nspname, p.proname,
  p.prosecdef AS is_security_definer,
  p.provolatile,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_proposal_billing_ready',
    'is_proposal_accepted',
    'tg_enforce_proposal_billing_on_insert',
    'tg_enforce_proposal_billing_on_approval',
    'tg_prevent_contract_type_change_after_approval',
    'tg_block_billing_schedule_mutation_after_acceptance',
    'tg_block_sov_mutation_after_acceptance',
    'approve_proposal_manual'
  )
ORDER BY p.proname;

-- =========================
-- 6) RLS status
-- =========================
SELECT n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('proposals', 'payment_schedules', 'payment_schedule_items', 'sov_items');
```

---

## Manual UI Test Script (10 steps)

1. **Open a draft proposal** in ProposalBuilderV2
2. **Set Contract Type = Milestone** (no milestones defined yet)
3. **Click "Mark as Approved"** → expect error: "At least one milestone must be defined"
4. **Add 1 milestone** via milestone editor
5. **Click "Mark as Approved"** → expect success
6. **Go to milestone editor and try to delete the milestone** → expect error: "Cannot modify billing schedule for accepted proposal"
7. **Create a new draft proposal with Contract Type = Progress Billing (SOV)**
8. **Add SOV items totaling 99%**, then try approval → expect error: "SOV allocation must total exactly 100%"
9. **Adjust SOV to exactly 100%**, then approve → expect success
10. **Go to Project Billing tab** → verify "Billing Basis" shows correct value (not "Not set") even if baseline pending

---

## Remaining Risks

### P0 (Closed by this migration)
- ✅ INSERT bypass: blocked by BEFORE INSERT trigger
- ✅ Post-acceptance milestone/SOV mutation: blocked by triggers
- ✅ Tenant-unsafe readiness function: now checks `authed_company_ids()`
- ✅ UI "Not set" lie: fixed conditional

### P1 (Closed in 20260108130000)
- ✅ Milestone total validation: now enforces sum == proposal.total_amount
- ✅ Escape hatch: now secured with `apply_billing_revision()` RPC + audit logging

### P2 (Post-launch hardening)
- Consider storing SOV as integer basis points (0-10000) for exact precision

