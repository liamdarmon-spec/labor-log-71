import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useMaterialInsights } from '@/hooks/useMaterialInsights';
import { useMaterialReceipts } from '@/hooks/useMaterialReceipts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const MaterialsTab = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  
  const { data: insights, isLoading: insightsLoading } = useMaterialInsights();
  const { data: receipts, isLoading: receiptsLoading } = useMaterialReceipts();
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name');
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const filteredReceipts = receipts?.filter(receipt => {
    const matchesSearch = receipt.vendor?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = !projectFilter || projectFilter === 'all' || receipt.project_id === projectFilter;
    return matchesSearch && matchesProject;
  });

  if (insightsLoading || receiptsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const varianceColor = (insights?.variance || 0) >= 0 ? 'text-green-600' : 'text-red-600';
  const VarianceIcon = (insights?.variance || 0) >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Material Costs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(insights?.totalMaterialCosts || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Material Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(insights?.totalBudget || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Variance</CardTitle>
            <VarianceIcon className={`h-4 w-4 ${varianceColor}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${varianceColor}`}>
              {formatCurrency(insights?.variance || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {insights?.variancePercent.toFixed(1)}% of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receipt Count</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receipts?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total receipts</p>
          </CardContent>
        </Card>
      </div>

      {/* Material by Trade Chart */}
      {insights && insights.byTrade.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Material Spending by Trade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={insights.byTrade}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="trade_name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="total" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Material Receipts Ledger */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Material Receipts Ledger</CardTitle>
            <Button onClick={() => navigate('/materials')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Receipt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Search vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Cost Code</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts?.map((receipt) => (
                <TableRow 
                  key={receipt.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    if (receipt.project_id) {
                      navigate(`/projects/${receipt.project_id}`);
                    }
                  }}
                >
                  <TableCell>
                    {receipt.date ? format(new Date(receipt.date), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell>{receipt.vendor || '-'}</TableCell>
                  <TableCell>{receipt.projects?.project_name || '-'}</TableCell>
                  <TableCell>
                    {receipt.cost_codes ? (
                      <span className="text-sm">
                        {receipt.cost_codes.code} - {receipt.cost_codes.name}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(receipt.subtotal)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(receipt.tax)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(receipt.total)}
                  </TableCell>
                </TableRow>
              ))}
              {filteredReceipts?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No material receipts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
