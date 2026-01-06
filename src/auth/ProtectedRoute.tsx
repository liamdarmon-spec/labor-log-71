import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/company/CompanyProvider";

export function ProtectedRoute() {
  const { user, loading: authLoading } = useAuth();
  const { companies, activeCompanyId, loading: companyLoading, setActiveCompanyId } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-select a company deterministically if user has memberships but no active selection.
  // This prevents "bounce" behavior from routes that require tenant context.
  useEffect(() => {
    if (authLoading || companyLoading) return;
    if (!user) return;
    if (!companies.length) return;
    if (activeCompanyId) return;
    setActiveCompanyId(companies[0].companyId);
  }, [authLoading, companyLoading, user?.id, companies, activeCompanyId, setActiveCompanyId]);

  if (authLoading || companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Authenticated but no memberships: stay on the requested route with a clear state (no silent redirect).
  if (!companies.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full px-6 text-center space-y-4">
          <div className="text-lg font-semibold">No company access</div>
          <div className="text-sm text-muted-foreground">
            You&apos;re signed in, but you don&apos;t belong to any company yet.
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate("/onboarding/company", { replace: true })}
            >
              Create / Select a company
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Memberships exist but selection missing: effect above will set it; show stable loading instead of redirecting away.
  if (!activeCompanyId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Selecting company...</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}


