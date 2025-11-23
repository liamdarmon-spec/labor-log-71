import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CostsTab } from '@/components/financials/CostsTab';
import { MaterialsTab } from '@/components/financials/MaterialsTab';
import { SubPaymentsTab } from '@/components/financials/SubPaymentsTab';

export default function CostsAPTab() {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Costs (AP)</h1>
        <p className="text-muted-foreground">
          All job-related expenses and accounts payable
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All Costs</TabsTrigger>
          <TabsTrigger value="labor">Labor</TabsTrigger>
          <TabsTrigger value="subs">Subcontractors</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="misc">Misc</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <CostsTab />
        </TabsContent>

        <TabsContent value="labor">
          <CostsTab categoryFilter="labor" />
        </TabsContent>

        <TabsContent value="subs">
          <SubPaymentsTab />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsTab />
        </TabsContent>

        <TabsContent value="equipment">
          <CostsTab categoryFilter="equipment" />
        </TabsContent>

        <TabsContent value="misc">
          <CostsTab categoryFilter="misc" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
