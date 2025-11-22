import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RosterTab } from '@/components/workforce/RosterTab';
import { SchedulerTab } from '@/components/workforce/SchedulerTab';
import { ActivityTab } from '@/components/workforce/ActivityTab';
import { PayCenterTabV2 } from '@/components/workforce/PayCenterTabV2';
import { useSearchParams } from 'react-router-dom';

const Workforce = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'scheduler');

  // Update active tab when URL param changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Workforce OS</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Unified labor planning, tracking, payments, and intelligence
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
            <TabsTrigger value="scheduler" className="text-xs sm:text-sm">Scheduler</TabsTrigger>
            <TabsTrigger value="labor" className="text-xs sm:text-sm">Roster</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm">Activity</TabsTrigger>
            <TabsTrigger value="pay-center" className="text-xs sm:text-sm">Pay</TabsTrigger>
          </TabsList>

          <TabsContent value="scheduler">
            <SchedulerTab />
          </TabsContent>

          <TabsContent value="labor">
            <RosterTab />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab />
          </TabsContent>

          <TabsContent value="pay-center">
            <PayCenterTabV2 />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Workforce;
