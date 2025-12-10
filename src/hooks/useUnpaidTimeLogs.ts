// src/hooks/useUnpaidTimeLogs.ts
//
// Canonical unpaid time logs hook for payroll flows.
//
// Reads from: time_logs_with_meta_view
// Used by: Pay Runs wizard, Pay Center, future payroll tools.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safeArray, safeNumber } from '@/lib/utils/safeData';

export interface UnpaidTimeLogFilters {
  startDate?: string;      // 'yyyy-MM-dd'
  endDate?: string;        // 'yyyy-MM-dd'
  companyId?: string;      // projects.company_id
  workerId?: string;
  projectId?: string;
  paymentStatus?: 'unpaid' | 'paid' | 'all';
}

export interface UnpaidTimeLog {
  id: string;
  worker_id: string | null;
  worker_name: string | null;
  worker_trade_id: string | null;
  worker_trade_name: string | null;

  project_id: string | null;
  project_name: string | null;
  company_id: string | null;
  company_name: string | null;
  override_company_id: string | null;

  trade_id: string | null;
  cost_code_id: string | null;
  cost_code: string | null;
  cost_code_name: string | null;

  date: string;
  hours_worked: number;
  hourly_rate: number | null;
  labor_cost: number | null;
  payment_status: 'unpaid' | 'paid' | null;
  paid_amount: number | null;

  source_schedule_id: string | null;
  notes: string | null;
  last_synced_at: string | null;
  created_at: string;
}

export interface UnpaidTimeLogSummary {
  totalLogs: number;
  totalHours: number;
  totalAmount: number;
  workersCount: number;
}

export interface UseUnpaidTimeLogsResult {
  logs: UnpaidTimeLog[];
  summary: UnpaidTimeLogSummary;
}

/**
 * Canonical unpaid-time-log hook for payroll.
 *
 * NOTE:
 * - Default paymentStatus = 'unpaid'
 * - Date filters are optional (but recommended in UI)
 * - Applies company / worker / project filters at DB level when possible
 * - Excludes time logs already in non-cancelled pay runs (prevents duplicates)
 */
export function useUnpaidTimeLogs(
  filters: UnpaidTimeLogFilters = {},
  enabled: boolean = true
) {
  const {
    startDate,
    endDate,
    companyId,
    workerId,
    projectId,
    paymentStatus = 'unpaid',
  } = filters;

  return useQuery<UseUnpaidTimeLogsResult>({
    queryKey: ['unpaid-time-logs', { startDate, endDate, companyId, workerId, projectId, paymentStatus }],
    enabled,
    queryFn: async () => {
      // For payroll, we need ALL matching records - fetch in batches to avoid hitting limits
      const PAGE_SIZE = 1000;
      let allLogs: UnpaidTimeLog[] = [];
      let page = 0;
      let hasMore = true;

      // Get IDs of time logs already in non-cancelled pay runs (prevents duplicate pay runs)
      let excludedIds: string[] = [];
      if (paymentStatus === 'unpaid') {
        const { data: existingItems, error: itemsError } = await supabase
          .from('labor_pay_run_items')
          .select('time_log_id, labor_pay_runs!inner(status)')
          .neq('labor_pay_runs.status', 'cancelled');

        if (itemsError) throw itemsError;
        excludedIds = safeArray(existingItems).map((item: any) => item.time_log_id).filter(Boolean);
      }

      // Fetch all pages
      while (hasMore) {
        let query = supabase
          .from('time_logs_with_meta_view')
          .select(
            `
            id,
            worker_id,
            worker_name,
            worker_trade_id,
            worker_trade_name,
            project_id,
            project_name,
            company_id,
            company_name,
            override_company_id,
            trade_id,
            cost_code_id,
            cost_code,
            cost_code_name,
            date,
            hours_worked,
            hourly_rate,
            labor_cost,
            payment_status,
            paid_amount,
            source_schedule_id,
            notes,
            last_synced_at,
            created_at
          `
          )
          .order('date', { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        // Date range
        if (startDate) {
          query = query.gte('date', startDate);
        }
        if (endDate) {
          query = query.lte('date', endDate);
        }

        // Payment status filter (default = unpaid)
        if (paymentStatus !== 'all') {
          query = query.eq('payment_status', paymentStatus);
        }

        // Company filter (from view column)
        if (companyId) {
          query = query.eq('company_id', companyId);
        }

        // Worker filter
        if (workerId) {
          query = query.eq('worker_id', workerId);
        }

        // Project filter
        if (projectId) {
          query = query.eq('project_id', projectId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const pageData = safeArray(data) as UnpaidTimeLog[];
        
        // Filter out excluded IDs (logs already in pay runs)
        const filteredData = excludedIds.length > 0
          ? pageData.filter(log => !excludedIds.includes(log.id))
          : pageData;

        allLogs = [...allLogs, ...filteredData];

        // Check if there are more pages
        hasMore = pageData.length === PAGE_SIZE;
        page++;

        // Safety limit to prevent infinite loops (max 50 pages = 50,000 records)
        if (page >= 50) {
          console.warn('useUnpaidTimeLogs: Hit safety limit of 50,000 records');
          hasMore = false;
        }
      }

      // Compute totals in one pass
      let totalHours = 0;
      let totalAmount = 0;
      const workerSet = new Set<string>();

      allLogs.forEach((log) => {
        const hours = safeNumber(log.hours_worked);
        const explicitCost = log.labor_cost != null ? safeNumber(log.labor_cost) : null;
        const rate = safeNumber(log.hourly_rate);
        const cost = explicitCost != null ? explicitCost : hours * rate;

        totalHours += hours;
        totalAmount += cost;

        if (log.worker_id) {
          workerSet.add(log.worker_id);
        }
      });

      const summary: UnpaidTimeLogSummary = {
        totalLogs: allLogs.length,
        totalHours,
        totalAmount,
        workersCount: workerSet.size,
      };

      return { logs: allLogs, summary };
    },
  });
}
