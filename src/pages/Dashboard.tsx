import { Layout } from '@/components/Layout';
import { DashboardOverviewCards } from '@/components/dashboard/DashboardOverviewCards';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsTab } from '@/components/dashboard/AnalyticsTab';
import { ReportsTab } from '@/components/dashboard/ReportsTab';
import { CostCalculatorTab } from '@/components/dashboard/CostCalculatorTab';
import { BarChart3, FileText, Calculator } from 'lucide-react';

const Dashboard = () => {
  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Your workforce and project overview</p>
          </div>
        </div>

        {/* Overview Cards */}
        <DashboardOverviewCards />

        {/* Analytics Tabs */}
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <FileText className="w-4 h-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="calculator" className="gap-2">
              <Calculator className="w-4 h-4" />
              Cost Calculator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsTab />
          </TabsContent>

          <TabsContent value="calculator">
            <CostCalculatorTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Dashboard;
