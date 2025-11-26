import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProjectFinancialsV3 {
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
    subs: number;
    materials: number;
  };
  invoicing: {
    billed: number;
    retentionHeld: number;
  };
  variance: number;
  margin: number;
  percentComplete: number;
}

/**
 * Project-level financials that match the job-costing view.
 * Uses canonical labor (time_logs) and the costs + invoices tables.
 */
export function useProjectFinancialsV3(projectId: string) {
  return useQuery({
    queryKey: ["project-financials-v3", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectFinancialsV3> => {
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
      const totalBudget =
        laborBudget + subsBudget + materialsBudget + otherBudget;

      // 2) Labor actuals from time_logs
      const { data: timeLogs, error: timeError } = await supabase
        .from("time_logs")
        .select(
          "id, project_id, hours_worked, labor_cost, hourly_rate, payment_status"
        )
        .eq("project_id", projectId);

      if (timeError) throw timeError;

      let laborActual = 0;
      (timeLogs || []).forEach((log: any) => {
        const hours = Number(log.hours_worked || 0);
        const explicitCost =
          log.labor_cost != null ? Number(log.labor_cost) : null;
        const rate = Number(log.hourly_rate || 0);
        const cost = explicitCost != null ? explicitCost : hours * rate;
        laborActual += cost;
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
        } else if (category === "misc") {
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

      // 5) Rollups
      const totalActual = laborActual + subsActual + materialsActual + miscActual;
      const variance = totalBudget - totalActual;
      const margin = billed - totalActual;
      const percentComplete =
        totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

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
          subs: subsUnpaid,
          materials: materialsUnpaid,
        },
        invoicing: {
          billed,
          retentionHeld,
        },
        variance,
        margin,
        percentComplete,
      };
    },
  });
}
