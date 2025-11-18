import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BulkEntryTab } from '@/components/dashboard/BulkEntryTab';
import { SingleEntryTab } from '@/components/dashboard/SingleEntryTab';
import { CalendarPlus, Plus } from 'lucide-react';

const Index = () => {
  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Time Entry</h1>
            <p className="text-muted-foreground">Log hours for workers and projects</p>
          </div>
        </div>

        <Tabs defaultValue="bulk" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="bulk" className="gap-2">
              <CalendarPlus className="w-4 h-4" />
              Bulk Entry
            </TabsTrigger>
            <TabsTrigger value="single" className="gap-2">
              <Plus className="w-4 h-4" />
              Single Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bulk">
            <BulkEntryTab />
          </TabsContent>

          <TabsContent value="single">
            <SingleEntryTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Index;
