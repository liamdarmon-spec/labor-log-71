import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RouteErrorBoundary } from "./components/ErrorBoundary";
import { Suspense, lazy } from "react";
import { ErrorTrigger } from "./components/dev/ErrorTrigger";
import { OfflineIndicator } from "./components/ui/OfflineIndicator";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import ViewLogs from "./pages/ViewLogs";
import Schedule from "./pages/Schedule";
import Payments from "./pages/Payments";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import ProposalEditor from "./pages/ProposalEditor";
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
import NotFound from "./pages/NotFound";
import "./i18n/config";

// Loading fallback for route transitions
const RouteLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Wrapper component to add error boundary to each route
const SafeRoute = ({ children }: { children: React.ReactNode }) => (
  <RouteErrorBoundary>
    <Suspense fallback={<RouteLoadingFallback />}>
      {children}
    </Suspense>
  </RouteErrorBoundary>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* Dev-only error testing tool */}
        <ErrorTrigger />
        {/* Offline indicator - shows when network is unavailable */}
        <OfflineIndicator />
        <Routes>
          {/* Core Routes - wrapped with SafeRoute for error protection */}
          <Route path="/" element={<SafeRoute><Dashboard /></SafeRoute>} />
          <Route path="/dashboard" element={<SafeRoute><Dashboard /></SafeRoute>} />
          <Route path="/view-logs" element={<SafeRoute><ViewLogs /></SafeRoute>} />
          <Route path="/schedule" element={<SafeRoute><Schedule /></SafeRoute>} />
          <Route path="/payments" element={<SafeRoute><Payments /></SafeRoute>} />
          <Route path="/projects" element={<SafeRoute><Projects /></SafeRoute>} />
          <Route path="/projects/:projectId" element={<SafeRoute><ProjectDetail /></SafeRoute>} />
          <Route path="/projects/:projectId/proposals/:proposalId" element={<SafeRoute><ProposalBuilderV2 /></SafeRoute>} />
          <Route path="/estimates/:estimateId" element={<SafeRoute><EstimateBuilderV2 /></SafeRoute>} />
          <Route path="/tasks" element={<SafeRoute><Tasks /></SafeRoute>} />
          <Route path="/settings/proposals" element={<SafeRoute><ProposalSettings /></SafeRoute>} />
          <Route path="/workforce" element={<SafeRoute><Workforce /></SafeRoute>} />
          <Route path="/workforce/worker/:workerId" element={<SafeRoute><WorkerProfile /></SafeRoute>} />
          
          {/* Financial System - 4-Tab Architecture: Costs / Payments / Receivables / Profit */}
          <Route path="/financials" element={<SafeRoute><FinancialsLayout /></SafeRoute>}>
            <Route index element={<CostsAPTab />} />
            <Route path="costs" element={<CostsAPTab />} />
            <Route path="payments" element={<PaymentsCenterTab />} />
            <Route path="receivables" element={<RevenueTab />} />
            <Route path="profit" element={<ProfitTab />} />
            {/* Legacy route mappings for backward compatibility */}
            <Route path="overview" element={<ProfitTab />} />
            <Route path="revenue" element={<RevenueTab />} />
            <Route path="job-costing" element={<ProfitTab />} />
            <Route path="procurement" element={<CostsAPTab />} />
          </Route>

          {/* Legacy routes */}
          <Route path="/financials-v2" element={<SafeRoute><FinancialsV2 /></SafeRoute>} />
          <Route path="/financials-v3" element={<SafeRoute><FinancialsV3 /></SafeRoute>} />
          <Route path="/financials/estimates" element={<SafeRoute><FinancialEstimates /></SafeRoute>} />
          <Route path="/financials/subcontractors" element={<SafeRoute><Subs /></SafeRoute>} />
          <Route path="/financials/documents" element={<SafeRoute><Documents /></SafeRoute>} />
          <Route path="/financials/reports" element={<SafeRoute><FinancialReports /></SafeRoute>} />
          <Route path="/financials/os" element={<SafeRoute><FinancialsOS /></SafeRoute>} />
          <Route path="/documents" element={<SafeRoute><Documents /></SafeRoute>} />
          <Route path="/proposals" element={<SafeRoute><Proposals /></SafeRoute>} />
          <Route path="/proposals/:id" element={<SafeRoute><ProposalBuilderV2 /></SafeRoute>} />
          <Route path="/public/proposal/:token" element={<PublicProposal />} />
          <Route path="/materials" element={<SafeRoute><Materials /></SafeRoute>} />
          <Route path="/subs" element={<SafeRoute><Subs /></SafeRoute>} />
          <Route path="/subs/:id" element={<SafeRoute><SubProfileV2 /></SafeRoute>} />
          <Route path="/admin" element={<SafeRoute><Admin /></SafeRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
