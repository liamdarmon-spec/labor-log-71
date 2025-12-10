import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safeArray } from '@/lib/utils/safeData';
import { toast } from 'sonner';

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
 * 
 * Features:
 * - Safe array return (never undefined)
 * - Automatic retry on failure
 * - Optimized caching
 */
export function useProjects(status?: string) {
  const query = useQuery({
    queryKey: ['projects', status],
    queryFn: async () => {
      let q = supabase
        .from('projects')
        .select('*')
        .order('project_name');
      
      if (status) {
        q = q.eq('status', status);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return safeArray(data) as Project[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    ...query,
    // Provide safe defaults
    data: safeArray(query.data),
    isEmpty: safeArray(query.data).length === 0,
  };
}

/**
 * Hook for creating a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (project: Partial<Project>) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects-simple'] });
      toast.success('Project created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create project');
      console.error('Create project error:', error);
    },
  });
}

/**
 * Hook for updating a project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects-simple'] });
      toast.success('Project updated');
    },
    onError: (error) => {
      toast.error('Failed to update project');
      console.error('Update project error:', error);
    },
  });
}

/**
 * Lightweight version for dropdowns - only id, name, and client
 * Returns safe empty array when no data
 */
export function useProjectsSimple(activeOnly = true) {
  const query = useQuery({
    queryKey: ['projects-simple', activeOnly],
    queryFn: async () => {
      let q = supabase
        .from('projects')
        .select('id, project_name, client_name, status')
        .order('project_name');
      
      if (activeOnly) {
        q = q.eq('status', 'Active');
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return safeArray(data);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    data: safeArray(query.data),
  };
}
