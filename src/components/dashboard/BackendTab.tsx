import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkersTab } from '@/components/admin/WorkersTab';
import { ProjectsTab } from '@/components/admin/ProjectsTab';
import { TradesTab } from '@/components/admin/TradesTab';
import { Users, Briefcase, Wrench } from 'lucide-react';

export const BackendTab = () => {
  const [activeTab, setActiveTab] = useState('workers');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Backend Management</h2>
        <p className="text-muted-foreground mt-1">
          Manage workers, salaries, projects, and trades
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="workers" className="gap-2">
            <Users className="w-4 h-4" />
            <span>Workers</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <Briefcase className="w-4 h-4" />
            <span>Projects</span>
          </TabsTrigger>
          <TabsTrigger value="trades" className="gap-2">
            <Wrench className="w-4 h-4" />
            <span>Trades</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workers" className="mt-6">
          <WorkersTab />
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <ProjectsTab />
        </TabsContent>

        <TabsContent value="trades" className="mt-6">
          <TradesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
