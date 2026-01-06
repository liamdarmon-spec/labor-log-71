import { useState, lazy, Suspense } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Briefcase, Wrench, FileText, BarChart3, UserCog, Archive, Settings, Hash, Building2, Package } from 'lucide-react';

// Lazy load all admin tabs for better performance
const WorkersTab = lazy(() => import('@/components/admin/WorkersTab').then(m => ({ default: m.WorkersTab })));
const ProjectsTab = lazy(() => import('@/components/admin/ProjectsTab').then(m => ({ default: m.ProjectsTab })));
const TradesTab = lazy(() => import('@/components/admin/TradesTab').then(m => ({ default: m.TradesTab })));
const CostCodesTab = lazy(() => import('@/components/admin/CostCodesTab').then(m => ({ default: m.CostCodesTab })));
const LogsTab = lazy(() => import('@/components/admin/LogsTab').then(m => ({ default: m.LogsTab })));
const ReportsTab = lazy(() => import('@/components/admin/ReportsTab').then(m => ({ default: m.ReportsTab })));
const UsersTab = lazy(() => import('@/components/admin/UsersTab').then(m => ({ default: m.UsersTab })));
const ArchivedLogsTab = lazy(() => import('@/components/admin/ArchivedLogsTab').then(m => ({ default: m.ArchivedLogsTab })));
const SettingsTab = lazy(() => import('@/components/admin/SettingsTab').then(m => ({ default: m.SettingsTab })));
const DocumentsTab = lazy(() => import('@/components/admin/DocumentsTab').then(m => ({ default: m.DocumentsTab })));
const SubcontractorsTab = lazy(() => import('@/components/admin/SubcontractorsTab').then(m => ({ default: m.SubcontractorsTab })));
const MaterialVendorsTab = lazy(() => import('@/components/admin/MaterialVendorsTab').then(m => ({ default: m.MaterialVendorsTab })));

const TabLoading = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full" />
  </div>
);

const Admin = () => {
  const [activeTab, setActiveTab] = useState('workers');

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage workers, trades, projects, and generate reports
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-12 h-auto gap-1 p-1 bg-muted/50">
            <TabsTrigger value="users" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm flex-col sm:flex-row">
              <UserCog className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-sm">Users</span>
            </TabsTrigger>
            <TabsTrigger value="workers" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm flex-col sm:flex-row">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-sm">Workers</span>
            </TabsTrigger>
            <TabsTrigger value="subs" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm flex-col sm:flex-row">
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-sm">Subs</span>
            </TabsTrigger>
            <TabsTrigger value="vendors" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm flex-col sm:flex-row">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-sm">Vendors</span>
            </TabsTrigger>
            <TabsTrigger value="trades" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm flex-col sm:flex-row">
              <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-sm">Trades &amp; Defaults</span>
            </TabsTrigger>
            <TabsTrigger value="costcodes" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm flex-col sm:flex-row">
              <Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-sm">Cost Code Library</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm flex-col sm:flex-row">
              <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-sm">Projects</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm flex-col sm:flex-row">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-sm">Logs</span>
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm flex-col sm:flex-row">
              <Archive className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-sm">Archive</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm flex-col sm:flex-row">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-sm">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm flex-col sm:flex-row">
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-sm">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm flex-col sm:flex-row">
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-sm">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4 sm:mt-6">
            <Suspense fallback={<TabLoading />}>
              <UsersTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="workers" className="mt-4 sm:mt-6">
            <Suspense fallback={<TabLoading />}>
              <WorkersTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="subs" className="mt-4 sm:mt-6">
            <Suspense fallback={<TabLoading />}>
              <SubcontractorsTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="vendors" className="mt-4 sm:mt-6">
            <Suspense fallback={<TabLoading />}>
              <MaterialVendorsTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="trades" className="mt-4 sm:mt-6">
            <Suspense fallback={<TabLoading />}>
              <TradesTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="costcodes" className="mt-4 sm:mt-6">
            <Suspense fallback={<TabLoading />}>
              <CostCodesTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="projects" className="mt-4 sm:mt-6">
            <Suspense fallback={<TabLoading />}>
              <ProjectsTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="logs" className="mt-4 sm:mt-6">
            <Suspense fallback={<TabLoading />}>
              <LogsTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="archived" className="mt-4 sm:mt-6">
            <Suspense fallback={<TabLoading />}>
              <ArchivedLogsTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="documents" className="mt-4 sm:mt-6">
            <Suspense fallback={<TabLoading />}>
              <DocumentsTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="reports" className="mt-4 sm:mt-6">
            <Suspense fallback={<TabLoading />}>
              <ReportsTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="settings" className="mt-4 sm:mt-6">
            <Suspense fallback={<TabLoading />}>
              <SettingsTab />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
