import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState("");
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
      setIsAuthenticated(false);
      setShowOnboarding(false);
      return;
    }

    setIsAuthenticated(true);

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

    // If user has no companies, show onboarding
    if (memberships.length === 0) {
      setShowOnboarding(true);
      setActiveCompanyId(null);
      return;
    }

    setShowOnboarding(false);

    // Validate / derive active company
    const stored = localStorage.getItem(LS_KEY);
    const hasStored = stored && memberships.some((m) => m.companyId === stored);

    if (hasStored) {
      setActiveCompanyIdState(stored!);
    } else if (memberships.length === 1) {
      setActiveCompanyId(memberships[0].companyId);
    } else {
      // >1: clear selection and force reselect
      setActiveCompanyId(null);
    }
  };

  const handleCreateCompany = async () => {
    if (!onboardingName.trim()) {
      setOnboardingError("Company name is required");
      return;
    }

    setOnboardingLoading(true);
    setOnboardingError(null);

    try {
      // Cast to any to bypass generated types not including new RPC
      const sb: any = supabase;
      const { data, error } = await sb.rpc("bootstrap_company", {
        p_company_name: onboardingName.trim(),
      });

      if (error) throw error;

      // Refresh companies after creating
      await refreshCompanies();
      setOnboardingName("");
      setShowOnboarding(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create company";
      setOnboardingError(msg);
    } finally {
      setOnboardingLoading(false);
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

  return (
    <CompanyContext.Provider value={value}>
      {children}

      {/* Onboarding Modal - shown when authenticated user has no companies */}
      <Dialog open={showOnboarding && isAuthenticated && !loading} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Welcome! Create Your Company</DialogTitle>
            <DialogDescription>
              To get started, create your first company. You'll be set as the owner and can invite team members later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                placeholder="My Construction Co."
                value={onboardingName}
                onChange={(e) => setOnboardingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateCompany();
                  }
                }}
                disabled={onboardingLoading}
              />
            </div>
            {onboardingError && (
              <p className="text-sm text-destructive">{onboardingError}</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleCreateCompany} disabled={onboardingLoading}>
              {onboardingLoading ? "Creating..." : "Create Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}
