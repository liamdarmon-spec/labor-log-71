# Schedule Data Model - Canonical Reference

## ✅ CANONICAL TABLE: `work_schedules` (LABOR ONLY)

**Status:** ACTIVE - Single source of truth for LABOR schedule entries.

**Schema:**
```
work_schedules:
  - id (uuid, primary key)
  - worker_id (uuid, NOT NULL, references workers) ← LABOR ONLY
  - project_id (uuid, references projects)
  - company_id (uuid, references companies)
  - trade_id (uuid, references trades)
  - cost_code_id (uuid, references cost_codes)
  - scheduled_date (date, NOT NULL)
  - scheduled_hours (numeric, NOT NULL)
  - type (text) ← Currently unused, reserved for future
  - status (text: 'planned' | 'synced' | 'converted')
  - notes (text)
  - source_schedule_id (uuid, for split schedules)
  - converted_to_timelog (boolean)
  - last_synced_at (timestamptz)
  - created_by (uuid)
  - created_at (timestamptz)
  - updated_at (timestamptz)
```

**Used By:**
- ✅ `src/hooks/useScheduleData.ts`
- ✅ `src/lib/scheduler/useSchedulerData.ts`
- ✅ `src/components/scheduling/UniversalDayDetailDialog.tsx`
- ✅ `src/components/scheduling/AddToScheduleDialog.tsx`
- ✅ `src/components/scheduling/EditScheduleDialog.tsx`
- ✅ `src/components/scheduling/ScheduleDeleteButton.tsx`
- ✅ All calendar views (Daily, Weekly, Monthly)

**Converts To:** `daily_logs` when `converted_to_timelog = true`

---

## ✅ CANONICAL TABLE: `sub_scheduled_shifts` (SUBS ONLY)

**Status:** ACTIVE - Single source of truth for SUBCONTRACTOR schedule entries.

**Schema:**
```
sub_scheduled_shifts:
  - id (uuid, primary key)
  - sub_id (uuid, NOT NULL, references subs) ← SUBS ONLY
  - project_id (uuid, NOT NULL, references projects)
  - scheduled_date (date, NOT NULL)
  - scheduled_hours (numeric, NOT NULL)
  - notes (text)
  - status (text)
  - cost_code_id (uuid, references cost_codes)
  - created_at (timestamptz)
  - updated_at (timestamptz)
```

**Used By:**
- ✅ `src/lib/scheduler/useSchedulerData.ts` (for sub calendar display)
- ✅ `src/components/scheduling/AddToScheduleDialog.tsx` (for sub schedule creation)
- ✅ Sub-related components

---

## ✅ TIME LOG TABLE: `daily_logs`

**Status:** ACTIVE - Records actual hours worked.

**Schema:**
```
daily_logs:
  - id (uuid, primary key)
  - worker_id (uuid, NOT NULL, references workers)
  - project_id (uuid, NOT NULL, references projects)
  - schedule_id (uuid, NULLABLE, references work_schedules) ← Link to schedule
  - date (date, NOT NULL)
  - hours_worked (numeric, NOT NULL)
  - trade_id (uuid, references trades)
  - cost_code_id (uuid, references cost_codes)
  - notes (text)
  - payment_status (text: 'unpaid' | 'paid')
  - payment_id (uuid, references payments)
  - paid_amount (numeric)
  - created_by (uuid)
  - created_at (timestamptz)
```

**Purpose:** Tracks actual time worked. Can be created from schedules or entered directly.

---

## 🗑️ LEGACY TABLE: `scheduled_shifts`

**Status:** DEPRECATED - No longer used.

**Action:** Can be safely dropped in future cleanup.

---

## 📊 UNIFIED DATA FLOW

```
LABOR SCHEDULES:
User Input (Add/Edit Schedule)
  ↓
work_schedules (INSERT/UPDATE)
  ↓
useSchedulerData + useScheduleData (both query work_schedules)
  ↓
UniversalDayDetailDialog (displays from work_schedules)
  ↓
[If past date OR manual conversion]
  ↓
daily_logs (INSERT with schedule_id reference)

SUB SCHEDULES:
User Input (Add Sub to Schedule)
  ↓
sub_scheduled_shifts (INSERT/UPDATE)
  ↓
useSchedulerData (queries sub_scheduled_shifts)
  ↓
Calendar views display subs
```

---

## 🎯 UNIFIED SCHEDULER COMPONENTS

All schedule views use the SAME data sources:

1. **Labor Data Hook:** `useScheduleData()` + `useSchedulerData()` → queries `work_schedules`
2. **Sub Data Hook:** `useSchedulerData()` → queries `sub_scheduled_shifts`
3. **Day Editor:** `UniversalDayDetailDialog` (via `FullDayPlanner`) → queries `work_schedules`
4. **Calendar Views:**
   - DailyScheduleView → `useSchedulerData` → `work_schedules` + `sub_scheduled_shifts`
   - WeeklyScheduleView → `useSchedulerData` → `work_schedules` + `sub_scheduled_shifts`
   - MonthlyScheduleView → `useSchedulerData` → `work_schedules` + `sub_scheduled_shifts`

---

## ⚡ KEY RULES

1. **Labor Schedules:** Always read/write from `work_schedules`
2. **Sub Schedules:** Always read/write from `sub_scheduled_shifts`
3. **Time Logs:** Always use `daily_logs` (not `time_logs`)
4. **Schedule-Log Link:** Use `daily_logs.schedule_id` to reference `work_schedules.id`
5. **Single Editor:** Always use `UniversalDayDetailDialog` for day-level edits
6. **Single Hook:** Use `useScheduleData()` for filtered queries, `useSchedulerData()` for calendar aggregation

---

Last Updated: 2025-11-24 (Standardized on daily_logs, removed time_logs confusion)
