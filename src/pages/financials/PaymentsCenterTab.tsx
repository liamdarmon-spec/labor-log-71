import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnpaidLaborTabV2 } from '@/components/payments/UnpaidLaborTabV2';
import { LaborPayRunsTabV2 } from '@/components/payments/LaborPayRunsTabV2';
import { SubPaymentsTab } from '@/components/financials/SubPaymentsTab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function PaymentsCenterTab() {
  const [activeTab, setActiveTab] = useState('unpaid-labor');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Payments</h2>
        <p className="text-muted-foreground">
          Vendor payments, pay runs, and money leaving the company.
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
            <UnpaidLaborTabV2 />
          </div>
        </TabsContent>

        <TabsContent value="pay-runs">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Historical labor payment runs and their status.
            </p>
            <LaborPayRunsTabV2 />
          </div>
        </TabsContent>

        <TabsContent value="subs">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Unpaid subcontractor costs grouped by sub, project, and cost code. Includes retention tracking.
            </p>
            <SubPaymentsTab />
          </div>
        </TabsContent>

        <TabsContent value="vendors">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Material and equipment vendor payments.
            </p>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Construction className="h-5 w-5" />
                  Vendor Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Vendor payment tracking coming soon. Use the Costs tab to manage material and equipment costs.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
