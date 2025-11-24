# Construction Management App - AI Analysis Package
## Complete System Documentation

---

## 📋 TABLE OF CONTENTS
0. [🏗️ Canonical Data Model (Quick Reference)](#-canonical-data-model-quick-reference)
1. [Application Overview](#application-overview)
2. [Routes & Navigation](#routes--navigation)
3. [Data Architecture](#data-architecture)
4. [Scheduling System](#scheduling-system)
5. [Budget & Estimates](#budget--estimates)
6. [Project Management](#project-management)
7. [Tasks & Todos](#tasks--todos)
8. [Known Issues & UX Inconsistencies](#known-issues--ux-inconsistencies)
9. [Component Inventory](#component-inventory)

---

## 🏗️ CANONICAL DATA MODEL (Quick Reference)

> **⚠️ CRITICAL**: This section defines the **canonical 4-pillar architecture**. All new features MUST use these tables. LEGACY tables are preserved for historical data only.

### The 4 Pillars:

#### 1️⃣ **Projects** (Anchor)
- `projects` ✅ - Primary anchor
- `project_budgets` ✅ - Project-level totals
- `project_budget_lines` ✅ - Per-cost-code budget details

#### 2️⃣ **Field Operations** (Schedule + Actuals)
- `work_schedules` ✅ - Scheduling source of truth
- `time_logs` ✅ - Labor actuals source of truth
- `workers` ✅ - Worker registry
- **Auto-sync**: past work_schedules → time_logs
- **Auto-populate**: company_id, cost_code_id, hourly_rate

#### 3️⃣ **Money** (Costs & Payments)
- `costs` ✅ - General cost ledger (all categories)
- `material_receipts` ✅ - Material purchases → costs
- `labor_pay_runs` ✅ - Labor payment batches → time_logs.payment_status
- `labor_pay_run_items` ✅ - Links time_logs to pay runs
- `subs` ✅, `sub_contracts` ✅, `sub_invoices` ✅ - Subcontractor management

#### 4️⃣ **Documents & AI**
- `documents` ✅ - Document storage with AI classification
- Auto-updates sub compliance from AI-extracted COI/W9/license dates

### Supporting Canonical Tables:
- `cost_codes` ✅ - Cost code registry
- `trades` ✅ - Trade registry with default cost codes
- `companies` ✅ - Company registry
- `estimates` ✅, `estimate_items` ✅ - Estimates → budget sync

### 🗄️ LEGACY Tables (DO NOT USE for new features):
- `scheduled_shifts` ⚠️ → Use `work_schedules`
- `daily_logs` ⚠️ → Use `time_logs`
- `day_cards` ⚠️ → Use `time_logs` aggregations
- `day_card_jobs` ⚠️ → Use `time_logs.cost_code_id`
- `payments` ⚠️ → Use `labor_pay_runs` + `costs.payment_id`

### Key Database Functions:
- `sync_work_schedule_to_time_log()` - Auto-syncs schedules to time logs
- `sync_time_log_to_work_schedule()` - Bi-directional sync
- `sync_estimate_to_budget()` - Syncs estimate to project_budgets + project_budget_lines
- `sync_material_receipt_to_cost()` - Syncs receipts to costs
- `mark_time_logs_paid_on_pay_run()` - Updates time_logs when pay run marked paid
- `auto_populate_company_id()` - Auto-fills company_id from project
- `auto_populate_worker_rate()` - Auto-fills hourly_rate from worker
- `auto_assign_labor_cost_code()` - Auto-fills cost_code_id from worker's trade
- `update_sub_compliance_from_document()` - Updates subs from AI-extracted doc data

---

## APPLICATION OVERVIEW

This is a **construction labor management and project tracking application** built with:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (Lovable Cloud)
- **Auth**: Supabase Auth
- **Database**: PostgreSQL via Supabase

### Core Features:
1. **Worker Scheduling** (workers, subs, meetings)
2. **Time Logging** (daily logs with auto-sync from schedules)
3. **Project Estimates** (line items, budget sync)
4. **Budget Tracking** (labor, subs, materials)
5. **Task Management** (todos, meetings, inspections)
6. **Payments** (reimbursements, tracking)

---

## ROUTES & NAVIGATION

### Main Routes:
| Route | Component | Description |
|-------|-----------|-------------|
| `/` | ViewLogs | Home page (daily time logs view) |
| `/dashboard` | Dashboard | Main dashboard with analytics |
| `/view-logs` | ViewLogs | Time log management |
| `/schedule` | Schedule | Global scheduling hub |
| `/payments` | Payments | Payment tracking |
| `/projects` | Projects | Project list |
| `/projects/:id` | ProjectDetail | Individual project details |
| `/admin` | Admin | Admin panel |

### Project Detail Tabs:
When viewing `/projects/:id`, users see 7 tabs:
1. **Overview** - Project summary and activity
2. **Estimates** - Estimates list with sync-to-budget
3. **Budget & Costs** - Labor budget vs actual
4. **Subs** - Subcontractor schedules and costs
5. **Invoices** - Invoice management
6. **Tasks** - Board + Calendar view for todos/meetings
7. **Schedule** - Calendar/List view of labor schedules

---

## DATA ARCHITECTURE

### 🏗️ Canonical 4-Pillar Architecture

The application uses a **canonical data model** built on 4 pillars. All tables marked CANONICAL are the source of truth for new features. LEGACY tables are preserved for historical data only.

---

### PILLAR 1: Projects (Anchor)

#### **projects** ✅ CANONICAL
- `id` (uuid) - Primary key, referenced by all other entities
- `project_name` (text)
- `client_name` (text)
- `status` (text: "Active", "Completed", "On Hold", "Cancelled")
- `address` (text, nullable)
- `project_manager` (text, nullable)
- `company_id` (uuid, nullable, FK to companies)
- Timestamps: `created_at`, `updated_at`

**Everything hangs off projects.id**: schedules, time logs, costs, budgets, invoices, documents.

#### **project_budgets** ✅ CANONICAL
- `id` (uuid)
- `project_id` (uuid, FK to projects, unique)
- `labor_budget` (numeric, default: 0)
- `subs_budget` (numeric, default: 0)
- `materials_budget` (numeric, default: 0)
- `other_budget` (numeric, default: 0)
- `baseline_estimate_id` (uuid, nullable, FK to estimates)
- Timestamps: `created_at`, `updated_at`

Synced via `sync_estimate_to_budget()` when estimate is accepted.

#### **project_budget_lines** ✅ CANONICAL
- `id` (uuid)
- `project_id` (uuid, FK to projects)
- `cost_code_id` (uuid, nullable, FK to cost_codes)
- `category` (text) - 'labor' | 'subs' | 'materials' | 'other'
- `description` (text, nullable)
- `budget_amount` (numeric, default: 0)
- `budget_hours` (numeric, nullable)
- `is_allowance` (boolean, default: false)
- `source_estimate_id` (uuid, nullable, FK to estimates)
- Timestamps: `created_at`, `updated_at`

Per-project, per-cost_code budget breakdown. Created when syncing estimate to budget.

---

### PILLAR 2: Field Operations (Scheduling + Labor Actuals)

#### **work_schedules** ✅ CANONICAL
- `id` (uuid)
- `worker_id` (uuid, FK to workers)
- `project_id` (uuid, FK to projects)
- `company_id` (uuid, nullable, auto-populated from project)
- `trade_id` (uuid, nullable, FK to trades)
- `cost_code_id` (uuid, nullable, FK to cost_codes, auto-assigned)
- `scheduled_date` (date)
- `scheduled_hours` (numeric)
- `notes` (text, nullable)
- `status` (text: "planned", "synced", "converted")
- `converted_to_timelog` (boolean, default: false)
- `last_synced_at` (timestamp, nullable)
- `created_by` (uuid, nullable)
- Timestamps: `created_at`, `updated_at`

**Scheduling source of truth.** Auto-syncs to time_logs for past dates via `sync_work_schedule_to_time_log()`.

**Triggers:**
- BEFORE INSERT/UPDATE: `auto_populate_company_id()`, `auto_assign_labor_cost_code()`
- AFTER INSERT/UPDATE: `sync_work_schedule_to_time_log()`

#### **time_logs** ✅ CANONICAL
- `id` (uuid)
- `worker_id` (uuid, FK to workers)
- `project_id` (uuid, FK to projects)
- `company_id` (uuid, nullable, auto-populated from project)
- `trade_id` (uuid, nullable, FK to trades)
- `cost_code_id` (uuid, nullable, FK to cost_codes, auto-assigned)
- `date` (date, default: CURRENT_DATE)
- `hours_worked` (numeric)
- `hourly_rate` (numeric, nullable, auto-populated from worker)
- `labor_cost` (numeric, generated: hours_worked * hourly_rate)
- `notes` (text, nullable)
- `payment_status` (text, default: 'unpaid': "unpaid" | "paid" | "pending")
- `paid_amount` (numeric, nullable, default: 0)
- `source_schedule_id` (uuid, nullable, FK to work_schedules)
- `last_synced_at` (timestamp, nullable)
- `created_by` (uuid, nullable)
- Timestamps: `created_at`

**Labor actuals source of truth.** Links back to work_schedules via `source_schedule_id`. Payment status updated via labor_pay_runs.

**Triggers:**
- BEFORE INSERT/UPDATE: `auto_populate_company_id()`, `auto_populate_worker_rate()`, `auto_assign_labor_cost_code()`
- AFTER INSERT/UPDATE: `sync_time_log_to_work_schedule()`

#### **workers** ✅ CANONICAL
- `id` (uuid)
- `name` (text)
- `trade` (text)
- `trade_id` (uuid, nullable, FK to trades)
- `hourly_rate` (numeric) - Auto-populates into time_logs
- `phone` (text, nullable)
- `active` (boolean, default: true)
- Timestamps: `created_at`, `updated_at`

---

### PILLAR 3: Money (Costs & Payments)

#### **costs** ✅ CANONICAL
- `id` (uuid)
- `project_id` (uuid, FK to projects)
- `company_id` (uuid, nullable, FK to companies)
- `vendor_type` (text, nullable: 'sub' | 'material_vendor')
- `vendor_id` (uuid, nullable, FK to subs or material_vendors)
- `cost_code_id` (uuid, nullable, FK to cost_codes)
- `category` (text) - 'labor' | 'subs' | 'materials' | 'other'
- `amount` (numeric, default: 0)
- `date_incurred` (date, default: CURRENT_DATE)
- `status` (text, default: 'unpaid': "unpaid" | "paid" | "void")
- `payment_id` (uuid, nullable, FK to labor_pay_runs or other payment records)
- `description` (text)
- `notes` (text, nullable)
- Timestamps: `created_at`, `updated_at`

**General cost ledger.** All project costs flow here. Created by:
- Material receipts → `sync_material_receipt_to_cost()`
- Sub invoices → direct insert
- Labor pay runs → referenced via payment_id

#### **material_receipts** ✅ CANONICAL
- `id` (uuid)
- `project_id` (uuid, FK to projects)
- `vendor_id` (uuid, nullable, FK to material_vendors)
- `vendor` (text) - Legacy field
- `cost_code_id` (uuid, nullable, FK to cost_codes)
- `receipt_date` (date)
- `subtotal` (numeric, default: 0)
- `tax` (numeric, default: 0)
- `shipping` (numeric, default: 0)
- `total` (numeric, default: 0)
- `linked_cost_id` (uuid, nullable, FK to costs) - Auto-linked via trigger
- `linked_document_id` (uuid, nullable, FK to documents)
- `notes` (text, nullable)
- `created_by` (uuid, nullable)
- Timestamps: `created_at`, `updated_at`

**Material purchase tracking.** Auto-syncs to costs via `sync_material_receipt_to_cost()`.

**Triggers:**
- AFTER INSERT/UPDATE/DELETE: `sync_material_receipt_to_cost()`

#### **material_vendors** ✅ CANONICAL
- `id` (uuid)
- `name` (text)
- `company_name` (text, nullable)
- `trade_id` (uuid, nullable, FK to trades)
- `default_cost_code_id` (uuid, nullable, FK to cost_codes)
- `phone` (text, nullable)
- `email` (text, nullable)
- `active` (boolean, default: true)
- `notes` (text, nullable)
- Timestamps: `created_at`, `updated_at`

#### **labor_pay_runs** ✅ CANONICAL
- `id` (uuid)
- `payer_company_id` (uuid, nullable, FK to companies)
- `payee_company_id` (uuid, nullable, FK to companies)
- `date_range_start` (date)
- `date_range_end` (date)
- `total_amount` (numeric, default: 0)
- `status` (text, default: 'draft': "draft" | "paid")
- `payment_method` (text, nullable)
- `notes` (text, nullable)
- `created_by` (uuid, nullable)
- Timestamps: `created_at`, `updated_at`

**Labor payment batches.** When marked paid, triggers `mark_time_logs_paid_on_pay_run()`.

**Triggers:**
- AFTER UPDATE: `mark_time_logs_paid_on_pay_run()` when status → 'paid'

#### **labor_pay_run_items** ✅ CANONICAL
- `id` (uuid)
- `pay_run_id` (uuid, FK to labor_pay_runs)
- `time_log_id` (uuid, FK to time_logs)
- `worker_id` (uuid, nullable, FK to workers)
- `hours` (numeric, nullable)
- `rate` (numeric, nullable)
- `amount` (numeric)
- Timestamp: `created_at`

Links time_logs to labor_pay_runs.

#### **subs** ✅ CANONICAL
- `id` (uuid)
- `name` (text)
- `company_name` (text, nullable)
- `trade` (text, nullable)
- `trade_id` (uuid, nullable, FK to trades)
- `default_rate` (numeric, nullable, default: 0)
- `phone` (text, nullable)
- `email` (text, nullable)
- `active` (boolean, default: true)
- Compliance fields: `compliance_w9_received`, `compliance_coi_expiration`, `compliance_license_expiration`
- Timestamps: `created_at`, `updated_at`

#### **sub_contracts** ✅ CANONICAL
- `id` (uuid)
- `sub_id` (uuid, FK to subs)
- `project_id` (uuid, FK to projects)
- `contract_amount` (numeric, default: 0)
- `payment_terms` (text, nullable)
- `start_date` (date, nullable)
- `end_date` (date, nullable)
- `status` (text, default: 'active')
- Timestamps: `created_at`, `updated_at`

#### **sub_invoices** ✅ CANONICAL
- `id` (uuid)
- `sub_contract_id` (uuid, FK to sub_contracts)
- `invoice_number` (text)
- `invoice_date` (date)
- `amount` (numeric)
- `status` (text, default: 'unpaid')
- `notes` (text, nullable)
- Timestamps: `created_at`, `updated_at`

---

### PILLAR 4: Documents & AI

#### **documents** ✅ CANONICAL
- `id` (uuid)
- `project_id` (uuid, nullable, FK to projects)
- `owner_type` (text, nullable: 'project' | 'sub' | 'worker')
- `owner_id` (uuid, nullable)
- `file_name` (text)
- `file_url` (text)
- `file_size` (bigint, nullable)
- `document_type` (text, nullable)
- `cost_code_id` (uuid, nullable, FK to cost_codes)
- AI classification fields: `ai_status`, `ai_doc_type`, `ai_title`, `ai_summary`, `ai_counterparty_name`, `ai_tags`, `ai_total_amount`, `ai_effective_date`, `ai_expiration_date`, `ai_extracted_data`
- `uploaded_by` (uuid, nullable)
- Timestamps: `created_at`, `updated_at`, `uploaded_at`

**Document storage with AI classification.** Supports project docs, sub compliance docs (COI, W9, licenses).

**Triggers:**
- AFTER INSERT/UPDATE: `update_sub_compliance_from_document()` - Updates subs table with compliance dates

---

### Supporting Canonical Tables

#### **cost_codes** ✅ CANONICAL
- `id` (uuid)
- `code` (text)
- `name` (text)
- `category` (text) - 'labor' | 'subs' | 'materials' | 'other'
- `trade_id` (uuid, nullable, FK to trades)
- `default_trade_id` (uuid, nullable, FK to trades)
- `is_active` (boolean, default: true)
- Timestamps: `created_at`, `updated_at`

Used across budgets, schedules, time logs, and costs for consistent categorization.

#### **trades** ✅ CANONICAL
- `id` (uuid)
- `name` (text)
- `description` (text, nullable)
- `default_labor_cost_code_id` (uuid, nullable, FK to cost_codes)
- `default_sub_cost_code_id` (uuid, nullable, FK to cost_codes)
- Timestamp: `created_at`

Auto-assigns cost codes via triggers.

#### **companies** ✅ CANONICAL
- `id` (uuid)
- `name` (text)
- Timestamp: `created_at`

Auto-populated in schedules and time logs from project.company_id.

#### **estimates** ✅ CANONICAL
- `id` (uuid)
- `project_id` (uuid, FK to projects)
- `title` (text)
- `status` (text: "draft", "sent", "accepted", "archived")
- `is_budget_source` (boolean, default: false)
- `subtotal_amount` (numeric, default: 0)
- `tax_amount` (numeric, default: 0)
- `total_amount` (numeric, default: 0)
- `margin_percent` (numeric, nullable, default: 0)
- `version` (integer, nullable, default: 1)
- `parent_estimate_id` (uuid, nullable, FK to estimates)
- Timestamps: `created_at`, `updated_at`, `approved_at`

Can be synced to project_budgets via `sync_estimate_to_budget()`.

#### **estimate_items** ✅ CANONICAL
- `id` (uuid)
- `estimate_id` (uuid, FK to estimates)
- `cost_code_id` (uuid, nullable, FK to cost_codes)
- `trade_id` (uuid, nullable, FK to trades)
- `description` (text)
- `quantity` (numeric, default: 1)
- `unit` (text, nullable, default: "ea")
- `unit_price` (numeric, default: 0)
- `line_total` (numeric, default: 0)
- `category` (text, nullable) - 'Labor' | 'Subs' | 'Materials' | 'Allowance' | 'Other'
- `area_name` (text, nullable)
- `scope_group` (text, nullable)
- `is_allowance` (boolean, default: false)
- `planned_hours` (numeric, nullable)
- Timestamp: `created_at`

Synced to project_budget_lines when estimate becomes budget source.

---

### 🗄️ LEGACY Tables (Historical Data Only)

> ⚠️ **DO NOT use these tables for new features.** They are preserved for historical reference only. All new development must use the CANONICAL tables above.

#### **scheduled_shifts** ⚠️ LEGACY
Replaced by **work_schedules**. Historical scheduling data.

#### **daily_logs** ⚠️ LEGACY
Replaced by **time_logs**. Historical time tracking data.

#### **day_cards** ⚠️ LEGACY
Replaced by **time_logs** aggregation queries. Historical day-level labor aggregation.

#### **day_card_jobs** ⚠️ LEGACY
Replaced by **time_logs** with cost_code_id. Historical day card job splits.

#### **payments** ⚠️ LEGACY
Replaced by **labor_pay_runs** + costs.payment_id flow. Historical payment tracking.

#### **project_todos** (tasks)
- `id` (uuid)
- `project_id` (uuid, FK to projects)
- `title` (text)
- `description` (text, nullable)
- `task_type` (text: "todo", "meeting", "inspection", "milestone", "punchlist")
- `status` (text: "open", "in_progress", "blocked", "done")
- `priority` (text: "low", "medium", "high")
- `due_date` (date, nullable)
- `assigned_worker_id` (uuid, nullable, FK to workers)
- `completed_at` (timestamp, nullable)
- `created_by` (uuid, nullable)
- Timestamps: `created_at`, `updated_at`

#### **payments**
- `id` (uuid)
- `company_id` (uuid, nullable, FK to companies)
- `paid_by` (text)
- `amount` (numeric, default: 0)
- `start_date` (date)
- `end_date` (date)
- `payment_date` (date, default: CURRENT_DATE)
- `paid_via` (text, nullable)
- `reimbursement_status` (text, nullable)
- `reimbursement_date` (date, nullable)
- `notes` (text, nullable)
- `created_by` (uuid, nullable)
- Timestamps: `created_at`, `updated_at`

#### **trades**
- `id` (uuid)
- `name` (text)
- `description` (text, nullable)
- Timestamp: `created_at`

#### **subs**
- `id` (uuid)
- `name` (text)
- `company_name` (text, nullable)
- `trade` (text, nullable)
- `default_rate` (numeric, nullable, default: 0)
- `phone` (text, nullable)
- `email` (text, nullable)
- `active` (boolean, default: true)
- Timestamps: `created_at`, `updated_at`

#### **sub_scheduled_shifts**
- `id` (uuid)
- `sub_id` (uuid, FK to subs)
- `project_id` (uuid, FK to projects)
- `scheduled_date` (date)
- `scheduled_hours` (numeric, nullable, default: 8)
- `notes` (text, nullable)
- `status` (text, nullable, default: "planned")
- Timestamps: `created_at`, `updated_at`

#### **schedule_modifications** (audit trail for splits)
- `id` (uuid)
- `original_schedule_id` (uuid)
- `new_schedule_id` (uuid, nullable)
- `modification_type` (text: "split", etc.)
- `metadata` (jsonb, nullable)
- `notes` (text, nullable)
- `modified_by` (uuid, nullable)
- Timestamp: `modified_at` (default: now())

---

## SCHEDULING SYSTEM

### 🔑 KEY CONCEPT: Schedule ↔ Time Log Sync

The app maintains **two separate but linked canonical tables**:
1. **`work_schedules`** ✅ CANONICAL - Future-oriented planning (what *will* happen)
2. **`time_logs`** ✅ CANONICAL - Past-oriented actuals (what *did* happen)

They are linked via `time_logs.source_schedule_id → work_schedules.id`.

### Sync Logic (Database Triggers):

#### **sync_work_schedule_to_time_log()**
Trigger on `work_schedules` AFTER INSERT/UPDATE:
- **When scheduled_date < CURRENT_DATE OR converted_to_timelog = true:**
  - If time log exists for this source_schedule_id → UPDATE it
  - If converted_to_timelog = true but no log → CREATE log
  - Set status to "synced" or "converted"
  - Update last_synced_at
- **Session flag**: `session.split_in_progress` skips sync during split operations
- **Auto-population**: company_id and cost_code_id are auto-populated BEFORE this sync

#### **sync_time_log_to_work_schedule()**
Trigger on `time_logs` AFTER INSERT/UPDATE:
- **When source_schedule_id IS NOT NULL AND scheduled_date < CURRENT_DATE:**
  - Update corresponding work_schedules with time log changes
  - Set status to "synced"
  - Update last_synced_at
- **Session flag**: `session.split_in_progress` skips sync during split operations
- **Auto-population**: company_id, hourly_rate, and cost_code_id are auto-populated BEFORE this sync

### Auto-Population Triggers:

#### **BEFORE INSERT/UPDATE on work_schedules:**
1. `auto_populate_company_id()` - Sets company_id from project.company_id
2. `auto_assign_labor_cost_code()` - Sets cost_code_id from worker's trade's default_labor_cost_code_id

#### **BEFORE INSERT/UPDATE on time_logs:**
1. `auto_populate_company_id()` - Sets company_id from project.company_id
2. `auto_populate_worker_rate()` - Sets hourly_rate from workers.hourly_rate
3. `auto_assign_labor_cost_code()` - Sets cost_code_id from worker's trade's default_labor_cost_code_id

### Schedule Statuses:
- **"planned"** - Default, not yet converted to time log
- **"synced"** - Auto-synced with time log (date passed)
- **"converted"** - Manually converted to time log

### Payment Flow:

1. **Create labor_pay_run** with date range and company filters
2. **Add time_logs to labor_pay_run_items** (links time_log_id to pay_run_id)
3. **Mark pay run as 'paid'** → Triggers `mark_time_logs_paid_on_pay_run()`
4. **Trigger updates time_logs:**
   - Sets `payment_status = 'paid'`
   - Sets `paid_amount = labor_cost`

---

## BUDGET & ESTIMATES

### Estimates → Budget Flow (Canonical):

The canonical budget sync flow uses `sync_estimate_to_budget()` function:

1. **User creates Estimate** with line items (estimate_items)
2. **Line items have categories**: "Labor", "Subs", "Materials", "Allowance", "Other"
3. **Line items can have cost_code_id** for granular budget tracking
4. **User "Accepts" estimate** (status → "accepted")
5. **"Sync to Budget" button** calls `sync_estimate_to_budget(estimate_id)`:
   
   **Function performs:**
   - Marks this estimate as `is_budget_source = true`
   - Clears `is_budget_source` from all other estimates for this project
   - Calculates category totals from estimate_items
   - Upserts `project_budgets` table:
     ```sql
     INSERT INTO project_budgets (
       project_id, 
       labor_budget, 
       subs_budget, 
       materials_budget, 
       other_budget,
       baseline_estimate_id
     ) VALUES (...)
     ON CONFLICT (project_id) DO UPDATE SET ...
     ```
   - Deletes old `project_budget_lines` for this project
   - Creates new `project_budget_lines` aggregated by (category, cost_code_id):
     ```sql
     INSERT INTO project_budget_lines (
       project_id,
       cost_code_id,
       category, -- 'labor' | 'subs' | 'materials' | 'other'
       description,
       budget_amount,
       budget_hours,
       is_allowance,
       source_estimate_id
     )
     SELECT 
       project_id,
       cost_code_id,
       normalized_category,
       string_agg(DISTINCT description, ' | '),
       SUM(line_total),
       SUM(planned_hours),
       bool_and(is_allowance),
       estimate_id
     FROM estimate_items
     WHERE estimate_id = :estimate_id
     GROUP BY cost_code_id, normalized_category
     ```

### Budget vs Actuals Calculation:

#### Labor:
- **Budget**: `project_budgets.labor_budget` OR `SUM(project_budget_lines.budget_amount WHERE category='labor')`
- **Actual**: `SUM(time_logs.labor_cost)` for this project
- **Variance**: Actual - Budget
  - Positive = Over budget (red)
  - Negative = Under budget (green)

#### Subs:
- **Budget**: `project_budgets.subs_budget` OR `SUM(project_budget_lines.budget_amount WHERE category='subs')`
- **Actual**: `SUM(costs.amount WHERE category='subs' AND status != 'void')` for this project

#### Materials:
- **Budget**: `project_budgets.materials_budget` OR `SUM(project_budget_lines.budget_amount WHERE category='materials')`
- **Actual**: `SUM(costs.amount WHERE category='materials' AND status != 'void')` for this project
- Also available via view: `get_material_actuals_by_project(project_id)`

#### Cost Code Drill-Down:
`project_budget_lines` enables cost-code-level tracking:
- Budget per cost code: `project_budget_lines.budget_amount`
- Actuals per cost code: 
  - Labor: `SUM(time_logs.labor_cost WHERE cost_code_id = :cost_code_id)`
  - Materials: `SUM(costs.amount WHERE category='materials' AND cost_code_id = :cost_code_id)`
  - Subs: `SUM(costs.amount WHERE category='subs' AND cost_code_id = :cost_code_id)`

---

## PROJECT MANAGEMENT

### Project States:
- **Active** - Currently working
- **Completed** - Finished
- **On Hold** - Paused
- **Cancelled** - Terminated

### Project Views (Canonical Data Sources):

#### **project_dashboard_view** (read-only aggregated view):
```sql
-- Note: This view should be migrated to use time_logs (canonical)
-- Current implementation may use legacy daily_logs
SELECT 
  p.id as project_id,
  p.project_name,
  p.client_name,
  p.status,
  p.address,
  p.project_manager,
  p.company_id,
  SUM(tl.hours_worked) as total_hours,
  SUM(tl.labor_cost) as total_cost,
  COUNT(DISTINCT tl.worker_id) as worker_count,
  MAX(tl.date) as last_activity
FROM projects p
LEFT JOIN time_logs tl ON tl.project_id = p.id
GROUP BY p.id
```

#### **project_costs_view** (read-only, more detailed):
Includes:
- Labor budget vs actual (paid vs unpaid) - Source: `time_logs`
- Budget variance - Calculated from `project_budgets` and `time_logs.labor_cost`
- Last payment date - From `labor_pay_runs`
- Materials/subs budgets - From `project_budgets` and `costs` table

#### **labor_actuals_by_cost_code** view:
Aggregates labor actuals by project and cost code:
```sql
SELECT 
  project_id,
  cost_code_id,
  SUM(hours_worked) as actual_hours,
  SUM(labor_cost) as actual_cost,
  COUNT(DISTINCT worker_id) as worker_count
FROM time_logs
GROUP BY project_id, cost_code_id
```

#### **material_actuals_by_project** view:
Aggregates material costs by project:
```sql
SELECT 
  project_id,
  SUM(amount) as material_actual,
  COUNT(*) as receipt_count,
  COUNT(DISTINCT vendor_id) as vendor_count
FROM costs
WHERE category = 'materials' AND status != 'void'
GROUP BY project_id
```

---

## TASKS & TODOS

### Task Types:
- **todo** - General task
- **meeting** - Meeting/appointment
- **inspection** - Site inspection
- **milestone** - Project milestone
- **punchlist** - Punchlist item

### Task Statuses:
- **open** - Not started
- **in_progress** - Currently working
- **blocked** - Blocked by issue
- **done** - Completed

### Task Views:

#### **Board View** (Kanban):
Columns: To Do | In Progress | Blocked | Done
- Drag-and-drop to change status (future enhancement)

#### **Calendar View**:
- Shows tasks with `due_date IS NOT NULL`
- Color-coded by task_type
- Click day → Add task with pre-filled date
- Click task → Edit drawer

---

## KNOWN ISSUES & UX INCONSISTENCIES

### 🚨 High Priority:

1. **Project Schedule Tab - Not Unified with Global**
   - **Issue**: Project → Schedule tab doesn't call the same DayDetailDialog as global /schedule
   - **Expected**: Clicking a day should open the canonical DayDetailDialog with project context
   - **Current**: Uses separate dialogs, inconsistent behavior

2. **Estimates → Budget Sync - Manual**
   - **Issue**: No automatic budget source tracking
   - **Expected**: Mark one estimate as "budget source", auto-update when estimate changes
   - **Current**: User must manually click "Sync to Budget" after accepting

3. **Schedule Conflict Detection - Read-Only**
   - **Issue**: Conflict warnings show but don't block or auto-resolve
   - **Expected**: Offer to open DayDetailDialog to rebalance via split
   - **Current**: Just shows banner, user must manually navigate

4. **Tasks Calendar - No Schedule Integration**
   - **Issue**: Tasks calendar doesn't show labor schedules
   - **Expected**: Option to "View Labor Schedule for this day" → opens Schedule tab
   - **Current**: Completely separate views

5. **Empty States - Inconsistent**
   - **Issue**: Some tabs have helpful empty states, others don't
   - **Expected**: All tabs should guide user to first action
   - **Current**: Mixed (Schedule has good one, some don't)

### ⚠️ Medium Priority:

6. **Project Schedule - View Filter Incomplete**
   - **Issue**: Filter dropdown says "Workers" but should be "Workers | Subs | Meetings | All"
   - **Expected**: Full filtering like global schedule
   - **Current**: Only shows workers

7. **Tasks Board - No Drag-and-Drop**
   - **Issue**: Board view doesn't support drag-and-drop
   - **Expected**: DnD to change status columns
   - **Current**: Must edit task to change status

8. **Budget Tab - No Subs/Materials Tracking**
   - **Issue**: Budget & Costs tab only shows labor
   - **Expected**: Cards for Subs Actual vs Budget, Materials Actual vs Budget
   - **Current**: Placeholders only

9. **Estimate Categories - Not Required**
   - **Issue**: estimate_items.category is nullable
   - **Expected**: Required field with dropdown
   - **Current**: Optional, must remember to set for budget sync

10. **Schedule Split - No Undo**
    - **Issue**: Split operation is permanent
    - **Expected**: Show in schedule_modifications, offer to reverse
    - **Current**: No undo mechanism

### 💡 Low Priority / UX Polish:

11. **Mobile - Schedule Calendar Too Dense**
    - **Issue**: Monthly calendar hard to read on mobile
    - **Expected**: Mobile-optimized day cards
    - **Current**: Works but cramped

12. **No Cross-Project Worker Utilization View**
    - **Issue**: Can't see worker across all projects for a week/month
    - **Expected**: Worker detail page with all their schedules
    - **Current**: Must check each project separately

13. **Payments - Not Linked to Projects**
    - **Issue**: Payments table doesn't link to projects
    - **Expected**: Payment detail shows project breakdowns
    - **Current**: Generic company-level only

14. **No Time Log Edit from Schedule**
    - **Issue**: Editing schedule for past dates shows warning but no direct link to edit time log
    - **Expected**: "Edit time log instead" button should open time log editor
    - **Current**: Just navigates to /daily-log page

15. **Schedule Status Icons - Not Visible**
    - **Issue**: Schedule cards don't show status badges
    - **Expected**: Visual indicator for "split_modified", "synced", etc.
    - **Current**: Status only visible in data, not UI

---

## COMPONENT INVENTORY

### 🗓️ Scheduling Components:

| Component | Path | Purpose |
|-----------|------|---------|
| MonthlyScheduleView | `src/components/scheduling/MonthlyScheduleView.tsx` | Monthly calendar grid |
| WeeklyScheduleView | `src/components/scheduling/WeeklyScheduleView.tsx` | Weekly schedule view |
| DailyScheduleView | `src/components/scheduling/DailyScheduleView.tsx` | Single day view |
| AddToScheduleDialog | `src/components/scheduling/AddToScheduleDialog.tsx` | Add workers/subs/meetings |
| EditScheduleDialog | `src/components/scheduling/EditScheduleDialog.tsx` | Edit schedule entry |
| SplitScheduleDialog | `src/components/dashboard/SplitScheduleDialog.tsx` | Split multi-project shifts |
| DayDetailDialog | `src/components/scheduling/DayDetailDialog.tsx` | Day detail popup |
| WorkerScheduleDialog | `src/components/scheduling/WorkerScheduleDialog.tsx` | Worker's day view |

### 📊 Project Components:

| Component | Path | Purpose |
|-----------|------|---------|
| ProjectOverview | `src/components/project/ProjectOverview.tsx` | Project summary tab |
| ProjectEstimates | `src/components/project/ProjectEstimates.tsx` | Estimates tab |
| ProjectBudgetCosts | `src/components/project/ProjectBudgetCosts.tsx` | Budget & Costs tab |
| ProjectSubs | `src/components/project/ProjectSubs.tsx` | Subs tab |
| ProjectInvoices | `src/components/project/ProjectInvoices.tsx` | Invoices tab |
| ProjectTasks | `src/components/project/ProjectTasks.tsx` | Tasks tab (Board+Calendar) |
| ProjectScheduleTab | `src/components/project/ProjectScheduleTab.tsx` | Schedule tab |
| ProjectSchedule | `src/components/project/ProjectSchedule.tsx` | Schedule list view |
| ProjectScheduleCalendar | `src/components/project/ProjectScheduleCalendar.tsx` | Schedule calendar view |

### 📄 Pages:

| Page | Path | Route |
|------|------|-------|
| Schedule | `src/pages/Schedule.tsx` | `/schedule` |
| ProjectDetail | `src/pages/ProjectDetail.tsx` | `/projects/:id` |
| Projects | `src/pages/Projects.tsx` | `/projects` |
| Dashboard | `src/pages/Dashboard.tsx` | `/dashboard` |
| ViewLogs | `src/pages/ViewLogs.tsx` | `/view-logs` |
| Payments | `src/pages/Payments.tsx` | `/payments` |
| Admin | `src/pages/Admin.tsx` | `/admin` |

### 🛠️ Utility Components:

| Component | Path | Purpose |
|-----------|------|---------|
| Layout | `src/components/Layout.tsx` | Main app layout |
| NavLink | `src/components/NavLink.tsx` | Navigation links |
| MobileNav | `src/components/MobileNav.tsx` | Mobile menu |
| ProtectedRoute | `src/components/ProtectedRoute.tsx` | Auth guard |

---

## BACKEND LOGIC LOCATIONS

### Schedule ↔ Time Log Sync:
- **Database Triggers**: 
  - `sync_schedule_to_timelog()` - On `scheduled_shifts` table
  - `sync_timelog_to_schedule()` - On `daily_logs` table
- **No frontend code** - handled entirely by DB

### Multi-Project Split:
- **Database Function**: `split_schedule_for_multi_project(p_original_schedule_id, p_time_log_entries)`
- **Called from**: `src/components/dashboard/SplitScheduleDialog.tsx`
  ```ts
  const { data, error } = await supabase.rpc('split_schedule_for_multi_project', {
    p_original_schedule_id: scheduleId,
    p_time_log_entries: entries.map(e => ({
      project_id: e.project_id,
      hours: parseFloat(e.hours),
      trade_id: e.trade_id || null,
      notes: e.notes || null
    }))
  });
  ```

### Budget Calculations:
- **Labor Actual Cost**: Calculated in frontend via SQL query in `ProjectBudgetCosts.tsx`:
  ```ts
  const { data } = await supabase
    .from('daily_logs')
    .select('hours_worked, worker:workers(hourly_rate)')
    .eq('project_id', projectId);
  
  const totalCost = data.reduce((sum, log) => 
    sum + (log.hours_worked * log.worker.hourly_rate), 0
  );
  ```
- **Budget Source**: Manually set in `ProjectEstimates.tsx` via `syncToBudget()` function

### Estimates Totals:
- **Auto-calculated** in frontend when line items change
- **Stored** in `estimates.subtotal_amount`, `tax_amount`, `total_amount`

---

## NAVIGATION FLOWS

### Adding a Worker Shift:
1. User goes to `/schedule` OR `/projects/:id` → Schedule tab
2. Clicks "Add to Schedule" button
3. `AddToScheduleDialog` opens
4. Selects: Worker, Project, Date, Hours, Trade (optional)
5. Submits → Inserts into `scheduled_shifts`
6. If date is past → Trigger auto-creates `daily_logs` entry

### Splitting a Multi-Project Day:
1. User sees a worker scheduled for 8h on Project A
2. Actually worked 4h on A, 4h on B
3. Clicks "Split" button on schedule card
4. `SplitScheduleDialog` opens
5. User enters:
   - Entry 1: Project A, 4h, Trade, Notes
   - Entry 2: Project B, 4h, Trade, Notes
6. Submits → Calls `split_schedule_for_multi_project()`
7. Backend:
   - Updates original schedule → 4h on Project A, status="split_modified"
   - Creates new schedule → 4h on Project B, status="split_created"
   - Updates existing time log for original schedule
   - Creates new time log for new schedule
   - Logs to `schedule_modifications`

### Syncing Estimate to Budget:
1. User creates Estimate with line items
2. Sets `category` on each item ("labor", "subs", "materials")
3. Clicks "Accept" → status="accepted"
4. Clicks "Sync to Budget"
5. Frontend calculates totals per category
6. Upserts `project_budgets` table
7. Budget & Costs tab now shows variance

---

## FUTURE ENHANCEMENTS (Out of Scope for Current Review)

1. **Real-time Collaboration** - Multiple users editing schedules
2. **Mobile App** - Native iOS/Android
3. **PDF Exports** - Estimates, invoices, reports
4. **Stripe Integration** - Payment processing
5. **Photo Uploads** - Daily progress photos
6. **GPS Check-in** - Worker location verification
7. **Subcontractor Portal** - External sub access
8. **Client Portal** - Client-facing project view
9. **Material Orders** - Purchase order tracking
10. **Equipment Tracking** - Tool/equipment logs

---

## TECHNICAL NOTES

### Authentication:
- Uses Supabase Auth
- Row Level Security (RLS) policies on tables
- User roles: `admin`, `field_user`

### Database Conventions:
- All IDs are UUIDs
- Timestamps use `timestamp with time zone`
- Soft deletes via `active` boolean (workers, subs, etc.)
- Hard deletes for logs/schedules (with archive option)

### Code Standards:
- TypeScript strict mode
- Tailwind CSS (no custom CSS)
- shadcn/ui components
- React Hook Form for forms
- Zod for validation
- date-fns for dates

### Performance:
- Database views for aggregations (project_dashboard_view, etc.)
- Indexes on foreign keys
- Batch inserts for bulk operations

---

## CONTACT & METADATA

**Generated**: 2025-01-21  
**Purpose**: AI code review and UX optimization  
**Target Reviewer**: ChatGPT or similar LLM  
**Review Focus**: Project-level UX consistency, scheduling logic, budget flow

---

## APPENDIX: Sample Queries

### Get all schedules for a project in a month:
```sql
SELECT 
  ss.*,
  w.name as worker_name,
  w.trade as worker_trade,
  p.project_name
FROM scheduled_shifts ss
JOIN workers w ON w.id = ss.worker_id
JOIN projects p ON p.id = ss.project_id
WHERE ss.project_id = :project_id
  AND ss.scheduled_date >= :month_start
  AND ss.scheduled_date <= :month_end
ORDER BY ss.scheduled_date, w.name;
```

### Get labor cost for a project:
```sql
SELECT 
  SUM(dl.hours_worked * w.hourly_rate) as total_cost,
  SUM(dl.hours_worked) as total_hours
FROM daily_logs dl
JOIN workers w ON w.id = dl.worker_id
WHERE dl.project_id = :project_id;
```

### Get budget variance:
```sql
SELECT 
  pb.labor_budget,
  (SELECT SUM(dl.hours_worked * w.hourly_rate) 
   FROM daily_logs dl 
   JOIN workers w ON w.id = dl.worker_id 
   WHERE dl.project_id = :project_id) as labor_actual,
  pb.labor_budget - (SELECT SUM(dl.hours_worked * w.hourly_rate) 
   FROM daily_logs dl 
   JOIN workers w ON w.id = dl.worker_id 
   WHERE dl.project_id = :project_id) as variance
FROM project_budgets pb
WHERE pb.project_id = :project_id;
```

### Get worker conflicts on a date:
```sql
SELECT 
  worker_id,
  w.name,
  COUNT(*) as shift_count,
  SUM(scheduled_hours) as total_hours,
  array_agg(DISTINCT p.project_name) as projects
FROM scheduled_shifts ss
JOIN workers w ON w.id = ss.worker_id
JOIN projects p ON p.id = ss.project_id
WHERE ss.scheduled_date = :date
GROUP BY worker_id, w.name
HAVING COUNT(*) > 1;
```

---

**END OF DOCUMENTATION**
