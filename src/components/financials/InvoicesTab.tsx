import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useInvoices, useInvoicesSummary, useInvoiceDocumentCounts, useUpdateInvoice } from '@/hooks/useInvoices';
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
import { ExternalLink, FileText, MoreVertical, Send, CheckCircle, Eye, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface InvoicesTabProps {
  statusFilter?: string;
  showRetention?: boolean;
}

export const InvoicesTab = ({ statusFilter: propStatusFilter, showRetention }: InvoicesTabProps = {}) => {
  const navigate = useNavigate();
  const updateInvoice = useUpdateInvoice();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>(propStatusFilter || 'all');

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
    status: statusFilter === 'all' ? undefined : statusFilter,
  };

  const { data: invoices, isLoading } = useInvoices(filters);
  const { data: summary } = useInvoicesSummary(filters);
  
  // Fetch document counts for all invoices
  const invoiceIds = useMemo(() => invoices?.map((inv: any) => inv.id) || [], [invoices]);
  const { data: documentCounts } = useInvoiceDocumentCounts(invoiceIds);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      partially_paid: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      void: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleMarkAsSent = async (invoiceId: string) => {
    try {
      await updateInvoice.mutateAsync({
        id: invoiceId,
        updates: { status: 'sent' },
      });
      toast.success('Invoice marked as sent');
    } catch (error) {
      toast.error('Failed to update invoice');
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      await updateInvoice.mutateAsync({
        id: invoiceId,
        updates: { status: 'paid' },
      });
      toast.success('Invoice marked as paid');
    } catch (error) {
      toast.error('Failed to update invoice');
    }
  };

  const handleViewDocuments = (invoice: any) => {
    if (invoice.project_id) {
      navigate(`/projects/${invoice.project_id}?tab=documents`);
    } else {
      toast.info('Navigate to project documents to view invoice attachments');
    }
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="partially_paid">Partially Paid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.totalInvoiced || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(summary?.outstanding || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.drafts || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary?.overdue || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Retention</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices?.map((invoice: any) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      {invoice.project_id ? (
                        <Button
                          variant="link"
                          className="p-0 h-auto font-medium text-primary hover:underline"
                          onClick={() => navigate(`/projects/${invoice.project_id}`)}
                        >
                          {invoice.projects?.project_name}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </Button>
                      ) : (
                        invoice.projects?.project_name || '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {invoice.client_name || invoice.projects?.client_name}
                    </TableCell>
                    <TableCell>
                      {invoice.issue_date 
                        ? format(new Date(invoice.issue_date), 'MM/dd/yyyy')
                        : '—'
                      }
                    </TableCell>
                    <TableCell>
                      {invoice.due_date 
                        ? format(new Date(invoice.due_date), 'MM/dd/yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(invoice.total_amount || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(invoice.retention_amount || 0)}
                    </TableCell>
                    <TableCell>
                      {documentCounts && documentCounts[invoice.id] > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1"
                          onClick={() => handleViewDocuments(invoice)}
                        >
                          <FileText className="h-3 w-3" />
                          <Badge variant="secondary" className="ml-1">
                            {documentCounts[invoice.id]}
                          </Badge>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7"
                          onClick={() => handleViewDocuments(invoice)}
                          title="View documents in project"
                        >
                          <Upload className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(invoice.status)}`}>
                        {invoice.status.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/projects/${invoice.project_id}?tab=billing`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {invoice.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handleMarkAsSent(invoice.id)}>
                              <Send className="mr-2 h-4 w-4" />
                              Mark as Sent
                            </DropdownMenuItem>
                          )}
                          {(invoice.status === 'sent' || invoice.status === 'partially_paid') && (
                            <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice.id)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleViewDocuments(invoice)}>
                            <FileText className="mr-2 h-4 w-4" />
                            {documentCounts && documentCounts[invoice.id] > 0 
                              ? `View Documents (${documentCounts[invoice.id]})`
                              : 'View Project Documents'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
