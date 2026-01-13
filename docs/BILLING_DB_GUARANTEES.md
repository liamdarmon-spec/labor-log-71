## Billing DB guarantees (invariants → enforcement)

### Approval gating (no “approved but misconfigured billing”)
- **Invariant**: Proposal cannot be accepted/approved unless billing config is valid for contract_type.
  - **Enforced by**: `public.tg_enforce_proposal_billing_on_approval()` trigger on `public.proposals`
  - **Source**: `supabase/migrations/20260108130000_billing_gating_hardening_and_proof.sql`

- **Invariant**: INSERT bypass is blocked (cannot INSERT already-accepted milestone/SOV proposals).
  - **Enforced by**: `public.tg_enforce_proposal_billing_on_insert()` trigger on `public.proposals`
  - **Source**: `supabase/migrations/20260108120000_close_billing_gating_p0_gaps.sql`

- **Invariant**: After approval, `contract_type`, `billing_basis`, `billing_readiness` cannot be changed.
  - **Enforced by**: `public.tg_prevent_contract_type_change_after_approval()` trigger on `public.proposals`
  - **Source**: `supabase/migrations/20260108110000_canonical_contract_billing_lock.sql`

- **Invariant**: Accepted base proposals are immutable (contract document immutability).
  - **Enforced by**: `public.tg_prevent_mutation_of_accepted_base_proposals()` trigger on `public.proposals`
  - **Source**: `supabase/migrations/20260107205000_prevent_mutation_of_accepted_base_proposals.sql`

### Post-acceptance mutation locks (schedule/SOV cannot drift)
- **Invariant**: Cannot mutate payment schedules after proposal accepted unless revision mode is explicitly enabled.
  - **Enforced by**: `public.tg_block_billing_schedule_mutation_after_acceptance()` triggers on `public.payment_schedules` and `public.payment_schedule_items`
  - **Escape hatch**: `current_setting('app.billing_revision_mode', true) = 'on'`
  - **Source**: `supabase/migrations/20260108120000_close_billing_gating_p0_gaps.sql`

- **Invariant**: Cannot mutate SOV after proposal accepted unless revision mode is explicitly enabled.
  - **Enforced by**: `public.tg_block_sov_mutation_after_acceptance()` trigger on `public.sov_items`
  - **Escape hatch**: `current_setting('app.billing_revision_mode', true) = 'on'`
  - **Source**: `supabase/migrations/20260108120000_close_billing_gating_p0_gaps.sql`

### Escape hatch is audited and off by default
- **Default**: Off by default (`current_setting('app.billing_revision_mode', true)` returns NULL unless set).
- **Only intended setter**: `public.apply_billing_revision(...)` which:
  - Validates tenant membership via `authed_company_ids()`
  - Requires proposal accepted
  - Requires non-empty reason
  - Inserts audit row into `public.billing_revision_audit`
  - Sets `set_config('app.billing_revision_mode','on', true)` (transaction-local)
  - **Source**: `supabase/migrations/20260108130000_billing_gating_hardening_and_proof.sql`

### Copy/paste SQL validation (run in Supabase SQL editor)

```sql
-- Accepted proposals must be billing-ready
SELECT
  p.id,
  p.company_id,
  p.project_id,
  p.contract_type,
  p.billing_basis,
  p.billing_readiness,
  p.total_amount,
  p.approved_at
FROM public.proposals p
WHERE p.acceptance_status = 'accepted'
  AND (p.billing_readiness IS DISTINCT FROM 'locked'
       OR p.contract_type IS NULL
       OR p.approved_at IS NULL);

-- Accepted milestone proposals must have milestones summing to proposal total
SELECT
  p.id,
  p.total_amount,
  COALESCE(SUM(psi.scheduled_amount),0) AS milestone_total,
  COUNT(*) AS milestone_count
FROM public.proposals p
JOIN public.payment_schedules ps ON ps.proposal_id = p.id
JOIN public.payment_schedule_items psi ON psi.payment_schedule_id = ps.id
WHERE p.acceptance_status = 'accepted'
  AND p.contract_type = 'milestone'
  AND NOT COALESCE(psi.is_archived, false)
GROUP BY p.id, p.total_amount
HAVING COUNT(*) = 0 OR ABS(COALESCE(SUM(psi.scheduled_amount),0) - COALESCE(p.total_amount,0)) > 0.01;

-- Accepted SOV/progress proposals must have SOV sum = proposal total
SELECT
  p.id,
  p.total_amount,
  COALESCE(SUM(si.scheduled_value),0) AS sov_total,
  COUNT(*) AS sov_count
FROM public.proposals p
LEFT JOIN public.sov_items si ON si.proposal_id = p.id AND NOT COALESCE(si.is_archived, false)
WHERE p.acceptance_status = 'accepted'
  AND p.contract_type IN ('sov','progress_billing')
GROUP BY p.id, p.total_amount
HAVING COUNT(si.id) = 0 OR ABS(COALESCE(SUM(si.scheduled_value),0) - COALESCE(p.total_amount,0)) > 0.01;

-- Escape hatch audit must exist when used
SELECT *
FROM public.billing_revision_audit
ORDER BY created_at DESC
LIMIT 50;
```


