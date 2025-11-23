import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedPaymentsPanelV2 } from '@/components/financials/UnifiedPaymentsPanelV2';
import { LaborPayRunsPanel } from '@/components/payments/LaborPayRunsPanel';

export default function PaymentsCenterTab() {
  const [activeTab, setActiveTab] = useState('unpaid-labor');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payments Center</h1>
        <p className="text-muted-foreground">
          Central hub for all outgoing payments - Labor, Subs, and Vendors
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="unpaid-labor">Unpaid Labor</TabsTrigger>
          <TabsTrigger value="pay-runs">Labor Pay Runs</TabsTrigger>
          <TabsTrigger value="subs">Subcontractor Payments</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="unpaid-labor">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              All unpaid time logs grouped by worker and project. Select logs and create a pay run.
            </p>
            <LaborPayRunsPanel />
          </div>
        </TabsContent>

        <TabsContent value="pay-runs">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Historical labor payment runs and their status
            </p>
            <UnifiedPaymentsPanelV2 defaultView="labor-pay-runs" />
          </div>
        </TabsContent>

        <TabsContent value="subs">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Unpaid subcontractor costs grouped by sub, project, and cost code. Includes retention tracking.
            </p>
            <UnifiedPaymentsPanelV2 defaultView="sub-payments" />
          </div>
        </TabsContent>

        <TabsContent value="vendors">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Material and equipment vendor payments
            </p>
            <UnifiedPaymentsPanelV2 defaultView="vendor-payments" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
