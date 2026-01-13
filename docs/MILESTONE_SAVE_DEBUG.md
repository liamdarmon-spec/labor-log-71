## Milestone Save Debug (DB vs UI) — Evidence Log

### Context
Milestone Schedule amounts looked correct in the editor, but after **Save** they collapsed to **$0.00** and approval could fail with trigger/tuple issues.

### What the UI renders from (proof)
`src/hooks/useProposalData.ts` currently renders priced scope (`proposal.allItems`) from the **linked estimate scope**, not proposal scope:

```165:181:src/hooks/useProposalData.ts
      const { data: blocks } = await supabase
        .from('scope_blocks')
        .select(`
          id,
          scope_block_cost_items (
            id, area_label, group_label, category,
            description, quantity, unit, unit_price,
            markup_percent, line_total, cost_code_id,
            cost_codes (code, name)
          )
        `)
        .eq('entity_type', 'estimate')
        .eq('entity_id', proposal.primary_estimate_id)
        .eq('block_type', 'cost_items');
```

This can show a non-zero contract value even if `public.proposals.total_amount` is 0.

### What was happening in the DB (root cause)
Historically, the DB had a trigger on `public.payment_schedule_items` that recalculated `scheduled_amount` on write using a “contract total” that could be 0 (due to proposal total drift / estimate-backed pricing). That caused saved milestone rows to reload as `$0.00`.

Additionally, approval could fail with:
`tuple to be updated was already modified by an operation triggered by the current command`
because a helper called during a proposals update performed an `UPDATE public.proposals` as a side-effect.

### Canonical fixes implemented
- UI now **persists absolute `scheduled_amount` for every row** (fixed/percentage/remaining) deterministically.
- DB no longer overwrites milestone scheduled amounts on save (recalc trigger removed).
- Approval/readiness are **side-effect free** relative to `public.proposals` row updates.
- Proposal contract total derivation is canonical for estimate-backed proposals (uses estimate scope if proposal scope not present).

### Required SQL (copy/paste)
> Replace `<proposal_id>` with the proposal uuid from the route (e.g. `/app/proposals/<proposal_id>`).

**SQL #1 — milestone rows**
```sql
select
  psi.id,
  psi.title,
  psi.sort_order,
  psi.allocation_mode,
  psi.percent_of_contract,
  psi.fixed_amount,
  psi.scheduled_amount,
  psi.is_archived,
  psi.updated_at
from public.payment_schedule_items psi
join public.payment_schedules ps on ps.id = psi.payment_schedule_id
where ps.proposal_id = '<proposal_id>'::uuid
order by psi.sort_order;
```

**SQL #2 — proposal totals**
```sql
select
  p.id,
  p.total_amount,
  p.contract_type,
  p.billing_basis,
  p.billing_readiness,
  p.acceptance_status,
  p.approved_at,
  p.updated_at
from public.proposals p
where p.id = '<proposal_id>'::uuid;
```

**SQL #3 — schedule parent**
```sql
select ps.id, ps.proposal_id, ps.created_at, ps.updated_at
from public.payment_schedules ps
where ps.proposal_id = '<proposal_id>'::uuid;
```


