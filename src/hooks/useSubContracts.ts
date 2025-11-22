import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubContract {
  id: string;
  project_id: string;
  sub_id: string;
  contract_value: number;
  retention_percentage: number;
  retention_held: number;
  amount_billed: number;
  amount_paid: number;
  payment_terms: string | null;
  start_date: string | null;
  end_date: string | null;
  linked_document_id: string | null;
  status: 'active' | 'completed' | 'cancelled';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubContracts(projectId?: string, subId?: string) {
  return useQuery({
    queryKey: ['sub-contracts', projectId, subId],
    queryFn: async () => {
      let query = supabase
        .from('sub_contracts')
        .select(`
          *,
          subs (
            id,
            name,
            company_name,
            trades (name)
          ),
          projects (project_name)
        `)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      if (subId) {
        query = query.eq('sub_id', subId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useSubInvoices(projectId?: string, subId?: string) {
  return useQuery({
    queryKey: ['sub-invoices', projectId, subId],
    queryFn: async () => {
      let query = supabase
        .from('sub_invoices')
        .select(`
          *,
          subs (name, company_name),
          projects (project_name)
        `)
        .order('invoice_date', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      if (subId) {
        query = query.eq('sub_id', subId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
