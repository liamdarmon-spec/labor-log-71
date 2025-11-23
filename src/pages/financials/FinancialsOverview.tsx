import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Clock, FileText, Users, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function FinancialsOverview() {
  const navigate = useNavigate();

  // Fetch overview data
  const { data: overview, isLoading } = useQuery({
    queryKey: ['financial-overview'],
    queryFn: async () => {
      // Fetch budgets
      const { data: budgets } = await supabase
        .from('project_budgets')
        .select('labor_budget, subs_budget, materials_budget, other_budget');

      const totalBudget = (budgets || []).reduce((sum, b) => 
        sum + (b.labor_budget || 0) + (b.subs_budget || 0) + (b.materials_budget || 0) + (b.other_budget || 0), 0
      );

      // Fetch labor actuals
      const { data: laborLogs } = await supabase
        .from('daily_logs')
        .select('hours_worked, workers!inner(hourly_rate)');

      const laborActual = (laborLogs || []).reduce((sum, log: any) => 
        sum + (log.hours_worked * (log.workers?.hourly_rate || 0)), 0
      );

      // Fetch other costs
      const { data: costs } = await supabase
        .from('costs')
        .select('category, amount, status, date_incurred');

      const subsActual = (costs || []).filter(c => c.category === 'subs').reduce((sum, c) => sum + c.amount, 0);
      const materialsActual = (costs || []).filter(c => c.category === 'materials').reduce((sum, c) => sum + c.amount, 0);
      const miscActual = (costs || []).filter(c => c.category === 'misc').reduce((sum, c) => sum + c.amount, 0);

      const totalActual = laborActual + subsActual + materialsActual + miscActual;
      const variance = totalBudget - totalActual;

      // Last 30 days costs
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCosts = (costs || []).filter(c => new Date(c.date_incurred) >= thirtyDaysAgo);
      const cashOutflow = recentCosts.reduce((sum, c) => sum + c.amount, 0);

      // Fetch invoices for AR
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, status, issue_date')
        .neq('status', 'void');

      const recentInvoices = (invoices || []).filter(i => new Date(i.issue_date) >= thirtyDaysAgo);
      const cashInflow = recentInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);

      // Unpaid costs
      const unpaidCosts = (costs || []).filter(c => c.status === 'unpaid').reduce((sum, c) => sum + c.amount, 0);
      const unpaidInvoices = (invoices || []).filter(i => i.status !== 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0);

      // Unpaid labor
      const { data: unpaidLabor } = await supabase
        .from('daily_logs')
        .select('hours_worked, workers!inner(hourly_rate)')
        .eq('payment_status', 'unpaid');

      const unpaidLaborTotal = (unpaidLabor || []).reduce((sum, log: any) => 
        sum + (log.hours_worked * (log.workers?.hourly_rate || 0)), 0
      );

      return {
        totalBudget,
        totalActual,
        variance,
        byCategory: {
          labor: laborActual,
          subs: subsActual,
          materials: materialsActual,
          misc: miscActual,
        },
        cashOutflow,
        cashInflow,
        upcomingPayables: unpaidCosts,
        upcomingReceivables: unpaidInvoices,
        unpaidLabor: unpaidLaborTotal,
      };
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/financials/job-costing')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(overview?.totalBudget || 0)}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/financials/job-costing')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Actual Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(overview?.totalActual || 0)}</div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${(overview?.variance || 0) < 0 ? 'border-destructive' : ''}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {(overview?.variance || 0) >= 0 ? (
                <TrendingDown className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              Budget Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${(overview?.variance || 0) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(Math.abs(overview?.variance || 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(overview?.variance || 0) >= 0 ? 'Under budget' : 'Over budget'}
            </p>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${(overview?.unpaidLabor || 0) > 0 ? 'border-orange-500' : ''}`} 
              onClick={() => navigate('/financials/payments')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              Unpaid Labor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{formatCurrency(overview?.unpaidLabor || 0)}</div>
            {(overview?.unpaidLabor || 0) > 0 && (
              <Badge variant="outline" className="mt-2 text-orange-600 border-orange-600">Requires Payment</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/financials/job-costing?category=labor')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Labor Costs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overview?.byCategory.labor || 0)}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/financials/materials')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overview?.byCategory.materials || 0)}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/financials/costs?category=subs')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Subcontractors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overview?.byCategory.subs || 0)}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/financials/job-costing?category=misc')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Other Costs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overview?.byCategory.misc || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Cash Outflow (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{formatCurrency(overview?.cashOutflow || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Cash Inflow (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(overview?.cashInflow || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Payables & Receivables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/financials/costs')}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              Upcoming Payables (AP)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{formatCurrency(overview?.upcomingPayables || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Unpaid invoices and bills</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/financials/invoices')}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Upcoming Receivables (AR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{formatCurrency(overview?.upcomingReceivables || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Outstanding client invoices</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
