import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FinancialsLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/financials' || path === '/financials/') return 'overview';
    if (path.includes('/job-costing')) return 'job-costing';
    if (path.includes('/invoices')) return 'invoices';
    if (path.includes('/materials')) return 'materials';
    if (path.includes('/costs')) return 'costs';
    if (path.includes('/payments')) return 'payments';
    return 'overview';
  };

  const handleTabChange = (value: string) => {
    const routes: Record<string, string> = {
      'overview': '/financials',
      'job-costing': '/financials/job-costing',
      'invoices': '/financials/invoices',
      'materials': '/financials/materials',
      'costs': '/financials/costs',
      'payments': '/financials/payments',
    };
    navigate(routes[value]);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Financial Hub</h1>
          <p className="text-muted-foreground">
            Comprehensive financial control center for job costing, invoices, materials, costs, and payments
          </p>
        </div>

        <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="job-costing">Job Costing</TabsTrigger>
            <TabsTrigger value="invoices">Invoices (AR)</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="costs">Costs (AP)</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>
        </Tabs>

        <Outlet />
      </div>
    </Layout>
  );
}
