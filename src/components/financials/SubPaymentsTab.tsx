/**
 * Subcontractors Payments Tab
 * 
 * Uses unified `costs` table filtered by:
 * - category = 'subs' (subcontractor costs)
 * - status IN ('unpaid', 'partially_paid') (unpaid or partially paid costs)
 * 
 * Status is ALWAYS derived from payments (via trigger), never manually toggled.
 * Use PaymentDrawer in batch mode to create payments.
 * 
 * NOTE: Legacy `sub_invoices` table queries are deprecated in favor of unified `costs` table.
 * TODO(AP_UNIFY): Previously manually toggled status - now uses PaymentDrawer ✅
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Users, AlertCircle, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import type { CostFilters } from '@/hooks/useCosts';
import { PaymentDrawer } from './PaymentDrawer';

interface SubPaymentsTabProps {
  filters?: CostFilters;
}

export function SubPaymentsTab({ filters }: SubPaymentsTabProps) {
  const navigate = useNavigate();
  const [selectedCosts, setSelectedCosts] = useState<Set<string>>(new Set());
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);

  // Fetch unpaid/partially paid subcontractor costs from `costs` table
  const { data: unpaidCosts, isLoading } = useQuery({
    queryKey: ['unpaid-sub-costs', filters],
    queryFn: async () => {
      let query = supabase
        .from('costs')
        .select(`
          *,
          projects (
            id,
            project_name,
            company_id,
            companies (
              id,
              name
            )
          ),
          cost_codes (
            id,
            code,
            name
          ),
          subs (
            id,
            name,
            company_name
          )
        `)
        .eq('category', 'subs') // Subcontractor costs only
        .in('status', ['unpaid', 'partially_paid']) // Unpaid or partially paid
        .order('date_incurred', { ascending: true });

      // Apply same filters as All Costs tab
      if (filters?.startDate) {
        query = query.gte('date_incurred', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date_incurred', filters.endDate);
      }
      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters?.companyId) {
        // Company filter applied in JS (company_id lives on projects)
        // We'll filter after fetching
      }

      const { data, error } = await query;
      if (error) throw error;

      // Apply company filter in JS (same as CostsTab)
      let results = data || [];
      if (filters?.companyId) {
        results = results.filter((cost: any) =>
          cost.projects?.company_id === filters.companyId
        );
      }

      return results;
    },
  });

  const toggleCost = (costId: string) => {
    setSelectedCosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(costId)) {
        newSet.delete(costId);
      } else {
        newSet.add(costId);
      }
      return newSet;
    });
  };

  const handleCreatePayment = () => {
    if (selectedCosts.size === 0) {
      return;
    }
    setPaymentDrawerOpen(true);
  };

  const selectedCostsData = unpaidCosts?.filter((cost: any) =>
    selectedCosts.has(cost.id)
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Calculate totals from costs table using paid_amount
  // Total Unpaid = SUM(amount - paid_amount) for subs where status != 'void'
  const totalUnpaid = unpaidCosts?.reduce((sum, cost: any) => {
    if (cost.status === 'void' || cost.status === 'disputed') return sum;
    const unpaidAmount = (cost.amount || 0) - (cost.paid_amount || 0);
    return sum + unpaidAmount;
  }, 0) || 0;

  // Retention Held = SUM(retention_amount) for subs with retention_amount > 0
  const totalRetention = unpaidCosts?.reduce((sum, cost: any) => {
    return sum + (cost.retention_amount || 0);
  }, 0) || 0;

  // Unpaid Invoices count = COUNT(DISTINCT costs.id) where status IN ('unpaid', 'partially_paid')
  const unpaidCount = unpaidCosts?.filter((cost: any) =>
    cost.status === 'unpaid' || cost.status === 'partially_paid'
  ).length || 0;

  const selectedTotal = Array.from(selectedCosts).reduce((sum, id) => {
    const cost = unpaidCosts?.find((c: any) => c.id === id);
    if (!cost) return sum;
    const unpaidAmount = (cost.amount || 0) - (cost.paid_amount || 0);
    return sum + unpaidAmount;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Unpaid</p>
                <p className="text-2xl font-bold">${totalUnpaid.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Retention Held</p>
                <p className="text-2xl font-bold">${totalRetention.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                <Users className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unpaid Invoices</p>
                <p className="text-2xl font-bold">{unpaidCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Subcontractor Costs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Unpaid Sub Invoices</CardTitle>
            {selectedCosts.size > 0 && (
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="font-semibold">{selectedCosts.size}</span> selected
                  <span className="text-muted-foreground ml-2">
                    (${selectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </span>
                </div>
                <Button
                  onClick={handleCreatePayment}
                  className="gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Create Payment
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!unpaidCosts || unpaidCosts.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No unpaid invoices</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Subcontractor</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Cost Code</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Unpaid</TableHead>
                  <TableHead className="text-right">Retention</TableHead>
                  <TableHead>Age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaidCosts.map((cost: any) => {
                  const costDate = new Date(cost.date_incurred);
                  const daysOld = Math.floor((Date.now() - costDate.getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = daysOld > 30;
                  const unpaidAmount = (cost.amount || 0) - (cost.paid_amount || 0);
                  const retentionAmount = cost.retention_amount || 0;

                  return (
                    <TableRow key={cost.id} className={isOverdue ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCosts.has(cost.id)}
                          onCheckedChange={() => toggleCost(cost.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{cost.description || '-'}</TableCell>
                      <TableCell>
                        <div>
                          {cost.subs?.name || cost.subs?.company_name || '-'}
                          {cost.subs?.company_name && cost.subs?.name && (
                            <div className="text-xs text-muted-foreground">
                              {cost.subs.company_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cost.project_id ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto font-medium text-primary hover:underline"
                            onClick={() => navigate(`/projects/${cost.project_id}`)}
                          >
                            {cost.projects?.project_name || '-'}
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        ) : (
                          cost.projects?.project_name || '-'
                        )}
                      </TableCell>
                      <TableCell>{format(costDate, 'MM/dd/yyyy')}</TableCell>
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
                        ${(cost.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        ${(cost.paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-semibold">
                        ${unpaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-amber-600">
                        ${retentionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isOverdue ? 'destructive' : 'secondary'}>
                          {daysOld}d old
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Drawer (Batch Mode) */}
      {selectedCostsData.length > 0 && (
        <PaymentDrawer
          open={paymentDrawerOpen}
          onOpenChange={(open) => {
            setPaymentDrawerOpen(open);
            if (!open) {
              setSelectedCosts(new Set());
            }
          }}
          mode="batch"
          costs={selectedCostsData}
          defaultVendorId={selectedCostsData[0]?.vendor_id || undefined}
          defaultVendorType={(selectedCostsData[0]?.vendor_type as 'sub' | 'supplier' | 'other') || 'sub'}
        />
      )}
    </div>
  );
}
