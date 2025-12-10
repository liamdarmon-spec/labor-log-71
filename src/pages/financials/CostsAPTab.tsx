/**
 * Financials → Costs Tab
 * 
 * Uses same canonical data model as Project → Budget tab when a project is selected.
 * When "All Projects" is selected, shows legacy costs view (all costs across projects).
 * 
 * Canonical data model: useUnifiedProjectBudget() hook which:
 * - Filters by active budget only (status = 'active')
 * - Uses normalizeCategoryFromLine() for cost code suffix checking (-L, -S, -M)
 * - Includes labor from time_logs + non-labor from costs table
 * - Aggregates by (cost_code_id, category) composite key
 */
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CostsTab } from '@/components/financials/CostsTab';
import { MaterialsTab } from '@/components/financials/MaterialsTab';
import { SubPaymentsTab } from '@/components/financials/SubPaymentsTab';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AddCostDialog } from '@/components/financials/AddCostDialog';
import { Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CostCodeLedgerTab } from '@/components/project/financials/CostCodeLedgerTab';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function CostsAPTab() {
  const [activeTab, setActiveTab] = useState('all');
  const [addCostOpen, setAddCostOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const navigate = useNavigate();

  // Fetch projects for selector
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name');
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Costs</h2>
          <p className="text-muted-foreground">
            {projectFilter === 'all' 
              ? 'All project costs, bills, and non-labor expenses in one place.'
              : 'Project cost code ledger with budget vs actual (same view as Project → Budget tab).'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.project_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setAddCostOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Cost
          </Button>
        </div>
      </div>

      {/* When project is selected, show canonical cost code ledger (same as Project → Budget tab) */}
      {projectFilter !== 'all' && projectFilter ? (
        <Card>
          <CardHeader>
            <CardTitle>Cost Code Ledger</CardTitle>
            <CardDescription>
              Budget vs. Actual by Cost Code — Uses same data model as Project → Budget tab
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="labor">Labor</TabsTrigger>
                <TabsTrigger value="subs">Subs</TabsTrigger>
                <TabsTrigger value="materials">Materials</TabsTrigger>
                <TabsTrigger value="other">Other</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <CostCodeLedgerTab projectId={projectFilter} filterCategory={undefined} />
              </TabsContent>

              <TabsContent value="labor" className="mt-4">
                <CostCodeLedgerTab projectId={projectFilter} filterCategory="labor" />
              </TabsContent>

              <TabsContent value="subs" className="mt-4">
                <CostCodeLedgerTab projectId={projectFilter} filterCategory="subs" />
              </TabsContent>

              <TabsContent value="materials" className="mt-4">
                <CostCodeLedgerTab projectId={projectFilter} filterCategory="materials" />
              </TabsContent>

              <TabsContent value="other" className="mt-4">
                <CostCodeLedgerTab projectId={projectFilter} filterCategory="other" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        /* When "All Projects" selected, show legacy costs view */
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All Costs</TabsTrigger>
            <TabsTrigger value="labor">Labor</TabsTrigger>
            <TabsTrigger value="subs">Subcontractors</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="misc">Other</TabsTrigger>
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
                  Go to Payments
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
      )}

      <AddCostDialog open={addCostOpen} onOpenChange={setAddCostOpen} />
    </div>
  );
}
