import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/company/CompanyProvider";

export function ProtectedRoute() {
  const { user, loading: authLoading } = useAuth();
  const { companies, activeCompanyId, loading: companyLoading } = useCompany();
  const location = useLocation();

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

  // Authenticated, but no company selected/available -> onboarding
  if (!companies.length) {
    return <Navigate to="/onboarding/company" replace />;
  }

  if (!activeCompanyId) {
    return <Navigate to="/onboarding/company" replace />;
  }

  return <Outlet />;
}


