import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MaterialReceipt {
  id: string;
  project_id: string;
  vendor: string;
  date: string;
  subtotal: number;
  tax: number;
  total: number;
  cost_code_id: string | null;
  linked_document_id: string | null;
  auto_classified: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useMaterialReceipts(projectId?: string) {
  return useQuery({
    queryKey: ['material-receipts', projectId],
    queryFn: async () => {
      let query = supabase
        .from('material_receipts')
        .select(`
          *,
          projects (project_name),
          cost_codes (code, name)
        `)
        .order('date', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
