# Construction Management App - AI Analysis Package
## Complete System Documentation

---

## 📋 TABLE OF CONTENTS
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

### Core Tables:

#### **projects**
- `id` (uuid)
- `project_name` (text)
- `client_name` (text)
- `status` (text: "Active", "Completed", "On Hold", "Cancelled")
- `address` (text, nullable)
- `project_manager` (text, nullable)
- `company_id` (uuid, nullable)
- Timestamps: `created_at`, `updated_at`

#### **workers**
- `id` (uuid)
- `name` (text)
- `trade` (text)
- `trade_id` (uuid, nullable, FK to trades)
- `hourly_rate` (numeric)
- `phone` (text, nullable)
- `active` (boolean, default: true)
- Timestamps: `created_at`, `updated_at`

#### **scheduled_shifts** (labor schedules)
- `id` (uuid)
- `worker_id` (uuid, FK to workers)
- `project_id` (uuid, FK to projects)
- `trade_id` (uuid, nullable, FK to trades)
- `scheduled_date` (date)
- `scheduled_hours` (numeric)
- `notes` (text, nullable)
- `status` (text: "planned", "synced", "split_modified", "split_created")
- `converted_to_timelog` (boolean, default: false)
- `last_synced_at` (timestamp, nullable)
- `created_by` (uuid, nullable)
- Timestamps: `created_at`, `updated_at`

#### **daily_logs** (time logs)
- `id` (uuid)
- `worker_id` (uuid, FK to workers)
- `project_id` (uuid, FK to projects)
- `trade_id` (uuid, nullable, FK to trades)
- `date` (date, default: CURRENT_DATE)
- `hours_worked` (numeric)
- `notes` (text, nullable)
- `schedule_id` (uuid, nullable, FK to scheduled_shifts) **← Links back to schedule**
- `last_synced_at` (timestamp, nullable)
- `created_by` (uuid, nullable)
- Timestamp: `created_at`

#### **estimates**
- `id` (uuid)
- `project_id` (uuid, FK to projects)
- `title` (text)
- `status` (text: "draft", "sent", "accepted", "archived")
- `subtotal_amount` (numeric, default: 0)
- `tax_amount` (numeric, default: 0)
- `total_amount` (numeric, default: 0)
- Timestamps: `created_at`, `updated_at`

#### **estimate_items**
- `id` (uuid)
- `estimate_id` (uuid, FK to estimates)
- `description` (text)
- `quantity` (numeric, default: 1)
- `unit` (text, nullable, default: "ea")
- `unit_price` (numeric, default: 0)
- `line_total` (numeric, default: 0)
- `category` (text, nullable) **← "labor", "subs", "materials", etc.**
- Timestamp: `created_at`

#### **project_budgets**
- `id` (uuid)
- `project_id` (uuid, FK to projects, unique)
- `labor_budget` (numeric, nullable, default: 0)
- `subs_budget` (numeric, nullable, default: 0)
- `materials_budget` (numeric, nullable, default: 0)
- `other_budget` (numeric, nullable, default: 0)
- Timestamps: `created_at`, `updated_at`

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

The app maintains **two separate but linked tables**:
1. **`scheduled_shifts`** - Future-oriented planning (what *will* happen)
2. **`daily_logs`** - Past-oriented actuals (what *did* happen)

They are linked via `daily_logs.schedule_id → scheduled_shifts.id`.

### Sync Logic (Database Triggers):

#### **sync_schedule_to_timelog()**
Trigger on `scheduled_shifts` AFTER INSERT/UPDATE:
- **When scheduled_date < CURRENT_DATE OR converted_to_timelog = true:**
  - If time log exists for this schedule_id → UPDATE it
  - If converted_to_timelog = true but no log → CREATE log
  - Set status to "synced" or "converted"
  - Update last_synced_at
- **Session flag**: `session.split_in_progress` skips sync during split operations

#### **sync_timelog_to_schedule()**
Trigger on `daily_logs` AFTER INSERT/UPDATE:
- **When schedule_id IS NOT NULL AND scheduled_date < CURRENT_DATE:**
  - Update corresponding scheduled_shifts with time log changes
  - Set status to "synced"
  - Update last_synced_at
- **Session flag**: `session.split_in_progress` skips sync during split operations

### Multi-Project Splits:

#### **split_schedule_for_multi_project(p_original_schedule_id, p_time_log_entries)**
Database function (SECURITY DEFINER) that:
1. **Sets session flag** `session.split_in_progress = true`
2. **Logs modification** to `schedule_modifications` table
3. **First entry**: Updates original schedule with first project
4. **Subsequent entries**: Creates NEW schedules for each additional project
5. **For each entry**:
   - Check if time log exists for that schedule
   - If exists → UPDATE time log
   - If not → CREATE time log
   - Mark schedule as "split_modified" or "split_created"
6. **Returns** array of `{schedule_id, time_log_id}` pairs
7. **Resets session flag** `session.split_in_progress = false`

### Schedule Statuses:
- **"planned"** - Default, not yet converted to time log
- **"synced"** - Auto-synced with time log (date passed)
- **"converted"** - Manually converted to time log
- **"split_modified"** - Original schedule modified by split operation
- **"split_created"** - New schedule created by split operation

---

## BUDGET & ESTIMATES

### Estimates → Budget Flow:

1. **User creates Estimate** with line items
2. **Line items have categories**: "labor", "subs", "materials", "allowance", "other"
3. **User "Accepts" estimate** (status → "accepted")
4. **"Sync to Budget" button**:
   - Calculates category totals from estimate_items
   - Upserts `project_budgets` table:
     ```sql
     UPDATE project_budgets SET
       labor_budget = SUM(line_total WHERE category='labor'),
       subs_budget = SUM(line_total WHERE category='subs'),
       materials_budget = SUM(line_total WHERE category='materials')
     WHERE project_id = :project_id
     ```
   - **Future**: Add `is_budget_source` flag to estimates to track which estimate is active

### Budget Variance Calculation:

**Labor Budget** = `project_budgets.labor_budget`

**Labor Actual Cost** = SUM(`daily_logs.hours_worked * workers.hourly_rate`) for this project

**Labor Variance** = Labor Actual Cost - Labor Budget
- If > 0 → "Over by $X.XX" (red)
- If < 0 → "Under by $X.XX" (green)
- If budget = 0 → Show hint "No budget set. Sync from estimate"

---

## PROJECT MANAGEMENT

### Project States:
- **Active** - Currently working
- **Completed** - Finished
- **On Hold** - Paused
- **Cancelled** - Terminated

### Project Views:

#### **project_dashboard_view** (read-only aggregated view):
```sql
SELECT 
  p.id as project_id,
  p.project_name,
  p.client_name,
  p.status,
  p.address,
  p.project_manager,
  p.company_id,
  SUM(dl.hours_worked) as total_hours,
  SUM(dl.hours_worked * w.hourly_rate) as total_cost,
  COUNT(DISTINCT dl.worker_id) as worker_count,
  MAX(dl.date) as last_activity
FROM projects p
LEFT JOIN daily_logs dl ON dl.project_id = p.id
LEFT JOIN workers w ON w.id = dl.worker_id
GROUP BY p.id
```

#### **project_costs_view** (read-only, more detailed):
Includes:
- Labor budget vs actual (paid vs unpaid)
- Budget variance
- Last payment date
- Materials/subs budgets

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
