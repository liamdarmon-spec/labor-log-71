import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkersTab } from '@/components/admin/WorkersTab';
import { ProjectsTab } from '@/components/admin/ProjectsTab';
import { TradesTab } from '@/components/admin/TradesTab';
import { LogsTab } from '@/components/admin/LogsTab';
import { ReportsTab } from '@/components/admin/ReportsTab';
import { UsersTab } from '@/components/admin/UsersTab';
import { Users, Briefcase, Wrench, FileText, BarChart3, UserCog } from 'lucide-react';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('workers');

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage workers, trades, projects, and generate reports
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid h-auto">
            <TabsTrigger value="users" className="gap-2 py-3">
              <UserCog className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="workers" className="gap-2 py-3">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Workers</span>
            </TabsTrigger>
            <TabsTrigger value="trades" className="gap-2 py-3">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Trades</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2 py-3">
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Projects</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2 py-3">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 py-3">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <UsersTab />
          </TabsContent>

          <TabsContent value="workers" className="mt-6">
            <WorkersTab />
          </TabsContent>

          <TabsContent value="trades" className="mt-6">
            <TradesTab />
          </TabsContent>

          <TabsContent value="projects" className="mt-6">
            <ProjectsTab />
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            <LogsTab />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <ReportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
