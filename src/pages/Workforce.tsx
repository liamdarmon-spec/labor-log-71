import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RosterTab } from '@/components/workforce/RosterTab';
import { SchedulerTab } from '@/components/workforce/SchedulerTab';
import { ActivityTab } from '@/components/workforce/ActivityTab';
import { PayCenterTab } from '@/components/workforce/PayCenterTab';
import { AnalyticsTab } from '@/components/workforce/AnalyticsTab';
import { SubsTab } from '@/components/workforce/SubsTab';

const Workforce = () => {
  const [activeTab, setActiveTab] = useState('labor');

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Workforce OS</h1>
          <p className="text-muted-foreground">
            Unified labor planning, tracking, payments, and intelligence
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="labor">Labor</TabsTrigger>
            <TabsTrigger value="subs">Subs</TabsTrigger>
            <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="pay-center">Pay Center</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="labor">
            <RosterTab />
          </TabsContent>

          <TabsContent value="subs">
            <SubsTab />
          </TabsContent>

          <TabsContent value="scheduler">
            <SchedulerTab />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab />
          </TabsContent>

          <TabsContent value="pay-center">
            <PayCenterTab />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Workforce;
