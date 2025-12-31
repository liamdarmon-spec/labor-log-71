import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export type CompanyRole = "owner" | "admin" | "manager" | "member" | "viewer";

export type CompanyMembership = {
  companyId: string;
  companyName: string;
  role: CompanyRole;
};

type CompanyContextValue = {
  loading: boolean;
  companies: CompanyMembership[];
  activeCompanyId: string | null;
  activeCompany: CompanyMembership | null;
  lastError: string | null;
  setActiveCompanyId: (companyId: string | null) => void;
  refreshCompanies: () => Promise<void>;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

const LS_KEY = "active_company_id";

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyMembership[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const setActiveCompanyId = (companyId: string | null) => {
    if (!companyId) {
      localStorage.removeItem(LS_KEY);
      setActiveCompanyIdState(null);
      return;
    }
    localStorage.setItem(LS_KEY, companyId);
    setActiveCompanyIdState(companyId);
  };

  const refreshCompanies = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCompanies([]);
      setActiveCompanyId(null);
      setLastError(null);
      setLoading(false);
      return;
    }

    // NOTE: our generated Supabase types may not include new tenant tables yet (company_members).
    // Keep runtime correct; cast to any to avoid blocking on type regeneration.
    const sb: any = supabase;
    const { data, error } = await sb
      .from("company_members")
      .select("company_id, role, companies:companies(id, name)")
      .eq("user_id", user.id);

    if (error) {
      setLastError(error.message);
      if (import.meta.env.DEV) {
        console.log("[tenant] company_members load failed", {
          userId: user.id,
          error: error.message,
        });
      }
      throw error;
    }

    const memberships: CompanyMembership[] = (data ?? [])
      .map((row: any) => ({
        companyId: row.company_id as string,
        role: row.role as CompanyRole,
        companyName: row.companies?.name as string,
      }))
      .filter((m) => Boolean(m.companyId && m.companyName));

    setCompanies(memberships);
    setLastError(null);

    // Validate / derive active company
    const stored = localStorage.getItem(LS_KEY);
    const hasStored = stored && memberships.some((m) => m.companyId === stored);

    if (hasStored) {
      setActiveCompanyIdState(stored!);
    } else if (memberships.length === 1) {
      setActiveCompanyId(memberships[0].companyId);
    } else {
      // 0 or >1: clear selection and force reselect/onboarding
      setActiveCompanyId(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refreshCompanies();
      } catch (e) {
        // If policies block reads or the user is unauthenticated, fall back cleanly.
        if (mounted) {
          setCompanies([]);
          setActiveCompanyId(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data } = supabase.auth.onAuthStateChange((_event) => {
      // Recompute memberships when auth changes (login/logout/refresh)
      setLoading(true);
      refreshCompanies()
        .catch(() => {
          setCompanies([]);
          setActiveCompanyId(null);
        })
        .finally(() => setLoading(false));
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCompany = useMemo(
    () => companies.find((c) => c.companyId === activeCompanyId) ?? null,
    [companies, activeCompanyId]
  );

  const value: CompanyContextValue = {
    loading,
    companies,
    activeCompanyId,
    activeCompany,
    lastError,
    setActiveCompanyId,
    refreshCompanies,
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}


