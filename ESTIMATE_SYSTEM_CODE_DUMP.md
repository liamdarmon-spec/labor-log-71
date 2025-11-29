# ESTIMATE SYSTEM CODE DUMP

Complete dump of all estimate-related code and SQL schema in the construction ERP system.

---

## TABLE OF CONTENTS

1. [SQL Schema](#sql-schema)
   - Estimates Table
   - Estimate Items Table
   - Scope Blocks Table
   - Scope Block Cost Items Table
   - Entity Change Log Table
2. [Database Functions](#database-functions)
3. [React Hooks](#react-hooks)
   - useEstimatesV2
   - useScopeBlocks
4. [React Components](#react-components)
   - EstimateBuilderV2 Page
   - FinancialEstimates Page
   - CreateEstimateDialog
   - EstimateItemDialog
   - ScopeBlockEditor
5. [System Architecture](#system-architecture)

---

## SQL SCHEMA

### 1. Estimates Table

```sql
CREATE TABLE public.estimates (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    subtotal_amount numeric(12,2) DEFAULT 0,
    tax_amount numeric(12,2) DEFAULT 0,
    total_amount numeric(12,2) DEFAULT 0,
    version integer DEFAULT 1,
    parent_estimate_id uuid REFERENCES public.estimates(id),
    change_log jsonb DEFAULT '[]'::jsonb,
    approved_at timestamp with time zone,
    approved_by uuid,
    margin_percent numeric DEFAULT 0,
    settings jsonb DEFAULT '{}'::jsonb,
    is_budget_source boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Constraints
ALTER TABLE public.estimates
    ADD CONSTRAINT estimates_status_check 
    CHECK (status IN ('draft', 'pending', 'accepted', 'rejected'));

-- Indexes
CREATE INDEX idx_estimates_project_id ON public.estimates(project_id);
CREATE INDEX idx_estimates_status ON public.estimates(status);
CREATE INDEX idx_estimates_is_budget_source ON public.estimates(is_budget_source);

-- RLS Policies
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view estimates" 
ON public.estimates FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert estimates" 
ON public.estimates FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update estimates" 
ON public.estimates FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete estimates" 
ON public.estimates FOR DELETE 
USING (true);

-- Trigger
CREATE TRIGGER trg_estimates_set_timestamp
BEFORE UPDATE ON public.estimates
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp();
```

### 2. Estimate Items Table

```sql
CREATE TABLE public.estimate_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
    description text NOT NULL,
    category text,
    cost_code_id uuid REFERENCES public.cost_codes(id),
    trade_id uuid REFERENCES public.trades(id),
    quantity numeric NOT NULL DEFAULT 1,
    unit text DEFAULT 'ea',
    unit_price numeric NOT NULL DEFAULT 0,
    line_total numeric NOT NULL DEFAULT 0,
    planned_hours numeric,
    is_allowance boolean DEFAULT false,
    area_name text,
    scope_group text,
    created_at timestamp with time zone DEFAULT now()
);

-- Constraints
ALTER TABLE public.estimate_items
    ADD CONSTRAINT estimate_items_category_check
    CHECK (category IS NULL OR category IN ('labor', 'subs', 'materials', 'allowance', 'other'));

-- Indexes
CREATE INDEX idx_estimate_items_estimate_id ON public.estimate_items(estimate_id);
CREATE INDEX idx_estimate_items_cost_code_id ON public.estimate_items(cost_code_id);
CREATE INDEX idx_estimate_items_category ON public.estimate_items(category);

-- RLS Policies
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view estimate items" 
ON public.estimate_items FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert estimate items" 
ON public.estimate_items FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update estimate items" 
ON public.estimate_items FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete estimate items" 
ON public.estimate_items FOR DELETE 
USING (true);
```

### 3. Scope Blocks Table

```sql
CREATE TABLE public.scope_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    parent_id uuid REFERENCES public.scope_blocks(id) ON DELETE CASCADE,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    block_type text NOT NULL,
    title text,
    description text,
    content_richtext text,
    image_url text,
    settings jsonb DEFAULT '{}'::jsonb,
    is_visible boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Constraints
ALTER TABLE public.scope_blocks
    ADD CONSTRAINT scope_blocks_entity_type_check
    CHECK (entity_type IN ('estimate', 'proposal'));

ALTER TABLE public.scope_blocks
    ADD CONSTRAINT scope_blocks_block_type_check
    CHECK (block_type IN ('section', 'cost_items', 'text', 'image', 'nested'));

-- Indexes
CREATE INDEX idx_scope_blocks_entity ON public.scope_blocks(entity_type, entity_id);
CREATE INDEX idx_scope_blocks_sort_order ON public.scope_blocks(entity_id, sort_order);
CREATE INDEX idx_scope_blocks_parent ON public.scope_blocks(parent_id);

-- RLS Policies
ALTER TABLE public.scope_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scope blocks" 
ON public.scope_blocks FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert scope blocks" 
ON public.scope_blocks FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update scope blocks" 
ON public.scope_blocks FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete scope blocks" 
ON public.scope_blocks FOR DELETE 
USING (true);

-- Trigger
CREATE TRIGGER trg_scope_blocks_set_timestamp
BEFORE UPDATE ON public.scope_blocks
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp();
```

### 4. Scope Block Cost Items Table

```sql
CREATE TABLE public.scope_block_cost_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    scope_block_id uuid NOT NULL REFERENCES public.scope_blocks(id) ON DELETE CASCADE,
    sort_order integer NOT NULL DEFAULT 0,
    category text NOT NULL,
    cost_code_id uuid REFERENCES public.cost_codes(id),
    description text NOT NULL,
    quantity numeric NOT NULL DEFAULT 1,
    unit text NOT NULL DEFAULT 'ea',
    unit_price numeric NOT NULL DEFAULT 0,
    markup_percent numeric NOT NULL DEFAULT 0,
    margin_percent numeric NOT NULL DEFAULT 0,
    line_total numeric NOT NULL DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Constraints
ALTER TABLE public.scope_block_cost_items
    ADD CONSTRAINT scope_block_cost_items_category_check
    CHECK (category IN ('labor', 'materials', 'subs', 'other'));

-- Indexes
CREATE INDEX idx_scope_block_cost_items_scope_block ON public.scope_block_cost_items(scope_block_id);
CREATE INDEX idx_scope_block_cost_items_cost_code ON public.scope_block_cost_items(cost_code_id);

-- RLS Policies
ALTER TABLE public.scope_block_cost_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scope block cost items" 
ON public.scope_block_cost_items FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert scope block cost items" 
ON public.scope_block_cost_items FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update scope block cost items" 
ON public.scope_block_cost_items FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete scope block cost items" 
ON public.scope_block_cost_items FOR DELETE 
USING (true);

-- Trigger
CREATE TRIGGER trg_scope_block_cost_items_set_timestamp
BEFORE UPDATE ON public.scope_block_cost_items
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp();
```

### 5. Entity Change Log Table

```sql
CREATE TABLE public.entity_change_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    version integer NOT NULL,
    change_type text NOT NULL,
    change_summary text,
    changes jsonb DEFAULT '{}'::jsonb,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX idx_entity_change_log_entity ON public.entity_change_log(entity_type, entity_id);
CREATE INDEX idx_entity_change_log_version ON public.entity_change_log(entity_id, version);

-- RLS Policies
ALTER TABLE public.entity_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view change log" 
ON public.entity_change_log FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert change log" 
ON public.entity_change_log FOR INSERT 
WITH CHECK (true);
```

---

## DATABASE FUNCTIONS

### 1. set_timestamp() Function

```sql
CREATE OR REPLACE FUNCTION public.set_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. sync_estimate_to_budget() Function

```sql
CREATE OR REPLACE FUNCTION public.sync_estimate_to_budget(p_estimate_id uuid)
RETURNS void AS $$
DECLARE
  v_project_id uuid;
  v_budget_id uuid;
BEGIN
  -- Get project_id from estimate
  SELECT project_id INTO v_project_id
  FROM public.estimates
  WHERE id = p_estimate_id;

  -- Check if budget exists for project, create if not
  SELECT id INTO v_budget_id
  FROM public.project_budgets
  WHERE project_id = v_project_id;

  IF v_budget_id IS NULL THEN
    INSERT INTO public.project_budgets (project_id, name, status)
    VALUES (v_project_id, 'Main Budget', 'active')
    RETURNING id INTO v_budget_id;
  END IF;

  -- Delete existing budget lines
  DELETE FROM public.project_budget_lines
  WHERE project_budget_id = v_budget_id
    AND source_estimate_id = p_estimate_id;

  -- Insert budget lines from estimate items
  INSERT INTO public.project_budget_lines (
    project_budget_id,
    project_id,
    category,
    cost_code_id,
    description_internal,
    description_client,
    qty,
    unit,
    unit_cost,
    budget_amount,
    budget_hours,
    is_allowance,
    source_estimate_id
  )
  SELECT
    v_budget_id,
    v_project_id,
    LOWER(ei.category),
    ei.cost_code_id,
    ei.description,
    ei.description,
    ei.quantity,
    ei.unit,
    ei.unit_price,
    ei.line_total,
    ei.planned_hours,
    ei.is_allowance,
    p_estimate_id
  FROM public.estimate_items ei
  WHERE ei.estimate_id = p_estimate_id;

  -- Update estimate to mark as budget source
  UPDATE public.estimates
  SET is_budget_source = true,
      status = 'accepted',
      approved_at = now()
  WHERE id = p_estimate_id;

  -- Update budget status to active
  UPDATE public.project_budgets
  SET status = 'active'
  WHERE id = v_budget_id;

END;
$$ LANGUAGE plpgsql;
```

---

## REACT HOOKS

### 1. useEstimatesV2.ts

```typescript
${await Deno.readTextFile('src/hooks/useEstimatesV2.ts')}
```

### 2. useScopeBlocks.ts

```typescript
${await Deno.readTextFile('src/hooks/useScopeBlocks.ts')}
```

---

## REACT COMPONENTS

### 1. EstimateBuilderV2.tsx

```typescript
${await Deno.readTextFile('src/pages/EstimateBuilderV2.tsx')}
```

### 2. FinancialEstimates.tsx

```typescript
${await Deno.readTextFile('src/pages/FinancialEstimates.tsx')}
```

### 3. CreateEstimateDialog.tsx

```typescript
${await Deno.readTextFile('src/components/project/CreateEstimateDialog.tsx')}
```

### 4. EstimateItemDialog.tsx

```typescript
${await Deno.readTextFile('src/components/project/EstimateItemDialog.tsx')}
```

### 5. ScopeBlockEditor.tsx

```typescript
${await Deno.readTextFile('src/components/estimates/ScopeBlockEditor.tsx')}
```

---

## SYSTEM ARCHITECTURE

### Data Flow

1. **Estimate Creation**
   - User creates estimate via `CreateEstimateDialog`
   - Estimate header created in `estimates` table
   - Line items created in `estimate_items` table
   - Change logged in `entity_change_log`

2. **Scope Block Builder (V2)**
   - Alternative to line items approach
   - Uses `scope_blocks` for sections/groups
   - Uses `scope_block_cost_items` for detailed line items
   - Supports nested structure with parent_id
   - Supports multiple block types: section, cost_items, text, image, nested

3. **Budget Sync**
   - Accepted estimates can be synced to project budgets
   - `sync_estimate_to_budget()` function handles the sync
   - Creates/updates `project_budget_lines` from `estimate_items`
   - Marks estimate as `is_budget_source = true`

4. **Version Control**
   - Estimates support versioning via `version` field
   - `parent_estimate_id` tracks estimate lineage
   - Duplication creates new version with reference to parent
   - Change history tracked in `entity_change_log`

### Key Design Principles

1. **Dual Line Item System**
   - **Simple**: `estimate_items` for basic estimates
   - **Advanced**: `scope_blocks` + `scope_block_cost_items` for complex estimates with grouping

2. **Budget Integration**
   - Estimates serve as budget baseline source
   - One-way sync from estimate → budget
   - `source_estimate_id` on budget lines tracks origin

3. **Flexible Structure**
   - Scope blocks support hierarchical organization
   - Multiple block types for rich content
   - Client visibility control on sections

4. **Audit Trail**
   - All changes logged in `entity_change_log`
   - Version tracking for estimate lineage
   - Approval workflow with timestamps

### Related Components

- **ProjectEstimatesEnhanced.tsx** - Project-level estimate list
- **ProjectEstimatesV3.tsx** - Alternative estimate viewer
- **ProposalPreview.tsx** - Converts estimates to client-facing proposals
- **ProjectBudgetTabV2.tsx** - Budget view that can reference estimate source

### Integration Points

- **Projects**: Each estimate belongs to one project
- **Cost Codes**: Line items can reference cost codes for categorization
- **Trades**: Labor items can reference trades
- **Budgets**: Accepted estimates sync to project budgets
- **Proposals**: Estimates can be converted to proposals for client presentation
