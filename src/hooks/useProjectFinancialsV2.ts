// src/hooks/useProjectFinancialsV2.ts
// V2 interface adapter and global financials hook
// Uses ONLY canonical tables: time_logs, costs, invoices, project_budgets

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectFinancialsV3 } from "./useProjectFinancials";

// Re-export V3 for compatibility
export { useProjectFinancialsV3 } from "./useProjectFinancials";

/**
 * V2 interface for category-based display components.
 * Pure JS adapter over V3 - NO database queries.
 */
export interface ProjectFinancialsV2Data {
  totalBudget: number;
  actualCost: number;
  variance: number;
  percentConsumed: number;
  unpaidLabor: number;
  laborActual: number;
  laborBudget: number;
  materialsActual: number;
  materialsBudget: number;
  subsActual: number;
  subsBudget: number;
  categories: {
    labor: CategoryData;
    subs: CategoryData;
    materials: CategoryData;
  };
}

interface CategoryData {
  budget: number;
  actual: number;
  variance: number;
  percentConsumed: number;
  entryCount: number;
}

export function useProjectFinancialsV2(projectId: string) {
  const v3Query = useProjectFinancialsV3(projectId);

  const transformedData: ProjectFinancialsV2Data | null = v3Query.data
    ? {
        totalBudget: v3Query.data.budget.total,
        actualCost: v3Query.data.actuals.total,
        variance: v3Query.data.variance,
        percentConsumed: v3Query.data.percentComplete,
        unpaidLabor: v3Query.data.unpaid.labor,
        laborActual: v3Query.data.actuals.labor,
        laborBudget: v3Query.data.budget.labor,
        materialsActual: v3Query.data.actuals.materials,
        materialsBudget: v3Query.data.budget.materials,
        subsActual: v3Query.data.actuals.subs,
        subsBudget: v3Query.data.budget.subs,
        categories: {
          labor: {
            budget: v3Query.data.budget.labor,
            actual: v3Query.data.actuals.labor,
            variance: v3Query.data.budget.labor - v3Query.data.actuals.labor,
            percentConsumed:
              v3Query.data.budget.labor > 0
                ? (v3Query.data.actuals.labor / v3Query.data.budget.labor) * 100
                : 0,
            entryCount: 0, // Would need separate query for count
          },
          subs: {
            budget: v3Query.data.budget.subs,
            actual: v3Query.data.actuals.subs,
            variance: v3Query.data.budget.subs - v3Query.data.actuals.subs,
            percentConsumed:
              v3Query.data.budget.subs > 0
                ? (v3Query.data.actuals.subs / v3Query.data.budget.subs) * 100
                : 0,
            entryCount: 0,
          },
          materials: {
            budget: v3Query.data.budget.materials,
            actual: v3Query.data.actuals.materials,
            variance: v3Query.data.budget.materials - v3Query.data.actuals.materials,
            percentConsumed:
              v3Query.data.budget.materials > 0
                ? (v3Query.data.actuals.materials / v3Query.data.budget.materials) * 100
                : 0,
            entryCount: 0,
          },
        },
      }
    : null;

  return {
    ...v3Query,
    data: transformedData,
  };
}

/**
 * Global financials - company-wide aggregations.
 * Uses ONLY canonical tables: time_logs, costs, invoices, estimates
 */
export interface GlobalFinancials {
  totalRevenue: number;
  totalProfit: number;
  totalOutstanding: number;
  retentionHeld: number;
  laborActual: number;
  laborUnpaid: number;
  subsActual: number;
  subsUnpaid: number;
  materialsActual: number;
  totalCosts: number;
}

export function useGlobalFinancials() {
  return useQuery({
    queryKey: ["global-financials"],
    queryFn: async (): Promise<GlobalFinancials> => {
      // 1) Revenue from accepted estimates
      const { data: estimates, error: estError } = await supabase
        .from("estimates")
        .select("total_amount")
        .eq("status", "accepted");

      if (estError) throw estError;

      const totalRevenue = (estimates || []).reduce(
        (sum, e: any) => sum + Number(e.total_amount || 0),
        0
      );

      // 2) Labor from time_logs
      const { data: timeLogs, error: timeError } = await supabase
        .from("time_logs")
        .select("hours_worked, labor_cost, hourly_rate, payment_status");

      if (timeError) throw timeError;

      let laborActual = 0;
      let laborUnpaid = 0;
      (timeLogs || []).forEach((log: any) => {
        const hours = Number(log.hours_worked || 0);
        const explicitCost = log.labor_cost != null ? Number(log.labor_cost) : null;
        const rate = Number(log.hourly_rate || 0);
        const cost = explicitCost != null ? explicitCost : hours * rate;
        laborActual += cost;
        if (log.payment_status !== "paid") {
          laborUnpaid += cost;
        }
      });

      // 3) Non-labor costs
      const { data: costs, error: costsError } = await supabase
        .from("costs")
        .select("category, amount, status");

      if (costsError) throw costsError;

      let subsActual = 0;
      let materialsActual = 0;
      let miscActual = 0;
      let subsUnpaid = 0;

      (costs || []).forEach((c: any) => {
        const amount = Number(c.amount || 0);
        const category = (c.category as string | undefined)?.toLowerCase();

        if (category === "subs") {
          subsActual += amount;
          if (c.status === "unpaid") subsUnpaid += amount;
        } else if (category === "materials") {
          materialsActual += amount;
        } else {
          miscActual += amount;
        }
      });

      // 4) Retention from invoices
      const { data: invoices, error: invError } = await supabase
        .from("invoices")
        .select("retention_amount")
        .neq("status", "void");

      if (invError) throw invError;

      const retentionHeld = (invoices || []).reduce(
        (sum, inv: any) => sum + Number(inv.retention_amount || 0),
        0
      );

      // 5) Rollups
      const totalCosts = laborActual + subsActual + materialsActual + miscActual;
      const totalProfit = totalRevenue - totalCosts;
      const totalOutstanding = laborUnpaid + subsUnpaid;

      return {
        totalRevenue,
        totalProfit,
        totalOutstanding,
        retentionHeld,
        laborActual,
        laborUnpaid,
        subsActual,
        subsUnpaid,
        materialsActual,
        totalCosts,
      };
    },
  });
}
