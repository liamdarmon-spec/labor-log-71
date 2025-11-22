import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { DollarSign, FileText, Receipt, Users, Package, BarChart3, TrendingUp, CreditCard, AlertTriangle, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalFinancials } from '@/hooks/useProjectFinancialsV2';
import { FinancialKPICard } from '@/components/financials/FinancialKPICard';
import { UnifiedPaymentsPanelV2 } from '@/components/financials/UnifiedPaymentsPanelV2';
import { FinancialSearchBar } from '@/components/financials/FinancialSearchBar';

const FinancialsV2 = () => {
  const navigate = useNavigate();
  const { data: summary, isLoading } = useGlobalFinancials();

  const financialModules = [
    {
      title: 'Payments',
      description: 'Labor payroll, payment runs, and reimbursements',
      icon: CreditCard,
      path: '/financials/payments',
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    },
    {
      title: 'Estimates',
      description: 'Global view of all project estimates',
      icon: FileText,
      path: '/financials/estimates',
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
    },
    {
      title: 'Subcontractors',
      description: 'Sub contracts, invoices, and payments',
      icon: Users,
      path: '/financials/subcontractors',
      color: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
    },
    {
      title: 'Materials',
      description: 'Material receipts and vendor tracking',
      icon: Package,
      path: '/financials/materials',
      color: 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
    },
    {
      title: 'Documents',
      description: 'Invoices, receipts, contracts, and permits',
      icon: Receipt,
      path: '/financials/documents',
      color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
    },
    {
      title: 'Reports & Analytics',
      description: 'Financial reports and insights',
      icon: BarChart3,
      path: '/financials/reports',
      color: 'bg-pink-50 text-pink-600 dark:bg-pink-950 dark:text-pink-400',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Financial OS</h1>
            <p className="text-muted-foreground">
              Real-time job costing & billing across all projects
            </p>
          </div>
          <FinancialSearchBar />
        </div>

        {/* Overview KPI Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : summary && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FinancialKPICard
                title="Total Revenue"
                value={`$${(summary.totalRevenue / 1000).toFixed(0)}K`}
                subtitle="From accepted estimates"
                icon={TrendingUp}
                variant="success"
                onClick={() => navigate('/financials/estimates?status=accepted')}
              />
              <FinancialKPICard
                title="Total Profit"
                value={`$${(summary.totalProfit / 1000).toFixed(0)}K`}
                subtitle={`${summary.totalRevenue > 0 ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1) : 0}% margin`}
                icon={DollarSign}
                variant={summary.totalProfit > 0 ? 'success' : 'danger'}
                onClick={() => navigate('/financials/reports')}
              />
              <FinancialKPICard
                title="Outstanding Payables"
                value={`$${(summary.totalOutstanding / 1000).toFixed(1)}K`}
                subtitle="All unpaid costs"
                icon={AlertTriangle}
                variant="warning"
                onClick={() => navigate('/financials/payments?type=unpaid')}
              />
              <FinancialKPICard
                title="Retention Held"
                value={`$${(summary.retentionHeld / 1000).toFixed(1)}K`}
                subtitle="Sub retention"
                icon={Building2}
                variant="default"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FinancialKPICard
                title="Labor (Actual)"
                value={`$${(summary.laborActual / 1000).toFixed(1)}K`}
                subtitle={`Unpaid: $${(summary.laborUnpaid / 1000).toFixed(1)}K`}
                icon={Users}
                onClick={() => navigate('/financials/payments?type=Labor')}
              />
              <FinancialKPICard
                title="Subs (Actual)"
                value={`$${(summary.subsActual / 1000).toFixed(1)}K`}
                subtitle={`Unpaid: $${(summary.subsUnpaid / 1000).toFixed(1)}K`}
                icon={Users}
                onClick={() => navigate('/financials/payments?type=Sub')}
              />
              <FinancialKPICard
                title="Materials (Actual)"
                value={`$${(summary.materialsActual / 1000).toFixed(1)}K`}
                subtitle="All material receipts"
                icon={Package}
                onClick={() => navigate('/financials/materials')}
              />
              <FinancialKPICard
                title="Total Costs"
                value={`$${(summary.totalCosts / 1000).toFixed(1)}K`}
                subtitle="Labor + Subs + Materials"
                icon={BarChart3}
              />
            </div>
          </>
        )}

        {/* Unified Payments Panel */}
        <UnifiedPaymentsPanelV2 />

        {/* Financial Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {financialModules.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.title} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(module.path)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg ${module.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <CardTitle className="mt-4">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full">
                    Open →
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common financial tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" onClick={() => navigate('/payments')}>
              Create Pay Run
            </Button>
            <Button variant="outline" onClick={() => navigate('/financials/subcontractors')}>
              Add Sub Invoice
            </Button>
            <Button variant="outline" onClick={() => navigate('/financials/materials')}>
              Add Material Receipt
            </Button>
            <Button variant="outline" onClick={() => navigate('/financials/documents')}>
              Upload Document
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default FinancialsV2;
