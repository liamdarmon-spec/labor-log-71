import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { DollarSign, FileText, Receipt, Users, Package, BarChart3, TrendingUp, CreditCard } from 'lucide-react';

const Financials = () => {
  const navigate = useNavigate();

  const financialModules = [
    {
      title: 'Payments',
      description: 'Labor payroll, payment runs, and reimbursements',
      icon: CreditCard,
      path: '/payments',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Estimates',
      description: 'Global view of all project estimates',
      icon: FileText,
      path: '/projects',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Subcontractors',
      description: 'Sub contracts, invoices, and payments',
      icon: Users,
      path: '/subs',
      color: 'bg-green-50 text-green-600',
    },
    {
      title: 'Materials',
      description: 'Material receipts and vendor tracking',
      icon: Package,
      path: '/materials',
      color: 'bg-orange-50 text-orange-600',
    },
    {
      title: 'Documents',
      description: 'Invoices, receipts, contracts, and permits',
      icon: Receipt,
      path: '/documents',
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Reports & Analytics',
      description: 'Financial reports and insights (coming soon)',
      icon: BarChart3,
      path: '/dashboard',
      color: 'bg-pink-50 text-pink-600',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Financials</h1>
          <p className="text-muted-foreground">
            Centralized financial management and reporting
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
              <p className="text-3xl font-bold">$1.2M</p>
              <p className="text-xs text-muted-foreground mt-1">Across all projects</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-50">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground">Total Profit</p>
              </div>
              <p className="text-3xl font-bold text-green-600">$320K</p>
              <p className="text-xs text-muted-foreground mt-1">26.7% margin</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-orange-50">
                  <CreditCard className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-sm text-muted-foreground">Outstanding Payables</p>
              </div>
              <p className="text-3xl font-bold text-orange-600">$45K</p>
              <p className="text-xs text-muted-foreground mt-1">Labor + Subs</p>
            </CardContent>
          </Card>
        </div>

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
              Create Payment Run
            </Button>
            <Button variant="outline" onClick={() => navigate('/subs')}>
              Add Sub Invoice
            </Button>
            <Button variant="outline" onClick={() => navigate('/materials')}>
              Add Material Receipt
            </Button>
            <Button variant="outline" onClick={() => navigate('/documents')}>
              Upload Document
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Financials;
