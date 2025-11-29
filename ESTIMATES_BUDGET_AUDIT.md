# ESTIMATES & BUDGETS AUDIT

Complete audit of how Estimates and Budgets interact in this Forma construction ERP system.

---

## EXECUTIVE SUMMARY

**Current State:**
- Estimates use TWO line item systems: `estimate_items` (legacy) and `scope_blocks` + `scope_block_cost_items` (V2)
- Budget model uses 3-tier structure: `project_budgets` (header) → `project_budget_groups` (sections) → `project_budget_lines` (detail)
- ONE canonical sync function: `sync_estimate_to_budget(p_estimate_id)` maps `estimate_items` → `project_budget_lines`
- MULTIPLE "budget vs actual" engines exist (useUnifiedProjectBudget, useProjectBudgetLedger, ProjectBudgetTabV2)

**Problems:**
1. Scope blocks (V2 estimate system) are NOT synced to budgets - only `estimate_items` are
2. Multiple duplicate hooks computing budget vs actual (useUnifiedProjectBudget vs useProjectBudgetLedger)
3. No canonical budget update hook - lines are updated via useUpdateBudgetLine but structure management is in useProjectBudgetStructure

---

## FILE INVENTORY

### SQL Schema & Functions

| File | Role | Status |
|------|------|--------|
| `database_complete_schema_dump.sql` (lines 1429-1510) | `sync_estimate_to_budget()` function - maps `estimate_items` to `project_budget_lines` by category | **KEEP** - Primary sync function |
| `supabase/migrations/20251122185403_remix_migration_from_pg_dump.sql` | Contains same function definition | **KEEP** - Migration history |

**Key Logic in `sync_estimate_to_budget()`:**
```sql
-- Maps estimate_items.category to project_budget_lines.category:
CASE 
  WHEN category = 'Labor' THEN 'labor'
  WHEN category IN ('Subs', 'Subcontractors') THEN 'subs'
  WHEN category = 'Materials' THEN 'materials'
  ELSE 'other'
END

-- Aggregates by cost_code_id + category
-- Sets is_budget_source = true on estimate
-- Deletes existing budget_lines, creates new ones
```

---

### ESTIMATE FILES

#### Editing & Creating Estimates (A)

| File | What It Does | Recommendation |
|------|--------------|----------------|
| `src/pages/EstimateBuilderV2.tsx` | Scope blocks UI (V2 system) - creates/edits `scope_blocks` + `scope_block_cost_items` | **KEEP** - Modern estimate builder |
| `src/pages/FinancialEstimates.tsx` | Lists all estimates, filters by status/project | **KEEP** - Estimate list view |
| `src/components/project/CreateEstimateDialog.tsx` | Creates estimate header + `estimate_items` (legacy system) | **REWIRE** - Should support scope blocks sync |
| `src/components/project/ProjectEstimatesEnhanced.tsx` | Lists estimates per project, has "Sync to Budget" button | **DEPRECATE** - Duplicate of V3 |
| `src/components/project/ProjectEstimatesV3.tsx` | Lists estimates per project, has "Sync to Budget" button | **KEEP** - Canonical project estimate list |
| `src/components/estimates/ScopeBlockEditor.tsx` | Edits individual scope blocks (sections, cost items, text, image) | **KEEP** - Part of V2 system |
| `src/components/project/EstimateItemDialog.tsx` | CRUD for `estimate_items` (legacy system) | **DEPRECATE** - Legacy line item system |

#### Hooks for Estimates

| File | What It Does | Recommendation |
|------|--------------|----------------|
| `src/hooks/useEstimatesV2.ts` | Fetch/create/update/duplicate/approve estimates | **KEEP** - Primary estimate hooks |
| `src/hooks/useScopeBlocks.ts` | CRUD for `scope_blocks` + `scope_block_cost_items` | **KEEP** - V2 system hooks |

**Key Finding:** `sync_estimate_to_budget()` only reads from `estimate_items`, NOT from `scope_blocks`. This means:
- Old estimates (using estimate_items) can sync to budget ✅
- New estimates (using scope_blocks) CANNOT sync to budget ❌

---

### BUDGET FILES

#### Budget Structure Management (D - Display Only)

| File | What It Does | Recommendation |
|------|--------------|----------------|
| `src/hooks/useProjectBudgetStructure.ts` | Manages 3-tier budget model (header, groups, lines). Provides mutations for CRUD. | **KEEP** - Canonical structure management |
| `src/hooks/useUpdateBudgetLine.ts` | Updates individual budget line fields (qty, unit_cost, descriptions, etc.) | **KEEP** - Line editing |
| `src/components/project/ProjectBudgetBuilderTab.tsx` | UI for editing budget structure (groups, lines, reorder) | **KEEP** - Budget builder UI |

#### Budget vs Actual Computation (C)

| File | What It Does | Recommendation |
|------|--------------|----------------|
| `src/hooks/useUnifiedProjectBudget.ts` | Queries `project_budget_lines` + `time_logs` + `costs` to compute budget vs actual by cost code + category. Returns `{ costCodeLines, summary }` | **KEEP** - Primary budget vs actual engine |
| `src/hooks/useProjectBudgetLedger.ts` | DUPLICATE logic - also queries budget lines + time_logs + costs to compute ledger | **DEPRECATE** - Duplicate of useUnifiedProjectBudget |
| `src/hooks/useProjectBudgetLines.ts` | Simple fetch of budget lines with actuals from `labor_actuals_by_cost_code` view | **DEPRECATE** - Limited to labor only |

**Key Finding:** TWO hooks compute budget vs actual:
1. **useUnifiedProjectBudget** - composite key (cost_code_id + category), handles all categories
2. **useProjectBudgetLedger** - same logic, different return shape

#### Budget Display Components (D)

| File | What It Does | Recommendation |
|------|--------------|----------------|
| `src/components/project/ProjectBudgetTabV2.tsx` | Main budget tab - shows summary cards, category rollups, cost code ledger. Uses BOTH useUnifiedProjectBudget + useProjectFinancialsSnapshot | **KEEP** - Primary budget UI |
| `src/components/project/BudgetDetailTable.tsx` | Table view of budget lines with actual hours/costs (labor only) | **DEPRECATE** - Limited scope, use unified ledger instead |
| `src/components/project/BudgetSummaryCards.tsx` | 4 cards: Total Budget, Total Actual, Total Remaining, Total Variance | **KEEP** - Summary UI |
| `src/components/project/CategorySummaryCards.tsx` | 4 category cards: Labor, Subs, Materials, Other with budget/actual/variance | **KEEP** - Category summary UI |
| `src/components/project/UnifiedBudgetSummaryCards.tsx` | Similar to BudgetSummaryCards, uses BudgetSummary type from useUnifiedProjectBudget | **KEEP** - Unified summary UI |

---

## CONSOLIDATION PLAN

### Step 1: Fix Estimate → Budget Sync

**Problem:** `sync_estimate_to_budget()` only reads `estimate_items`, not `scope_blocks`.

**Solution:** Update SQL function to:
1. Check if estimate has scope_block_cost_items
2. If yes, map scope_block_cost_items → project_budget_lines
3. If no, fall back to estimate_items (legacy)

**New Logic:**
```sql
-- Check for scope blocks first
SELECT COUNT(*) INTO v_has_scope_blocks
FROM scope_blocks sb
JOIN scope_block_cost_items sbci ON sb.id = sbci.scope_block_id
WHERE sb.entity_type = 'estimate' 
  AND sb.entity_id = p_estimate_id;

IF v_has_scope_blocks > 0 THEN
  -- Sync from scope_block_cost_items
  INSERT INTO project_budget_lines (...)
  SELECT ...
  FROM scope_block_cost_items sbci
  JOIN scope_blocks sb ON sbci.scope_block_id = sb.id
  WHERE sb.entity_type = 'estimate' AND sb.entity_id = p_estimate_id;
ELSE
  -- Sync from estimate_items (legacy)
  INSERT INTO project_budget_lines (...)
  SELECT ... FROM estimate_items WHERE estimate_id = p_estimate_id;
END IF;
```

### Step 2: Consolidate Budget vs Actual Hooks

**Problem:** Two hooks doing the same thing.

**Action:**
- **KEEP**: `useUnifiedProjectBudget.ts`
- **DEPRECATE**: `useProjectBudgetLedger.ts`
- **UPDATE**: ProjectBudgetTabV2 to use ONLY useUnifiedProjectBudget

**Reasoning:**
- useUnifiedProjectBudget has composite key pattern (cost_code_id + category)
- Returns clean `{ costCodeLines, summary }` interface
- Already used in multiple components

### Step 3: Deprecate Legacy Estimate Components

**Action:**
- **DEPRECATE**: `ProjectEstimatesEnhanced.tsx` (use V3 instead)
- **DEPRECATE**: `EstimateItemDialog.tsx` (scope blocks are the future)
- **DEPRECATE**: `BudgetDetailTable.tsx` (use unified ledger in ProjectBudgetTabV2)
- **DEPRECATE**: `useProjectBudgetLines.ts` (use useUnifiedProjectBudget)

### Step 4: Single Budget Update Path

**Current State:**
- `useProjectBudgetStructure` manages groups + lines (CRUD)
- `useUpdateBudgetLine` updates line fields
- No coordination between them

**Action:**
- Keep both hooks but document clear responsibilities:
  - `useProjectBudgetStructure`: Structure management (groups, create/delete lines, reorder)
  - `useUpdateBudgetLine`: Field updates (qty, unit_cost, descriptions)
- Both should invalidate same query keys: `['project-budget-structure', projectId]`, `['unified-project-budget', projectId]`

---

## FINAL TARGET ARCHITECTURE

### Estimates Layer (Sales Tool)

```
┌─────────────────────────────────────┐
│   EstimateBuilderV2 (UI)            │
│   - Uses scope_blocks system        │
│   - Modern flexible builder         │
└─────────────────────────────────────┘
             │
             │ creates
             ▼
┌─────────────────────────────────────┐
│   estimates (header)                │
│   - id, project_id, title, status   │
│   - is_budget_source flag           │
└─────────────────────────────────────┘
             │
             ├── scope_blocks (V2 - preferred)
             │   └── scope_block_cost_items
             │       - category, description, qty, unit_price
             │
             └── estimate_items (legacy - deprecated)
                 - category, description, qty, unit_price
```

### Budget Layer (Execution Tool)

```
┌─────────────────────────────────────┐
│   ProjectBudgetTabV2 (UI)           │
│   - Budget vs Actual view           │
│   - Category rollups                │
│   - Cost code ledger                │
└─────────────────────────────────────┘
             │
             │ reads via
             ▼
┌─────────────────────────────────────┐
│   useUnifiedProjectBudget (ONLY)    │
│   - Queries project_budget_lines    │
│   - Joins time_logs for labor       │
│   - Joins costs for subs/materials  │
│   - Returns { costCodeLines, summary }
└─────────────────────────────────────┘
             │
             │ reads from
             ▼
┌─────────────────────────────────────┐
│   3-Tier Budget Model               │
│                                     │
│   project_budgets (header)          │
│   ├── labor_budget                  │
│   ├── subs_budget                   │
│   ├── materials_budget              │
│   └── other_budget                  │
│                                     │
│   project_budget_groups (sections)  │
│   └── Kitchen, Bath, etc.           │
│                                     │
│   project_budget_lines (detail)     │
│   ├── cost_code_id                  │
│   ├── line_type (labor/subs/...)   │
│   ├── scope_type (base/CO/option)  │
│   ├── qty, unit, unit_cost         │
│   └── budget_amount                 │
└─────────────────────────────────────┘
```

### Sync Function (Bridge)

```
┌──────────────────────────────────────┐
│   sync_estimate_to_budget()          │
│   - ONE canonical function           │
│   - Reads from scope_blocks OR       │
│     estimate_items (legacy fallback) │
│   - Writes to project_budget_lines   │
│   - Sets is_budget_source = true     │
└──────────────────────────────────────┘
```

### Actuals Layer (Field Data)

```
┌─────────────────────────────────────┐
│   time_logs (labor actuals)         │
│   - hours_worked, labor_cost        │
│   - cost_code_id, payment_status    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   costs (non-labor actuals)         │
│   - amount, category                │
│   - cost_code_id, status            │
│   - subs, materials, misc           │
└─────────────────────────────────────┘
```

---

## RECOMMENDED CHANGES SUMMARY

### SQL Changes (1)
- [ ] Update `sync_estimate_to_budget()` to read from scope_blocks + scope_block_cost_items (with estimate_items fallback)

### Hook Changes (3)
- [ ] Mark `useProjectBudgetLedger.ts` as deprecated (add console.warn)
- [ ] Mark `useProjectBudgetLines.ts` as deprecated
- [ ] Update both useProjectBudgetStructure + useUpdateBudgetLine to invalidate same query keys

### Component Changes (4)
- [ ] Update `ProjectBudgetTabV2.tsx` to use ONLY useUnifiedProjectBudget (remove useProjectFinancialsSnapshot)
- [ ] Mark `ProjectEstimatesEnhanced.tsx` as deprecated (add banner to use V3)
- [ ] Mark `BudgetDetailTable.tsx` as deprecated
- [ ] Mark `EstimateItemDialog.tsx` as deprecated (add banner to use scope blocks)

---

## VALIDATION CHECKLIST

After implementing changes, verify:

1. ✅ Estimate created with **scope_blocks** can sync to budget
2. ✅ Estimate created with **estimate_items** (legacy) can still sync to budget
3. ✅ Budget vs Actual computed by **ONE** hook (useUnifiedProjectBudget)
4. ✅ Cost code with multiple categories (e.g., APPL-M as materials + subs) displays as separate ledger lines
5. ✅ All actuals (time_logs + costs) flow into budget variance calculations
6. ✅ Budget structure edits (groups, lines) invalidate unified budget query
7. ✅ Sync function sets `is_budget_source = true` on ONE estimate per project
8. ✅ Legacy components display deprecation warnings

---

## APPENDIX: Current Schema

### estimates
```sql
CREATE TABLE estimates (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects,
  title text NOT NULL,
  status text DEFAULT 'draft',
  subtotal_amount numeric,
  tax_amount numeric,
  total_amount numeric,
  version integer DEFAULT 1,
  parent_estimate_id uuid REFERENCES estimates,
  is_budget_source boolean DEFAULT false,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### estimate_items (LEGACY)
```sql
CREATE TABLE estimate_items (
  id uuid PRIMARY KEY,
  estimate_id uuid REFERENCES estimates,
  description text NOT NULL,
  category text, -- 'Labor', 'Subs', 'Materials', 'Other'
  cost_code_id uuid REFERENCES cost_codes,
  quantity numeric DEFAULT 1,
  unit text DEFAULT 'ea',
  unit_price numeric DEFAULT 0,
  line_total numeric DEFAULT 0,
  planned_hours numeric,
  is_allowance boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

### scope_blocks (V2)
```sql
CREATE TABLE scope_blocks (
  id uuid PRIMARY KEY,
  parent_id uuid REFERENCES scope_blocks,
  entity_type text NOT NULL, -- 'estimate' | 'proposal'
  entity_id uuid NOT NULL,
  sort_order integer DEFAULT 0,
  block_type text NOT NULL, -- 'section' | 'cost_items' | 'text' | 'image'
  title text,
  description text,
  content_richtext text,
  image_url text,
  settings jsonb DEFAULT '{}',
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### scope_block_cost_items (V2)
```sql
CREATE TABLE scope_block_cost_items (
  id uuid PRIMARY KEY,
  scope_block_id uuid REFERENCES scope_blocks,
  sort_order integer DEFAULT 0,
  category text NOT NULL, -- 'labor' | 'materials' | 'subs' | 'other'
  cost_code_id uuid REFERENCES cost_codes,
  description text NOT NULL,
  quantity numeric DEFAULT 1,
  unit text DEFAULT 'ea',
  unit_price numeric DEFAULT 0,
  markup_percent numeric DEFAULT 0,
  margin_percent numeric DEFAULT 0,
  line_total numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### project_budgets (HEADER)
```sql
CREATE TABLE project_budgets (
  id uuid PRIMARY KEY,
  project_id uuid UNIQUE REFERENCES projects,
  name text NOT NULL DEFAULT 'Main Budget',
  status text DEFAULT 'draft', -- 'draft' | 'active' | 'archived'
  labor_budget numeric DEFAULT 0,
  subs_budget numeric DEFAULT 0,
  materials_budget numeric DEFAULT 0,
  other_budget numeric DEFAULT 0,
  default_markup_pct numeric,
  default_tax_pct numeric,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### project_budget_groups (SECTIONS)
```sql
CREATE TABLE project_budget_groups (
  id uuid PRIMARY KEY,
  project_budget_id uuid REFERENCES project_budgets,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  client_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### project_budget_lines (DETAIL)
```sql
CREATE TABLE project_budget_lines (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects,
  project_budget_id uuid REFERENCES project_budgets,
  group_id uuid REFERENCES project_budget_groups,
  cost_code_id uuid REFERENCES cost_codes,
  scope_type text DEFAULT 'base', -- 'base' | 'change_order' | 'allowance' | 'option'
  line_type text, -- 'labor' | 'subs' | 'materials' | 'other'
  category text NOT NULL, -- normalized to 4 values
  description_internal text,
  description_client text,
  qty numeric DEFAULT 1,
  unit text,
  unit_cost numeric DEFAULT 0,
  budget_amount numeric DEFAULT 0,
  budget_hours numeric,
  markup_pct numeric,
  tax_pct numeric,
  allowance_cap numeric,
  is_optional boolean DEFAULT false,
  is_allowance boolean DEFAULT false,
  client_visible boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  internal_notes text,
  source_estimate_id uuid REFERENCES estimates,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```
