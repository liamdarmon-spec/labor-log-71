import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/company/CompanyProvider';

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
  limit?: number;
  offset?: number;
}

export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const limit = Math.min(Math.max(filters?.limit ?? 100, 1), 500);
      const offset = Math.max(filters?.offset ?? 0, 0);
      const rangeFrom = offset;
      const rangeTo = offset + limit - 1;

      let query = supabase
        .from('invoices')
        .select(
          `
          *,
          projects!inner(id, project_name, client_name, company_id, companies(id, name))
        `,
          { count: 'exact' }
        )
        .order('issue_date', { ascending: false })
        .range(rangeFrom, rangeTo);

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
      return data || [];
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>) => {
      if (!activeCompanyId) throw new Error('No active company selected');
      const { data, error } = await supabase
        .from('invoices')
        .insert({ ...(invoice as any), company_id: activeCompanyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
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
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
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
