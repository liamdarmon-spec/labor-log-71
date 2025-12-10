# FORMA ERP – V3 DESIGN SPEC  
Estimate → Budget → Proposal

## 0. Product Philosophy

FORMA is a **construction OS**. The core preconstruction loop is:

> Estimate → Budget → Proposal → (then) Execution

Every feature must reinforce this loop.

Principles:

1. **Estimator-first UX** – Feels like a hybrid of Excel + Notion + Apple Notes.
2. **Single Source of Truth** – Estimate is the canonical scope & quantities; Budget is money; Proposal is presentation.
3. **Non-destructive** – Syncs should preview changes and never silently wipe user work.
4. **Forgiving** – Undo, change history, and “safe preview” before big actions.
5. **Performance-aware** – Designed to handle 500–1000 line items without choking.

---

## 1. Pillars

### Pillar 1 – Estimate UX (Preconstruction Brain)
- Area-first hierarchy: **Area → Group → Item**.
- Inline edit everywhere; keyboard-first controls.
- Cost codes + trades baked into line items.
- Autosave with clear UI feedback and undo.
- Bulk edit + drag-and-drop for reorg.

### Pillar 2 – Budget Engine (Financial Backbone)
- Budget lines keyed off cost codes and trades.
- Estimate → Budget sync is **previewed** and **non-destructive**.
- Actuals from time logs, subs, and materials roll up against budget lines.
- Variance and margin are always visible.

### Pillar 3 – Proposals (Client-Facing Layer)
- Proposal is a curated *view* of the estimate.
- Scope tree with include/exclude toggles.
- Multiple presentation modes (summary vs detailed vs itemized).
- Live preview of what the client sees.

### Pillar 4 – Canonical Data Model
- Supabase holds the **canonical schema**.
- React queries views & RPCs, not raw tables where possible.
- All destructive changes are versioned and auditable.

---

## 2. Canonical Data Concepts

### 2.1 Estimate

**Canonical facts:**
- Each line item has:
  - Area (kitchen, master bath…)
  - Optional group (demo, framing, finishes…)
  - Cost code (ties back to trade + category)
  - Qty, unit, unit price, markup, line total
- Every change is attributable to:
  - When, who, what field, old value, new value.

### 2.2 Budget

**Canonical facts:**
- Budget lines aggregate estimate items:
  - Usually by cost code + category + sometimes area.
- Budget knows:
  - Original amount from first sync.
  - Current revised budget.
  - Actuals to date.
  - Variance.

### 2.3 Proposal

**Canonical facts:**
- Proposal references:
  - Project, estimate, company branding, settings.
- Proposal content:
  - Sections (intro, scope, allowances, exclusions, payment schedule, terms, signatures).
  - Scope mapping to estimate items (what is shown vs internal-only).
- Proposal is effectively a **view** over estimate + settings.

---

## 3. Supabase Strategy

### 3.1 General Rules

1. **Never drop/rename existing tables in place**. Always add:
   - New tables
   - New views
   - New RPCs with `_v2` suffix.
2. **Migrations are additive and reversible**.
3. **Views are your compatibility layer**:
   - Front-end should rely on views where shape evolves over time.
4. **RPCs for business logic**, not scattered client-side loops:
   - E.g. `sync_estimate_to_budget_v2` for preview + execute.

### 3.2 Short-Term DB Additions (Non-breaking)

1. **Views to enrich existing data**  
   Examples (names, not implemented yet):
   - `estimate_items_enriched_view`
   - `budget_lines_with_actuals_view`
   - `proposal_scope_tree_view`

2. **New RPC for Budget Sync Preview**
   - `sync_estimate_to_budget_v2(estimate_id, mode='preview')`
   - Returns JSON diff: added, modified, removed.

3. **Change History Table (optional later)**
   - `estimate_change_history` to log who changed what.

### 3.3 Long-Term Schema Evolution

Long-term, move toward:

- `estimate_areas` table  
- `estimate_groups` table  
- `estimate_items` as first-class, not tied to legacy `scope_blocks`.

But that is a multi-step migration (separate plan).

---

## 4. Front-End Architecture (Target State)

### 4.1 Estimate

- `EstimateBuilder` (page-level, replaces V2)  
  - Uses `useEstimate(estimateId)` as single source of truth.
  - Renders:
    - `EstimateSummaryBar`
    - `EstimateToolbar`
    - `EstimateScope` (areas + groups + items)
    - `BudgetSyncBanner`

### 4.2 Budget

- `BudgetDashboard` (per project)  
- `BudgetSyncPreview` (modal)  
- `BudgetVarianceIndicator` (small badge/on overview)

### 4.3 Proposal

- `ProposalBuilder` (page-level 2-panel layout)  
  - Left: `ProposalContentTree` + `ProposalScopeTree`  
  - Right: `ProposalPreview` (live HTML/PDF)

---

## 5. Hooks (Target State)

- `useEstimate(estimateId)` – unified estimate data/ops  
- `useBudgetSync(estimateId, projectId)` – preview + execute sync  
- `useProposalEditor(proposalId)` – real-time proposal editing  
- `useUndoStack<T>()` – generic undo/redo utility

Initially, these **wrap existing hooks**, not replace them.

---

## 6. Implementation Philosophy

- Front-end UX improvements first (no schema changes).
- Then add non-destructive Supabase RPCs & views.
- Only then consider deep schema migrations.
- Everything behind feature flags or branch isolation until battle-tested.