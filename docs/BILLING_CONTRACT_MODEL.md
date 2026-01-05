# Billing & Contract Model

## Overview

The Forma ERP billing system is designed around three core principles:

1. **Canonical**: Every billing number traces to an approved upstream decision
2. **Security**: Full tenant isolation via RLS
3. **Performance**: Server-side aggregation with indexed hot paths

## Business Flow

```
Proposal (with billing_basis)
    ↓
Accept Proposal
    ↓
Contract Baseline Created (billing_basis LOCKED)
    ├── If payment_schedule → contract_milestones frozen
    └── If sov → contract_sov_lines frozen
    ↓
Change Orders (modify contract ceiling only)
    ↓
Invoices (respect ceiling constraints)
    ↓
Payments (reduce A/R)
```

## Key Concepts

### Contract Baseline

The **Contract Baseline** is the immutable foundation of billing. It's created when a proposal is accepted and captures:

- `billing_basis`: Either `payment_schedule` or `sov` - **LOCKED forever**
- `base_contract_total`: The original contract value
- `approved_change_order_total`: Sum of approved COs
- `current_contract_total`: Computed as base + approved COs

**Important**: The billing basis cannot be changed after baseline creation. This is intentional to ensure billing consistency and auditability.

### Billing Basis

#### Payment Schedule (Milestones)

- Traditional milestone-based billing
- Each milestone has a scheduled amount
- Invoices reference one or more milestones
- Cannot invoice more than the milestone amount

#### Schedule of Values (SOV)

- AIA G702/G703 style progress billing
- Each line item has a scheduled value
- Invoices represent billing periods with amounts per line
- Tracks previous/current/remaining per line

### Change Orders

Change Orders modify the contract ceiling but do NOT:
- Rewrite milestones
- Rewrite SOV lines
- Automatically allocate to billing lines

They simply raise or lower the total contract value.

**Workflow**: `draft` → `sent` → `approved` / `rejected` / `void`

Only **approved** COs affect the contract total.

### Invoices

Invoices are the billing action. They respect the billing basis:

- **Milestone mode**: Invoice references milestone allocations
- **SOV mode**: Invoice represents a billing period with per-line amounts

**Ceiling constraints** are enforced in SQL:
- Cannot allocate more than remaining milestone amount
- Cannot bill more than remaining SOV line value

### Payments

Payments record cash received. They:
- Reduce open A/R
- Do NOT affect contract totals
- Can be applied to specific invoices (optional)

## UI States

### State A: No Contract Baseline

- Banner: "No Contract Baseline"
- CTA: "Go to Proposals"
- Summary cards show $0
- No tabs for milestones/SOV

### State B: Baseline with payment_schedule

- Tabs: Summary | Milestones | Change Orders | Invoices | Payments
- Default tab: Milestones
- Badge: "Payment Schedule (Locked)"

### State C: Baseline with sov

- Tabs: Summary | SOV | Change Orders | Invoices | Payments
- Default tab: SOV
- Badge: "Schedule of Values (Locked)"

## Canonical Math

All billing calculations are performed server-side via `get_project_billing_summary()`:

```sql
base_contract_total          -- From accepted proposal
approved_change_order_total  -- Sum of approved COs
current_contract_total       -- base + approved_cos (generated column)
billed_to_date               -- Sum of non-void invoices
paid_to_date                 -- Sum of payments
open_ar                      -- billed - paid
remaining_to_bill            -- contract - billed
```

**The frontend NEVER computes these values.** It only displays them.

## Database Tables

### Core Tables

| Table | Purpose |
|-------|---------|
| `contract_baselines` | One per project, freezes billing setup |
| `contract_milestones` | Frozen milestone schedule |
| `contract_sov_lines` | Frozen SOV schedule |
| `change_orders` | Contract modifications |
| `invoices` | Billing documents |
| `invoice_milestone_allocations` | Links invoices to milestones |
| `invoice_sov_lines` | Links invoices to SOV lines |
| `customer_payments` | Cash receipts |

### RPC Functions

| Function | Purpose |
|----------|---------|
| `accept_proposal_create_baseline` | Accept proposal → create baseline |
| `approve_change_order` | Approve CO → update contract value |
| `create_invoice_from_milestones` | Create invoice with ceiling validation |
| `create_invoice_from_sov` | Create pay app with ceiling validation |
| `get_project_billing_summary` | Canonical billing summary |
| `get_contract_billing_lines` | Returns milestones OR SOV lines |

## Security

All tables have RLS policies using:
- `authed_company_ids()` for tenant isolation
- `tenant_select/insert/update/delete` naming convention

All RPC functions use `SECURITY INVOKER` to respect caller's permissions.

## PDF Readiness

Each entity has fields for PDF artifacts:
- `pdf_document_id` - Reference to documents table
- `pdf_snapshot jsonb` - Frozen data at generation time

Once a document is "sent", its PDF is immutable.

## How to Test

### 1. New Project (No Baseline)
- Navigate to Project → Billing
- Should see "No Contract Baseline" banner
- Summary cards should show $0
- No Milestones/SOV tabs visible

### 2. Create Baseline (Payment Schedule)
- Go to Proposals
- Create a proposal with billing_basis = 'payment_schedule'
- Accept the proposal
- Return to Billing
- Should see "Payment Schedule (Locked)" badge
- Should see Milestones tab

### 3. Create Baseline (SOV)
- Go to Proposals
- Create a proposal with billing_basis = 'sov'
- Accept the proposal
- Return to Billing
- Should see "Schedule of Values (Locked)" badge
- Should see SOV tab

### 4. Change Order Flow
- Create a change order (draft)
- Send the change order
- Approve the change order
- Contract value should increase by CO amount

### 5. Invoice Flow
- Create an invoice
- Billed to Date should increase
- Remaining to Bill should decrease

### 6. Payment Flow
- Record a payment
- Paid amount should increase
- Open A/R should decrease

