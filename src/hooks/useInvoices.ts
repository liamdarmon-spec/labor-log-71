import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Invoice {
  id: string;
  project_id: string;
  client_name: string | null;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  total_amount: number | null;
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'void';
  retention_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface InvoiceFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  companyId?: string;
  projectId?: string;
}

export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          projects (id, project_name, client_name, company_id, companies (id, name))
        `)
        .order('issue_date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('issue_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('issue_date', filters.endDate);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Apply company filter in JS
      let results = data || [];
      if (filters?.companyId) {
        results = results.filter((invoice: any) => 
          invoice.projects?.company_id === filters.companyId
        );
      }

      return results;
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert(invoice)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Failed to create invoice');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-summary'] });
      
      // Invalidate project financials if project_id is available
      if (data?.project_id) {
        queryClient.invalidateQueries({ queryKey: ['project-financials', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['project-financials-v3', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['unified-project-budget', data.project_id] });
      }
      
      // Invalidate global financial summaries
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['job-costing'] });
    },
  });
}

// Fetch documents for an invoice
export function useInvoiceDocuments(invoiceId: string | null) {
  return useQuery({
    queryKey: ['invoice-documents', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      
      const { data, error } = await supabase
        .from('documents')
        .select('id, file_name, file_url, document_type, doc_type')
        .eq('related_invoice_id', invoiceId)
        .eq('is_archived', false)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!invoiceId,
  });
}

// Fetch document counts for multiple invoices (for table display)
export function useInvoiceDocumentCounts(invoiceIds: string[]) {
  return useQuery({
    queryKey: ['invoice-document-counts', invoiceIds.sort().join(',')],
    queryFn: async () => {
      if (invoiceIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('documents')
        .select('related_invoice_id')
        .in('related_invoice_id', invoiceIds)
        .eq('is_archived', false);
      
      if (error) throw error;
      
      // Count documents per invoice
      const counts: Record<string, number> = {};
      (data || []).forEach((doc: any) => {
        if (doc.related_invoice_id) {
          counts[doc.related_invoice_id] = (counts[doc.related_invoice_id] || 0) + 1;
        }
      });
      
      return counts;
    },
    enabled: invoiceIds.length > 0,
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Invoice> }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Invoice not found');
      }
      return data;
    },
    onSuccess: (data) => {
      // Invalidate all invoice-related queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-summary'] });
      
      // Invalidate project financials if project_id is available
      if (data?.project_id) {
        queryClient.invalidateQueries({ queryKey: ['project-financials', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['project-financials-v3', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['project-financials-v2', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['unified-project-budget', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['project-stats', data.project_id] });
      }
      
      // Invalidate global financial summaries
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['job-costing'] });
    },
  });
}

// Invoice summary
export function useInvoicesSummary(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: ['invoices-summary', filters],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('total_amount, status, issue_date, due_date, project_id, projects!inner(company_id)');

      if (filters?.startDate) {
        query = query.gte('issue_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('issue_date', filters.endDate);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters?.companyId) {
        query = query.eq('projects.company_id', filters.companyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const invoices = data || [];
      
      // Optimized single-pass aggregation
      let totalInvoiced = 0;
      let outstanding = 0;
      let drafts = 0;
      let overdue = 0;
      const today = new Date().toISOString().split('T')[0];

      invoices.forEach(i => {
        if (i.status !== 'void') {
          totalInvoiced += i.total_amount || 0;
        }
        
        if (i.status === 'sent' || i.status === 'partially_paid') {
          outstanding += i.total_amount || 0;
        }
        
        if (i.status === 'draft') {
          drafts++;
        }
        
        if (i.due_date && i.due_date < today && i.status !== 'paid' && i.status !== 'void') {
          overdue++;
        }
      });

      return {
        totalInvoiced,
        outstanding,
        drafts,
        overdue,
      };
    },
  });
}
