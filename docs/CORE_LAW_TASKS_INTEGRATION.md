# Core Law: Tasks → Outcomes → States Integration Plan

## Philosophy

- **Tasks** = intent (human instructions). Editable. Reassignable. Can fail. No authority over reality.
- **Outcomes** = facts (immutable events). Timestamped. Attributed. Cannot be "in progress".
- **States** = reality gates (derived ONLY from outcomes). Deterministic. Never manually set.

**Non-negotiable**: Tasks cannot directly flip state. Only recording an outcome can.

---

## Current Tasks Infrastructure

## PROOF NOTES (repo scan, 2026-01-16)

- **Task table**: `public.project_todos` (used by `src/hooks/useTasks.ts` via `supabase.from('project_todos')`)
- **Core Law tables/views (from migration)**:
  - **Table**: `public.outcomes`
  - **Table**: `public.state_rules`
  - **View**: `public.subject_states`
- **Core Law RPCs (from migration)**:
  - `public.record_outcome(p_subject_type text, p_subject_id uuid, p_outcome_type text, ...)`
  - `public.list_outcomes(p_subject_type text, p_subject_id uuid, p_limit int)`
  - `public.get_subject_state(p_subject_type text, p_subject_id uuid)`
  - `public.get_available_outcome_types(p_subject_type text)` (currently derived from `state_rules.required_outcome_types`)
- **Core Law UI entry points**:
  - `src/components/tasks/OutcomePanel.tsx`
  - `src/components/tasks/TaskDetailDrawer.tsx`
  - `src/components/tasks/TaskCard.tsx`

### Table: `public.project_todos`

```sql
CREATE TABLE public.project_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid,                          -- nullable (company-wide tasks)
  title text NOT NULL,
  description text,
  status text DEFAULT 'open' NOT NULL,      -- task status: open/in_progress/done
  priority text DEFAULT 'medium' NOT NULL,  -- low/medium/high/urgent
  due_date date,
  assigned_worker_id uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  task_type text DEFAULT 'todo' NOT NULL,   -- todo/meeting/milestone/punchlist/inspection
  company_id uuid
);
```

### Frontend Components

| Component | Path | Purpose |
|-----------|------|---------|
| Tasks page | `src/pages/Tasks.tsx` | Main tasks page with tabs: Overview, My Tasks, Calendar |
| useTasks hook | `src/hooks/useTasks.ts` | CRUD operations for project_todos |
| TasksKanbanBoard | `src/components/tasks/TasksKanbanBoard.tsx` | Kanban view with drag-drop status changes |
| TaskDetailDrawer | `src/components/tasks/TaskDetailDrawer.tsx` | Sheet drawer for editing task details |
| TaskCard | `src/components/tasks/TaskCard.tsx` | Individual task card in kanban/list |
| QuickAddTaskBar | `src/components/tasks/QuickAddTaskBar.tsx` | Inline task creation |
| TaskFilters | `src/components/tasks/TaskFilters.tsx` | Filter by project/assignee/status/type |
| TaskSummaryCards | `src/components/tasks/TaskSummaryCards.tsx` | KPI cards (open, due today, overdue, completed this week) |
| TasksCalendarView | `src/components/tasks/TasksCalendarView.tsx` | Calendar view of tasks |

### Data Flow

1. `useTasks(filters)` → queries `project_todos` with filters
2. `useUpdateTask()` → updates single task (auto-sets `completed_at` when status='done')
3. `useCreateTask()` → uses `tenantInsert` with company_id
4. `useDeleteTask()` → hard delete

---

## Integration Plan: Extend Without Breaking

### 1. Keep `project_todos` as-is

We will NOT rename or restructure the table. The existing task system continues to work.

**Minimal additions to `project_todos`:**

```sql
-- Link tasks to subjects (for Core Law integration)
ALTER TABLE public.project_todos ADD COLUMN IF NOT EXISTS subject_type text;
ALTER TABLE public.project_todos ADD COLUMN IF NOT EXISTS subject_id uuid;
ALTER TABLE public.project_todos ADD COLUMN IF NOT EXISTS is_blocking boolean DEFAULT false;
```

### 2. New Tables for Core Law

#### `public.outcomes` (immutable facts)

```sql
CREATE TABLE public.outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  subject_type text NOT NULL,    -- 'project', 'proposal', 'invoice', 'schedule_block'
  subject_id uuid NOT NULL,
  outcome_type text NOT NULL,    -- 'crew_scheduled', 'client_notified', 'crew_arrived', etc.
  occurred_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid NOT NULL,
  method text,                   -- 'sms', 'call', 'email', 'in_person', 'system'
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enforce immutability via RLS (no UPDATE/DELETE)
```

#### `public.state_rules` (configurable state derivation)

```sql
CREATE TABLE public.state_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,
  state text NOT NULL,
  required_outcome_types text[] NOT NULL,
  precedence int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Higher precedence wins when multiple states match
```

#### `public.subject_states` (view - derived, never stored)

```sql
CREATE VIEW public.subject_states AS
WITH outcome_counts AS (
  SELECT company_id, subject_type, subject_id, outcome_type, COUNT(*) as cnt
  FROM public.outcomes
  GROUP BY company_id, subject_type, subject_id, outcome_type
),
matched_rules AS (
  SELECT
    oc.company_id,
    oc.subject_type,
    oc.subject_id,
    sr.state,
    sr.precedence,
    -- All required outcomes must exist
    BOOL_AND(EXISTS(
      SELECT 1 FROM outcome_counts oc2
      WHERE oc2.company_id = oc.company_id
        AND oc2.subject_type = oc.subject_type
        AND oc2.subject_id = oc.subject_id
        AND oc2.outcome_type = req
    )) as all_met
  FROM (SELECT DISTINCT company_id, subject_type, subject_id FROM outcome_counts) oc
  CROSS JOIN public.state_rules sr
  CROSS JOIN LATERAL unnest(sr.required_outcome_types) req
  WHERE oc.subject_type = sr.subject_type
  GROUP BY oc.company_id, oc.subject_type, oc.subject_id, sr.state, sr.precedence
)
SELECT company_id, subject_type, subject_id, state
FROM matched_rules
WHERE all_met = true
ORDER BY precedence DESC
LIMIT 1;
```

### 3. RPCs (Minimal, Safe)

- `record_outcome(subject_type, subject_id, outcome_type, occurred_at?, method?, metadata?)`
- `get_subject_state(subject_type, subject_id)` → returns derived state
- `list_outcomes(subject_type, subject_id)` → returns timeline

### 4. Frontend Changes

**Extend TaskDetailDrawer** with a new section at the bottom:

```
┌──────────────────────────────────────┐
│ [Existing task fields...]            │
│                                      │
│ ─────────────────────────────────── │
│ LINKED SUBJECT                       │
│ Project: Kitchen Remodel             │
│ Reality State: [scheduled] ← badge   │
│                                      │
│ RECORD OUTCOME                       │
│ [Select outcome type ▼] [Record]     │
│                                      │
│ TIMELINE                             │
│ • crew_scheduled - Jan 15 @ 2:30pm   │
│ • client_notified - Jan 14 @ 10:00am │
└──────────────────────────────────────┘
```

**No new navigation tabs. No new pages.**

### 5. Guardrails

- Remove/disable any manual "project status" buttons (or label as legacy)
- Completing a task does NOT auto-record an outcome
- Recording an outcome is always an explicit user action

---

## Implementation Phases

### Phase 1: Database (this PR)
- [ ] Add `subject_type`, `subject_id`, `is_blocking` to `project_todos`
- [ ] Create `outcomes` table with immutability enforcement
- [ ] Create `state_rules` table
- [ ] Create `subject_states` view
- [ ] Create RPCs: `record_outcome`, `get_subject_state`, `list_outcomes`
- [ ] Seed initial state rules for projects

### Phase 2: Frontend Integration (this PR)
- [ ] Create `useOutcomes` hook
- [ ] Extend `TaskDetailDrawer` with outcomes panel
- [ ] Add state badge to task cards (when linked to subject)
- [ ] Add "Record Outcome" dropdown in drawer

### Phase 3: Future Work (separate PRs)
- [ ] Auto-link tasks when created from project context
- [ ] Project detail page shows derived state (read-only)
- [ ] Billing/scheduling logic reads from `subject_states`
- [ ] Deprecate manual status toggles

---

## Seed Data: Initial State Rules

```sql
-- Project states
INSERT INTO public.state_rules (subject_type, state, required_outcome_types, precedence) VALUES
  ('project', 'unscheduled', '{}', 0),              -- default
  ('project', 'scheduled', '{crew_scheduled}', 10),
  ('project', 'ready_to_start', '{crew_scheduled, client_notified}', 20),
  ('project', 'in_progress', '{crew_arrived}', 30),
  ('project', 'completed', '{work_completed}', 40);
```

---

## Validation Queries

```sql
-- Prove outcomes are immutable
SELECT 'UPDATE blocked' WHERE EXISTS (
  UPDATE public.outcomes SET outcome_type = 'test' RETURNING 1
);

-- Prove state is derived (no manual column)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'subject_states' AND column_name = 'state';
-- Should return from VIEW definition, not stored

-- Prove tasks cannot change state
-- (No trigger or function connects project_todos.status to subject_states)
```

