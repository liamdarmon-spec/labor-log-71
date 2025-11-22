import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Document {
  id: string;
  project_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  document_type: 'plans' | 'receipts' | 'invoices' | 'contracts' | 'submittals' | 'permits' | 'photos' | 'proposals' | 'other';
  cost_code_id: string | null;
  auto_classified: boolean;
  extracted_text: string | null;
  tags: string[] | null;
  vendor_name: string | null;
  amount: number | null;
  document_date: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useDocuments(projectId?: string) {
  return useQuery({
    queryKey: ['documents', projectId],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select(`
          *,
          projects (project_name),
          cost_codes (code, name)
        `)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
