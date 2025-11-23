import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, AlertCircle, Clock, FileText, Hammer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useInvoicesSummary } from '@/hooks/useInvoices';
import { useCostsSummary } from '@/hooks/useCosts';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function FinancialsOverviewV2() {
  const navigate = useNavigate();
  const { data: summary, isLoading: summaryLoading } = useFinancialSummary();
  const { data: arSummary, isLoading: arLoading } = useInvoicesSummary();
  const { data: apSummary, isLoading: apLoading } = useCostsSummary();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (summaryLoading || arLoading || apLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const grossProfit = (summary?.revenue || 0) - (apSummary?.totalCosts || 0);
  const profitMargin = summary?.revenue ? ((grossProfit / summary.revenue) * 100) : 0;

  // Mock timeline data for chart
  const timelineData = [
    { month: 'Jan', profit: 45000 },
    { month: 'Feb', profit: 52000 },
    { month: 'Mar', profit: 48000 },
    { month: 'Apr', profit: 61000 },
    { month: 'May', profit: 55000 },
    { month: 'Jun', profit: grossProfit },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Financial Overview</h1>
        <p className="text-muted-foreground">
          Company-wide financial performance and health metrics
        </p>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Total Revenue (AR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(summary?.revenue || 0)}
            </div>
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto text-xs"
              onClick={() => navigate('/financials/revenue')}
            >
              View Revenue Details →
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-destructive" />
              Total Costs (AP)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {formatCurrency(apSummary?.totalCosts || 0)}
            </div>
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto text-xs"
              onClick={() => navigate('/financials/costs')}
            >
              View Costs Breakdown →
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              Gross Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(grossProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {profitMargin.toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 border-yellow-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              Outstanding AP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {formatCurrency(apSummary?.unpaidCosts || 0)}
            </div>
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto text-xs"
              onClick={() => navigate('/financials/payments')}
            >
              View Payment Center →
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Profit Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Profit Timeline</CardTitle>
          <CardDescription>Monthly gross profit trend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="hsl(var(--primary))"
                  fill="url(#profitGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Labor Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.laborActual || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Unpaid: {formatCurrency(summary?.laborUnpaid || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Subcontractor Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.subsActual || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Unpaid: {formatCurrency(summary?.subsUnpaid || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Materials Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.materialsActual || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Retention Held</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(summary?.retentionHeld || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/financials/revenue')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Overdue Invoices
            </CardTitle>
            <CardDescription>
              {arSummary?.overdue || 0} invoices need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm">View Invoices →</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/financials/payments')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Unpaid Labor
            </CardTitle>
            <CardDescription>
              {formatCurrency(summary?.laborUnpaid || 0)} outstanding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm">Process Payments →</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/financials/payments')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hammer className="w-5 h-5 text-orange-600" />
              Unpaid Subs
            </CardTitle>
            <CardDescription>
              {formatCurrency(summary?.subsUnpaid || 0)} outstanding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm">Pay Subcontractors →</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
