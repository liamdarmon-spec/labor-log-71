import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScheduleFilters {
  startDate?: string;
  endDate?: string;
  projectId?: string;
  workerId?: string;
  subId?: string;
  companyId?: string;
  type?: 'labor' | 'sub' | 'meeting' | 'all';
}

/**
 * Canonical schedule data hook - THE SINGLE SOURCE OF TRUTH for all schedule queries
 * All schedule views must use this hook instead of writing their own queries
 */
export function useScheduleData(filters: ScheduleFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['schedules', filters],
    enabled,
    queryFn: async () => {
      let query: any = supabase
        .from('work_schedules')
        .select(`
          *,
          worker:workers(id, name, trade, hourly_rate),
          project:projects(id, project_name, client_name, status, company_id),
          trade:trades(id, name),
          cost_code:cost_codes(id, code, name, category)
        `)
        .order('scheduled_date')
        .order('worker_id');

      // Apply date filters
      if (filters.startDate) {
        query = query.gte('scheduled_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('scheduled_date', filters.endDate);
      }

      // Apply entity filters
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters.workerId) {
        query = query.eq('worker_id', filters.workerId);
      }
      if (filters.subId) {
        query = query.eq('sub_id', filters.subId);
      }

      // Apply type filter
      if (filters.type && filters.type !== 'all') {
        query = query.eq('schedule_type', filters.type);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Apply company filter post-fetch (since it's on related projects table)
      let filteredData = data || [];
      if (filters.companyId && filters.companyId !== 'all') {
        filteredData = filteredData.filter((schedule: any) => 
          schedule.project?.company_id === filters.companyId
        );
      }
      
      return filteredData;
    },
  });
}

/**
 * Get schedules for a specific date
 */
export function useSchedulesForDate(date: string, filters: Omit<ScheduleFilters, 'startDate' | 'endDate'> = {}) {
  return useScheduleData({
    ...filters,
    startDate: date,
    endDate: date,
  });
}

/**
 * Get schedules for a date range
 */
export function useSchedulesForRange(startDate: string, endDate: string, filters: Omit<ScheduleFilters, 'startDate' | 'endDate'> = {}) {
  return useScheduleData({
    ...filters,
    startDate,
    endDate,
  });
}
