import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkersTab } from '@/components/admin/WorkersTab';
import { ProjectsTab } from '@/components/admin/ProjectsTab';
import { TradesTab } from '@/components/admin/TradesTab';
import { Users, Briefcase, Wrench } from 'lucide-react';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('workers');

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage employees, trades, and projects
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="workers" className="gap-2">
              <Users className="w-4 h-4" />
              <span>Employees</span>
            </TabsTrigger>
            <TabsTrigger value="trades" className="gap-2">
              <Wrench className="w-4 h-4" />
              <span>Trades</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <Briefcase className="w-4 h-4" />
              <span>Projects</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workers" className="mt-6">
            <WorkersTab />
          </TabsContent>

          <TabsContent value="trades" className="mt-6">
            <TradesTab />
          </TabsContent>

          <TabsContent value="projects" className="mt-6">
            <ProjectsTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
