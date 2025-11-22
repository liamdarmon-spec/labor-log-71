# Forma OS QA & Polish Checklist

## 🔄 Core End-to-End Flow Testing

### Leo's Weekly Workflow
- [ ] **Schedule Creation**
  - Go to Workforce → Scheduler → Team Week View
  - Schedule 2-3 workers across multiple days and projects
  - Verify schedules appear in the correct day tiles
  - Verify company assignment is correct

- [ ] **Multi-Project Splits**
  - Open Full Day Planner for a day
  - Split one worker's time across 2 projects
  - Use "Rebalance" to ensure total = 8h
  - Verify both schedule entries are created correctly

- [ ] **Schedule → Time Log Conversion**
  - Ensure at least one schedule is in the past
  - Use "Convert to Time Logs" (manual or automatic)
  - Verify time logs created with correct:
    - Date, worker, company, project
    - Hours, rate, cost
    - Link back to source schedule (source_schedule_id)

- [ ] **Time Logs Verification**
  - Go to Workforce → Activity → Time Logs Table
  - Filter by date range, company, worker
  - Click "View" on a log → unified detail drawer opens
  - Verify drawer shows all info: worker, company, project, hours, rate, cost, pay status, cost code

- [ ] **Pay Run Creation**
  - Go to Workforce → Pay Center → Unpaid tab
  - Select time logs for a date range and company
  - Click "Create Payment Run" → navigate to /financials/payments
  - Complete payment run creation
  - Verify time logs are marked as paid
  - Verify payment appears in History tab

- [ ] **Project Financials Check**
  - Go to Projects → [Select a project] → Financials tab
  - Verify "Labor Actuals" matches sum of time logs
  - Verify "Unpaid Labor" matches unpaid time logs
  - Verify budget vs actual calculations are correct

### Owner/Office Workflow
- [ ] **Dashboard Overview**
  - Visit /dashboard
  - Verify cards show:
    - This Week's Schedule (hours + worker count) → links to Scheduler
    - Unpaid Labor (amount + log count) → links to Pay Center
    - Unlogged Schedules alert (if any) → links to Unlogged tab
    - Active Projects count → links to Projects
  - Click each card, verify correct navigation

- [ ] **Project Navigation**
  - From Projects list, open a project
  - Verify all tabs load: Overview, Estimates, Proposals, Financials, Schedule, Workforce, Subs, Documents
  - Click through each tab, verify no errors
  - Verify terminology is consistent across tabs

## 🎯 Terminology & Consistency

### Verified Terms Across All UIs
- [ ] **Schedule** always refers to planned work (`work_schedules` table)
- [ ] **Time Log** always refers to actual work (`time_logs` table)
- [ ] **Worker** vs **Subcontractor** never mixed
- [ ] **Company** (Forma/GA) vs **Client** distinction clear
- [ ] **Pay Run** for grouped payments, **Payment** for individual transactions
- [ ] No "Entries", "Events", or ambiguous "Logs" labels

### Component Names Match UI Labels
- [ ] Tab names in Project detail match global nav areas
- [ ] Buttons do what they say (no "Open" that just refreshes)
- [ ] Consistent capitalization and phrasing

## 🧩 Unified Views & Behaviors

### Schedule vs Time Log Consistency
- [ ] Scheduler Team Week View uses `work_schedules`
- [ ] Full Day Planner uses `work_schedules`
- [ ] Time Logs Table uses `time_logs`
- [ ] Activity Feed distinguishes schedule events from time log events

### Single Day Planner Experience
- [ ] Clicking day tile in Scheduler → Full Day Planner modal
- [ ] Clicking day in global Schedule calendar → same Full Day Planner
- [ ] Both paths use the same component (DayDetailDialog or UniversalDayDetailDialog)
- [ ] No divergent versions with different behaviors

### Time Log Detail Drawer
- [ ] Used in: Activity Tab Time Logs Table
- [ ] Used in: Any time log view links
- [ ] Shows: worker, project, company, trade, date, hours, rate, cost
- [ ] Shows: cost code, pay status, link to pay run (if paid)
- [ ] Actions: Split (if unpaid), View in Project, View Payment Run

### Activity Feed vs Time Logs Table
- [ ] Time Logs Table is the authoritative, filterable grid
- [ ] Activity Feed shows readable history ("Time log created", etc.)
- [ ] Each feed item links to meaningful detail view
- [ ] No dead-end "View" buttons

## 💼 UX Simplification for Leo

### Reduce Decisions Per Screen
- [ ] Scheduler Full Day Planner prioritizes core actions:
  - Schedule hours
  - Split across projects
  - Rebalance hours
  - Convert to time logs
- [ ] Advanced options behind "More" links if needed

### Copy & Helper Text
- [ ] "Schedule workers" not "Create entries"
- [ ] "Convert schedules to time logs" not "Sync"
- [ ] "Unpaid labor" / "Paid labor" not "Outstanding"
- [ ] Inline helper text where needed:
  - Example: "Only past schedules will be converted to time logs. Future days stay as schedules."

### Empty States
- [ ] Scheduler: "No schedules this week. Click 'Add to Schedule' to start."
- [ ] Time Logs: "No time logs found. Try adjusting filters."
- [ ] Pay Center Unpaid: "All caught up! No unpaid time logs."
- [ ] Pay Center Unlogged: "All schedules logged! No unlogged past days."
- [ ] Documents: "No documents yet. Upload to get started."
- [ ] No blank white screens anywhere

### Error States & Sync Clarity
- [ ] Failed conversions show clear error messages
- [ ] Tooltip or info icon explains:
  - When automatic conversion runs
  - How to manually convert a day
- [ ] Never silently drop data

## 📱 Mobile & Responsive

### Workforce → Scheduler
- [ ] On mobile: worker cards stack vertically
- [ ] On mobile: day list replaces big calendar grid
- [ ] Simple schedule summary per worker
- [ ] No horizontal scroll

### Time Logs Table
- [ ] On narrow screens: wide table becomes stacked rows
  - Top line: Worker, Date, Project
  - Second line: Hours, Cost, Pay Status, Cost Code
- [ ] "View" opens same detail drawer as desktop
- [ ] Filters accessible on mobile

### Global Navigation
- [ ] Mobile bottom nav works on all pages
- [ ] Slide-out menu accessible
- [ ] No cut-off buttons or text

## 🧹 Dead Code & Placeholder Cleanup

- [ ] Find buttons/links that do nothing
  - Wire to correct flow OR
  - Mark as "Coming soon" and visually downplay
- [ ] Remove unreachable components from old architecture
- [ ] Remove duplicate calendar/scheduler components
- [ ] Deprecate old components still using `scheduled_shifts` or `daily_logs`

## ✅ Final Checklist Before Sign-Off

### Complete Flow Test
1. [ ] Create project → estimate → set as budget
2. [ ] Schedule workers for a week (Workforce → Scheduler)
3. [ ] Convert last few days to time logs
4. [ ] Run a pay run (Workforce → Pay Center)
5. [ ] Check Project Financials: labor budget vs actual matches
6. [ ] Check Project Financials: unpaid labor matches Pay Center

### Technical Health
- [ ] No console errors on main paths
- [ ] No TypeScript errors
- [ ] No obvious layout breaks on desktop
- [ ] No obvious layout breaks on mobile (iPad + phone)
- [ ] All API calls use new tables (`work_schedules`, `time_logs`)

### Code Quality
- [ ] Business logic has short comments explaining rules
- [ ] Sync rules documented in code
- [ ] Pay run logic has clear comments
- [ ] No redundant or confusing variable names

## 📊 Migration Status

**Components Updated to New Tables:** 17
**Components Remaining:** 38

### Still Using Old Tables (Lower Priority)
- Project view components (ProjectOverview, ProjectWorkforceTab, etc.)
- Payment detail components
- Admin reports
- Archived logs

These will be addressed in future sprints but don't block Leo's core workflow.

---

**Last Updated:** 2025-11-22
**Status:** QA & Polish Sprint In Progress
