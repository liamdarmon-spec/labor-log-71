# FORMA OS — Construction Workforce + Financial Operating System

## 🎯 Product Vision

**Forma OS** is a unified workforce and financial management platform for small-to-mid size contractors. Built first for Forma Homes and GA Painting in Los Angeles, it's designed to become a scalable SaaS product for the construction industry.

### Core Value Proposition
- **One system** for workforce scheduling, time tracking, payments, and project financials
- **Fast daily workflows** optimized for field managers and office staff
- **Clear financial visibility** from estimate → budget → actual costs
- **Multi-company support** for contractors managing multiple entities

---

## 🏗️ Architecture Overview

### Five Core Modules

#### 1. **Dashboard**
High-level snapshot of current operations:
- This week's schedule and hours
- Unpaid labor summary
- Project alerts and todos
- Recent activity

#### 2. **Projects**
Project lifecycle management:
- Project list and detail pages
- Estimates → Proposals → Budget → Actuals
- Cost code tracking
- Document management per project

#### 3. **Workforce**
People and time management:
- **Team Week View** — schedule entire crew in one view
- **Time Logs** — actual hours worked
- **Pay Center** — process labor payments by company
- Worker and subcontractor management

#### 4. **Financials**
Global financial visibility:
- Estimates and budgets across all projects
- Cost code ledger (budget vs actual)
- Labor, subs, materials, and misc costs
- Payment history and reporting

#### 5. **Admin**
System configuration:
- Companies (Forma Homes, GA Painting, etc.)
- Trades and cost codes
- User management
- System settings

---

## 📊 Data Model — Forma OS

### Workforce OS Tables

#### `workers`
Core worker information
- `id`, `name`, `trade_id`, `company_id`
- `hourly_rate`, `phone`, `email`
- `status` (active, inactive)

#### `work_schedules`
**Planned** work assignments
- `id`, `worker_id`, `project_id`, `company_id`
- `scheduled_date`, `scheduled_hours`
- `type` (labor, sub, meeting)
- `status` (planned, confirmed, synced, cancelled)
- `source_schedule_id` (for multi-project splits)
- `converted_to_timelog` (manual conversion flag)

**Key Rules:**
- Future schedules stay as schedules only
- Past schedules auto-convert to time logs at 1am daily
- Manual conversion supported via "Convert to Time Log" button

#### `time_logs`
**Actual** work performed
- `id`, `worker_id`, `project_id`, `company_id`
- `date`, `hours_worked`, `hourly_rate`
- `labor_cost` (computed: hours × rate)
- `source_schedule_id` (links back to schedule)
- `payment_status` (unpaid, pending, paid, void)
- `cost_code_id` (for budget tracking)

**Key Rules:**
- Created from schedules (automatic or manual)
- Can be edited independently
- Drives all labor cost calculations
- Links to pay runs when paid

#### `labor_pay_runs`
Grouped payments for labor
- `id`, `payer_company_id`, `payee_company_id`
- `date_range_start`, `date_range_end`
- `total_amount`, `status` (draft, approved, paid, reimbursed)
- `payment_method`, `notes`

**Key Rules:**
- Pay runs group time logs by date range + company
- When status = 'paid', all linked time logs are marked paid
- Supports reimbursement workflow (e.g., GA Painting → Forma Homes)

#### `labor_pay_run_items`
Individual time logs in a pay run
- `id`, `pay_run_id`, `time_log_id`
- `worker_id`, `amount`, `hours`, `rate`

### Project OS Tables

#### `projects`
- `id`, `project_name`, `client_name`, `address`
- `company_id` (who owns the project)
- `status` (Active, On Hold, Complete, Archived)
- `project_manager`

#### `estimates`
Internal cost estimates
- `id`, `project_id`, `title`, `status`
- `total_amount`, `is_budget_source`

#### `estimate_items`
Line items within an estimate
- `id`, `estimate_id`, `description`
- `quantity`, `unit_price`, `line_total`
- `category` (labor, subs, materials, other)
- `cost_code_id`, `trade_id`, `planned_hours`

#### `project_budgets`
High-level budget summary
- `id`, `project_id`, `baseline_estimate_id`
- `labor_budget`, `subs_budget`, `materials_budget`, `other_budget`

#### `project_budget_lines`
Detailed budget by cost code
- `id`, `project_id`, `cost_code_id`, `category`
- `budget_amount`, `budget_hours`
- `source_estimate_id`

### Financial OS Tables

#### `cost_codes`
Standard cost tracking codes
- `id`, `code`, `name`, `category`
- `trade_id` (optional linkage)
- `is_active`

**Examples:**
- `1000` — Labor: Painting
- `2000` — Labor: Carpentry
- `3000` — Subs: Framing
- `4000` — Materials: Paint & Supplies

#### `companies`
Legal entities for cost allocation
- `id`, `name`, `type` (internal, external)

**Examples:**
- Forma Homes (GC)
- GA Painting (internal labor company)
- DHY LLC (equipment/labor leasing)

#### `payments` (legacy, being phased out)
Old payment records
- Being replaced by `labor_pay_runs` system

### Subcontractor OS Tables (Phase 5+)

#### `subcontractors`
- `id`, `name`, `trade_id`, `company_id`
- `default_terms`, `retention_terms`

#### `sub_contracts`
- `id`, `project_id`, `subcontractor_id`
- `contract_value`, `retention_percent`
- `status`, `cost_code_id`

#### `sub_invoices`
- `id`, `sub_contract_id`, `invoice_number`
- `amount`, `retention_held`
- `status` (submitted, approved, paid)

### Documents OS Tables

#### `documents`
Unified document storage
- `id`, `project_id`, `company_id`
- `related_type`, `related_id` (polymorphic)
- `type` (contract, invoice, proposal, permit, other)
- `filename`, `storage_path`, `mime_type`

---

## 🔄 Key Workflows

### 1. Schedule → Time Log Sync

**Automatic (Daily at 1am):**
```
For each work_schedule where:
  - scheduled_date < CURRENT_DATE (past day)
  - converted_to_timelog = false
  - no linked time_log exists

→ Create time_log with same details
→ Link via source_schedule_id
→ Mark schedule as synced
```

**Manual Conversion:**
```
User clicks "Convert to Time Log" in UI
→ Set converted_to_timelog = true
→ Trigger creates time_log immediately
→ Works for any date (past or future)
```

**Reverse Sync:**
```
When time_log is edited:
  - If source_schedule_id exists
  - And scheduled_date < CURRENT_DATE
→ Update linked work_schedule to match
```

### 2. Multi-Project Day Split

**Scenario:** Worker works 4h on Project A + 4h on Project B

```
Original schedule: 8h on Project A

User splits via UI:
→ Update original schedule: 4h Project A
→ Create new schedule: 4h Project B
→ Both link to same source_schedule_id (audit trail)

At end of day:
→ Both schedules convert to separate time_logs
→ Each time_log links back to its schedule
```

### 3. Payment Workflow

**Creating a Pay Run:**
```
1. Select date range (e.g., Nov 1-15)
2. Select payer (e.g., Forma Homes)
3. Select payee (e.g., GA Painting)

System pulls all time_logs where:
  - date IN range
  - company_id matches payee
  - payment_status = 'unpaid'

4. User reviews, selects/deselects logs
5. Confirms → creates labor_pay_run + items
6. When status = 'paid':
   → All linked time_logs.payment_status = 'paid'
   → paid_amount = labor_cost
```

---

## 🎨 UI/UX Guidelines

### Workforce Module

#### Team Week View (Primary Schedule Interface)
- **Left:** List of all active workers
  - Show worker name, trade, company
  - Show summary: scheduled hours vs logged hours
- **Right:** Day tiles for selected week (Sun-Sat)
  - Each tile shows total scheduled hours + worker count
  - Click tile → opens Full Day Planner

#### Full Day Planner (Modal/Page)
- Header: Date, total workers, total hours
- Tabs: Workers | Subs | Meetings | All
- **Workers Tab:**
  - One card per worker scheduled that day
  - Each card shows:
    - Worker name, trade, company
    - Total hours for the day
    - One row per project (support multi-project splits)
    - Quick "Split" action to divide hours
  - Actions: Edit hours, change project, rebalance
  - Big CTA: **"Convert to Time Logs"** (for past dates)

#### Worker Detail View
- Calendar view (week or month)
- Table of time logs
- Filters: date range, project, company, pay status
- Goal: "Where has this worker been?"

#### Pay Center
- Summary cards by company:
  - GA Painting unpaid labor
  - Forma Homes unpaid labor
- Table view of workers with unpaid hours
- "Create Pay Run" button → launches payment wizard

### Terminology Standards

**Always use these exact terms:**
- "Schedule" = planned work (future or present)
- "Time Log" = actual work performed (past)
- "Pay Run" = grouped labor payment
- "Worker" = in-house labor
- "Subcontractor" or "Sub" = external trade contractor
- "Company" = legal entity (Forma Homes, GA Painting, etc.)
- "Trade" = skill/craft (Painter, Carpenter, Electrician, etc.)
- "Cost Code" = accounting category

**Never mix terms:**
- ❌ "Log" (too vague)
- ❌ "Shift" (implies hourly scheduling)
- ❌ "Entry" (ambiguous)

---

## 🚀 Implementation Phases

### ✅ Phase 1: Foundation (Complete)
- Clean navigation structure
- Core data model (work_schedules, time_logs, labor_pay_runs)
- Sync functions and triggers
- Documentation

### 🏗️ Phase 2: Workforce OS (In Progress)
- Team Week View with day planner
- Time Logs table and detail views
- Pay Center with pay run creation
- Worker management

### 📋 Phase 3: Project OS Alignment
- Project Overview dashboard
- Estimates → Budget flow
- Cost code ledger (budget vs actual)
- Financials tab redesign

### 💼 Phase 4: Subcontractor OS
- Sub management and contracts
- Sub invoicing and retention
- Cost integration with projects
- Bid packages (future)

### 📄 Phase 5: Documents OS
- Unified document storage
- Project and company document views
- Document linking (contracts, invoices, etc.)
- AI extraction (future)

### 🧹 Phase 6: Cleanup & Polish
- Remove dead UI and duplicate flows
- Mobile optimization
- Performance tuning
- User onboarding

---

## 🛠️ Developer Notes

### Tech Stack
- **Frontend:** React, TypeScript, Vite
- **Styling:** Tailwind CSS + shadcn/ui components
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **State:** TanStack Query (React Query)
- **Routing:** React Router

### Key Files
- `/src/components/workforce/` — Workforce module components
- `/src/components/project/` — Project module components
- `/src/pages/` — Top-level pages
- `/src/hooks/` — Shared data hooks
- `/supabase/migrations/` — Database migrations

### Database Conventions
- Use UUIDs for all primary keys
- Use `created_at`, `updated_at` timestamps
- Use `created_by`, `updated_by` for audit trails
- Use enums for status fields (defined in CHECK constraints)
- Use TIMESTAMPTZ for timestamps, DATE for dates

### Component Patterns
- Prefer small, focused components
- Reuse common patterns (drawers, dialogs, cards)
- Keep business logic in hooks
- Use TypeScript for all new code

---

## 📱 Mobile Strategy

### Priority Mobile Views
1. **Workforce → Team Week View**
   - Stack layout for workers
   - Simple day list instead of wide calendar
   - Tap day → Full Day Planner modal

2. **Time Logs Table**
   - Convert to stacked cards on narrow screens
   - Swipe actions for quick edits

3. **Pay Center**
   - Simplified card layout
   - Easy "Create Pay Run" flow

### Mobile-Last for Now
- Full project financial views
- Complex estimate builders
- Multi-tab interfaces (use accordions)

---

## 🎯 Success Metrics

### For Leo (Field Manager)
- Schedule entire crew for the week in under 2 minutes
- See yesterday's actual hours in one click
- Identify unpaid labor in 5 seconds

### For Liam (Owner)
- Understand project budget vs actual at a glance
- Process weekly payroll in under 5 minutes
- Track labor costs by company and project

### For Office Staff
- Enter time log corrections quickly
- Generate financial reports without Excel exports
- Manage documents without email attachments

---

## 🔐 Security & Access Control

### Current: Open Access (Internal Tool)
- All authenticated users can view/edit everything
- RLS policies: simple `USING (true)` for now
- Focus on UX before adding granular permissions

### Future: Role-Based Access
- **Admin** — full access to everything
- **Manager** — projects, workforce, financials
- **Field** — view schedules, log hours
- **Accounting** — financials and payments only

---

## 📝 Next Steps

1. **Finish Workforce OS UI** — Complete Team Week View and Pay Center
2. **Align Project Financials** — Wire up cost code actuals from time_logs
3. **Build Subcontractor Foundation** — Basic sub contracts and invoicing
4. **Clean Navigation** — Remove all duplicate/dead routes
5. **Mobile Optimization** — Make core flows work on phone
6. **User Testing** — Get Leo and Liam using it daily

---

## 🤝 Contributing

When making changes:
1. **Preserve concepts** — Don't break schedule vs time log distinction
2. **One clear way** — Avoid creating parallel flows that do the same thing
3. **Clear names** — Use consistent terminology everywhere
4. **Document business rules** — Add comments explaining "why"
5. **Test end-to-end** — Create project → schedule → log → pay

---

**Built with ❤️ for the construction industry**
