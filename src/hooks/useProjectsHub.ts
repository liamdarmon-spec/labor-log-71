/**
 * useProjectsHub - Enhanced project data for the Projects Hub page
 * 
 * Provides:
 * - Portfolio-level summary metrics
 * - Per-project health status indicators
 * - Budget progress tracking
 * - Today's crew counts
 * - Overdue task counts
 * 
 * Uses batch queries for efficiency (unlike per-project RPC).
 * Reuses computeHealth from useProjectStats for consistent health logic.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { computeHealth, HealthStatus } from './useProjectStats';

export type { HealthStatus } from './useProjectStats';

export interface EnhancedProject {
  id: string;
  project_name: string;
  client_name: string;
  address: string | null;
  project_manager: string | null;
  status: string;
  created_at: string;
  company_id: string | null;
  company_name: string | null;
}

export interface ProjectHealthStats {
  // Budget
  budgetTotal: number;
  actualTotal: number;
  percentUsed: number;
  variance: number;
  
  // Financial
  unpaidLabor: number;
  arOutstanding: number;
  
  // Activity
  todayCrewCount: number;
  lastActivityDate: string | null;
  daysInactive: number;
  totalHours: number;
  
  // Tasks
  openTaskCount: number;
  overdueTaskCount: number;
  
  // Computed health
  healthStatus: HealthStatus;
  healthReasons: string[];
}

export interface PortfolioSummary {
  activeProjectCount: number;
  totalBudget: number;
  totalSpent: number;
  totalUnpaidLabor: number;
  totalArOutstanding: number;
  projectsOverBudget: number;
  totalOverduesTasks: number;
  todayTotalCrew: number;
}

export interface TodayActivity {
  projectId: string;
  projectName: string;
  crewCount: number;
  scheduledHours: number;
}

/**
 * Main hook for Projects Hub page
 * Uses batch queries for efficiency, reuses computeHealth for consistency
 */
export function useProjectsHub() {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['projects-hub', today],
    queryFn: async () => {
      // Fetch all data in parallel for performance
      const [
        projectsRes,
        budgetsRes,
        timeLogsRes,
        costsRes,
        tasksRes,
        schedulesRes,
        invoicesRes,
        paymentsRes,
      ] = await Promise.all([
        // Projects with company
        supabase
          .from('projects')
          .select('id, project_name, client_name, address, project_manager, status, created_at, company_id, companies(name)')
          .order('created_at', { ascending: false }),
        
        // Budgets
        supabase
          .from('project_budgets')
          .select('project_id, labor_budget, subs_budget, materials_budget, other_budget'),
        
        // Time logs (for labor actuals + last activity)
        supabase
          .from('time_logs')
          .select('project_id, hours_worked, labor_cost, payment_status, date'),
        
        // Costs (for non-labor actuals)
        supabase
          .from('costs')
          .select('project_id, amount, category'),
        
        // Tasks (for overdue counts)
        supabase
          .from('project_todos')
          .select('project_id, status, due_date'),
        
        // Today's schedules
        supabase
          .from('work_schedules')
          .select('project_id, worker_id, scheduled_hours')
          .eq('scheduled_date', today),
        
        // Invoices (for AR)
        supabase
          .from('invoices')
          .select('project_id, total_amount, status')
          .neq('status', 'void'),
        
        // Customer payments
        supabase
          .from('customer_payments')
          .select('project_id, amount'),
      ]);

      if (projectsRes.error) throw projectsRes.error;

      const projects = projectsRes.data || [];
      const budgets = budgetsRes.data || [];
      const timeLogs = timeLogsRes.data || [];
      const costs = costsRes.data || [];
      const tasks = tasksRes.data || [];
      const schedules = schedulesRes.data || [];
      const invoices = invoicesRes.data || [];
      const payments = paymentsRes.data || [];

      // Build lookup maps for efficient per-project aggregation
      const budgetMap = new Map(budgets.map(b => [b.project_id, b]));
      
      // Process each project
      const projectStats: Record<string, ProjectHealthStats> = {};
      const enhancedProjects: EnhancedProject[] = [];
      
      // Portfolio summary accumulators
      let portfolioTotalBudget = 0;
      let portfolioTotalSpent = 0;
      let portfolioUnpaidLabor = 0;
      let portfolioArOutstanding = 0;
      let portfolioOverBudget = 0;
      let portfolioOverdueTasks = 0;
      let portfolioTodayCrew = 0;
      let activeCount = 0;

      for (const project of projects) {
        const projectId = project.id;
        const isActiveOrOnHold = project.status.toLowerCase() === 'active' || project.status.toLowerCase() === 'on hold';
        
        // Enhanced project data
        enhancedProjects.push({
          id: project.id,
          project_name: project.project_name,
          client_name: project.client_name,
          address: project.address,
          project_manager: project.project_manager,
          status: project.status,
          created_at: project.created_at,
          company_id: project.company_id,
          company_name: (project.companies as any)?.name || null,
        });

        // Budget
        const budget = budgetMap.get(projectId);
        const budgetTotal = budget
          ? (budget.labor_budget || 0) + (budget.subs_budget || 0) + (budget.materials_budget || 0) + (budget.other_budget || 0)
          : 0;

        // Time logs for this project
        const projectLogs = timeLogs.filter(l => l.project_id === projectId);
        const laborActual = projectLogs.reduce((sum, l) => sum + (l.labor_cost || 0), 0);
        const unpaidLabor = projectLogs
          .filter(l => l.payment_status !== 'paid')
          .reduce((sum, l) => sum + (l.labor_cost || 0), 0);
        const totalHours = projectLogs.reduce((sum, l) => sum + (l.hours_worked || 0), 0);
        
        // Last activity date
        const sortedLogs = [...projectLogs].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const lastActivityDate = sortedLogs[0]?.date || null;
        const daysInactive = lastActivityDate 
          ? differenceInDays(new Date(), new Date(lastActivityDate))
          : 999;

        // Non-labor costs
        const projectCosts = costs.filter(c => c.project_id === projectId);
        const nonLaborActual = projectCosts.reduce((sum, c) => sum + (c.amount || 0), 0);

        // Total actual
        const actualTotal = laborActual + nonLaborActual;
        const percentUsed = budgetTotal > 0 ? (actualTotal / budgetTotal) * 100 : 0;
        const variance = budgetTotal - actualTotal;

        // Tasks
        const projectTasks = tasks.filter(t => t.project_id === projectId);
        const openTaskCount = projectTasks.filter(t => t.status === 'open' || t.status === 'in_progress').length;
        const overdueTaskCount = projectTasks.filter(t => {
          if (t.status === 'done') return false;
          if (!t.due_date) return false;
          return t.due_date < today;
        }).length;

        // Today's crew
        const todaySchedules = schedules.filter(s => s.project_id === projectId);
        const todayCrewCount = new Set(todaySchedules.map(s => s.worker_id)).size;

        // AR outstanding
        const projectInvoices = invoices.filter(i => i.project_id === projectId);
        const totalBilled = projectInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
        const projectPayments = payments.filter(p => p.project_id === projectId);
        const totalPaid = projectPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const arOutstanding = Math.max(0, totalBilled - totalPaid);

        // Calculate health status using shared computeHealth function
        // Only compute health for active/on-hold projects
        let healthStatus: HealthStatus = 'healthy';
        let healthReasons: string[] = [];
        
        if (isActiveOrOnHold) {
          const healthResult = computeHealth({
            budgetTotal,
            actualTotal,
            percentUsed,
            unpaidLabor,
            overdueTasks: overdueTaskCount,
            daysInactive,
            arOutstanding,
          });
          healthStatus = healthResult.healthStatus;
          healthReasons = healthResult.healthReasons;
        }

        projectStats[projectId] = {
          budgetTotal,
          actualTotal,
          percentUsed,
          variance,
          unpaidLabor,
          arOutstanding,
          todayCrewCount,
          lastActivityDate,
          daysInactive,
          totalHours,
          openTaskCount,
          overdueTaskCount,
          healthStatus,
          healthReasons,
        };

        // Aggregate portfolio stats (only for active projects)
        if (project.status.toLowerCase() === 'active') {
          activeCount++;
          portfolioTotalBudget += budgetTotal;
          portfolioTotalSpent += actualTotal;
          portfolioUnpaidLabor += unpaidLabor;
          portfolioArOutstanding += arOutstanding;
          portfolioTodayCrew += todayCrewCount;
          portfolioOverdueTasks += overdueTaskCount;
          if (percentUsed > 100) portfolioOverBudget++;
        }
      }

      // Today's activity breakdown
      const todayActivity: TodayActivity[] = [];
      const projectScheduleMap = new Map<string, { count: number; hours: number }>();
      
      for (const schedule of schedules) {
        const current = projectScheduleMap.get(schedule.project_id) || { count: 0, hours: 0 };
        current.count++;
        current.hours += schedule.scheduled_hours || 0;
        projectScheduleMap.set(schedule.project_id, current);
      }
      
      for (const [projectId, data] of projectScheduleMap) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
          todayActivity.push({
            projectId,
            projectName: project.project_name,
            crewCount: data.count,
            scheduledHours: data.hours,
          });
        }
      }
      
      // Sort by crew count descending
      todayActivity.sort((a, b) => b.crewCount - a.crewCount);

      const portfolioSummary: PortfolioSummary = {
        activeProjectCount: activeCount,
        totalBudget: portfolioTotalBudget,
        totalSpent: portfolioTotalSpent,
        totalUnpaidLabor: portfolioUnpaidLabor,
        totalArOutstanding: portfolioArOutstanding,
        projectsOverBudget: portfolioOverBudget,
        totalOverduesTasks: portfolioOverdueTasks,
        todayTotalCrew: portfolioTodayCrew,
      };

      return {
        projects: enhancedProjects,
        stats: projectStats,
        portfolio: portfolioSummary,
        todayActivity,
      };
    },
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
