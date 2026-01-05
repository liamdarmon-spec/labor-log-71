import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { requireCompanyId, withCompanyId } from "@/company/tenant";

export { supabase };

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  const emailRedirectTo = `${window.location.origin}/auth/callback`;
  return await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
}

export async function rpcCreateCompany(name: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_company_with_owner", { p_name: name });
  if (error) throw error;
  // RPC returns uuid
  return data as unknown as string;
}

// DEV-only friendly helper for tenant-scoped inserts.
// Use in call sites where you already have activeCompanyId and want to guarantee company_id is attached.
export async function tenantInsert<T extends object>(
  table: string,
  values: T | T[],
  activeCompanyId: string | null | undefined,
  opts?: { select?: string; single?: boolean }
) {
  const companyId = requireCompanyId(activeCompanyId);
  const payload = Array.isArray(values)
    ? (values as T[]).map((v) => withCompanyId(v, companyId))
    : withCompanyId(values as T, companyId);

  // Supabase types may not include all tables; cast table to any.
  let q = (supabase as any).from(table).insert(payload);
  if (opts?.select) q = q.select(opts.select);
  if (opts?.single) q = q.single();
  return await q;
}


