# Phase 2: company_id Foundation (Hardened)

## Overview

This phase adds `company_id` (uuid) columns to all tenant-owned tables that were missing it. The goal is to establish a consistent tenant identifier across the entire database, enabling proper multi-tenant isolation in future phases.

**Migration:** `20251222003245_phase2_company_id_foundation.sql`

## Hardening Changes

This migration has been hardened for production safety:

| Change | Rationale |
|--------|-----------|
| **No foreign keys** | Columns added as `uuid` only, no `REFERENCES companies(id)`. FK constraints can be added in Phase 3 after verification. |
| **No SECURITY DEFINER** | All trigger functions use invoker rights. Only `SET search_path = 'public'` is kept. |
| **INSERT-only triggers** | Triggers fire on `BEFORE INSERT` only, not UPDATE. Prevents unexpected behavior on existing data. |
| **WHEN clause on triggers** | All triggers have `WHEN (NEW.company_id IS NULL)` to skip if already set. |
| **Reduced indexes** | Only essential indexes created. No `created_at` composites in Phase 2. |

## What This Phase Does

### 1. Adds `company_id` Columns (Nullable, No FK)

The following tables now have a `company_id uuid` column:

#### Tables with Direct `project_id` Relationship
| Table | Backfill Source |
|-------|----------------|
| `archived_daily_logs` | `projects.company_id` via `project_id` |
| `bid_packages` | `projects.company_id` via `project_id` |
| `budget_revisions` | `projects.company_id` via `project_id` |
| `cost_entries` | `projects.company_id` via `project_id` |
| `customer_payments` | `projects.company_id` via `project_id` |
| `daily_logs` | `projects.company_id` via `project_id` |
| `day_card_jobs` | `projects.company_id` via `project_id` |
| `documents` | `projects.company_id` via `project_id` |
| `estimates` | `projects.company_id` via `project_id` |
| `invoices` | `projects.company_id` via `project_id` |
| `material_receipts` | `projects.company_id` via `project_id` |
| `project_budget_lines` | `projects.company_id` via `project_id` |
| `project_budgets` | `projects.company_id` via `project_id` |
| `project_todos` | `projects.company_id` via `project_id` |
| `proposals` | `projects.company_id` via `project_id` |
| `scheduled_shifts` | `projects.company_id` via `project_id` |
| `schedule_of_values` | `projects.company_id` via `project_id` |
| `sub_contracts` | `projects.company_id` via `project_id` |
| `sub_invoices` | `projects.company_id` via `project_id` |
| `sub_scheduled_shifts` | `projects.company_id` via `project_id` |
| `time_log_allocations` | `projects.company_id` via `project_id` |

#### Tables with Indirect Relationships
| Table | Backfill Source |
|-------|----------------|
| `bid_invitations` | via `bid_packages` → `projects` |
| `estimate_items` | via `estimates` → `projects` |
| `invoice_items` | via `invoices` → `projects` |
| `labor_pay_run_items` | via `time_logs` → `projects` |
| `proposal_events` | via `proposals` → `projects` |
| `proposal_sections` | via `proposals` → `projects` |
| `project_budget_groups` | via `project_budgets` → `projects` |
| `scope_blocks` | via `entity_type`/`entity_id` (estimate/proposal only) |
| `scope_block_cost_items` | via `scope_blocks` |

#### Company-Scoped Entities (No Direct Project Link)
| Table | Notes |
|-------|-------|
| `subs` | Subcontractors - need manual company assignment |
| `material_vendors` | Vendors - need manual company assignment |
| `proposal_settings` | Per-company settings |
| `proposal_templates` | Per-company templates |
| `invitations` | User invitations |

### 2. Backfills Existing Data

All existing rows are backfilled using deterministic joins:

- **Primary strategy:** If table has `project_id`, get `company_id` from `projects`
- **Secondary strategies:**
  - Via parent tables (e.g., `estimate_items` → `estimates` → `projects`)
  - Via `worker_id` → `workers.company_id` as fallback
  - Via `day_card_id` → `day_cards.company_id` as fallback

### 3. Creates Indexes (Reduced Set)

Only essential indexes are created in Phase 2:

**Single-column indexes on `company_id`:**
- `invoices`, `invoice_items`
- `estimates`, `estimate_items`
- `documents`
- `daily_logs`
- `time_log_allocations`
- `schedule_of_values`
- `scheduled_shifts`
- `sub_contracts`, `sub_invoices`
- `customer_payments`

**Composite indexes `(company_id, project_id)`:**
- `invoices`
- `estimates`
- `daily_logs`
- `scheduled_shifts`
- `sub_invoices`
- `documents`

**NOT created in Phase 2:**
- `(company_id, created_at)` indexes - deferred to later phase

### 4. Creates Auto-Fill Triggers (INSERT-Only)

Lightweight `BEFORE INSERT` triggers with `WHEN (NEW.company_id IS NULL)`:

| Function | Derives company_id from |
|----------|------------------------|
| `auto_fill_company_id_from_project()` | `projects.company_id` |
| `auto_fill_company_id_from_estimate()` | `estimates` → `projects` |
| `auto_fill_company_id_from_invoice()` | `invoices` → `projects` |
| `auto_fill_company_id_from_proposal()` | `proposals` → `projects` |
| `auto_fill_company_id_from_bid_package()` | `bid_packages` → `projects` |
| `auto_fill_company_id_from_scope_block()` | `scope_blocks.company_id` |
| `auto_fill_company_id_from_project_budget()` | `project_budgets` → `projects` |
| `auto_fill_company_id_from_day_card()` | `day_cards.company_id` |
| `auto_fill_company_id_from_time_log()` | `time_logs.company_id` |

**Note:** Triggers only fire on INSERT, not UPDATE. The WHEN clause skips execution if `company_id` is already set.

## Tables Already Having company_id

These tables already had `company_id` before this migration:
- `companies` (the source of truth)
- `projects`
- `costs`
- `day_cards`
- `payments`
- `time_logs`
- `vendor_payments`
- `work_schedules`
- `workers`
- `labor_pay_runs` (has `payer_company_id`, `payee_company_id`)

## Tables NOT Modified

These tables are intentionally excluded as they are global/canonical:
- `trades` - shared trade definitions
- `cost_codes` - shared cost code catalog
- `measurement_units` - shared unit definitions
- `user_roles` - auth system table
- `activity_log` - audit log (entity-scoped, not company-scoped)
- `entity_change_log` - audit log (entity-scoped, not company-scoped)

## Verification

Run the verification script after migration:

```bash
# Via Supabase CLI (remote)
supabase db execute --file scripts/security/verify_company_id_backfill.sql

# Or via psql
psql $DATABASE_URL -f scripts/security/verify_company_id_backfill.sql
```

The script checks:
1. **NULL counts** - How many rows still have `company_id IS NULL`
2. **Mismatch checks** - Whether `company_id` matches the derived value from `projects`
3. **scope_blocks issues** - Lists `scope_blocks` where `entity_type NOT IN ('estimate','proposal')` and `company_id IS NULL`
4. **Summary statistics** - Percentage of rows with populated `company_id`
5. **Sample rows** - Shows example rows with NULL `company_id` for debugging

### Expected Results

After migration:
- Tables with `project_id` should have 0 NULL `company_id` (if `projects.company_id` is populated)
- Mismatch checks should show 0 mismatches
- `scope_blocks` with entity_type other than 'estimate'/'proposal' will have NULL (expected)
- Company-scoped entities (`subs`, `material_vendors`, etc.) may have NULL until manually assigned

## What This Phase Does NOT Do

- ❌ Does NOT add foreign key constraints (deferred to Phase 3)
- ❌ Does NOT add `NOT NULL` constraints (coming in Phase 3)
- ❌ Does NOT use SECURITY DEFINER functions
- ❌ Does NOT modify RLS policies
- ❌ Does NOT drop any policies
- ❌ Does NOT require local database or `supabase start`

## Next Steps (Future Phases)

### Phase 3: Enforce company_id
- Add foreign key constraints to `companies(id)`
- Add `NOT NULL` constraints after verification
- Fix any remaining NULL values

### Phase 4: RLS with company_id
- Update RLS policies to use `company_id` for tenant isolation
- Add company membership checks

## Rollback

If needed, the migration can be rolled back by:
1. Dropping the triggers
2. Dropping the indexes
3. Dropping the `company_id` columns

```sql
-- Example rollback for one table (repeat for all)
DROP TRIGGER IF EXISTS auto_fill_company_<table> ON <table>;
DROP INDEX IF EXISTS idx_<table>_company;
ALTER TABLE <table> DROP COLUMN IF EXISTS company_id;
```

## Files Created/Modified

1. **Migration:** `supabase/migrations/20251222003245_phase2_company_id_foundation.sql`
2. **Verification:** `scripts/security/verify_company_id_backfill.sql`
3. **Documentation:** `supabase/PHASE2_COMPANY_ID.md` (this file)
