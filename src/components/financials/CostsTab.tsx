/**
 * CostsTab - Global AP costs view
 * 
 * Uses unified costs table. Status is ALWAYS derived from payments (via trigger),
 * never manually toggled. Use PaymentDrawer to create payments.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCosts, useCostsSummary } from '@/hooks/useCosts';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ExternalLink, DollarSign } from 'lucide-react';
import { PaymentDrawer } from './PaymentDrawer';

interface CostsTabProps {
  categoryFilter?: string;
  statusFilter?: string;
}

export const CostsTab = ({ categoryFilter: propCategoryFilter, statusFilter: propStatusFilter }: CostsTabProps = {}) => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>(propCategoryFilter || 'all');
  const [statusFilter, setStatusFilter] = useState<string>(propStatusFilter || 'all');
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [selectedCostForPayment, setSelectedCostForPayment] = useState<any>(null);

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;
      return data;
    },
  });

  const filters = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    companyId: companyFilter === 'all' ? undefined : companyFilter,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  };

  const { data: costs, isLoading } = useCosts(filters);
  const { data: summary } = useCostsSummary(filters);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Input
          type="date"
          placeholder="Start Date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Input
          type="date"
          placeholder="End Date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies?.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="labor">Labor</SelectItem>
            <SelectItem value="subs">Subs</SelectItem>
            <SelectItem value="materials">Materials</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="misc">Misc</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="partially_paid">Partially Paid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.totalCosts || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary?.unpaidCosts || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.paidCosts || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">By Category</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div>Labor: {formatCurrency(summary?.byCategory.labor || 0)}</div>
            <div>Subs: {formatCurrency(summary?.byCategory.subs || 0)}</div>
            <div>Materials: {formatCurrency(summary?.byCategory.materials || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Costs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Cost Code</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Unpaid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs?.map((cost: any) => {
                  const unpaidAmount = (cost.amount || 0) - (cost.paid_amount || 0);
                  const canPay = unpaidAmount > 0 && cost.status !== 'void' && cost.status !== 'disputed';
                  
                  return (
                    <TableRow key={cost.id}>
                      <TableCell>
                        {format(new Date(cost.date_incurred), 'MM/dd/yyyy')}
                      </TableCell>
                      <TableCell>
                        {cost.project_id ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto font-medium text-primary hover:underline"
                            onClick={() => navigate(`/projects/${cost.project_id}`)}
                          >
                            {cost.projects?.project_name}
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        ) : (
                          cost.projects?.project_name || '-'
                        )}
                      </TableCell>
                      <TableCell>{cost.projects?.companies?.name}</TableCell>
                      <TableCell>{cost.description}</TableCell>
                      <TableCell className="capitalize">{cost.category}</TableCell>
                      <TableCell>
                        {cost.cost_codes && cost.project_id ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto text-primary hover:underline"
                            onClick={() => navigate(`/projects/${cost.project_id}?tab=financials`)}
                          >
                            {cost.cost_codes.code} - {cost.cost_codes.name}
                          </Button>
                        ) : cost.cost_codes ? (
                          `${cost.cost_codes.code} - ${cost.cost_codes.name}`
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(cost.amount)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(cost.paid_amount || 0)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(unpaidAmount)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          cost.status === 'paid' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : cost.status === 'partially_paid'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : cost.status === 'void' || cost.status === 'disputed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {cost.status === 'partially_paid' ? 'Partially Paid' : cost.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {canPay && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCostForPayment(cost);
                              setPaymentDrawerOpen(true);
                            }}
                            className="gap-1"
                          >
                            <DollarSign className="h-3 w-3" />
                            Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Drawer */}
      {selectedCostForPayment && (
        <PaymentDrawer
          open={paymentDrawerOpen}
          onOpenChange={(open) => {
            setPaymentDrawerOpen(open);
            if (!open) {
              setSelectedCostForPayment(null);
            }
          }}
          mode="single"
          costs={[selectedCostForPayment]}
          defaultVendorId={selectedCostForPayment.vendor_id || undefined}
          defaultVendorType={(selectedCostForPayment.vendor_type as 'sub' | 'supplier' | 'other') || undefined}
        />
      )}
    </div>
  );
};
