// src/hooks/useUnpaidTimeLogs.ts
//
// Canonical unpaid time logs hook for payroll flows.
//
// Reads from: time_logs_with_meta_view
// Used by: Pay Runs wizard, Pay Center, future payroll tools.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
        .limit(1000);

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

      // Exclude time logs already assigned to any pay run
      query = query.not('id', 'in', `(
        SELECT time_log_id FROM labor_pay_run_items
      )`);

      const { data, error } = await query;
      if (error) throw error;

      const logs = (data || []) as UnpaidTimeLog[];

      // Compute totals in one pass
      let totalHours = 0;
      let totalAmount = 0;
      const workerSet = new Set<string>();

      logs.forEach((log) => {
        const hours = Number(log.hours_worked || 0);
        const explicitCost =
          log.labor_cost != null ? Number(log.labor_cost) : null;
        const rate = log.hourly_rate != null ? Number(log.hourly_rate) : 0;
        const cost = explicitCost != null ? explicitCost : hours * rate;

        totalHours += hours;
        totalAmount += cost;

        if (log.worker_id) {
          workerSet.add(log.worker_id);
        }
      });

      const summary: UnpaidTimeLogSummary = {
        totalLogs: logs.length,
        totalHours,
        totalAmount,
        workersCount: workerSet.size,
      };

      return { logs, summary };
    },
  });
}
