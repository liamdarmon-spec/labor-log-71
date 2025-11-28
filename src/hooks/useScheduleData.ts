/**
 * useScheduleData - Canonical schedule data hook
 *
 * THE SINGLE SOURCE OF TRUTH for all schedule queries
 *
 * CANONICAL READ: work_schedule_grid_view (view over work_schedules)
 *   - View already joins workers, projects, companies, trades, cost_codes
 *   - We transform the flat row into the same nested shape the UI expects:
 *       worker, project, trade, cost_code
 *
 * For sub schedules, use sub_scheduled_shifts directly (different table)
 */

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
      // NOTE: read from the optimized view, not the base table
      let query: any = supabase
        .from('work_schedule_grid_view')
        .select('*')
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

      // Type filter: labor vs subs
      // Labor schedules have worker_id, sub schedules have sub_id
      if (filters.type && filters.type !== 'all') {
        if (filters.type === 'labor') {
          query = query.not('worker_id', 'is', null);
        } else if (filters.type === 'sub') {
          query = query.not('sub_id', 'is', null);
        }
      }

      // Company filter can now be pushed down to DB because view exposes company_id
      if (filters.companyId && filters.companyId !== 'all') {
        query = query.eq('company_id', filters.companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const rows = data || [];

      // IMPORTANT:
      // Transform flat view rows into the nested shape that existing components expect:
      //   worker, project, trade, cost_code
      const transformed = rows.map((row: any) => {
        const worker =
          row.worker_id != null
            ? {
                id: row.worker_id,
                name: row.worker_name ?? null,
                // original API used workers.trade (string). We approximate using trade name.
                trade: row.worker_trade_name ?? null,
                // hourly_rate is not in the view; if you ever need it, we can add it to the view.
                hourly_rate: row.worker_hourly_rate ?? null,
              }
            : null;

        const project =
          row.project_id != null
            ? {
                id: row.project_id,
                project_name: row.project_name ?? null,
                // not surfaced in the view; kept for backwards-compat callers
                client_name: row.client_name ?? null,
                status: row.project_status ?? null,
                company_id: row.company_id ?? null,
              }
            : null;

        const trade =
          row.trade_id != null
            ? {
                id: row.trade_id,
                name: row.worker_trade_name ?? null,
              }
            : null;

        const cost_code =
          row.cost_code_id != null
            ? {
                id: row.cost_code_id,
                code: row.cost_code ?? null,
                name: row.cost_code_name ?? null,
                // category is not projected from the view; can be added later if needed
                category: row.cost_code_category ?? null,
              }
            : null;

        return {
          ...row,
          worker,
          project,
          trade,
          cost_code,
        };
      });

      return transformed;
    },
  });
}

/**
 * Get schedules for a specific date
 */
export function useSchedulesForDate(
  date: string,
  filters: Omit<ScheduleFilters, 'startDate' | 'endDate'> = {},
) {
  return useScheduleData(
    {
      ...filters,
      startDate: date,
      endDate: date,
    },
    !!date,
  );
}

/**
 * Get schedules for a date range
 */
export function useSchedulesForRange(
  startDate: string,
  endDate: string,
  filters: Omit<ScheduleFilters, 'startDate' | 'endDate'> = {},
) {
  return useScheduleData(
    {
      ...filters,
      startDate,
      endDate,
    },
    !!startDate && !!endDate,
  );
}
