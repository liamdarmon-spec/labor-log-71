import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialSummaryTabV2 } from './financials/FinancialSummaryTabV2';
import { CostByCategoryTabV2 } from './financials/CostByCategoryTabV2';
import { CostCodeLedgerTab } from './financials/CostCodeLedgerTab';
import { ActivityTimelineTab } from './financials/ActivityTimelineTab';

interface ProjectFinancialsTabV2Props {
  projectId: string;
}

export function ProjectFinancialsTabV2({ projectId }: ProjectFinancialsTabV2Props) {
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
        <FinancialSummaryTabV2 projectId={projectId} />
      </TabsContent>

      <TabsContent value="category">
        <CostByCategoryTabV2 
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
