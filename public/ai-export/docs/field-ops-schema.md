# Field Operations Schema Documentation
## Pillar 2 – Workforce OS Backend

---

## Overview

This document provides a comprehensive reference for all database objects related to **Field Operations** (Workforce OS), which includes scheduling, time tracking, and labor payment management.

---

## Core Tables

### 1. `work_schedules` ✅ CANONICAL
**Purpose**: Scheduling source of truth for planned labor assignments

**Key Columns**:
- `id` (uuid, PK)
- `worker_id` (uuid, FK → workers)
- `project_id` (uuid, FK → projects)
- `company_id` (uuid, FK → companies) - Auto-populated from project
- `trade_id` (uuid, FK → trades) - Auto-assigned from worker if NULL
- `cost_code_id` (uuid, FK → cost_codes) - Auto-assigned based on trade
- `scheduled_date` (date)
- `scheduled_hours` (numeric)
- `status` (text) - Values: 'planned', 'synced', 'split_modified', 'split_created', 'converted'
- `converted_to_timelog` (boolean, default: false)
- `source_schedule_id` (uuid, FK → work_schedules, nullable) - For split schedules
- `last_synced_at` (timestamp, nullable)
- `notes` (text, nullable)
- `created_by` (uuid, nullable)

**Relationships**:
- `worker_id` → workers.id
- `project_id` → projects.id
- `company_id` → companies.id
- `trade_id` → trades.id
- `cost_code_id` → cost_codes.id
- Linked to time_logs via time_logs.source_schedule_id

**Triggers**:
- BEFORE INSERT/UPDATE: `auto_set_schedule_trade()` - Sets trade_id from worker if NULL
- BEFORE INSERT/UPDATE: `auto_populate_company_id()` - Fills company_id from project
- AFTER INSERT/UPDATE: `sync_work_schedule_to_time_log()` - Auto-syncs to time_logs for past dates

**Related Functions**:
- `split_schedule_for_multi_project()` - Splits schedule across multiple projects

---

### 2. `time_logs` ✅ CANONICAL
**Purpose**: Labor actuals source of truth - records actual hours worked

**Key Columns**:
- `id` (uuid, PK)
- `worker_id` (uuid, FK → workers)
- `project_id` (uuid, FK → projects)
- `company_id` (uuid, FK → companies) - Auto-populated from project
- `trade_id` (uuid, FK → trades) - Auto-assigned from schedule or worker
- `cost_code_id` (uuid, FK → cost_codes) - Auto-assigned based on trade
- `date` (date, default: CURRENT_DATE)
- `hours_worked` (numeric)
- `hourly_rate` (numeric, nullable) - Auto-populated from worker
- `labor_cost` (numeric, generated) - Computed as hours_worked * hourly_rate
- `payment_status` (text, default: 'unpaid') - Values: 'unpaid', 'paid', 'pending'
- `paid_amount` (numeric, nullable, default: 0)
- `source_schedule_id` (uuid, FK → work_schedules, nullable) - Link to originating schedule
- `last_synced_at` (timestamp, nullable)
- `notes` (text, nullable)
- `created_by` (uuid, nullable)

**Relationships**:
- `worker_id` → workers.id
- `project_id` → projects.id
- `company_id` → companies.id
- `trade_id` → trades.id
- `cost_code_id` → cost_codes.id
- `source_schedule_id` → work_schedules.id (nullable for manual entries)
- Linked from labor_pay_run_items.time_log_id

**Triggers**:
- BEFORE INSERT/UPDATE: `auto_set_time_log_trade_and_cost_code()` - Sets trade_id and cost_code_id with priority logic
- BEFORE INSERT/UPDATE: `auto_populate_company_id()` - Fills company_id from project
- BEFORE INSERT/UPDATE: `auto_populate_worker_rate()` - Fills hourly_rate from worker
- AFTER INSERT/UPDATE: `sync_time_log_to_work_schedule()` - Bi-directional sync back to schedule

**Related Functions**:
- `split_time_log_for_multi_project()` - Splits time log across multiple projects

---

### 3. `workers` ✅ CANONICAL
**Purpose**: Worker registry with default rates and trades

**Key Columns**:
- `id` (uuid, PK)
- `name` (text)
- `trade` (text) - Legacy field
- `trade_id` (uuid, FK → trades, nullable)
- `hourly_rate` (numeric) - Default rate used in time_logs
- `phone` (text, nullable)
- `active` (boolean, default: true)
- `created_at`, `updated_at` (timestamps)

**Relationships**:
- `trade_id` → trades.id
- Referenced by work_schedules.worker_id
- Referenced by time_logs.worker_id

**Notes**:
- `hourly_rate` is auto-populated into time_logs via `auto_populate_worker_rate()`
- `trade_id` is used as fallback for schedule/time log trade assignment

---

### 4. `trades` ✅ CANONICAL
**Purpose**: Trade registry with default cost code mappings

**Key Columns**:
- `id` (uuid, PK)
- `name` (text)
- `description` (text, nullable)
- `default_labor_cost_code_id` (uuid, FK → cost_codes, nullable)
- `default_sub_cost_code_id` (uuid, FK → cost_codes, nullable)
- `created_at` (timestamp)

**Relationships**:
- `default_labor_cost_code_id` → cost_codes.id
- `default_sub_cost_code_id` → cost_codes.id
- Referenced by workers.trade_id
- Referenced by work_schedules.trade_id
- Referenced by time_logs.trade_id

**Notes**:
- Used by auto-assignment triggers to populate cost_code_id for labor entries

---

### 5. `cost_codes` ✅ CANONICAL
**Purpose**: Cost code registry for budget and actual categorization

**Key Columns**:
- `id` (uuid, PK)
- `code` (text)
- `name` (text)
- `category` (text) - Values: 'labor', 'subs', 'materials', 'other'
- `trade_id` (uuid, FK → trades, nullable)
- `default_trade_id` (uuid, FK → trades, nullable)
- `is_active` (boolean, default: true)
- `created_at`, `updated_at` (timestamps)

**Relationships**:
- `trade_id` → trades.id
- `default_trade_id` → trades.id
- Referenced by work_schedules.cost_code_id
- Referenced by time_logs.cost_code_id
- Referenced by project_budget_lines.cost_code_id
- Referenced by costs.cost_code_id

---

### 6. `labor_pay_runs` ✅ CANONICAL
**Purpose**: Labor payment batch management

**Key Columns**:
- `id` (uuid, PK)
- `payer_company_id` (uuid, FK → companies, nullable)
- `payee_company_id` (uuid, FK → companies, nullable)
- `date_range_start` (date)
- `date_range_end` (date)
- `total_amount` (numeric, default: 0)
- `status` (text, default: 'draft') - Values: 'draft', 'paid'
- `payment_method` (text, nullable)
- `notes` (text, nullable)
- `created_by` (uuid, nullable)
- `created_at`, `updated_at` (timestamps)

**Relationships**:
- `payer_company_id` → companies.id
- `payee_company_id` → companies.id
- Linked to labor_pay_run_items via labor_pay_run_items.pay_run_id

**Triggers**:
- AFTER UPDATE: `mark_time_logs_paid_on_pay_run()` - When status changes to 'paid', updates associated time_logs

---

### 7. `labor_pay_run_items` ✅ CANONICAL
**Purpose**: Line items linking time_logs to pay runs

**Key Columns**:
- `id` (uuid, PK)
- `pay_run_id` (uuid, FK → labor_pay_runs)
- `time_log_id` (uuid, FK → time_logs)
- `worker_id` (uuid, FK → workers, nullable)
- `hours` (numeric, nullable)
- `rate` (numeric, nullable)
- `amount` (numeric)
- `created_at` (timestamp)

**Relationships**:
- `pay_run_id` → labor_pay_runs.id
- `time_log_id` → time_logs.id
- `worker_id` → workers.id

**Notes**:
- Links time_logs to payment batches
- When pay run is marked 'paid', trigger updates time_logs.payment_status

---

## Supporting Tables

### `projects` ✅ CANONICAL
**Purpose**: Project anchor - all field ops tie to projects

**Key Columns**:
- `id` (uuid, PK)
- `project_name` (text)
- `client_name` (text)
- `status` (text)
- `company_id` (uuid, FK → companies, nullable)

**Notes**:
- All schedules and time logs reference project_id
- `company_id` is auto-populated into work_schedules and time_logs

---

### `companies` ✅ CANONICAL
**Purpose**: Company registry for multi-company operations

**Key Columns**:
- `id` (uuid, PK)
- `name` (text)

**Notes**:
- Auto-populated in work_schedules and time_logs from project.company_id
- Used for filtering and grouping in Workforce OS

---

## Database Functions

### Auto-Population Functions

#### `auto_populate_company_id()`
- **Type**: BEFORE INSERT/UPDATE trigger
- **Purpose**: Auto-fills company_id from project.company_id
- **Used on**: work_schedules, time_logs, costs

#### `auto_populate_worker_rate()`
- **Type**: BEFORE INSERT/UPDATE trigger
- **Purpose**: Auto-fills hourly_rate from workers.hourly_rate
- **Used on**: time_logs

#### `auto_set_schedule_trade()`
- **Type**: BEFORE INSERT/UPDATE trigger
- **Purpose**: Sets trade_id from worker if NULL
- **Used on**: work_schedules

#### `auto_set_time_log_trade_and_cost_code()`
- **Type**: BEFORE INSERT/UPDATE trigger
- **Purpose**: Sets trade_id and cost_code_id with priority logic:
  1. Explicit value from UI/API
  2. From linked work_schedule
  3. From worker's primary trade
- **Used on**: time_logs

---

### Sync Functions

#### `sync_work_schedule_to_time_log()`
- **Type**: AFTER INSERT/UPDATE trigger
- **Purpose**: Auto-syncs work_schedules to time_logs when:
  - scheduled_date < CURRENT_DATE (past dates)
  - converted_to_timelog = true (manual conversion)
- **Behavior**: Creates or updates time_logs with source_schedule_id link
- **Used on**: work_schedules

#### `sync_time_log_to_work_schedule()`
- **Type**: AFTER INSERT/UPDATE trigger
- **Purpose**: Bi-directional sync - updates work_schedule when time_log changes
- **Condition**: Only syncs if schedule_date < CURRENT_DATE
- **Used on**: time_logs

---

### Split Functions

#### `split_schedule_for_multi_project(p_original_schedule_id uuid, p_time_log_entries jsonb)`
- **Type**: RPC function
- **Returns**: TABLE(schedule_id uuid, time_log_id uuid)
- **Purpose**: Splits a single work_schedule across multiple projects/trades
- **Behavior**:
  - First entry updates the original schedule
  - Additional entries create new work_schedules with status 'split_created'
  - All entries create/update corresponding time_logs
  - All splits inherit original's source_schedule_id (if any)

#### `split_time_log_for_multi_project(p_original_time_log_id uuid, p_entries jsonb)`
- **Type**: RPC function
- **Returns**: TABLE(time_log_id uuid, source_schedule_id uuid)
- **Purpose**: Splits a single time_log across multiple projects/trades
- **Behavior**:
  - First entry updates the original time_log
  - Additional entries create new time_logs
  - All splits preserve original's source_schedule_id (may be NULL for manual logs)

---

### Payment Functions

#### `mark_time_logs_paid_on_pay_run()`
- **Type**: AFTER UPDATE trigger on labor_pay_runs
- **Purpose**: When pay run status → 'paid', updates time_logs:
  - Sets payment_status = 'paid'
  - Sets paid_amount = labor_cost
- **Used on**: labor_pay_runs

---

## Key Constraints & Rules

### Schedule-to-TimeLog Sync Rules
1. **One-way primary sync**: work_schedules → time_logs for past dates only
2. **Manual conversion**: User can force sync by setting converted_to_timelog = true
3. **Manual time logs**: time_logs with source_schedule_id = NULL are standalone entries
4. **Bi-directional updates**: Changes to time_logs can sync back to work_schedules for past dates

### Split Preservation Rules
1. **Schedule splits**: All split schedules create new time_logs with matching source_schedule_id
2. **Time log splits**: All split time_logs preserve original's source_schedule_id (may be NULL)
3. **Manual log splits**: If source_schedule_id = NULL, all splits also have NULL (no FK violations)

### Trade & Cost Code Assignment Priority
**For schedules**:
1. Explicit trade_id from UI
2. Worker's default trade_id

**For time logs**:
1. Explicit trade_id from UI
2. Trade from linked work_schedule
3. Worker's default trade_id

**Cost codes**: Auto-assigned from trade's default_labor_cost_code_id

---

## Related Tables (Money Pillar)

### `costs` ✅ CANONICAL
- General cost ledger
- Labor costs from pay runs referenced via payment_id
- Can link cost_code_id for categorization

### `material_receipts` ✅ CANONICAL
- Material purchase tracking
- Syncs to costs via `sync_material_receipt_to_cost()`

---

## Views & Aggregations

### Common Queries

**Unpaid labor summary**:
```sql
SELECT worker_id, SUM(labor_cost) as total_unpaid
FROM time_logs
WHERE payment_status = 'unpaid'
GROUP BY worker_id;
```

**Schedule vs actuals**:
```sql
SELECT 
  ws.scheduled_date,
  ws.worker_id,
  ws.scheduled_hours,
  tl.hours_worked,
  (tl.hours_worked - ws.scheduled_hours) as variance
FROM work_schedules ws
LEFT JOIN time_logs tl ON tl.source_schedule_id = ws.id;
```

**Manual vs scheduled time logs**:
```sql
SELECT 
  CASE 
    WHEN source_schedule_id IS NOT NULL THEN 'scheduled'
    ELSE 'manual'
  END as log_type,
  COUNT(*) as count,
  SUM(hours_worked) as total_hours
FROM time_logs
GROUP BY log_type;
```

---

## Migration Notes

### Legacy Tables (DO NOT USE)
- `scheduled_shifts` → Replaced by work_schedules
- `daily_logs` → Replaced by time_logs
- `day_cards` → Replaced by time_logs aggregations
- `day_card_jobs` → Replaced by time_logs with cost_code_id
- `payments` → Replaced by labor_pay_runs flow

These tables are preserved for historical data only.

---

## Summary

**Canonical Flow**:
1. Create work_schedule (planned labor)
2. Auto-sync to time_log when date passes or manually converted
3. Time logs grouped by worker+date in UI
4. Pay runs consume unpaid time_logs
5. When pay run marked paid, time_logs.payment_status → 'paid'

**Key Features**:
- Automatic sync between schedules and time logs
- Support for manual time log entry (no schedule required)
- Multi-project day splitting for both schedules and time logs
- Auto-population of company, trade, cost code, and hourly rate
- Bi-directional updates between schedules and time logs
- Payment batch processing with status tracking
