// src/hooks/useProjectFinancials.ts
// Canonical project financials hook - single source of truth
// Uses ONLY: project_budgets, time_logs, costs, invoices, customer_payments

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectFinancialsV3 {
  budget: {
    labor: number;
    subs: number;
    materials: number;
    other: number;
    total: number;
  };
  actuals: {
    labor: number;
    subs: number;
    materials: number;
    misc: number;
    total: number;
  };
  unpaid: {
    labor: number;
    subs: number;
    materials: number;
  };
  invoicing: {
    billed: number;
    retentionHeld: number;
    paid: number;
  };
  variance: number;
  margin: number;
  percentComplete: number;
}

/**
 * Canonical project-level financials.
 * One source of truth:
 *   - Budgets: project_budgets
 *   - Labor actuals: time_logs
 *   - Subs / Materials / Misc actuals: costs
 *   - Billing: invoices
 *   - Customer payments: customer_payments
 */
export function useProjectFinancialsV3(projectId: string) {
  return useQuery({
    queryKey: ["project-financials-v3", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectFinancialsV3> => {
      if (!projectId) {
        return getEmptyFinancials();
      }

      // 1) Budget
      const { data: budgetRow, error: budgetError } = await supabase
        .from("project_budgets")
        .select("labor_budget, subs_budget, materials_budget, other_budget")
        .eq("project_id", projectId)
        .maybeSingle();

      if (budgetError) throw budgetError;

      const laborBudget = Number(budgetRow?.labor_budget || 0);
      const subsBudget = Number(budgetRow?.subs_budget || 0);
      const materialsBudget = Number(budgetRow?.materials_budget || 0);
      const otherBudget = Number(budgetRow?.other_budget || 0);
      const totalBudget = laborBudget + subsBudget + materialsBudget + otherBudget;

      // 2) Labor actuals from time_logs
      const { data: timeLogs, error: timeError } = await supabase
        .from("time_logs")
        .select("id, project_id, hours_worked, labor_cost, hourly_rate, payment_status")
        .eq("project_id", projectId);

      if (timeError) throw timeError;

      let laborActual = 0;
      let laborUnpaid = 0;
      (timeLogs || []).forEach((log: any) => {
        const hours = Number(log.hours_worked || 0);
        const explicitCost = log.labor_cost != null ? Number(log.labor_cost) : null;
        const rate = Number(log.hourly_rate || 0);
        const cost = explicitCost != null ? explicitCost : hours * rate;
        laborActual += cost;
        if (log.payment_status !== 'paid') {
          laborUnpaid += cost;
        }
      });

      // 3) Non-labor costs (subs/materials/misc) from costs table
      const { data: costs, error: costsError } = await supabase
        .from("costs")
        .select("category, amount, status")
        .eq("project_id", projectId);

      if (costsError) throw costsError;

      let subsActual = 0;
      let materialsActual = 0;
      let miscActual = 0;
      let subsUnpaid = 0;
      let materialsUnpaid = 0;

      (costs || []).forEach((c: any) => {
        const amount = Number(c.amount || 0);
        const category = (c.category as string | undefined)?.toLowerCase();

        if (category === "subs") {
          subsActual += amount;
          if (c.status === "unpaid") subsUnpaid += amount;
        } else if (category === "materials") {
          materialsActual += amount;
          if (c.status === "unpaid") materialsUnpaid += amount;
        } else if (category === "misc" || category === "equipment" || category === "other") {
          miscActual += amount;
        }
      });

      // 4) Revenue / invoices
      const { data: invoices, error: invError } = await supabase
        .from("invoices")
        .select("total_amount, status, retention_amount")
        .eq("project_id", projectId)
        .neq("status", "void");

      if (invError) throw invError;

      const billed = (invoices || []).reduce(
        (sum, inv: any) => sum + Number(inv.total_amount || 0),
        0
      );
      const retentionHeld = (invoices || []).reduce(
        (sum, inv: any) => sum + Number(inv.retention_amount || 0),
        0
      );

      // 5) Customer payments
      const { data: customerPayments, error: cpError } = await supabase
        .from("customer_payments")
        .select("amount")
        .eq("project_id", projectId);

      if (cpError) throw cpError;

      const paid = (customerPayments || []).reduce(
        (sum, p: any) => sum + Number(p.amount || 0),
        0
      );

      // 6) Rollups
      const totalActual = laborActual + subsActual + materialsActual + miscActual;
      const variance = totalBudget - totalActual;
      const margin = billed - totalActual;
      const percentComplete = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

      return {
        budget: {
          labor: laborBudget,
          subs: subsBudget,
          materials: materialsBudget,
          other: otherBudget,
          total: totalBudget,
        },
        actuals: {
          labor: laborActual,
          subs: subsActual,
          materials: materialsActual,
          misc: miscActual,
          total: totalActual,
        },
        unpaid: {
          labor: laborUnpaid,
          subs: subsUnpaid,
          materials: materialsUnpaid,
        },
        invoicing: {
          billed,
          retentionHeld,
          paid,
        },
        variance,
        margin,
        percentComplete,
      };
    },
  });
}

function getEmptyFinancials(): ProjectFinancialsV3 {
  return {
    budget: { labor: 0, subs: 0, materials: 0, other: 0, total: 0 },
    actuals: { labor: 0, subs: 0, materials: 0, misc: 0, total: 0 },
    unpaid: { labor: 0, subs: 0, materials: 0 },
    invoicing: { billed: 0, retentionHeld: 0, paid: 0 },
    variance: 0,
    margin: 0,
    percentComplete: 0,
  };
}

// ============================================================
// BACKWARDS-COMPATIBLE ALIASES - Pure JS transforms over V3
// ============================================================

/**
 * Legacy flat interface adapter - transforms V3 nested data to flat structure
 * NO database queries - just transforms data from useProjectFinancialsV3
 */
export interface ProjectFinancialsSnapshot {
  baseline_budget: number;
  revised_budget: number;
  actual_cost_total: number;
  actual_cost_labor: number;
  actual_cost_subs: number;
  actual_cost_materials: number;
  actual_cost_other: number;
  profit_amount: number;
  profit_percent: number;
  billed_to_date: number;
  open_ar: number;
  retention_held: number;
  open_ap_labor: number;
  open_ap_subs: number;
}

export function useProjectFinancialsSnapshot(projectId: string) {
  const v3Query = useProjectFinancialsV3(projectId);

  // Transform V3 nested structure to flat legacy format
  const transformedData: ProjectFinancialsSnapshot | null = v3Query.data
    ? {
        baseline_budget: v3Query.data.budget.total,
        revised_budget: v3Query.data.budget.total,
        actual_cost_total: v3Query.data.actuals.total,
        actual_cost_labor: v3Query.data.actuals.labor,
        actual_cost_subs: v3Query.data.actuals.subs,
        actual_cost_materials: v3Query.data.actuals.materials,
        actual_cost_other: v3Query.data.actuals.misc,
        profit_amount: v3Query.data.margin,
        profit_percent:
          v3Query.data.invoicing.billed > 0
            ? (v3Query.data.margin / v3Query.data.invoicing.billed) * 100
            : 0,
        billed_to_date: v3Query.data.invoicing.billed,
        open_ar: v3Query.data.invoicing.billed - v3Query.data.invoicing.paid,
        retention_held: v3Query.data.invoicing.retentionHeld,
        open_ap_labor: v3Query.data.unpaid.labor,
        open_ap_subs: v3Query.data.unpaid.subs,
      }
    : null;

  return {
    ...v3Query,
    data: transformedData,
  };
}

// Simple alias
export function useProjectFinancials(projectId: string) {
  return useProjectFinancialsV3(projectId);
}

/**
 * Recalculate is now a no-op since V3 always queries live data.
 * Kept for API compatibility - just invalidates the query cache.
 */
export function useRecalculateProjectFinancials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      // No-op - V3 always returns live data
      return { projectId };
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ["project-financials-v3", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-financials-snapshot", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-budget-ledger", projectId] });
    },
  });
}

// ============================================================
// CUSTOMER PAYMENTS - Canonical table queries
// ============================================================

export function useCustomerPayments(projectId: string) {
  return useQuery({
    queryKey: ["customer-payments", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_payments")
        .select("*")
        .eq("project_id", projectId)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateCustomerPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: {
      project_id: string;
      amount: number;
      payment_method: string;
      reference_number?: string;
      notes?: string;
      payment_date: string;
      applied_to_retention?: number;
    }) => {
      const { data, error } = await supabase
        .from("customer_payments")
        .insert(payment)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error('Failed to create customer payment');
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customer-payments", variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ["project-financials-v3", variables.project_id] });
    },
  });
}
