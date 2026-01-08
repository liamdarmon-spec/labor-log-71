// src/components/project/ProjectChangeOrdersTab.tsx
// Change Orders tab within a project — shows COs for this project only
//
// UI SMOKE TEST CHECKLIST:
// □ Shows only COs for the current project
// □ Stats cards show counts for this project
// □ Create CO button opens coming-soon modal
// □ Clicking a row opens detail dialog
// □ Empty state is shown when no COs exist

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileDiff,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Plus,
  DollarSign,
  Building2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================
// Types
// ============================================================

interface ChangeOrder {
  id: string;
  project_id: string;
  company_id: string;
  change_order_number: string | null;
  title: string;
  description: string | null;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'void';
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectChangeOrdersTabProps {
  projectId: string;
}

// ============================================================
// Hook for Project-specific Change Orders
// ============================================================

function useProjectChangeOrders(projectId: string, filters: { status?: string | null; search?: string }) {
  return useQuery({
    queryKey: ['change-orders', 'project', projectId, filters],
    queryFn: async () => {
      let query = supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      let results = data as ChangeOrder[];
      if (filters.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(
          (co) =>
            co.title.toLowerCase().includes(s) ||
            co.description?.toLowerCase().includes(s) ||
            co.change_order_number?.toLowerCase().includes(s)
        );
      }

      return results;
    },
    enabled: !!projectId,
  });
}

// ============================================================
// Main Component
// ============================================================

export function ProjectChangeOrdersTab({ projectId }: ProjectChangeOrdersTabProps) {
  const navigate = useNavigate();

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Data
  const { data: changeOrders = [], isLoading } = useProjectChangeOrders(projectId, {
    status: statusFilter,
    search,
  });

  // Dialog states
  const [selectedCO, setSelectedCO] = useState<ChangeOrder | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const formatCurrency = (value: number | null | undefined) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0);
  };

  // Stats
  const stats = useMemo(() => {
    const draft = changeOrders.filter((co) => co.status === 'draft').length;
    const sent = changeOrders.filter((co) => co.status === 'sent').length;
    const approved = changeOrders.filter((co) => co.status === 'approved').length;
    const totalApproved = changeOrders
      .filter((co) => co.status === 'approved')
      .reduce((sum, co) => sum + (co.total_amount || 0), 0);
    return { draft, sent, approved, totalApproved };
  }, [changeOrders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Change Orders</h2>
          <p className="text-muted-foreground text-sm">
            Track, approve, and bill change orders for this project
          </p>
        </div>
        <Button onClick={() => setShowComingSoon(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Change Order
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Draft" value={stats.draft} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Sent" value={stats.sent} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Approved" value={stats.approved} icon={<CheckCircle className="h-4 w-4" />} />
        <StatCard
          label="Approved Value"
          value={formatCurrency(stats.totalApproved)}
          icon={<DollarSign className="h-4 w-4" />}
          isMonetary
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Label className="sr-only">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-40">
              <Label className="sr-only">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : changeOrders.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">CO #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changeOrders.map((co) => (
                  <TableRow
                    key={co.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedCO(co)}
                  >
                    <TableCell className="font-medium">
                      {co.change_order_number || '—'}
                    </TableCell>
                    <TableCell className="font-medium">{co.title}</TableCell>
                    <TableCell>
                      <StatusBadge status={co.status} />
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${co.total_amount < 0 ? 'text-red-600' : ''}`}
                    >
                      {formatCurrency(co.total_amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(co.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <ChangeOrderDetailDialog
        changeOrder={selectedCO}
        open={!!selectedCO}
        onOpenChange={(open) => !open && setSelectedCO(null)}
      />

      {/* Coming Soon Modal */}
      <Dialog open={showComingSoon} onOpenChange={setShowComingSoon}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDiff className="h-5 w-5" />
              CO Creation Coming Soon
            </DialogTitle>
            <DialogDescription>
              Change Order creation is in development. Here&apos;s what&apos;s coming:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Create CO from scope changes</p>
                <p className="text-xs text-muted-foreground">Add or remove work from the contract</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Auto-allocate to SOV lines</p>
                <p className="text-xs text-muted-foreground">COs automatically update SOV when approved</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Send for client approval</p>
                <p className="text-xs text-muted-foreground">Public link for client review and signature</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Bill approved COs</p>
                <p className="text-xs text-muted-foreground">Create invoices for approved change orders</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowComingSoon(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StatCard({
  label,
  value,
  icon,
  isMonetary = false,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  isMonetary?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-xl font-bold mt-1 ${isMonetary ? 'text-green-600' : ''}`}>
              {value}
            </p>
          </div>
          <div className="rounded-full bg-muted p-2 text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    approved: { variant: 'default', icon: <CheckCircle className="w-3 h-3" /> },
    sent: { variant: 'outline', icon: <Clock className="w-3 h-3" /> },
    draft: { variant: 'secondary', icon: null },
    rejected: { variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
    void: { variant: 'destructive', icon: null },
  };
  const c = config[status] || { variant: 'secondary', icon: null };
  return (
    <Badge variant={c.variant} className="gap-1 capitalize">
      {c.icon} {status}
    </Badge>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="mx-auto mb-4 opacity-50">
        <FileDiff className="h-12 w-12 mx-auto" />
      </div>
      <h3 className="font-medium mb-1">No Change Orders</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        Change orders will appear here when created. COs modify the contract value when approved.
      </p>
    </div>
  );
}

function ChangeOrderDetailDialog({
  changeOrder,
  open,
  onOpenChange,
}: {
  changeOrder: ChangeOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!changeOrder) return null;

  const formatCurrency = (value: number | null | undefined) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDiff className="h-5 w-5" />
            {changeOrder.change_order_number || 'Change Order'}
          </DialogTitle>
          <DialogDescription>{changeOrder.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status={changeOrder.status} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className={`font-semibold ${changeOrder.total_amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(changeOrder.total_amount)}
            </span>
          </div>

          {changeOrder.description && (
            <div className="pt-2 border-t">
              <span className="text-sm text-muted-foreground block mb-1">Description</span>
              <p className="text-sm">{changeOrder.description}</p>
            </div>
          )}

          {changeOrder.approved_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Approved</span>
              <span>
                {new Date(changeOrder.approved_at).toLocaleDateString()}
                {changeOrder.approved_by && ` by ${changeOrder.approved_by}`}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Created</span>
            <span>{new Date(changeOrder.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

