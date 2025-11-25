import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkforceScheduleTab } from '@/components/workforce/WorkforceScheduleTab';
import { WorkforceTimeLogsTab } from '@/components/workforce/WorkforceTimeLogsTab';
import { WorkforcePayRunsTab } from '@/components/workforce/WorkforcePayRunsTab';
import { WorkforcePayCenterTab } from '@/components/workforce/WorkforcePayCenterTab';
import { useSearchParams } from 'react-router-dom';

const Workforce = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'schedule');

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
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Workforce & Pay Center</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Schedule, track time logs, and manage payments in one place
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 gap-1">
            <TabsTrigger value="schedule" className="text-xs sm:text-sm">Schedule</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs sm:text-sm">Time Logs</TabsTrigger>
            <TabsTrigger value="pay-runs" className="text-xs sm:text-sm">Pay Runs</TabsTrigger>
            <TabsTrigger value="pay" className="text-xs sm:text-sm">Pay Center</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule">
            <WorkforceScheduleTab />
          </TabsContent>

          <TabsContent value="logs">
            <WorkforceTimeLogsTab />
          </TabsContent>

          <TabsContent value="pay-runs">
            <WorkforcePayRunsTab />
          </TabsContent>

          <TabsContent value="pay">
            <WorkforcePayCenterTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Workforce;
