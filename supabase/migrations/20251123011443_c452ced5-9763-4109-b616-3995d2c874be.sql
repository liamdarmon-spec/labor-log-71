-- Sub OS v2 Backend Optimization
-- Add indexes for sub-related queries
-- Ensure efficient querying across costs, sub_contracts tables

-- Index on costs for sub vendor lookups
CREATE INDEX IF NOT EXISTS idx_costs_vendor_sub ON costs(vendor_id, vendor_type) 
WHERE vendor_type = 'sub';

-- Index on costs for sub category filtering
CREATE INDEX IF NOT EXISTS idx_costs_category_subs ON costs(category, project_id) 
WHERE category = 'subs';

-- Index on costs for date range queries
CREATE INDEX IF NOT EXISTS idx_costs_date_incurred ON costs(date_incurred DESC);

-- Index on sub_contracts for sub lookups
CREATE INDEX IF NOT EXISTS idx_sub_contracts_sub_id ON sub_contracts(sub_id);

-- Index on sub_contracts for project lookups
CREATE INDEX IF NOT EXISTS idx_sub_contracts_project_id ON sub_contracts(project_id);

-- Composite index for common sub+project queries
CREATE INDEX IF NOT EXISTS idx_sub_contracts_sub_project ON sub_contracts(sub_id, project_id);

-- Index on sub_scheduled_shifts for sub schedule queries
CREATE INDEX IF NOT EXISTS idx_sub_scheduled_shifts_sub ON sub_scheduled_shifts(sub_id, scheduled_date DESC);

-- Index on sub_scheduled_shifts for project schedule queries
CREATE INDEX IF NOT EXISTS idx_sub_scheduled_shifts_project ON sub_scheduled_shifts(project_id, scheduled_date DESC);
