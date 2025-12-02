import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Type-safe tab values
const FINANCIAL_TABS = ['costs', 'payments', 'receivables', 'profit'] as const;
type FinancialTab = (typeof FINANCIAL_TABS)[number];

// Normalize legacy and new paths to canonical tab values
const normalizePathToTab = (pathname: string): FinancialTab => {
  // Check for exact matches and legacy paths
  if (pathname.includes('/costs') || pathname.includes('/procurement') || pathname.includes('/ap')) {
    return 'costs';
  }
  if (pathname.includes('/payments')) {
    return 'payments';
  }
  if (pathname.includes('/receivables') || pathname.includes('/revenue') || pathname.includes('/ar')) {
    return 'receivables';
  }
  if (pathname.includes('/profit') || pathname.includes('/job-costing') || pathname.includes('/overview')) {
    return 'profit';
  }
  // Default: /financials or /financials/ goes to costs
  if (pathname === '/financials' || pathname === '/financials/') {
    return 'costs';
  }
  return 'costs';
};

export default function FinancialsLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = normalizePathToTab(location.pathname);

  const handleTabChange = (value: string) => {
    const routes: Record<FinancialTab, string> = {
      costs: '/financials/costs',
      payments: '/financials/payments',
      receivables: '/financials/receivables',
      profit: '/financials/profit',
    };
    navigate(routes[value as FinancialTab]);
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

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
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
