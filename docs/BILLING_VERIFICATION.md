# Billing System Verification Checklist

## 1. Database Reset & Lint

```bash
# Reset local database
npm run db:reset

# Check migrations applied
supabase migration list | tail -10

# Lint (if linked to remote)
supabase db lint --linked
```

## 2. Verify Schema Objects

Run in local Supabase SQL Editor or `psql`:

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'contract_baselines',
  'contract_milestones', 
  'contract_sov_lines',
  'invoice_milestone_allocations',
  'invoice_sov_lines',
  'document_snapshots'
)
ORDER BY 1;

-- Verify RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'contract_baselines',
  'contract_milestones', 
  'contract_sov_lines',
  'invoice_milestone_allocations',
  'invoice_sov_lines'
);

-- Verify RPC functions exist
SELECT proname 
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
AND proname IN (
  'get_project_billing_summary',
  'get_contract_billing_lines',
  'accept_proposal_create_baseline',
  'approve_change_order',
  'create_invoice_from_milestones',
  'create_invoice_from_sov',
  'generate_change_order_pdf',
  'generate_invoice_pdf'
)
ORDER BY 1;
```

## 3. Verify Tenant Isolation (RLS)

```sql
-- Check all billing tables have tenant_* policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
  'contract_baselines',
  'contract_milestones', 
  'contract_sov_lines',
  'invoice_milestone_allocations',
  'invoice_sov_lines'
)
ORDER BY 1, 2;

-- Verify policies use authed_company_ids()
SELECT tablename, policyname, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'contract_baselines'
AND policyname = 'tenant_select';
```

## 4. Test Contract Baseline Creation

```sql
-- Simulate baseline creation (replace UUIDs with real ones)
-- This tests the entire flow

-- 1. Check proposal exists and is pending
SELECT id, title, acceptance_status, billing_basis 
FROM proposals 
WHERE project_id = 'YOUR_PROJECT_ID' 
AND parent_proposal_id IS NULL;

-- 2. Set billing basis if not set
UPDATE proposals 
SET billing_basis = 'payment_schedule'
WHERE id = 'YOUR_PROPOSAL_ID';

-- 3. Create baseline (via RPC in app)
-- SELECT * FROM accept_proposal_create_baseline('YOUR_PROPOSAL_ID');

-- 4. Verify baseline created
SELECT * FROM contract_baselines 
WHERE project_id = 'YOUR_PROJECT_ID';
```

## 5. Verify Billing Summary Function

```sql
-- Test the canonical billing summary (replace with real project_id)
SELECT * FROM get_project_billing_summary('00000000-0000-0000-0000-000000000000'::uuid);

-- Verify all columns returned
SELECT 
  has_contract_baseline,
  billing_basis,
  current_contract_total,
  billed_to_date,
  open_ar,
  remaining_to_bill
FROM get_project_billing_summary('YOUR_PROJECT_ID'::uuid);
```

## 6. Test Ceiling Constraints

```sql
-- Verify milestone allocations respect ceiling
-- This should FAIL if amount > remaining:

-- 1. Get a milestone with some value
SELECT id, name, scheduled_amount, invoiced_amount, remaining_amount
FROM contract_milestones
WHERE contract_baseline_id = 'YOUR_BASELINE_ID';

-- 2. Try to over-allocate (should error)
SELECT * FROM create_invoice_from_milestones(
  'YOUR_PROJECT_ID'::uuid,
  '[{"milestone_id": "YOUR_MILESTONE_ID", "amount": 999999999}]'::jsonb
);
-- Expected: ERROR - Allocation exceeds available amount
```

## 7. Verify Generated Columns

```sql
-- contract_baselines.current_contract_total
SELECT 
  base_contract_total,
  approved_change_order_total,
  current_contract_total,
  (base_contract_total + approved_change_order_total) as computed
FROM contract_baselines;

-- contract_milestones.remaining_amount
SELECT 
  scheduled_amount,
  invoiced_amount,
  remaining_amount,
  (scheduled_amount - invoiced_amount) as computed
FROM contract_milestones;

-- contract_sov_lines percent_complete
SELECT 
  scheduled_value,
  total_billed,
  percent_complete,
  CASE WHEN scheduled_value > 0 
    THEN (total_billed / scheduled_value * 100)
    ELSE 0 
  END as computed
FROM contract_sov_lines;
```

## 8. UI Verification Steps

### 8.1 Before Baseline
1. Navigate to Project → Billing tab
2. Should see "No Contract Baseline" warning
3. Should see "Create Baseline" button if proposals exist
4. Change Orders tab should be disabled or show lock message

### 8.2 Create Baseline Flow
1. Click "Create Baseline"
2. Select a proposal
3. Choose billing method (Payment Schedule or SOV)
4. Click create
5. Should see success toast
6. Billing basis badge should appear with "Locked" indicator

### 8.3 Change Order Flow
1. Create a change order (draft)
2. Send the change order
3. Approve the change order
4. Verify contract value increased by CO amount
5. All values should update from canonical function

### 8.4 Billing Lines
1. Check Milestones/SOV tab shows frozen baseline items
2. Verify scheduled amounts match proposal/SOV items
3. Verify invoiced/remaining columns update after invoicing

## 9. Indexes Verification

```sql
-- Verify hot path indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN (
  'contract_baselines',
  'contract_milestones',
  'contract_sov_lines',
  'invoice_milestone_allocations',
  'invoice_sov_lines',
  'change_orders'
)
ORDER BY tablename, indexname;
```

## 10. Final Acceptance Criteria

- [ ] `npm run db:reset` passes cleanly
- [ ] All 8 RPC functions exist and are callable
- [ ] All 5 new tables have RLS enabled with tenant_* policies
- [ ] Contract baseline can be created from accepted proposal
- [ ] Billing basis is locked after baseline creation
- [ ] Change orders update contract value when approved
- [ ] Billing summary returns all expected fields
- [ ] Milestone/SOV ceiling constraints prevent over-billing
- [ ] UI shows locked billing method badge
- [ ] All totals come from canonical function (no frontend math)

