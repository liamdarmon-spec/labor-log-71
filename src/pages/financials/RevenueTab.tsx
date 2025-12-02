import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvoicesTab } from '@/components/financials/InvoicesTab';

export default function RevenueTab() {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Receivables</h2>
        <p className="text-muted-foreground">
          Invoices, customer payments, and money owed to you.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Invoices</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="partially_paid">Partially Paid</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <InvoicesTab />
        </TabsContent>

        <TabsContent value="draft">
          <InvoicesTab statusFilter="draft" />
        </TabsContent>

        <TabsContent value="sent">
          <InvoicesTab statusFilter="sent" />
        </TabsContent>

        <TabsContent value="paid">
          <InvoicesTab statusFilter="paid" />
        </TabsContent>

        <TabsContent value="partially_paid">
          <InvoicesTab statusFilter="partially_paid" />
        </TabsContent>

        <TabsContent value="overdue">
          <InvoicesTab statusFilter="overdue" />
        </TabsContent>

        <TabsContent value="retention">
          <InvoicesTab showRetention />
        </TabsContent>
      </Tabs>
    </div>
  );
}
