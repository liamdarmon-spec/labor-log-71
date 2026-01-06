# Trades + Cost Codes Verification Checklist

## System Overview

- **Trades** = Source of truth for work categories
- **Cost Codes** = Read-only projection (derived from Trades)
- Each Trade has exactly **3 default cost codes**: Labor, Material, Subcontractor

## Verification Steps

### 1. Create Trade with Auto-Generate

1. Navigate to **Admin → Trades**
2. Click **Add Trade**
3. Enter trade name (e.g., "Electrical")
4. Leave "Auto-generate Labor, Material, and Subcontractor cost codes" checked
5. Click **Create Trade**
6. **Expected:**
   - Trade appears in list with Status = **Complete**
   - Columns show: ✓ ELE-L | ✓ ELE-M | ✓ ELE-S (or similar prefix)

### 2. Verify Cost Codes Page

1. Navigate to **Admin → Cost Codes**
2. **Expected:**
   - The 3 new cost codes appear with correct trade name in Trade column
   - Category shows: Labor, Material, Subcontractor
   - No "Auto-Generate" button exists on this page

### 3. Create Trade Without Auto-Generate

1. Navigate to **Admin → Trades**
2. Click **Add Trade**
3. Enter trade name (e.g., "Roofing")
4. **Uncheck** "Auto-generate Labor, Material, and Subcontractor cost codes"
5. Click **Create Trade**
6. **Expected:**
   - Trade appears with Status = **Incomplete**
   - Labor/Material/Sub columns show "Missing"

### 4. Generate Defaults for Incomplete Trade

1. On the incomplete trade row, click the **⋮** menu
2. Click **Generate Defaults**
3. Confirm the dialog
4. **Expected:**
   - Trade status changes to **Complete**
   - All 3 default codes now show ✓

### 5. Legacy/Unassigned Codes

1. Navigate to **Admin → Cost Codes**
2. If legacy codes exist:
   - A yellow banner shows "X legacy/unassigned cost codes hidden"
   - Toggle "Show legacy" to reveal them
   - Trade column shows "Legacy" badge for these codes

### 6. Filters Work

1. On Cost Codes page, test:
   - Search by code (e.g., "ELE")
   - Filter by Trade dropdown
   - Filter by Category dropdown
   - Filter by Status (Active/Archived)

### 7. No Stray Auto-Generate Buttons

1. On Cost Codes page: **No "Auto-Generate" button exists**
2. On Cost Codes page: **No "Add Cost Code" button exists**
3. All cost code creation happens only through Trades page

## SQL Verification Queries

Run in Supabase SQL Editor:

```sql
-- 1) Check for invalid categories (should return 0)
SELECT COUNT(*) AS invalid_categories
FROM public.cost_codes
WHERE category NOT IN ('labor', 'material', 'sub');

-- 2) Check for trades with invalid code count (should return 0)
SELECT t.id, t.name, COUNT(cc.*) AS code_count
FROM public.trades t
LEFT JOIN public.cost_codes cc ON cc.trade_id = t.id
GROUP BY t.id, t.name
HAVING COUNT(cc.*) NOT IN (0, 3);

-- 3) Check for orphaned cost codes (legacy/unassigned)
SELECT COUNT(*) AS legacy_count
FROM public.cost_codes
WHERE trade_id IS NULL;

-- 4) Verify RPC functions exist
SELECT proname FROM pg_proc
WHERE proname IN ('get_trades_with_default_codes', 'get_cost_codes_with_trades');
```

## Performance Verification

- **Trades page:** Makes 1 RPC call (`get_trades_with_default_codes`)
- **Cost Codes page:** Makes 1 RPC call (`get_cost_codes_with_trades`)
- No N+1 queries
- No per-row queries

## Security Verification

- All queries filtered by `activeCompanyId`
- RPCs validate company membership via `is_company_member()`
- Cost Codes page is completely read-only (no write operations)
