# Schedule Data Model - Canonical Reference (AFTER PRIORITY-1 FIXES)

## ✅ CANONICAL TABLE: `work_schedules` (LABOR ONLY)

**Status:** ACTIVE - Single source of truth for LABOR schedule entries.

**Row Count:** 0 (clean slate)

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

**Used By (ALL ALIGNED):**
- ✅ `src/hooks/useScheduleData.ts`
- ✅ `src/lib/scheduler/useSchedulerData.ts`
- ✅ `src/components/scheduling/UniversalDayDetailDialog.tsx`
- ✅ `src/components/scheduling/AddToScheduleDialog.tsx`
- ✅ `src/components/scheduling/EditScheduleDialog.tsx`
- ✅ `src/components/scheduling/ScheduleDeleteButton.tsx`
- ✅ All calendar views (Daily, Weekly, Monthly)

---

## ✅ CANONICAL TABLE: `sub_scheduled_shifts` (SUBS ONLY)

**Status:** ACTIVE - Single source of truth for SUBCONTRACTOR schedule entries.

**Row Count:** 0 (clean slate)

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

## 🗑️ LEGACY TABLE: `scheduled_shifts`

**Status:** DEPRECATED - No longer used after Priority-1 fixes.

**Row Count:** 0 (empty)

**Action:** Can be safely dropped in future cleanup.

---

## 📊 UNIFIED DATA FLOW (AFTER FIX)

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
time_logs (INSERT via trigger)

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

All schedule views now use the SAME data sources:

1. **Labor Data Hook:** `useScheduleData()` + `useSchedulerData()` → queries `work_schedules`
2. **Sub Data Hook:** `useSchedulerData()` → queries `sub_scheduled_shifts`
3. **Day Editor:** `UniversalDayDetailDialog` (via `FullDayPlanner`) → queries `work_schedules`
4. **Calendar Views:**
   - DailyScheduleView → `useSchedulerData` → `work_schedules` + `sub_scheduled_shifts`
   - WeeklyScheduleView → `useSchedulerData` → `work_schedules` + `sub_scheduled_shifts`
   - MonthlyScheduleView → `useSchedulerData` → `work_schedules` + `sub_scheduled_shifts`

All aligned ✅

---

## ⚡ KEY RULES (ENFORCED)

1. **Labor Schedules:** Always read/write from `work_schedules`
2. **Sub Schedules:** Always read/write from `sub_scheduled_shifts`
3. **Single Editor:** Always use `UniversalDayDetailDialog` for day-level edits
4. **Single Hook:** Use `useScheduleData()` for filtered queries, `useSchedulerData()` for calendar aggregation
5. **No Duplicates:** Never create parallel schedule dialogs or queries

---

## 🔧 FUTURE UNIFICATION (OPTIONAL)

To merge into ONE true table:
1. Add `sub_id UUID NULLABLE` to `work_schedules`
2. Rename `work_schedules` → `schedule_entries`
3. Migrate `sub_scheduled_shifts` data into `schedule_entries`
4. Drop `sub_scheduled_shifts` and `scheduled_shifts`
5. Update queries to use discriminator: `WHERE worker_id IS NOT NULL` (labor) or `WHERE sub_id IS NOT NULL` (sub)

---

Last Updated: 2025-11-22 (After Priority-1 System Fixes - COMPLETED)
