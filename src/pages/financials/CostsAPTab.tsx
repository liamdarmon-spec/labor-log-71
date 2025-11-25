import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CostsTab } from '@/components/financials/CostsTab';
import { MaterialsTab } from '@/components/financials/MaterialsTab';
import { SubPaymentsTab } from '@/components/financials/SubPaymentsTab';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AddCostDialog } from '@/components/financials/AddCostDialog';
import { Plus } from 'lucide-react';

export default function CostsAPTab() {
  const [activeTab, setActiveTab] = useState('all');
  const [addCostOpen, setAddCostOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Costs (AP)</h1>
          <p className="text-muted-foreground">
            All job-related non-labor expenses and accounts payable
          </p>
        </div>
        <Button onClick={() => setAddCostOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Cost
        </Button>
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

        {/* All non-labor AP pulled from `costs` */}
        <TabsContent value="all">
          <CostsTab />
        </TabsContent>

        {/* Labor = point them to Workforce Pay Center / Pay Runs */}
        <TabsContent value="labor">
          <div className="space-y-3 border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              Labor costs and payments are managed via time logs and pay runs, not the AP costs ledger.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="default" onClick={() => navigate('/financials/payments')}>
                Go to Payment Center
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/workforce')}>
                Open Workforce OS
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Subs = costs coming from subs / sub_invoices / vendor_payments */}
        <TabsContent value="subs">
          <SubPaymentsTab />
        </TabsContent>

        {/* Materials = material_receipts + costs.category = 'materials' */}
        <TabsContent value="materials">
          <MaterialsTab />
        </TabsContent>

        {/* Equipment + Misc = filtered costs categories */}
        <TabsContent value="equipment">
          <CostsTab categoryFilter="equipment" />
        </TabsContent>

        <TabsContent value="misc">
          <CostsTab categoryFilter="misc" />
        </TabsContent>
      </Tabs>

      <AddCostDialog open={addCostOpen} onOpenChange={setAddCostOpen} />
    </div>
  );
}
