/**
 * useProjectStats - Calls the get_project_stats RPC for aggregated project metrics
 * 
 * This hook is the canonical source for project-level statistics.
 * It replaces manual aggregation of budgets, time logs, costs, tasks, and AR.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================================
// TYPES
// ============================================================

export type HealthStatus = 'critical' | 'warning' | 'healthy';

/**
 * Raw response from the get_project_stats RPC (snake_case)
 */
interface RawProjectStats {
  budget_total: number;
  actual_total: number;
  percent_used: number;
  variance: number;
  billed_total: number;
  ar_outstanding: number;
  unpaid_labor: number;
  today_crew_count: number;
  last_activity_date: string | null;
  days_inactive: number;
  open_tasks: number;
  overdue_tasks: number;
}

/**
 * Mapped camelCase stats with derived health info
 */
export interface ProjectStats {
  // Core financials
  budgetTotal: number;
  actualTotal: number;
  percentUsed: number;
  variance: number;
  
  // Billing / AR
  billedTotal: number;
  arOutstanding: number;
  unpaidLabor: number;
  
  // Crew
  todayCrewCount: number;
  
  // Activity
  lastActivityDate: string | null;
  daysInactive: number;
  
  // Tasks
  openTasks: number;
  overdueTasks: number;
  
  // Derived
  hasBudget: boolean;
  isOverBudget: boolean;
  
  // Health
  healthStatus: HealthStatus;
  healthReasons: string[];
}

// ============================================================
// HEALTH COMPUTATION
// ============================================================

interface HealthInput {
  budgetTotal: number;
  actualTotal: number;
  percentUsed: number;
  unpaidLabor: number;
  overdueTasks: number;
  daysInactive: number;
  arOutstanding: number;
}

/**
 * Computes health status and reasons based on project stats
 */
export function computeHealth(input: HealthInput): { healthStatus: HealthStatus; healthReasons: string[] } {
  const reasons: string[] = [];
  let hasCritical = false;
  
  // CRITICAL conditions
  if (input.percentUsed > 100) {
    reasons.push(`${Math.round(input.percentUsed)}% of budget used`);
    hasCritical = true;
  }
  if (input.overdueTasks >= 5) {
    reasons.push(`${input.overdueTasks} overdue tasks`);
    hasCritical = true;
  }
  if (input.daysInactive >= 14) {
    reasons.push(`No activity in ${input.daysInactive} days`);
    hasCritical = true;
  }
  if (input.unpaidLabor >= 10000) {
    reasons.push(`$${(input.unpaidLabor / 1000).toFixed(1)}K unpaid labor`);
    hasCritical = true;
  }
  
  if (hasCritical) {
    return { healthStatus: 'critical', healthReasons: reasons };
  }
  
  // WARNING conditions
  if (input.percentUsed >= 90 && input.percentUsed <= 100) {
    reasons.push(`${Math.round(input.percentUsed)}% of budget used`);
  }
  if (input.overdueTasks > 0 && input.overdueTasks < 5) {
    reasons.push(`${input.overdueTasks} overdue task${input.overdueTasks > 1 ? 's' : ''}`);
  }
  if (input.daysInactive >= 7 && input.daysInactive < 14) {
    reasons.push(`${input.daysInactive} days inactive`);
  }
  if (input.arOutstanding >= 20000) {
    reasons.push(`$${(input.arOutstanding / 1000).toFixed(1)}K outstanding AR`);
  }
  if (input.unpaidLabor >= 5000 && input.unpaidLabor < 10000) {
    reasons.push(`$${(input.unpaidLabor / 1000).toFixed(1)}K unpaid labor`);
  }
  
  if (reasons.length > 0) {
    return { healthStatus: 'warning', healthReasons: reasons };
  }
  
  return { healthStatus: 'healthy', healthReasons: ['On track'] };
}

// ============================================================
// MAPPER
// ============================================================

function mapRawToProjectStats(raw: RawProjectStats): ProjectStats {
  const budgetTotal = raw.budget_total ?? 0;
  const actualTotal = raw.actual_total ?? 0;
  const percentUsed = raw.percent_used ?? 0;
  const hasBudget = budgetTotal > 0;
  const isOverBudget = actualTotal > budgetTotal && hasBudget;
  
  // Compute health
  const { healthStatus, healthReasons } = computeHealth({
    budgetTotal,
    actualTotal,
    percentUsed,
    unpaidLabor: raw.unpaid_labor ?? 0,
    overdueTasks: raw.overdue_tasks ?? 0,
    daysInactive: raw.days_inactive ?? 0,
    arOutstanding: raw.ar_outstanding ?? 0,
  });
  
  return {
    // Core financials
    budgetTotal,
    actualTotal,
    percentUsed,
    variance: raw.variance ?? 0,
    
    // Billing / AR
    billedTotal: raw.billed_total ?? 0,
    arOutstanding: raw.ar_outstanding ?? 0,
    unpaidLabor: raw.unpaid_labor ?? 0,
    
    // Crew
    todayCrewCount: raw.today_crew_count ?? 0,
    
    // Activity
    lastActivityDate: raw.last_activity_date,
    daysInactive: raw.days_inactive ?? 0,
    
    // Tasks
    openTasks: raw.open_tasks ?? 0,
    overdueTasks: raw.overdue_tasks ?? 0,
    
    // Derived
    hasBudget,
    isOverBudget,
    
    // Health
    healthStatus,
    healthReasons,
  };
}

// ============================================================
// HOOK
// ============================================================

/**
 * Fetches aggregated project statistics from the get_project_stats RPC
 */
export function useProjectStats(projectId: string) {
  return useQuery<ProjectStats>({
    queryKey: ['project-stats-rpc', projectId],
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_project_stats', {
        p_project_id: projectId,
      });
      
      if (error) throw error;
      
      // The RPC returns a single JSONB object (or null)
      const raw: RawProjectStats = data ?? {
        budget_total: 0,
        actual_total: 0,
        percent_used: 0,
        variance: 0,
        billed_total: 0,
        ar_outstanding: 0,
        unpaid_labor: 0,
        today_crew_count: 0,
        last_activity_date: null,
        days_inactive: 0,
        open_tasks: 0,
        overdue_tasks: 0,
      };
      
      return mapRawToProjectStats(raw);
    },
  });
}
