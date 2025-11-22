import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkerDaySummary {
  day_card_id: string;
  worker_id: string;
  worker_name: string;
  worker_rate: number;
  worker_trade: string | null;
  date: string;
  scheduled_hours: number;
  logged_hours: number;
  pay_rate: number;
  lifecycle_status: string;
  pay_status: string;
  locked: boolean;
  company_id: string | null;
  company_name: string | null;
  total_cost: number;
  unpaid_amount: number;
  allocations: Array<{
    project_id: string;
    project_name: string;
    hours: number;
    trade: string | null;
    cost_code: string | null;
  }>;
}

/**
 * Fetch worker day summaries with allocations
 */
export function useWorkerDaySummary(startDate?: string, endDate?: string, workerId?: string) {
  return useQuery({
    queryKey: ['worker-day-summary', startDate, endDate, workerId],
    queryFn: async () => {
      let query = supabase
        .from('worker_day_summary')
        .select('*');

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }
      if (workerId) {
        query = query.eq('worker_id', workerId);
      }

      query = query.order('date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as WorkerDaySummary[];
    },
    enabled: !!startDate || !!endDate || !!workerId,
  });
}

/**
 * Fetch worker day summary for a specific date
 */
export function useWorkerDaySummaryByDate(workerId: string, date: string) {
  return useQuery({
    queryKey: ['worker-day-summary', workerId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_day_summary')
        .select('*')
        .eq('worker_id', workerId)
        .eq('date', date)
        .maybeSingle();

      if (error) throw error;
      return data as WorkerDaySummary | null;
    },
    enabled: !!workerId && !!date,
  });
}
