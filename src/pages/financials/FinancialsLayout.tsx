import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FinancialsLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    const path = location.pathname;
    
    // Map current path to new 4-tab structure
    if (path.includes('/costs') || path.includes('/procurement')) return 'costs';
    if (path.includes('/payments')) return 'payments';
    if (path.includes('/receivables') || path.includes('/revenue')) return 'receivables';
    if (path.includes('/profit') || path.includes('/job-costing') || path === '/financials' || path === '/financials/') return 'profit';
    
    return 'costs';
  };

  const handleTabChange = (value: string) => {
    const routes: Record<string, string> = {
      'costs': '/financials/costs',
      'payments': '/financials/payments',
      'receivables': '/financials/receivables',
      'profit': '/financials/profit',
    };
    navigate(routes[value]);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Financials</h1>
          <p className="text-muted-foreground">
            Costs, payments, receivables, and profit overview
          </p>
        </div>

        <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="receivables">Receivables</TabsTrigger>
            <TabsTrigger value="profit">Profit</TabsTrigger>
          </TabsList>
        </Tabs>

        <Outlet />
      </div>
    </Layout>
  );
}
