import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JobCostingTab } from '@/components/financials/JobCostingTab';
import { CostsTab } from '@/components/financials/CostsTab';
import { InvoicesTab } from '@/components/financials/InvoicesTab';
import { UnifiedPaymentsPanelV2 } from '@/components/financials/UnifiedPaymentsPanelV2';

const FinancialsV3 = () => {
  const [activeTab, setActiveTab] = useState('job-costing');

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Financials</h1>
          <p className="text-muted-foreground">
            Job costing, invoices, costs, and payments center
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="job-costing">Job Costing</TabsTrigger>
            <TabsTrigger value="invoices">Invoices (AR)</TabsTrigger>
            <TabsTrigger value="costs">Costs (AP)</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="job-costing">
            <JobCostingTab />
          </TabsContent>

          <TabsContent value="invoices">
            <InvoicesTab />
          </TabsContent>

          <TabsContent value="costs">
            <CostsTab />
          </TabsContent>

          <TabsContent value="payments">
            <UnifiedPaymentsPanelV2 />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default FinancialsV3;
