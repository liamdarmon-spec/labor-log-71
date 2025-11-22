import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, DollarSign } from 'lucide-react';

export default function FinancialReports() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Financial insights and performance metrics
          </p>
        </div>

        {/* Coming Soon Banner */}
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Advanced Analytics Coming Soon</h3>
                <p className="text-sm text-muted-foreground">
                  Detailed financial reports, trend analysis, and custom dashboards are in development
                </p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Cost Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Chart: Labor, Subs, Materials Over Time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Profit by Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Chart: Revenue vs Costs by Project</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Reports List */}
        <Card>
          <CardHeader>
            <CardTitle>Available Reports (Coming Soon)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                'Cash Flow Analysis',
                'Project Profitability',
                'Labor Cost Analysis',
                'Subcontractor Performance',
                'Material Spend by Category',
                'Budget vs Actual Variance',
                'Outstanding Receivables',
                'Payment History & Trends',
              ].map((report, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{report}</span>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
