# Auth + Multi-Tenant Setup Guide

## Overview
This application uses **Supabase Auth** with **multi-tenant company-based access control**. Every user must belong to at least one company to access the app.

---

## Required Environment Variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

### For Staging/Production
Use separate Supabase projects for each environment and set the corresponding env vars.

---

## How It Works

### 1. Email Confirmation Flow
```
User signs up → receives email → clicks link → 
/auth/callback (exchanges PKCE code) → 
checks company membership → 
  if 0 companies: /onboarding/company
  if 1+ companies: /app
```

### 2. Company Onboarding
- New users land on `/onboarding/company`
- They create their first company via `create_company_with_owner()` RPC
- User is automatically added as "owner" role
- `localStorage.active_company_id` is set
- Redirected to `/app`

### 3. Company Switching
- If user belongs to multiple companies, a `CompanySwitcher` appears in the header
- Switching updates `localStorage.active_company_id` and refreshes queries
- All data queries are scoped to `activeCompanyId` via RLS + frontend filters

### 4. Row-Level Security (RLS)
- **Companies**: users can only see companies they are members of
- **Company_members**: users can only see their own memberships
- **All tenant-scoped tables** (projects, tasks, schedules, etc.): 
  - SELECT/INSERT/UPDATE/DELETE require `is_company_member(company_id)` = true
  - Enforced by RLS policies in the database

---

## Local Testing

### 1. Reset Database
```bash
yes | npm run db:reset
```

### 2. Start Dev Server
```bash
npm run dev
```

### 3. Sign Up
- Visit `http://localhost:5173/login`
- Click "Sign Up" tab
- Enter email + password
- Check your email for confirmation link
- Click link → redirected to `/auth/callback` → `/onboarding/company`

### 4. Create Company
- Enter company name (e.g., "Acme Construction")
- Submit → you're now the "owner" → redirected to `/app`

### 5. Create Projects
- Now create projects, tasks, schedules—all will have `company_id` set to your active company

---

## Troubleshooting

### "Cannot read properties of null (reading 'id')"
- Likely not logged in. Check `localStorage` for `sb-*-auth-token`
- Try signing out and back in

### "row-level security policy" error when inserting
- Ensure `company_id` is set on all inserts
- Check that `localStorage.active_company_id` exists and user is a member

### Email confirmation link doesn't work
- Ensure `emailRedirectTo` in signup matches your app domain
- Check Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
- Add `http://localhost:5173/auth/callback` (local) and production URL

### "No company_id" errors
- Some tables may not have `company_id` yet (see migration notes)
- Reference tables like `measurement_units`, `trades` may be intentionally shared

---

## Adding Company ID to New Tables

When creating a new tenant-scoped table:

```sql
CREATE TABLE public.my_new_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index for performance
CREATE INDEX idx_my_new_table_company_id ON public.my_new_table(company_id);

-- Enable RLS
ALTER TABLE public.my_new_table ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "tenant_select" ON public.my_new_table
FOR SELECT TO authenticated
USING (public.is_company_member(company_id));

CREATE POLICY "tenant_insert" ON public.my_new_table
FOR INSERT TO authenticated
WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "tenant_update" ON public.my_new_table
FOR UPDATE TO authenticated
USING (public.is_company_member(company_id))
WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "tenant_delete" ON public.my_new_table
FOR DELETE TO authenticated
USING (public.is_company_member(company_id));
```

---

## Production Deployment Checklist

- [ ] Set up separate Supabase project for prod
- [ ] Configure Redirect URLs in Supabase Dashboard → Authentication → URL Configuration
- [ ] Add production domain to allowed redirect URLs
- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in deployment env
- [ ] Run migrations: `supabase db push` (or via CI)
- [ ] Test signup → email confirmation → onboarding flow
- [ ] Verify RLS policies are active on all tables

---

## Developer Diagnostics

In `/app`, you can optionally add a debug panel (DEV only) that shows:

- `user.id` (from `useAuth`)
- `active_company_id` (from `useCompany`)
- Membership count
- Last Supabase error (if any)

Example:

```tsx
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/company/CompanyProvider';

export function DevDiagnostics() {
  const { user } = useAuth();
  const { activeCompanyId, companies } = useCompany();

  if (import.meta.env.PROD) return null;

  return (
    <div style={{ position: 'fixed', bottom: 0, right: 0, background: '#000', color: '#0f0', padding: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
      <div>user: {user?.id?.slice(0, 8) || 'none'}</div>
      <div>company: {activeCompanyId?.slice(0, 8) || 'none'}</div>
      <div>memberships: {companies.length}</div>
    </div>
  );
}
```

---

## Summary

- **Auth**: Supabase email/password with PKCE flow via `/auth/callback`
- **Multi-tenant**: Every row scoped to `company_id`; enforced by RLS
- **Onboarding**: `/onboarding/company` creates first company + assigns owner role
- **Company switching**: `CompanySwitcher` in header updates `localStorage.active_company_id`
- **Data isolation**: All queries filter by `activeCompanyId` + RLS policies

---

**Questions?** Check the migration file `20251230050000_complete_auth_rls_foundation.sql` for exact RLS policy definitions.

