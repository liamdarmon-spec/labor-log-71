import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnpaidLaborTabV2 } from '../payments/UnpaidLaborTabV2';
import { LaborPayRunsTabV2 } from '../payments/LaborPayRunsTabV2';
import { SubPaymentsTab } from './SubPaymentsTab';

export function UnifiedPaymentsPanelV2() {
  const [activeTab, setActiveTab] = useState('unpaid-labor');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Center</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="unpaid-labor">Unpaid Labor</TabsTrigger>
            <TabsTrigger value="pay-runs">Labor Pay Runs</TabsTrigger>
            <TabsTrigger value="subs">Subs</TabsTrigger>
          </TabsList>

          <TabsContent value="unpaid-labor" className="space-y-4">
            <UnpaidLaborTabV2 />
          </TabsContent>

          <TabsContent value="pay-runs" className="space-y-4">
            <LaborPayRunsTabV2 />
          </TabsContent>

          <TabsContent value="subs" className="space-y-4">
            <SubPaymentsTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
