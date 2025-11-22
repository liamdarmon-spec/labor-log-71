import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialSummaryTab } from './financials/FinancialSummaryTab';
import { CostByCategoryTab } from './financials/CostByCategoryTab';
import { CostCodeLedgerTab } from './financials/CostCodeLedgerTab';
import { ActivityTimelineTab } from './financials/ActivityTimelineTab';

interface ProjectFinancialsTabProps {
  projectId: string;
}

export function ProjectFinancialsTab({ projectId }: ProjectFinancialsTabProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const [categoryFilter, setCategoryFilter] = useState<string>();

  const handleViewCategoryDetails = (category: string) => {
    setCategoryFilter(category);
    setActiveTab('ledger');
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="category">By Category</TabsTrigger>
        <TabsTrigger value="ledger">Cost Code Ledger</TabsTrigger>
        <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
      </TabsList>

      <TabsContent value="summary">
        <FinancialSummaryTab projectId={projectId} />
      </TabsContent>

      <TabsContent value="category">
        <CostByCategoryTab 
          projectId={projectId} 
          onViewDetails={handleViewCategoryDetails}
        />
      </TabsContent>

      <TabsContent value="ledger">
        <CostCodeLedgerTab 
          projectId={projectId} 
          filterCategory={categoryFilter}
        />
      </TabsContent>

      <TabsContent value="timeline">
        <ActivityTimelineTab projectId={projectId} />
      </TabsContent>
    </Tabs>
  );
}
