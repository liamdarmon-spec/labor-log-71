# Crew Scheduler — Unified Workforce Planning System

## Overview

**Crew Scheduler** is the primary operational hub for field managers to plan, track, and pay their crews. It consolidates all scheduling, time tracking, and payment workflows into one streamlined interface.

---

## Architecture

### Navigation Structure
```
Projects | Crew Scheduler | Workforce | Costs | Payments | Admin
```

- **Crew Scheduler** (Workforce → Scheduler tab): Main scheduling workspace
- **Workforce** (Workforce → Roster/Activity tabs): Worker directory, daily activity logs
- **Schedule** (navbar `/schedule`): Read-only calendar visualizer (future feature)

---

## Crew Scheduler Tabs

### 1. Week Tab (Primary Interface)

**Purpose**: Fast, simple weekly crew planning

**Layout**:
- Week selector (Mon–Sun)
- Grid: Workers × Days
- Each cell shows:
  - Total hours scheduled
  - Project names (up to 2 visible)
  - Company badge (GA/Forma)
  - Payment status (for past days: Paid/Unpaid)

**Interactions**:
- **Click empty cell** → Opens "Add Schedule" dialog (pre-filled with worker + date)
- **Click filled cell** → Opens "Day Detail" modal showing:
  - All assignments for that worker/day
  - Ability to edit hours, split across projects, delete
  - Payment status awareness
- **Hover action** → Edit icon appears for quick access

**Features**:
- Conflict detection (worker scheduled multiple places same day)
- Payment status badges (Paid/Unpaid) for past days
- Company filtering (GA, Forma, All)
- Trade filtering
- Project filtering

---

### 2. History Tab

**Purpose**: Review past work and verify payment status

**Layout**:
- **One row per worker-day** (not one row per split)
- Expandable rows showing project breakdown:
  - Project name
  - Hours worked
  - Cost code
  - Notes
  - Payment status per project

**Filters**:
- Date range (default: last 2 weeks)
- Worker
- Project
- Company
- "Show unpaid only" toggle

**Summary Cards**:
- Total Hours
- Total Cost
- Unpaid Hours
- Unpaid Cost

**Use Case**: Leo can quickly answer:
- "Where did Wilver work last week?"
- "Which days are unpaid for this project?"
- "How many hours did my GA crew log?"

---

### 3. Payments Tab

**Purpose**: Fast workflow to see who's owed and trigger payments

**Layout**:
- Two primary cards:
  - **GA Painting Unpaid Labor**
  - **Forma Homes Unpaid Labor**

Each card shows:
- Unpaid hours
- Unpaid cost (large, prominent)
- Workers owed
- Paid hours/cost (for reference)
- "Start Pay Run" button

**Behavior**:
- Clicking "Start Pay Run" navigates to existing payment flow with pre-filled:
  - Date range
  - Company
- Payment creation uses existing logic:
  - Marks logs as paid
  - Creates payment record
  - Links logs to payment_id
  - Updates payment_status

**Use Case**: Leo can:
- See at a glance who needs to be paid
- Separate GA vs Forma payroll
- Trigger payment in 3 clicks

---

## Backend Logic (UNCHANGED)

The following systems remain exactly as they were:

### Schedule → Time Log Sync
- **Future dates**: Remain as scheduled_shifts only
- **Past dates**: Can auto-sync to daily_logs
- **Midnight conversion**: Existing trigger handles this
- **Safe-edit logic**: Past logs don't re-sync schedules

### Split Operations
- `split_schedule_for_multi_project()` RPC unchanged
- Audit trail in `schedule_modifications` table
- Multi-project allocation preserved
- Hours validation (total must match)

### Payment Logic
- Date range + company filtering
- Auto-calculate unpaid logs
- Mark logs as paid in batch
- Link payment_id to all affected logs
- Reimbursement rules (GA, Forma, DHY) unchanged

### Cost Code Assignment
- Auto-assign based on worker trade
- Manual override available
- Links to project budget lines
- Cost tracking unchanged

### Database Structure
- `scheduled_shifts` table unchanged
- `daily_logs` table unchanged
- `payments` table unchanged
- All foreign keys preserved
- All triggers preserved

---

## Unified Modal System

### UniversalDayDetailDialog
Used everywhere for schedule interactions:
- Global Crew Scheduler → Week tab
- Workforce OS → Schedule view
- Project OS → Schedule tab
- Calendar visualizer

**Features**:
- Context-aware (knows if it's a project view, worker view, or global view)
- Shows all assignments for worker/day
- Edit, split, delete actions
- Payment status display
- Link to time logs (for past days)

**Props**:
- `date`: Date to show
- `highlightWorkerId`: (optional) Focus on specific worker
- `projectContext`: (optional) Filter to specific project
- `onRefresh`: Callback after changes

---

## Key Principles

1. **One mental model**: All scheduling feels the same everywhere
2. **Worker-centric**: Grid shows workers first, then their days
3. **Fast entry**: Click empty cell → pre-filled form
4. **Payment awareness**: Past days show paid/unpaid status inline
5. **Split-friendly**: Multi-project allocation visible and editable
6. **Company-aware**: GA and Forma are first-class concepts

---

## Mobile Optimization

- Bottom nav includes "Scheduler" as primary action
- Week grid scrolls horizontally
- Cards replace tables
- Full-screen drawers replace modals
- Touch-friendly hit areas (48px minimum)

---

## Future Enhancements (Not Yet Implemented)

- Drag & drop rescheduling
- "Duplicate last week" bulk action
- Template-based scheduling
- AI suggestions for crew allocation
- Overtime warnings
- Budget vs actual tracking inline

---

## File Structure

```
src/components/workforce/
  ├── SchedulerTab.tsx                   # Main Crew Scheduler (Week/History/Payments tabs)
  ├── scheduler/
  │   ├── CrewSchedulerWeekView.tsx      # Week grid (workers × days)
  │   ├── CrewSchedulerHistoryView.tsx   # Past work logs (grouped by worker-day)
  │   └── CrewSchedulerPaymentsView.tsx  # Payment summary by company
  └── ...

src/components/scheduling/
  ├── UniversalDayDetailDialog.tsx       # Unified schedule detail modal
  ├── AddToScheduleDialog.tsx            # Create new schedule (unchanged)
  ├── EditScheduleDialog.tsx             # Edit existing schedule (unchanged)
  └── ...

src/pages/
  ├── Workforce.tsx                      # Workforce OS wrapper
  └── Schedule.tsx                       # Read-only calendar visualizer
```

---

## Testing Checklist

- [ ] Week view shows all active workers
- [ ] Clicking empty cell opens Add dialog
- [ ] Clicking filled cell opens Day Detail modal
- [ ] Split functionality works from Day Detail
- [ ] Payment badges show on past days
- [ ] History tab groups by worker-day
- [ ] Expanding history row shows project splits
- [ ] Payments tab shows GA and Forma separately
- [ ] "Start Pay Run" navigates to payment flow
- [ ] Mobile bottom nav includes Scheduler
- [ ] All filters (company, trade, project) work correctly
- [ ] No backend logic broken (schedule→log sync still works)

---

## Migration Notes

### What Changed (UI Only)
- Navbar now says "Crew Scheduler" instead of "Schedule"
- Schedule page (`/schedule`) is now read-only calendar view
- Crew Scheduler is accessed via Workforce → Scheduler tab
- Week view is the default (not calendar view)
- History shows one row per worker-day with expandable splits
- Payments tab shows company-specific cards (GA/Forma)

### What Stayed Exactly the Same (Backend)
- All database tables
- All RPC functions
- All triggers
- Schedule→log sync behavior
- Split logic
- Payment logic
- Cost code logic
- All foreign keys and relationships

---

**Result**: Leo can schedule his entire week in 30 seconds, check what happened yesterday, and trigger payments in 3 clicks—all from one unified interface.
