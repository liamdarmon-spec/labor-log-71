import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Project {
  id: string;
  project_name: string;
  client_name: string | null;
  status: string;
  company_id: string | null;
  created_at?: string;
  budget?: number | null;
  start_date?: string | null;
  end_date?: string | null;
}

/**
 * Canonical hook for fetching projects
 * Used across: Admin, Dashboard, Schedule, Financials
 */
export function useProjects(status?: string) {
  return useQuery({
    queryKey: ['projects', status],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*')
        .order('project_name');
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Project[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Lightweight version for dropdowns - only id, name, and client
 */
export function useProjectsSimple(activeOnly = true) {
  return useQuery({
    queryKey: ['projects-simple', activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('id, project_name, client_name, status')
        .order('project_name');
      
      if (activeOnly) {
        query = query.eq('status', 'Active');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
