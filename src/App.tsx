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
import Documents from '@/pages/Documents';
import Proposals from '@/pages/Proposals';
import ProposalBuilderV2 from '@/pages/ProposalBuilderV2';
import PublicProposal from '@/pages/PublicProposal';
import Materials from '@/pages/Materials';
import SubProfile from "./pages/SubProfile";
import Subs from "./pages/Subs";
import NotFound from "./pages/NotFound";
import "./i18n/config";

const queryClient = new QueryClient();

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
          <Route path="/settings/proposals" element={<ProposalSettings />} />
            <Route path="/workforce" element={<Workforce />} />
            <Route path="/workforce/worker/:workerId" element={<WorkerProfile />} />
            <Route path="/financials" element={<FinancialsV3 />} />
            <Route path="/financials-v2" element={<FinancialsV2 />} />
            <Route path="/financials/payments" element={<FinancialPayments />} />
            <Route path="/financials/estimates" element={<FinancialEstimates />} />
            <Route path="/financials/materials" element={<FinancialMaterials />} />
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
            <Route path="/subs/:id" element={<SubProfile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
