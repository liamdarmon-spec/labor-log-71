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
import Workforce from "./pages/Workforce";
import WorkerProfile from "./pages/WorkerProfile";
import Financials from "./pages/Financials";
import FinancialPayments from "./pages/FinancialPayments";
import FinancialEstimates from "./pages/FinancialEstimates";
import FinancialMaterials from "./pages/FinancialMaterials";
import FinancialReports from "./pages/FinancialReports";
import Documents from "./pages/Documents";
import Materials from "./pages/Materials";
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
            <Route path="/workforce" element={<Workforce />} />
            <Route path="/workforce/worker/:workerId" element={<WorkerProfile />} />
            <Route path="/financials" element={<Financials />} />
            <Route path="/financials/payments" element={<FinancialPayments />} />
            <Route path="/financials/estimates" element={<FinancialEstimates />} />
            <Route path="/financials/materials" element={<FinancialMaterials />} />
            <Route path="/financials/subcontractors" element={<Subs />} />
            <Route path="/financials/documents" element={<Documents />} />
            <Route path="/financials/reports" element={<FinancialReports />} />
            <Route path="/documents" element={<Documents />} />
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
