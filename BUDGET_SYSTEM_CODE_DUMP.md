# Budget System Code Dump
*Generated: 2025-11-29*

This file contains all React code and SQL code related to the budget system in Forma Tracking.

---

## TABLE OF CONTENTS

1. [SQL Schema](#sql-schema)
   - [Core Tables](#core-tables)
   - [Database Views](#database-views)
   - [Database Functions](#database-functions)
2. [React Hooks](#react-hooks)
3. [React Components](#react-components)
4. [Latest Migration](#latest-migration)

---

## SQL SCHEMA

### Core Tables

#### `project_budgets`
```sql
CREATE TABLE public.project_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE,
  labor_budget numeric DEFAULT 0,
  subs_budget numeric DEFAULT 0,
  materials_budget numeric DEFAULT 0,
  other_budget numeric DEFAULT 0,
  baseline_estimate_id uuid,
  name text NOT NULL DEFAULT 'Main Budget',
  status text NOT NULL DEFAULT 'draft',
  default_markup_pct numeric,
  default_tax_pct numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_budgets_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT project_budgets_status_check 
    CHECK (status IN ('draft','active','archived'))
);
```

#### `project_budget_groups`
```sql
CREATE TABLE public.project_budget_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_budget_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  client_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_budget_groups_project_budget_id_fkey
    FOREIGN KEY (project_budget_id) REFERENCES public.project_budgets(id) ON DELETE CASCADE
);
```

#### `project_budget_lines`
```sql
CREATE TABLE public.project_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  project_budget_id uuid,
  group_id uuid,
  cost_code_id uuid,
  category text NOT NULL DEFAULT 'labor',
  description text,
  description_internal text,
  description_client text,
  budget_amount numeric NOT NULL DEFAULT 0,
  budget_hours numeric,
  qty numeric NOT NULL DEFAULT 1,
  unit text,
  unit_cost numeric NOT NULL DEFAULT 0,
  markup_pct numeric,
  tax_pct numeric,
  allowance_cap numeric,
  is_optional boolean NOT NULL DEFAULT false,
  is_allowance boolean DEFAULT false,
  client_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  internal_notes text,
  scope_type text NOT NULL DEFAULT 'base',
  line_type text,
  change_order_id uuid,
  source_estimate_id uuid,
  estimated_cost numeric,
  estimated_hours numeric,
  actual_cost numeric DEFAULT 0,
  actual_hours numeric DEFAULT 0,
  variance numeric DEFAULT 0,
  percent_complete numeric DEFAULT 0,
  forecast_at_completion numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT project_budget_lines_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT project_budget_lines_project_budget_id_fkey
    FOREIGN KEY (project_budget_id) REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  CONSTRAINT project_budget_lines_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES public.project_budget_groups(id) ON DELETE SET NULL,
  CONSTRAINT project_budget_lines_cost_code_id_fkey 
    FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  CONSTRAINT project_budget_lines_scope_type_check
    CHECK (scope_type IN ('base','change_order','allowance','option')),
  CONSTRAINT project_budget_lines_line_type_check
    CHECK (line_type IS NULL OR line_type IN ('labor','subs','materials','other'))
);

-- Indexes
CREATE INDEX idx_project_budget_lines_project 
  ON project_budget_lines(project_id);
CREATE INDEX idx_project_budget_lines_cost_code 
  ON project_budget_lines(cost_code_id);
CREATE INDEX idx_project_budget_lines_project_budget 
  ON project_budget_lines(project_budget_id, group_id, sort_order);
CREATE INDEX idx_project_budget_lines_project_costcode 
  ON project_budget_lines(project_budget_id, cost_code_id);
```

#### `budget_revisions`
```sql
CREATE TABLE public.budget_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  revision_number integer NOT NULL,
  revision_type text NOT NULL,
  description text,
  previous_budget numeric,
  revision_amount numeric NOT NULL,
  new_budget numeric NOT NULL,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  CONSTRAINT budget_revisions_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_budget_revisions_project 
  ON budget_revisions(project_id);
```

### Database Views

#### `project_budget_vs_actual_view`
```sql
CREATE OR REPLACE VIEW project_budget_vs_actual_view AS
SELECT 
  p.id as project_id,
  p.project_name,
  pb.labor_budget,
  pb.subs_budget,
  pb.materials_budget,
  pb.other_budget,
  (pb.labor_budget + pb.subs_budget + pb.materials_budget + pb.other_budget) as total_budget,
  COALESCE(SUM(CASE WHEN c.category = 'labor' THEN c.amount ELSE 0 END), 0) as actual_labor_cost,
  COALESCE(SUM(CASE WHEN c.category = 'subs' THEN c.amount ELSE 0 END), 0) as actual_subs_cost,
  COALESCE(SUM(CASE WHEN c.category = 'materials' THEN c.amount ELSE 0 END), 0) as actual_materials_cost,
  COALESCE(SUM(CASE WHEN c.category NOT IN ('labor','subs','materials') THEN c.amount ELSE 0 END), 0) as actual_other_cost,
  COALESCE(SUM(c.amount), 0) as total_actual_cost,
  (pb.labor_budget + pb.subs_budget + pb.materials_budget + pb.other_budget) - COALESCE(SUM(c.amount), 0) as remaining_budget
FROM projects p
LEFT JOIN project_budgets pb ON pb.project_id = p.id
LEFT JOIN costs c ON c.project_id = p.id
GROUP BY p.id, p.project_name, pb.labor_budget, pb.subs_budget, pb.materials_budget, pb.other_budget;
```

#### `material_actuals_by_project`
```sql
CREATE OR REPLACE VIEW material_actuals_by_project AS
SELECT 
  p.id as project_id,
  p.project_name,
  p.company_id,
  pb.materials_budget,
  COALESCE(SUM(c.amount), 0) as material_actual,
  pb.materials_budget - COALESCE(SUM(c.amount), 0) as material_variance,
  COUNT(DISTINCT mr.vendor_id) as vendor_count,
  COUNT(DISTINCT mr.id) as receipt_count
FROM projects p
LEFT JOIN project_budgets pb ON pb.project_id = p.id
LEFT JOIN material_receipts mr ON mr.project_id = p.id
LEFT JOIN costs c ON c.project_id = p.id AND c.category = 'materials'
GROUP BY p.id, p.project_name, p.company_id, pb.materials_budget;
```

### Database Functions

#### `sync_estimate_to_budget()`
```sql
CREATE OR REPLACE FUNCTION sync_estimate_to_budget(p_estimate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_labor_total NUMERIC := 0;
  v_subs_total NUMERIC := 0;
  v_materials_total NUMERIC := 0;
  v_other_total NUMERIC := 0;
BEGIN
  -- Get project_id from estimate
  SELECT project_id INTO v_project_id
  FROM estimates
  WHERE id = p_estimate_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Estimate not found';
  END IF;

  -- Clear is_budget_source from all other estimates for this project
  UPDATE estimates
  SET is_budget_source = false
  WHERE project_id = v_project_id
    AND id != p_estimate_id;

  -- Mark this estimate as budget source and accepted
  UPDATE estimates
  SET 
    is_budget_source = true,
    status = 'accepted',
    updated_at = now()
  WHERE id = p_estimate_id;

  -- Calculate category totals from estimate items
  SELECT 
    COALESCE(SUM(CASE WHEN category = 'Labor' THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category IN ('Subs', 'Subcontractors') THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'Materials' THEN line_total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category IN ('Allowance', 'Other') THEN line_total ELSE 0 END), 0)
  INTO v_labor_total, v_subs_total, v_materials_total, v_other_total
  FROM estimate_items
  WHERE estimate_id = p_estimate_id;

  -- Update or insert project_budgets
  INSERT INTO project_budgets (
    project_id,
    labor_budget,
    subs_budget,
    materials_budget,
    other_budget,
    baseline_estimate_id
  ) VALUES (
    v_project_id,
    v_labor_total,
    v_subs_total,
    v_materials_total,
    v_other_total,
    p_estimate_id
  )
  ON CONFLICT (project_id) DO UPDATE SET
    labor_budget = EXCLUDED.labor_budget,
    subs_budget = EXCLUDED.subs_budget,
    materials_budget = EXCLUDED.materials_budget,
    other_budget = EXCLUDED.other_budget,
    baseline_estimate_id = EXCLUDED.baseline_estimate_id,
    updated_at = now();

  -- Delete old budget lines for this project
  DELETE FROM project_budget_lines
  WHERE project_id = v_project_id;

  -- Insert new budget lines aggregated by category + cost_code
  INSERT INTO project_budget_lines (
    project_id,
    cost_code_id,
    category,
    description,
    budget_amount,
    budget_hours,
    is_allowance,
    source_estimate_id
  )
  SELECT 
    v_project_id,
    cost_code_id,
    CASE 
      WHEN category = 'Labor' THEN 'labor'
      WHEN category IN ('Subs', 'Subcontractors') THEN 'subs'
      WHEN category = 'Materials' THEN 'materials'
      ELSE 'other'
    END as normalized_category,
    string_agg(DISTINCT description, ' | ') as description,
    SUM(line_total) as budget_amount,
    SUM(planned_hours) as budget_hours,
    bool_and(is_allowance) as is_allowance,
    p_estimate_id
  FROM estimate_items
  WHERE estimate_id = p_estimate_id
  GROUP BY cost_code_id, normalized_category;

END;
$$;
```

#### `set_timestamp()`
```sql
CREATE OR REPLACE FUNCTION public.set_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trg_project_budgets_set_timestamp
BEFORE UPDATE ON public.project_budgets
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp();

CREATE TRIGGER trg_project_budget_groups_set_timestamp
BEFORE UPDATE ON public.project_budget_groups
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp();

CREATE TRIGGER trg_project_budget_lines_set_timestamp
BEFORE UPDATE ON public.project_budget_lines
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp();
```

---

## REACT HOOKS

### useUnifiedProjectBudget.ts

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BudgetCategory = 'labor' | 'subs' | 'materials' | 'misc';

export interface ActualEntry {
  id: string;
  type: BudgetCategory;
  date: string;
  description: string;
  amount: number;
  hours?: number;
  worker_name?: string;
  vendor_name?: string;
}

export interface CostCodeBudgetLine {
  cost_code_id: string | null;
  code: string;
  description: string;
  category: BudgetCategory;
  budget_amount: number;
  budget_hours: number | null;
  actual_amount: number;
  actual_hours: number | null;
  variance: number;
  is_allowance: boolean;
  details: ActualEntry[];
}

export interface BudgetSummary {
  total_budget: number;
  total_actual: number;
  total_variance: number;
  labor_budget: number;
  labor_actual: number;
  labor_variance: number;
  labor_unpaid: number;
  subs_budget: number;
  subs_actual: number;
  subs_variance: number;
  materials_budget: number;
  materials_actual: number;
  materials_variance: number;
  other_budget: number;
  other_actual: number;
  other_variance: number;
}

// Category normalization helpers
function normalizeCategory(raw?: string | null): BudgetCategory {
  const value = (raw || '').toLowerCase().trim();
  if (value.startsWith('lab')) return 'labor';
  if (value.startsWith('sub')) return 'subs';
  if (value.startsWith('mat')) return 'materials';
  return 'misc';
}

function normalizeCategoryFromLine(line: any): BudgetCategory {
  const code = (line.cost_codes?.code || '').toUpperCase().trim();
  if (code.endsWith('-L')) return 'labor';
  if (code.endsWith('-S')) return 'subs';
  if (code.endsWith('-M')) return 'materials';
  return normalizeCategory(line.category);
}

function makeKey(costCodeId: string | null, category: BudgetCategory): string {
  return `${costCodeId || 'unassigned'}:${category}`;
}

export function useUnifiedProjectBudget(projectId: string) {
  return useQuery({
    queryKey: ['unified-project-budget', projectId],
    queryFn: async () => {
      // 1) Budget lines + cost codes
      const { data: budgetLines, error: budgetError } = await supabase
        .from('project_budget_lines')
        .select(`*, cost_codes (code, name)`)
        .eq('project_id', projectId)
        .order('category')
        .order('cost_code_id');

      if (budgetError) throw budgetError;

      // 2) Labor actuals from time_logs (canonical)
      const { data: laborLogs, error: laborError } = await supabase
        .from('time_logs')
        .select(`
          id, date, hours_worked, labor_cost, hourly_rate, notes,
          cost_code_id, payment_status,
          workers (name), cost_codes (code, name)
        `)
        .eq('project_id', projectId)
        .order('date', { ascending: false });

      if (laborError) throw laborError;

      // 3) ALL non-labor costs from costs (canonical)
      const { data: allCosts, error: costsError } = await supabase
        .from('costs')
        .select(`
          id, date_incurred, amount, description, cost_code_id,
          category, vendor_id, status, cost_codes (code, name)
        `)
        .eq('project_id', projectId)
        .order('date_incurred', { ascending: false });

      if (costsError) throw costsError;

      // 4) Build cost-code ledger using composite key
      const costCodeMap = new Map<string, CostCodeBudgetLine>();

      // 4a) Seed from budget lines
      budgetLines?.forEach(line => {
        const category = normalizeCategoryFromLine(line);
        const key = makeKey(line.cost_code_id, category);

        if (!costCodeMap.has(key)) {
          costCodeMap.set(key, {
            cost_code_id: line.cost_code_id,
            code: line.cost_codes?.code || 'N/A',
            description: line.cost_codes?.name || line.description || 'Unassigned',
            category,
            budget_amount: 0,
            budget_hours: null,
            actual_amount: 0,
            actual_hours: null,
            variance: 0,
            is_allowance: line.is_allowance || false,
            details: [],
          });
        }
        const entry = costCodeMap.get(key)!;
        entry.budget_amount += line.budget_amount || 0;
        if (line.budget_hours) {
          entry.budget_hours = (entry.budget_hours || 0) + line.budget_hours;
        }
      });

      // 4b) Labor actuals
      laborLogs?.forEach((log: any) => {
        const category: BudgetCategory = 'labor';
        const key = makeKey(log.cost_code_id, category);

        if (!costCodeMap.has(key)) {
          costCodeMap.set(key, {
            cost_code_id: log.cost_code_id,
            code: log.cost_codes?.code || 'N/A',
            description: log.cost_codes?.name || 'Unassigned Labor',
            category,
            budget_amount: 0,
            budget_hours: null,
            actual_amount: 0,
            actual_hours: null,
            variance: 0,
            is_allowance: false,
            details: [],
          });
        }
        const entry = costCodeMap.get(key)!;
        const amount = log.labor_cost ?? (log.hours_worked * (log.hourly_rate || 0));

        entry.actual_amount += amount;
        entry.actual_hours = (entry.actual_hours || 0) + log.hours_worked;
        entry.details.push({
          id: log.id,
          type: 'labor',
          date: log.date,
          description: log.notes || `${log.workers?.name || 'Worker'} - ${log.hours_worked}h`,
          amount,
          hours: log.hours_worked,
          worker_name: log.workers?.name,
        });
      });

      // 4c) Non-labor costs
      allCosts?.forEach((cost: any) => {
        const category = normalizeCategory(cost.category);
        const key = makeKey(cost.cost_code_id, category);

        if (!costCodeMap.has(key)) {
          costCodeMap.set(key, {
            cost_code_id: cost.cost_code_id,
            code: cost.cost_codes?.code || 'N/A',
            description: cost.cost_codes?.name || `Unassigned ${category}`,
            category,
            budget_amount: 0,
            budget_hours: null,
            actual_amount: 0,
            actual_hours: null,
            variance: 0,
            is_allowance: false,
            details: [],
          });
        }
        const entry = costCodeMap.get(key)!;
        entry.actual_amount += cost.amount || 0;
        entry.details.push({
          id: cost.id,
          type: category,
          date: cost.date_incurred,
          description: cost.description || `${category} cost`,
          amount: cost.amount || 0,
          vendor_name: cost.vendor_id,
        });
      });

      // 5) Finalize lines + variance
      const costCodeLines = Array.from(costCodeMap.values()).map(line => ({
        ...line,
        variance: line.budget_amount - line.actual_amount,
      }));

      // 6) Summary totals (plus unpaid labor)
      const unpaidLaborAmount = (laborLogs || []).reduce((sum: number, log: any) => {
        if (log.payment_status === 'unpaid') {
          return sum + (log.labor_cost ?? (log.hours_worked * (log.hourly_rate || 0)));
        }
        return sum;
      }, 0);

      const summary: BudgetSummary = {
        total_budget: 0,
        total_actual: 0,
        total_variance: 0,
        labor_budget: 0,
        labor_actual: 0,
        labor_variance: 0,
        labor_unpaid: unpaidLaborAmount,
        subs_budget: 0,
        subs_actual: 0,
        subs_variance: 0,
        materials_budget: 0,
        materials_actual: 0,
        materials_variance: 0,
        other_budget: 0,
        other_actual: 0,
        other_variance: 0,
      };

      costCodeLines.forEach(line => {
        summary.total_budget += line.budget_amount;
        summary.total_actual += line.actual_amount;

        switch (line.category) {
          case 'labor':
            summary.labor_budget += line.budget_amount;
            summary.labor_actual += line.actual_amount;
            break;
          case 'subs':
            summary.subs_budget += line.budget_amount;
            summary.subs_actual += line.actual_amount;
            break;
          case 'materials':
            summary.materials_budget += line.budget_amount;
            summary.materials_actual += line.actual_amount;
            break;
          case 'misc':
            summary.other_budget += line.budget_amount;
            summary.other_actual += line.actual_amount;
            break;
        }
      });

      summary.total_variance = summary.total_budget - summary.total_actual;
      summary.labor_variance = summary.labor_budget - summary.labor_actual;
      summary.subs_variance = summary.subs_budget - summary.subs_actual;
      summary.materials_variance = summary.materials_budget - summary.materials_actual;
      summary.other_variance = summary.other_budget - summary.other_actual;

      return { costCodeLines, summary };
    },
  });
}
```

### useProjectBudgetLines.ts

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectBudgetLine {
  id: string;
  project_id: string;
  cost_code_id: string | null;
  category: 'labor' | 'subs' | 'materials' | 'other';
  description: string | null;
  budget_amount: number;
  budget_hours: number | null;
  is_allowance: boolean;
  source_estimate_id: string | null;
  cost_codes?: { code: string; name: string; } | null;
}

export interface BudgetLineWithActuals extends ProjectBudgetLine {
  actual_hours: number;
  actual_cost: number;
}

export function useProjectBudgetLines(projectId: string) {
  return useQuery({
    queryKey: ['project_budget_lines', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_budget_lines')
        .select(`*, cost_codes (code, name)`)
        .eq('project_id', projectId)
        .order('category')
        .order('cost_code_id');
      
      if (error) throw error;
      return data as ProjectBudgetLine[];
    },
  });
}

export function useBudgetLinesWithActuals(projectId: string) {
  return useQuery({
    queryKey: ['budget_lines_actuals', projectId],
    queryFn: async () => {
      const { data: budgetLines, error: budgetError } = await supabase
        .from('project_budget_lines')
        .select(`*, cost_codes (code, name)`)
        .eq('project_id', projectId)
        .order('category')
        .order('cost_code_id');
      
      if (budgetError) throw budgetError;

      const { data: actuals, error: actualsError } = await supabase
        .from('labor_actuals_by_cost_code')
        .select('*')
        .eq('project_id', projectId);
      
      if (actualsError) throw actualsError;

      const actualsMap = new Map(
        actuals?.map(a => [a.cost_code_id, { hours: a.actual_hours || 0, cost: a.actual_cost || 0 }]) || []
      );

      return (budgetLines || []).map(line => ({
        ...line,
        actual_hours: line.category === 'labor' ? (actualsMap.get(line.cost_code_id)?.hours || 0) : 0,
        actual_cost: line.category === 'labor' ? (actualsMap.get(line.cost_code_id)?.cost || 0) : 0,
      })) as BudgetLineWithActuals[];
    },
  });
}
```

### useProjectBudgetLedger.ts

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LedgerCategory = "labor" | "subs" | "materials" | "misc";

export interface CostCodeLedgerLine {
  costCodeId: string | null;
  costCode: string;
  costCodeName: string;
  category: LedgerCategory;
  budgetAmount: number;
  budgetHours: number | null;
  actualAmount: number;
  actualHours: number | null;
  variance: number;
}

export interface BudgetLedgerSummary {
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
  unpaidLabor: number;
  byCategory: {
    labor: { budget: number; actual: number; variance: number };
    subs: { budget: number; actual: number; variance: number };
    materials: { budget: number; actual: number; variance: number };
    misc: { budget: number; actual: number; variance: number };
  };
}

function normalizeCategory(raw: string | null | undefined): LedgerCategory {
  const v = (raw || "").toLowerCase().trim();
  if (v.startsWith("lab")) return "labor";
  if (v === "subs" || v.startsWith("sub")) return "subs";
  if (v === "materials" || v.startsWith("mat")) return "materials";
  if (["misc", "equipment", "other"].includes(v)) return "misc";
  return "misc";
}

export function useProjectBudgetLedger(projectId: string) {
  return useQuery({
    queryKey: ["project-budget-ledger", projectId],
    queryFn: async () => {
      if (!projectId) {
        return {
          ledgerLines: [] as CostCodeLedgerLine[],
          summary: {
            totalBudget: 0,
            totalActual: 0,
            totalVariance: 0,
            unpaidLabor: 0,
            byCategory: {
              labor: { budget: 0, actual: 0, variance: 0 },
              subs: { budget: 0, actual: 0, variance: 0 },
              materials: { budget: 0, actual: 0, variance: 0 },
              misc: { budget: 0, actual: 0, variance: 0 },
            },
          } as BudgetLedgerSummary,
        };
      }

      // Fetch budget lines, labor logs, legacy sub logs, and costs
      const [
        { data: budgetLines, error: budgetError },
        { data: laborLogs, error: laborError },
        { data: subLogs, error: subError },
        { data: allCosts, error: costsError },
      ] = await Promise.all([
        supabase
          .from("project_budget_lines")
          .select(`id, project_id, cost_code_id, category, budget_amount, budget_hours, cost_codes (id, code, name, category)`)
          .eq("project_id", projectId),
        supabase
          .from("time_logs")
          .select(`id, project_id, cost_code_id, hours_worked, labor_cost, payment_status`)
          .eq("project_id", projectId),
        supabase
          .from("sub_logs")
          .select("id, project_id, cost_code_id, amount")
          .eq("project_id", projectId),
        supabase
          .from("costs")
          .select("id, project_id, cost_code_id, amount, category")
          .eq("project_id", projectId),
      ]);

      if (budgetError) throw budgetError;
      if (laborError) throw laborError;
      if (subError) throw subError;
      if (costsError) throw costsError;

      const safeBudgetLines = budgetLines || [];
      const safeLaborLogs = laborLogs || [];
      const safeSubLogs = subLogs || [];
      const safeCosts = allCosts || [];

      // Build cost code metadata map
      const costCodeMeta = new Map<string, { code: string; name: string; category: LedgerCategory }>();
      safeBudgetLines.forEach((line: any) => {
        const cc = line.cost_codes;
        if (line.cost_code_id && cc) {
          costCodeMeta.set(line.cost_code_id, {
            code: cc.code || "MISC",
            name: cc.name || "Miscellaneous",
            category: normalizeCategory(cc.category || line.category),
          });
        }
      });

      // Augment meta with cost codes from actuals
      const costCodeIds = new Set<string>();
      safeLaborLogs.forEach((log: any) => { if (log.cost_code_id) costCodeIds.add(log.cost_code_id); });
      safeSubLogs.forEach((log: any) => { if (log.cost_code_id) costCodeIds.add(log.cost_code_id); });
      safeCosts.forEach((c: any) => { if (c.cost_code_id) costCodeIds.add(c.cost_code_id); });

      if (costCodeIds.size > 0) {
        const { data: costCodesData, error: costCodesError } = await supabase
          .from("cost_codes")
          .select("id, code, name, category")
          .in("id", Array.from(costCodeIds));

        if (costCodesError) throw costCodesError;

        costCodesData?.forEach((cc: any) => {
          if (!costCodeMeta.has(cc.id)) {
            costCodeMeta.set(cc.id, {
              code: cc.code || "MISC",
              name: cc.name || "Miscellaneous",
              category: normalizeCategory(cc.category),
            });
          }
        });
      }

      // Build ledger map with composite key: costCodeId:category
      const ledgerMap = new Map<string, CostCodeLedgerLine>();
      const getKey = (costCodeId: string | null, category: LedgerCategory) =>
        `${costCodeId ?? "unassigned"}:${category}`;

      const getOrCreateLine = (costCodeId: string | null, category: LedgerCategory): CostCodeLedgerLine => {
        const key = getKey(costCodeId, category);
        let line = ledgerMap.get(key);

        if (!line) {
          const meta = costCodeId ? costCodeMeta.get(costCodeId) : null;
          line = {
            costCodeId,
            costCode: meta?.code || (costCodeId ? "MISC" : "UNASSIGNED"),
            costCodeName: meta?.name || (costCodeId ? "Miscellaneous" : "Unassigned"),
            category,
            budgetAmount: 0,
            budgetHours: null,
            actualAmount: 0,
            actualHours: null,
            variance: 0,
          };
          ledgerMap.set(key, line);
        }
        return line;
      };

      // Seed ledger with budget lines
      safeBudgetLines.forEach((line: any) => {
        const costCodeId = line.cost_code_id as string | null;
        const meta = costCodeId ? costCodeMeta.get(costCodeId) : null;
        const category = normalizeCategory(meta?.category || line.category || null);
        const key = getKey(costCodeId, category);

        const budgetAmount = Number(line.budget_amount || 0);
        const budgetHours = line.budget_hours !== null && line.budget_hours !== undefined
          ? Number(line.budget_hours) : null;

        ledgerMap.set(key, {
          costCodeId,
          costCode: meta?.code || (costCodeId ? "MISC" : "UNASSIGNED"),
          costCodeName: meta?.name || (costCodeId ? "Miscellaneous" : "Unassigned"),
          category,
          budgetAmount,
          budgetHours,
          actualAmount: 0,
          actualHours: budgetHours !== null ? 0 : null,
          variance: budgetAmount,
        });
      });

      // Add labor actuals
      safeLaborLogs.forEach((log: any) => {
        const costCodeId = log.cost_code_id as string | null;
        const hours = Number(log.hours_worked || 0);
        const cost = Number(log.labor_cost || 0);

        const line = getOrCreateLine(costCodeId, "labor");
        line.actualAmount += cost;
        if (line.actualHours !== null) {
          line.actualHours = (line.actualHours || 0) + hours;
        } else {
          line.actualHours = hours;
        }
        line.variance = line.budgetAmount - line.actualAmount;
      });

      // Add legacy sub logs
      safeSubLogs.forEach((log: any) => {
        const costCodeId = log.cost_code_id as string | null;
        const amount = Number(log.amount || 0);

        const line = getOrCreateLine(costCodeId, "subs");
        line.actualAmount += amount;
        line.variance = line.budgetAmount - line.actualAmount;
      });

      // Add non-labor costs from costs table
      safeCosts.forEach((cost: any) => {
        const costCodeId = cost.cost_code_id as string | null;
        const category = normalizeCategory(cost.category);
        const amount = Number(cost.amount || 0);

        const line = getOrCreateLine(costCodeId, category);
        line.actualAmount += amount;
        line.variance = line.budgetAmount - line.actualAmount;
      });

      const ledgerLines = Array.from(ledgerMap.values());

      // Calculate summary
      const totalBudget = ledgerLines.reduce((sum, line) => sum + line.budgetAmount, 0);
      const totalActual = ledgerLines.reduce((sum, line) => sum + line.actualAmount, 0);
      const totalVariance = totalBudget - totalActual;

      const unpaidLabor = safeLaborLogs.reduce((sum, log: any) => {
        if (log.payment_status === "unpaid") {
          return sum + Number(log.labor_cost || 0);
        }
        return sum;
      }, 0) || 0;

      const sumCategory = (cat: LedgerCategory) =>
        ledgerLines.reduce(
          (acc, line) => {
            if (line.category !== cat) return acc;
            acc.budget += line.budgetAmount;
            acc.actual += line.actualAmount;
            acc.variance += line.variance;
            return acc;
          },
          { budget: 0, actual: 0, variance: 0 }
        );

      const summary: BudgetLedgerSummary = {
        totalBudget,
        totalActual,
        totalVariance,
        unpaidLabor,
        byCategory: {
          labor: sumCategory("labor"),
          subs: sumCategory("subs"),
          materials: sumCategory("materials"),
          misc: sumCategory("misc"),
        },
      };

      return { ledgerLines, summary };
    },
  });
}
```

---

## REACT COMPONENTS

### ProjectBudgetTabV2.tsx

Full component showing unified budget view with summary cards, category rollups, and cost code ledger. Uses `useUnifiedProjectBudget` hook and displays variance tracking with visual indicators for over/under budget status.

### ProjectBudgetCosts.tsx

Component displaying budget costs with summary cards, category breakdown, ledger view, unpaid labor bills, and labor detail tables. Listens for budget update events and integrates payment tracking.

### ProjectBudgetCostsTabV2.tsx

Enhanced budget costs tab with improved UI showing summary cards for total budget, actual cost, variance, and unpaid labor. Includes cost by category cards and detailed cost code ledger table with percentage used indicators.

### BudgetDetailTable.tsx

Detailed budget table component showing cost codes with budget vs actual hours and amounts for labor category. Includes interactive sheet drawer for viewing time logs by cost code.

### BudgetSummaryCards.tsx

Three-card summary component displaying:
1. Total Budget (baseline estimate)
2. Total Actual Cost (costs to date)
3. Budget Variance (over/under budget with visual indicators)

### UnifiedBudgetSummaryCards.tsx

Four-card summary component allowing category filtering:
1. Total Budget (all categories)
2. Labor Budget & Actuals
3. Subs Budget & Actuals
4. Materials Budget & Actuals

Each card is clickable to filter the ledger view by category.

---

## LATEST MIGRATION

### 20251129022007_988c354b-4f7f-42e1-bc98-4311f4e2df17.sql

```sql
-- ============================
-- CANONICAL BUDGETING MODEL
-- ============================

-- Add missing columns to existing project_budgets table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budgets' AND column_name='name') THEN
    ALTER TABLE public.project_budgets ADD COLUMN name text NOT NULL DEFAULT 'Main Budget';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budgets' AND column_name='status') THEN
    ALTER TABLE public.project_budgets ADD COLUMN status text NOT NULL DEFAULT 'draft';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budgets' AND column_name='default_markup_pct') THEN
    ALTER TABLE public.project_budgets ADD COLUMN default_markup_pct numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budgets' AND column_name='default_tax_pct') THEN
    ALTER TABLE public.project_budgets ADD COLUMN default_tax_pct numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budgets' AND column_name='notes') THEN
    ALTER TABLE public.project_budgets ADD COLUMN notes text;
  END IF;
END;
$$;

-- Add status check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_budgets_status_check'
  ) THEN
    ALTER TABLE public.project_budgets
      ADD CONSTRAINT project_budgets_status_check
      CHECK (status IN ('draft','active','archived'));
  END IF;
END;
$$;

-- Trigger to maintain updated_at
CREATE OR REPLACE FUNCTION public.set_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_budgets_set_timestamp ON public.project_budgets;
CREATE TRIGGER trg_project_budgets_set_timestamp
BEFORE UPDATE ON public.project_budgets
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp();

-- ============================
-- PROJECT BUDGET GROUPS (SECTIONS)
-- ============================

CREATE TABLE IF NOT EXISTS public.project_budget_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_budget_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  client_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_budget_groups_project_budget_id_fkey'
  ) THEN
    ALTER TABLE public.project_budget_groups
      ADD CONSTRAINT project_budget_groups_project_budget_id_fkey
      FOREIGN KEY (project_budget_id) REFERENCES public.project_budgets(id) ON DELETE CASCADE;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_budget_groups_set_timestamp ON public.project_budget_groups;
CREATE TRIGGER trg_project_budget_groups_set_timestamp
BEFORE UPDATE ON public.project_budget_groups
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp();

-- ============================
-- PROJECT BUDGET LINES - Add missing columns
-- ============================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='project_budget_id') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN project_budget_id uuid;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='group_id') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN group_id uuid;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='scope_type') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN scope_type text NOT NULL DEFAULT 'base';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='line_type') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN line_type text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='description_internal') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN description_internal text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='description_client') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN description_client text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='qty') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN qty numeric NOT NULL DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='unit') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN unit text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='unit_cost') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN unit_cost numeric NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='markup_pct') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN markup_pct numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='tax_pct') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN tax_pct numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='allowance_cap') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN allowance_cap numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='is_optional') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN is_optional boolean NOT NULL DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='client_visible') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN client_visible boolean NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='sort_order') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='internal_notes') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN internal_notes text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='project_budget_lines' AND column_name='change_order_id') THEN
    ALTER TABLE public.project_budget_lines ADD COLUMN change_order_id uuid;
  END IF;
END;
$$;

-- Add FKs for new columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_budget_lines_project_budget_id_fkey'
  ) THEN
    ALTER TABLE public.project_budget_lines
      ADD CONSTRAINT project_budget_lines_project_budget_id_fkey
      FOREIGN KEY (project_budget_id) REFERENCES public.project_budgets(id) ON DELETE CASCADE;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_budget_lines_group_id_fkey'
  ) THEN
    ALTER TABLE public.project_budget_lines
      ADD CONSTRAINT project_budget_lines_group_id_fkey
      FOREIGN KEY (group_id) REFERENCES public.project_budget_groups(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- scope_type + line_type checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_budget_lines_scope_type_check'
  ) THEN
    ALTER TABLE public.project_budget_lines
      ADD CONSTRAINT project_budget_lines_scope_type_check
      CHECK (scope_type IN ('base','change_order','allowance','option'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_budget_lines_line_type_check'
  ) THEN
    ALTER TABLE public.project_budget_lines
      ADD CONSTRAINT project_budget_lines_line_type_check
      CHECK (line_type IS NULL OR line_type IN ('labor','subs','materials','other'));
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_budget_lines_set_timestamp ON public.project_budget_lines;
CREATE TRIGGER trg_project_budget_lines_set_timestamp
BEFORE UPDATE ON public.project_budget_lines
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp();

-- Helpful indexes for budget lookups
CREATE INDEX IF NOT EXISTS idx_project_budget_lines_project_budget 
  ON public.project_budget_lines (project_budget_id, group_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_project_budget_lines_project_costcode 
  ON public.project_budget_lines (project_budget_id, cost_code_id);
```

---

## SYSTEM ARCHITECTURE NOTES

### Budget Data Flow

1. **Estimate Creation** → User creates estimates with line items
2. **Budget Sync** → User accepts estimate, triggers `sync_estimate_to_budget()` function
3. **Budget Lines Created** → Function creates/updates `project_budgets` and `project_budget_lines`
4. **Actuals Tracking** → As work happens:
   - Labor: `time_logs` table tracks hours and labor costs
   - Subs: `costs` table with category='subs'
   - Materials: `costs` table with category='materials'
   - Other: `costs` table with category='misc' or 'other'
5. **Budget Comparison** → Hooks aggregate actuals and compare to budget lines

### Key Design Principles

- **Composite Keys**: Budget lines use `(cost_code_id + category)` as composite key to allow same cost code across multiple categories
- **Category Normalization**: All categories normalize to exactly 4 buckets: labor, subs, materials, misc
- **Canonical Tables**: Budget system reads from `time_logs`, `costs`, `project_budgets`, `project_budget_lines` only
- **Legacy Tables**: `daily_logs`, `sub_logs`, `material_receipts` are read-only fallbacks for historical data
- **Cost Code Priority**: Budget line category determined by cost code suffix (-L, -S, -M) first, then fallback to stored category

### Budget Groups Feature

- **project_budget_groups**: New table for organizing budget lines into sections (Kitchen, Bath, etc.)
- **group_id**: Foreign key in project_budget_lines linking lines to groups
- **sort_order**: Controls display order of both groups and lines within groups
- **client_visible**: Controls what sections/lines appear in client-facing proposals

---

*End of Budget System Code Dump*
