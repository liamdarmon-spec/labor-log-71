import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import ViewLogs from "./pages/ViewLogs";
import Schedule from "./pages/Schedule";
import Payments from "./pages/Payments";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import EstimateBuilderV2 from "./pages/EstimateBuilderV2";
import ProposalSettings from "./pages/ProposalSettings";
import FinancialsOS from "./pages/FinancialsOS";
import Workforce from "./pages/Workforce";
import WorkerProfile from "./pages/WorkerProfile";
import FinancialsV2 from '@/pages/FinancialsV2';
import FinancialsV3 from '@/pages/FinancialsV3';
import FinancialEstimates from '@/pages/FinancialEstimates';
import FinancialReports from '@/pages/FinancialReports';
import FinancialsLayout from '@/pages/financials/FinancialsLayout';
import RevenueTab from '@/pages/financials/RevenueTab';
import CostsAPTab from '@/pages/financials/CostsAPTab';
import PaymentsCenterTab from '@/pages/financials/PaymentsCenterTab';
import ProfitTab from '@/pages/financials/ProfitTab';
import Documents from '@/pages/Documents';
import Proposals from '@/pages/Proposals';
import ProposalBuilderV2 from '@/pages/ProposalBuilderV2';
import PublicProposal from '@/pages/PublicProposal';
import Materials from '@/pages/Materials';
import SubProfileV2 from './pages/SubProfileV2';
import Subs from "./pages/Subs";
import Tasks from "./pages/Tasks";
import ChangeOrders from "./pages/ChangeOrders";
import NotFound from "./pages/NotFound";
import "./i18n/config";
import AuthPage from "@/auth/AuthPage";
import CompanyOnboardingPage from "@/company/CompanyOnboardingPage";
import { CompanyProvider } from "@/company/CompanyProvider";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { RequireAuth } from "@/auth/RequireAuth";
import AuthCallback from "@/pages/AuthCallback";
import ResetPassword from "@/pages/ResetPassword";

// Configure React Query with optimized defaults for performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds - balance freshness and performance
      gcTime: 5 * 60 * 1000, // 5 minutes cache retention
      refetchOnWindowFocus: false, // Prevent unnecessary refetches on tab switch
      retry: 1, // Only retry failed requests once
      refetchOnMount: false, // Use cached data when component mounts
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CompanyProvider>
          <Routes>
            {/* Auth */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
            <Route path="/auth" element={<Navigate to="/login" replace />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset" element={<ResetPassword />} />

            {/* Public proposal stays public */}
            <Route path="/public/proposal/:token" element={<PublicProposal />} />

            {/* Onboarding (auth required, company not required) */}
            <Route element={<RequireAuth />}>
              <Route path="/onboarding/company" element={<CompanyOnboardingPage />} />
            </Route>

            {/* App (auth + company required) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<Dashboard />} />
              <Route path="/app/dashboard" element={<Dashboard />} />
              <Route path="/app/view-logs" element={<ViewLogs />} />
              <Route path="/app/schedule" element={<Schedule />} />
              <Route path="/app/payments" element={<Payments />} />
              <Route path="/app/projects" element={<Projects />} />
              <Route path="/app/projects/:projectId" element={<ProjectDetail />} />
              <Route path="/app/projects/:projectId/proposals/:proposalId" element={<ProposalBuilderV2 />} />
              <Route path="/app/estimates/:estimateId" element={<EstimateBuilderV2 />} />
              <Route path="/app/tasks" element={<Tasks />} />
              <Route path="/app/settings/proposals" element={<ProposalSettings />} />
              <Route path="/app/workforce" element={<Workforce />} />
              <Route path="/app/workforce/worker/:workerId" element={<WorkerProfile />} />

              {/* Financial System - 4-Tab Architecture */}
              <Route path="/app/financials" element={<FinancialsLayout />}>
                <Route index element={<CostsAPTab />} />
                <Route path="costs" element={<CostsAPTab />} />
                <Route path="payments" element={<PaymentsCenterTab />} />
                <Route path="receivables" element={<RevenueTab />} />
                <Route path="profit" element={<ProfitTab />} />
                <Route path="overview" element={<ProfitTab />} />
                <Route path="revenue" element={<RevenueTab />} />
                <Route path="job-costing" element={<ProfitTab />} />
                <Route path="procurement" element={<CostsAPTab />} />
              </Route>

              {/* Legacy pages under /app */}
              <Route path="/app/financials-v2" element={<FinancialsV2 />} />
              <Route path="/app/financials-v3" element={<FinancialsV3 />} />
              <Route path="/app/financials/estimates" element={<FinancialEstimates />} />
              <Route path="/app/financials/subcontractors" element={<Subs />} />
              <Route path="/app/financials/documents" element={<Documents />} />
              <Route path="/app/financials/reports" element={<FinancialReports />} />
              <Route path="/app/financials/os" element={<FinancialsOS />} />
              <Route path="/app/documents" element={<Documents />} />
              <Route path="/app/proposals" element={<Proposals />} />
              <Route path="/app/proposals/:id" element={<ProposalBuilderV2 />} />
              <Route path="/app/materials" element={<Materials />} />
              <Route path="/app/subs" element={<Subs />} />
              <Route path="/app/subs/:id" element={<SubProfileV2 />} />
              <Route path="/app/change-orders" element={<ChangeOrders />} />
              <Route path="/app/admin" element={<Admin />} />
            </Route>

            {/* Legacy route aliases -> /app/* */}
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
            <Route path="/view-logs" element={<Navigate to="/app/view-logs" replace />} />
            <Route path="/schedule" element={<Navigate to="/app/schedule" replace />} />
            <Route path="/payments" element={<Navigate to="/app/payments" replace />} />
            <Route path="/projects/*" element={<Navigate to="/app/projects" replace />} />
            {/* Legacy /estimates routes - estimates are accessed via /app/estimates/:id */}
            <Route path="/tasks" element={<Navigate to="/app/tasks" replace />} />
            <Route path="/settings/proposals" element={<Navigate to="/app/settings/proposals" replace />} />
            <Route path="/workforce/*" element={<Navigate to="/app/workforce" replace />} />
            <Route path="/financials/*" element={<Navigate to="/app/financials" replace />} />
            <Route path="/financials-v2" element={<Navigate to="/app/financials-v2" replace />} />
            <Route path="/financials-v3" element={<Navigate to="/app/financials-v3" replace />} />
            <Route path="/documents" element={<Navigate to="/app/documents" replace />} />
            <Route path="/proposals/*" element={<Navigate to="/app/proposals" replace />} />
            <Route path="/materials" element={<Navigate to="/app/materials" replace />} />
            <Route path="/subs/*" element={<Navigate to="/app/subs" replace />} />
            <Route path="/change-orders" element={<Navigate to="/app/change-orders" replace />} />
            <Route path="/admin" element={<Navigate to="/app/admin" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </CompanyProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
