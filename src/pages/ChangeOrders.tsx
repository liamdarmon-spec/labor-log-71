// src/pages/ChangeOrders.tsx
// Change Orders module — top-level list of all COs across projects
// Supports optional projectId query param for filtering

import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
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
  Building2,
  Plus,
  DollarSign,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProjects } from '@/hooks/useProjects';
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
  projects?: { project_name: string; client_name: string | null } | null;
}

// ============================================================
// Global hook for Change Orders (all projects in authed companies)
// ============================================================

function useAllChangeOrders(filters: {
  projectId?: string | null;
  status?: string | null;
  search?: string;
}) {
  return useQuery({
    queryKey: ['change-orders-all', filters],
    queryFn: async () => {
      let query = supabase
        .from('change_orders')
        .select('*, projects(project_name, client_name)')
        .order('created_at', { ascending: false });

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Client-side search filter (description + title)
      let results = data as ChangeOrder[];
      if (filters.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(
          (co) =>
            co.title.toLowerCase().includes(s) ||
            co.description?.toLowerCase().includes(s) ||
            co.change_order_number?.toLowerCase().includes(s) ||
            co.projects?.project_name.toLowerCase().includes(s)
        );
      }

      return results;
    },
  });
}

// ============================================================
// Main Component
// ============================================================

export default function ChangeOrders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters from URL
  const projectIdFilter = searchParams.get('projectId') || null;
  const statusFilter = searchParams.get('status') || 'all';
  const [search, setSearch] = useState('');

  // Data
  const { data: changeOrders = [], isLoading } = useAllChangeOrders({
    projectId: projectIdFilter,
    status: statusFilter,
    search,
  });
  const { data: projects = [] } = useProjects();

  // Selected CO for detail view
  const [selectedCO, setSelectedCO] = useState<ChangeOrder | null>(null);

  const formatCurrency = (value: number | null | undefined) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0);
  };

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
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
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <FileDiff className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Change Orders</h1>
              <p className="text-muted-foreground text-sm">
                {changeOrders.length} change order{changeOrders.length !== 1 ? 's' : ''}
                {projectIdFilter && ' for selected project'}
              </p>
            </div>
          </div>
          {/* Future: Add Create CO button here if creation workflow exists */}
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
                    placeholder="Search by title, number, or project..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Project Filter */}
              <div className="w-full sm:w-56">
                <Label className="sr-only">Project</Label>
                <Select
                  value={projectIdFilter || 'all'}
                  onValueChange={(v) => updateFilter('projectId', v === 'all' ? null : v)}
                >
                  <SelectTrigger>
                    <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="w-full sm:w-40">
                <Label className="sr-only">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => updateFilter('status', v)}>
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
              <EmptyState projectFilter={!!projectIdFilter} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">CO #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Project</TableHead>
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
                      <TableCell className="text-muted-foreground">
                        {co.projects?.project_name || '—'}
                      </TableCell>
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
      </div>

      {/* Detail Dialog */}
      <ChangeOrderDetailDialog
        changeOrder={selectedCO}
        open={!!selectedCO}
        onOpenChange={(open) => !open && setSelectedCO(null)}
        onViewProject={() => {
          if (selectedCO) {
            navigate(`/app/projects/${selectedCO.project_id}?tab=billing`);
          }
        }}
      />
    </Layout>
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

function EmptyState({ projectFilter }: { projectFilter: boolean }) {
  return (
    <div className="text-center py-16">
      <div className="mx-auto mb-4 opacity-50">
        <FileDiff className="h-12 w-12 mx-auto" />
      </div>
      <h3 className="font-medium mb-1">No Change Orders</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        {projectFilter
          ? 'No change orders found for this project. Try clearing the filter.'
          : 'Change orders will appear here when created from a project.'}
      </p>
    </div>
  );
}

function ChangeOrderDetailDialog({
  changeOrder,
  open,
  onOpenChange,
  onViewProject,
}: {
  changeOrder: ChangeOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewProject: () => void;
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
            <span className="text-sm text-muted-foreground">Project</span>
            <span className="font-medium">{changeOrder.projects?.project_name || '—'}</span>
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

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onViewProject}>
            <Building2 className="h-4 w-4 mr-2" />
            View Project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

