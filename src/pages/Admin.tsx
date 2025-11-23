import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkersTab } from '@/components/admin/WorkersTab';
import { ProjectsTab } from '@/components/admin/ProjectsTab';
import { TradesTab } from '@/components/admin/TradesTab';
import { CostCodesManagementTab } from '@/components/admin/CostCodesManagementTab';
import { LogsTab } from '@/components/admin/LogsTab';
import { ReportsTab } from '@/components/admin/ReportsTab';
import { UsersTab } from '@/components/admin/UsersTab';
import { ArchivedLogsTab } from '@/components/admin/ArchivedLogsTab';
import { SettingsTab } from '@/components/admin/SettingsTab';
import { DocumentsTab } from '@/components/admin/DocumentsTab';
import { SubcontractorsTab } from '@/components/admin/SubcontractorsTab';
import { MaterialVendorsTab } from '@/components/admin/MaterialVendorsTab';
import { Users, Briefcase, Wrench, FileText, BarChart3, UserCog, Archive, Settings, Hash, Building2, Package } from 'lucide-react';

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
              <span className="text-[10px] sm:text-sm">Trades</span>
            </TabsTrigger>
            <TabsTrigger value="costcodes" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm flex-col sm:flex-row">
              <Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-sm">Cost Codes</span>
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
            <UsersTab />
          </TabsContent>

          <TabsContent value="workers" className="mt-4 sm:mt-6">
            <WorkersTab />
          </TabsContent>

          <TabsContent value="subs" className="mt-4 sm:mt-6">
            <SubcontractorsTab />
          </TabsContent>

          <TabsContent value="vendors" className="mt-4 sm:mt-6">
            <MaterialVendorsTab />
          </TabsContent>

          <TabsContent value="trades" className="mt-4 sm:mt-6">
            <TradesTab />
          </TabsContent>

          <TabsContent value="costcodes" className="mt-4 sm:mt-6">
            <CostCodesManagementTab />
          </TabsContent>

          <TabsContent value="projects" className="mt-4 sm:mt-6">
            <ProjectsTab />
          </TabsContent>

          <TabsContent value="logs" className="mt-4 sm:mt-6">
            <LogsTab />
          </TabsContent>

          <TabsContent value="archived" className="mt-4 sm:mt-6">
            <ArchivedLogsTab />
          </TabsContent>

          <TabsContent value="documents" className="mt-4 sm:mt-6">
            <DocumentsTab />
          </TabsContent>

          <TabsContent value="reports" className="mt-4 sm:mt-6">
            <ReportsTab />
          </TabsContent>

          <TabsContent value="settings" className="mt-4 sm:mt-6">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
