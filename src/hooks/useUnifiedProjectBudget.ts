import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BudgetCategory = 'labor' | 'subs' | 'materials' | 'other';

export interface ActualEntry {
  id: string;
  type: BudgetCategory;
  date: string;
  description: string;
  amount: number;
  hours?: number;
  worker_name?: string;
  vendor_name?: string;
}

export interface CostCodeBudgetLine {
  cost_code_id: string | null;
  code: string;
  description: string;
  category: BudgetCategory;
  budget_amount: number;
  budget_hours: number | null;
  actual_amount: number;
  actual_hours: number | null;
  variance: number;
  is_allowance: boolean;
  details: ActualEntry[];
}

export interface BudgetSummary {
  total_budget: number;
  total_actual: number;
  total_variance: number;
  labor_budget: number;
  labor_actual: number;
  labor_variance: number;
  labor_unpaid: number;
  subs_budget: number;
  subs_actual: number;
  subs_variance: number;
  materials_budget: number;
  materials_actual: number;
  materials_variance: number;
  other_budget: number;
  other_actual: number;
  other_variance: number;
}

export function useUnifiedProjectBudget(projectId: string) {
  return useQuery({
    queryKey: ['unified_project_budget', projectId],
    queryFn: async () => {
      // 1. Fetch all budget lines
      const { data: budgetLines, error: budgetError } = await supabase
        .from('project_budget_lines')
        .select(`
          *,
          cost_codes (code, name)
        `)
        .eq('project_id', projectId)
        .order('category')
        .order('cost_code_id');

      if (budgetError) throw budgetError;

      // 2. Fetch labor actuals (daily_logs)
      const { data: laborLogs, error: laborError } = await supabase
        .from('daily_logs')
        .select(`
          id,
          date,
          hours_worked,
          notes,
          cost_code_id,
          payment_status,
          workers (name, hourly_rate)
        `)
        .eq('project_id', projectId)
        .order('date', { ascending: false });

      if (laborError) throw laborError;

      // 3. Fetch sub actuals (sub_logs)
      const { data: subLogs, error: subError } = await supabase
        .from('sub_logs')
        .select(`
          id,
          date,
          amount,
          description,
          cost_code_id,
          subs (name)
        `)
        .eq('project_id', projectId)
        .order('date', { ascending: false });

      if (subError) throw subError;

      // 4. Build cost code ledger with actuals
      const costCodeMap = new Map<string, CostCodeBudgetLine>();

      // Initialize from budget lines
      budgetLines?.forEach(line => {
        const key = line.cost_code_id || 'unassigned';
        if (!costCodeMap.has(key)) {
          costCodeMap.set(key, {
            cost_code_id: line.cost_code_id,
            code: line.cost_codes?.code || 'N/A',
            description: line.cost_codes?.name || line.description || 'Unassigned',
            category: line.category as BudgetCategory,
            budget_amount: 0,
            budget_hours: null,
            actual_amount: 0,
            actual_hours: null,
            variance: 0,
            is_allowance: line.is_allowance || false,
            details: [],
          });
        }
        const entry = costCodeMap.get(key)!;
        entry.budget_amount += line.budget_amount;
        if (line.budget_hours) {
          entry.budget_hours = (entry.budget_hours || 0) + line.budget_hours;
        }
      });

      // Add labor actuals
      laborLogs?.forEach((log: any) => {
        const key = log.cost_code_id || 'unassigned';
        if (!costCodeMap.has(key)) {
          costCodeMap.set(key, {
            cost_code_id: log.cost_code_id,
            code: 'N/A',
            description: 'Unassigned Labor',
            category: 'labor',
            budget_amount: 0,
            budget_hours: null,
            actual_amount: 0,
            actual_hours: null,
            variance: 0,
            is_allowance: false,
            details: [],
          });
        }
        const entry = costCodeMap.get(key)!;
        const amount = log.hours_worked * (log.workers?.hourly_rate || 0);
        entry.actual_amount += amount;
        entry.actual_hours = (entry.actual_hours || 0) + log.hours_worked;
        entry.details.push({
          id: log.id,
          type: 'labor',
          date: log.date,
          description: log.notes || `${log.workers?.name || 'Worker'} - ${log.hours_worked}h`,
          amount,
          hours: log.hours_worked,
          worker_name: log.workers?.name,
        });
      });

      // Add sub actuals
      subLogs?.forEach((log: any) => {
        const key = log.cost_code_id || 'unassigned';
        if (!costCodeMap.has(key)) {
          costCodeMap.set(key, {
            cost_code_id: log.cost_code_id,
            code: 'N/A',
            description: 'Unassigned Subs',
            category: 'subs',
            budget_amount: 0,
            budget_hours: null,
            actual_amount: 0,
            actual_hours: null,
            variance: 0,
            is_allowance: false,
            details: [],
          });
        }
        const entry = costCodeMap.get(key)!;
        entry.actual_amount += log.amount;
        entry.details.push({
          id: log.id,
          type: 'subs',
          date: log.date,
          description: log.description || `${log.subs?.name || 'Subcontractor'}`,
          amount: log.amount,
          vendor_name: log.subs?.name,
        });
      });

      // Calculate variance for each line
      const costCodeLines = Array.from(costCodeMap.values()).map(line => ({
        ...line,
        variance: line.budget_amount - line.actual_amount,
      }));

      // 5. Calculate summary totals including unpaid labor
      const unpaidLaborAmount = (laborLogs || []).reduce((sum: number, log: any) => {
        if (log.payment_status === 'unpaid') {
          return sum + (log.hours_worked * (log.workers?.hourly_rate || 0));
        }
        return sum;
      }, 0);

      const summary: BudgetSummary = {
        total_budget: 0,
        total_actual: 0,
        total_variance: 0,
        labor_budget: 0,
        labor_actual: 0,
        labor_variance: 0,
        labor_unpaid: unpaidLaborAmount,
        subs_budget: 0,
        subs_actual: 0,
        subs_variance: 0,
        materials_budget: 0,
        materials_actual: 0,
        materials_variance: 0,
        other_budget: 0,
        other_actual: 0,
        other_variance: 0,
      };

      costCodeLines.forEach(line => {
        summary.total_budget += line.budget_amount;
        summary.total_actual += line.actual_amount;

        switch (line.category) {
          case 'labor':
            summary.labor_budget += line.budget_amount;
            summary.labor_actual += line.actual_amount;
            break;
          case 'subs':
            summary.subs_budget += line.budget_amount;
            summary.subs_actual += line.actual_amount;
            break;
          case 'materials':
            summary.materials_budget += line.budget_amount;
            summary.materials_actual += line.actual_amount;
            break;
          case 'other':
            summary.other_budget += line.budget_amount;
            summary.other_actual += line.actual_amount;
            break;
        }
      });

      summary.total_variance = summary.total_budget - summary.total_actual;
      summary.labor_variance = summary.labor_budget - summary.labor_actual;
      summary.subs_variance = summary.subs_budget - summary.subs_actual;
      summary.materials_variance = summary.materials_budget - summary.materials_actual;
      summary.other_variance = summary.other_budget - summary.other_actual;

      return {
        costCodeLines,
        summary,
      };
    },
  });
}
