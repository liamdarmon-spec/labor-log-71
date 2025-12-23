# 🔍 MIGRATION CONTRACT AUDIT REPORT

**Generated:** 2025-12-23T05:55:37.628Z

## How to Use

```bash
# 1. Run the audit
npm run db:contract

# 2. If missing columns found, generate fix
npm run db:contract:fix

# 3. Test the fix
npm run db:reset
```

## Summary

- **Tables cataloged:** 61
- **Functions cataloged:** 31
- **Views cataloged:** 24
- **Missing columns:** 5


## ⚠️ Status: ISSUES FOUND

Missing columns detected.

---

## Missing Columns

### Table: `documents`

#### Column: `source_context`

**Type (inferred):** `text`

**Referenced by:**

- `20251204153001_29ca01ea-de94-4cb8-927d-8f5f8289c876.sql:13` (CREATE INDEX)

#### Column: `related_cost_id`

**Type (inferred):** `uuid`

**Referenced by:**

- `20251204153001_29ca01ea-de94-4cb8-927d-8f5f8289c876.sql:14` (CREATE INDEX)

#### Column: `related_invoice_id`

**Type (inferred):** `uuid`

**Referenced by:**

- `20251204153001_29ca01ea-de94-4cb8-927d-8f5f8289c876.sql:15` (CREATE INDEX)

#### Column: `is_archived`

**Type (inferred):** `boolean`

**Referenced by:**

- `20251204153001_29ca01ea-de94-4cb8-927d-8f5f8289c876.sql:16` (CREATE INDEX)

#### Column: `version_group_id`

**Type (inferred):** `uuid`

**Referenced by:**

- `20251204153001_29ca01ea-de94-4cb8-927d-8f5f8289c876.sql:17` (CREATE INDEX)

