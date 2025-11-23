import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FinancialsLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/financials' || path === '/financials/') return 'overview';
    if (path.includes('/revenue')) return 'revenue';
    if (path.includes('/costs')) return 'costs';
    if (path.includes('/job-costing')) return 'job-costing';
    if (path.includes('/payments')) return 'payments';
    if (path.includes('/procurement')) return 'procurement';
    return 'overview';
  };

  const handleTabChange = (value: string) => {
    const routes: Record<string, string> = {
      'overview': '/financials',
      'revenue': '/financials/revenue',
      'costs': '/financials/costs',
      'job-costing': '/financials/job-costing',
      'payments': '/financials/payments',
      'procurement': '/financials/procurement',
    };
    navigate(routes[value]);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Financials</h1>
          <p className="text-muted-foreground">
            Professional AP/AR management, job costing analytics, and payment center
          </p>
        </div>

        <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue (AR)</TabsTrigger>
            <TabsTrigger value="costs">Costs (AP)</TabsTrigger>
            <TabsTrigger value="job-costing">Job Costing</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="procurement">Procurement</TabsTrigger>
          </TabsList>
        </Tabs>

        <Outlet />
      </div>
    </Layout>
  );
}
