# Forma OS Migration Status

## ✅ Phase 1: Foundation (COMPLETE)

### Database Schema
- ✅ Created `work_schedules` table (replaces `scheduled_shifts`)
- ✅ Created `time_logs` table (replaces `daily_logs`)
- ✅ Created `labor_pay_runs` table (new payment system)
- ✅ Created `labor_pay_run_items` table (links pay runs to time logs)
- ✅ Added sync functions for work_schedules ↔ time_logs
- ✅ Added auto-populate functions (company_id, hourly_rate)
- ✅ Added trigger for marking time logs paid when pay run approved
- ✅ Comprehensive indexes and RLS policies

### Navigation & IA
- ✅ Restructured nav to: Dashboard | Projects | Workforce | Financials | Admin
- ✅ Updated desktop navigation
- ✅ Updated mobile bottom nav
- ✅ Updated mobile slide-out nav
- ✅ Removed confusing duplicate "Schedule" entry

### Documentation
- ✅ Created comprehensive FORMA_OS.md
- ✅ Documented all data models
- ✅ Documented sync workflows
- ✅ Documented UI/UX guidelines
- ✅ Documented terminology standards

## 🏗️ Phase 2: Workforce OS Components (IN PROGRESS)

### Crew Scheduler Components
- ✅ Updated `CrewSchedulerWeekView` to use `work_schedules` and `time_logs`
- ✅ Updated `CrewSchedulerHistoryView` to use `time_logs`
- ✅ Updated `CrewSchedulerPaymentsView` to use `time_logs`

### Components Still Using Old Tables

#### HIGH PRIORITY (Core Scheduling)
- ⏳ `AddToScheduleDialog` - uses `scheduled_shifts`
- ⏳ `EditScheduleDialog` - uses `scheduled_shifts` and `daily_logs`
- ⏳ `DayDetailDialog` - uses `scheduled_shifts` and `daily_logs`
- ⏳ `MasterScheduleModal` - uses `scheduled_shifts` and `daily_logs`
- ⏳ `UniversalDayDetailDialog` - likely uses old tables
- ⏳ `ScheduleDeleteButton` - uses `scheduled_shifts` and `daily_logs`

#### MEDIUM PRIORITY (Dashboard & Workforce)
- ⏳ `SingleEntryTab` - uses `daily_logs`
- ⏳ `BulkEntryTab` - uses `daily_logs`
- ⏳ `ViewLogsTab` - uses `daily_logs`
- ⏳ `ViewLogsTabMobile` - uses `daily_logs`
- ⏳ `AnalyticsTab` (dashboard) - uses `daily_logs`
- ⏳ `CostCalculatorTab` - uses `daily_logs`
- ⏳ `WeeklyCompanyReport` - uses `daily_logs`

#### MEDIUM PRIORITY (Project Views)
- ⏳ `ProjectOverview` - uses `scheduled_shifts`
- ⏳ `ProjectOverviewEnhanced` - uses `scheduled_shifts`
- ⏳ `ProjectOverviewOS` - uses `scheduled_shifts` and `daily_logs`
- ⏳ `ProjectOverviewTab` - uses `scheduled_shifts` and `daily_logs`
- ⏳ `ProjectWorkforceTab` - uses `scheduled_shifts` and `daily_logs`
- ⏳ `ProjectBudgetCosts` - uses `daily_logs`
- ⏳ `ProjectCostsTab` - uses `daily_logs`
- ⏳ `BudgetDetailTable` - uses `daily_logs`
- ⏳ `LaborDetailTable` - uses `daily_logs`

#### LOWER PRIORITY (Payments & Reports)
- ⏳ `GlobalUnpaidLaborView` - uses `daily_logs`
- ⏳ `PaymentDetailsPanel` - uses `daily_logs`
- ⏳ `UnpaidLaborSummary` - uses `daily_logs`
- ⏳ `UnpaidLaborBills` - uses `daily_logs`
- ⏳ `ReportsTab` (admin) - uses `daily_logs`
- ⏳ `ReportsTab` (dashboard) - uses `daily_logs`
- ⏳ `ActivityTimelineTab` - uses `daily_logs`

#### LOWER PRIORITY (Admin)
- ⏳ `ArchivedLogsTab` - uses `archived_daily_logs` (legacy)
- ⏳ `LogsTab` - uses `daily_logs`

### Subcontractor Components
- ⏳ `SubScheduleDialog` - uses `sub_scheduled_shifts`
- ⏳ `ProjectSubsCalendar` - uses `sub_scheduled_shifts`
- ⏳ `ProjectSubsTab` - uses `sub_scheduled_shifts`

**Note:** Subcontractor scheduling is Phase 4, will address after core labor scheduling is complete.

## 📋 Next Actions

### Immediate (Next Session)
1. Update `AddToScheduleDialog` to insert into `work_schedules`
2. Update `EditScheduleDialog` to edit `work_schedules` and `time_logs`
3. Update `DayDetailDialog` to query `work_schedules` and `time_logs`
4. Update `MasterScheduleModal` to use new tables
5. Update `ScheduleDeleteButton` to delete from correct tables

### Short Term
1. Update all Dashboard time entry components
2. Update all Project overview components
3. Update payment-related components to understand `labor_pay_runs`
4. Test end-to-end: schedule → convert → pay

### Medium Term
1. Build new Pay Center UI using `labor_pay_runs`
2. Refactor Project Financials to pull actuals from `time_logs`
3. Create unified "Time Log Detail" drawer
4. Remove/deprecate old payment components

### Long Term
1. Phase out `archived_daily_logs` (implement archiving in new model)
2. Implement subcontractor scheduling with new model
3. Build Subcontractor OS (Phase 4)
4. Build Documents OS (Phase 5)

## 🧪 Testing Checklist

### Core Workflows (Once Updated)
- [ ] Create a work schedule for future date
- [ ] Manually convert schedule to time log
- [ ] Wait for past schedule to auto-convert
- [ ] Edit a time log, verify schedule syncs
- [ ] Split a schedule across multiple projects
- [ ] Create a pay run from time logs
- [ ] Verify time logs marked as paid
- [ ] View paid vs unpaid in History view

### UI Verification
- [ ] Week view shows all workers correctly
- [ ] Day planner shows multi-project splits
- [ ] History view groups by worker-day
- [ ] Payments view shows unpaid by company
- [ ] Mobile views render correctly

## ⚠️ Known Issues

1. **Payment History References**
   - History view no longer shows which payment a time log belongs to
   - Need to add labor_pay_run_id to time_logs or join through labor_pay_run_items
   - Low priority for now since payment UI will be rebuilt

2. **Archived Logs**
   - Old archived_daily_logs table still exists
   - Need archiving strategy for time_logs
   - Very low priority

3. **Subcontractor Schedules**
   - sub_scheduled_shifts still exists as separate table
   - Should potentially unify with work_schedules using type field
   - Phase 4 work

## 📊 Migration Metrics

- **Total Components Identified:** 55
- **Components Updated:** 3
- **Components Remaining:** 52
- **High Priority:** 6
- **Medium Priority:** 21
- **Lower Priority:** 25

**Estimated Time to Complete Phase 2:** 
- High priority: 2-3 hours
- Medium priority: 3-4 hours  
- Lower priority: 2-3 hours
- **Total:** 7-10 hours of focused work

## 🎯 Success Criteria

Phase 2 is complete when:
- ✅ All scheduling UI uses `work_schedules`
- ✅ All time tracking UI uses `time_logs`
- ✅ Schedule → time log sync works end-to-end
- ✅ Multi-project splits work correctly
- ✅ Team Week View is fully functional
- ✅ History View shows correct data
- ✅ No components query `scheduled_shifts` or `daily_logs`
- ✅ All tests pass
- ✅ Leo can use it for real daily work

---

**Last Updated:** 2025-11-22
**Current Phase:** 2 - Workforce OS Components
**Status:** In Progress (5% complete)
