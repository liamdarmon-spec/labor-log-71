import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
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
import FinancialPayments from '@/pages/FinancialPayments';
import FinancialEstimates from '@/pages/FinancialEstimates';
import FinancialMaterials from '@/pages/FinancialMaterials';
import FinancialReports from '@/pages/FinancialReports';
import FinancialsLayout from '@/pages/financials/FinancialsLayout';
import FinancialsOverviewV2 from '@/pages/financials/FinancialsOverviewV2';
import RevenueTab from '@/pages/financials/RevenueTab';
import CostsAPTab from '@/pages/financials/CostsAPTab';
import JobCostingTabV2 from '@/pages/financials/JobCostingTabV2';
import PaymentsCenterTab from '@/pages/financials/PaymentsCenterTab';
import ProcurementTab from '@/pages/financials/ProcurementTab';
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
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/view-logs" element={<ViewLogs />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
          <Route path="/projects/:projectId/proposals/:proposalId" element={<ProposalEditor />} />
          <Route path="/estimates/:estimateId" element={<EstimateBuilderV2 />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/settings/proposals" element={<ProposalSettings />} />
            <Route path="/workforce" element={<Workforce />} />
            <Route path="/workforce/worker/:workerId" element={<WorkerProfile />} />
            
            {/* Financial System - AP/AR Architecture */}
            <Route path="/financials" element={<FinancialsLayout />}>
              <Route index element={<FinancialsOverviewV2 />} />
              <Route path="overview" element={<FinancialsOverviewV2 />} />
              <Route path="revenue" element={<RevenueTab />} />
              <Route path="costs" element={<CostsAPTab />} />
              <Route path="job-costing" element={<JobCostingTabV2 />} />
              <Route path="payments" element={<PaymentsCenterTab />} />
              <Route path="procurement" element={<ProcurementTab />} />
            </Route>

            {/* Legacy routes */}
            <Route path="/financials-v2" element={<FinancialsV2 />} />
            <Route path="/financials-v3" element={<FinancialsV3 />} />
            <Route path="/financials/estimates" element={<FinancialEstimates />} />
            <Route path="/financials/subcontractors" element={<Subs />} />
            <Route path="/financials/documents" element={<Documents />} />
          <Route path="/financials/reports" element={<FinancialReports />} />
          <Route path="/financials/os" element={<FinancialsOS />} />
          <Route path="/documents" element={<Documents />} />
            <Route path="/proposals" element={<Proposals />} />
            <Route path="/proposals/:id" element={<ProposalBuilderV2 />} />
            <Route path="/public/proposal/:token" element={<PublicProposal />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/subs" element={<Subs />} />
            <Route path="/subs/:id" element={<SubProfileV2 />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
