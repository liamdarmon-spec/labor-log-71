/**
 * useProjectFinancialsV2 - Adapter hook for project-level financial summaries
 * 
 * This is a pure JavaScript adapter over useProjectFinancialsV3 that transforms
 * the V3 nested data structure into the flat format expected by V2 UI components.
 * 
 * NO DIRECT DATABASE QUERIES - all data comes from V3.
 */

import { useProjectFinancialsV3 } from './useProjectFinancialsV3';

// Re-export useGlobalFinancials for backward compatibility
export { useGlobalFinancials } from './useGlobalFinancials';

export interface ProjectFinancialsV2 {
  totalBudget: number;
  actualCost: number;
  variance: number;
  percentConsumed: number;
  
  laborBudget: number;
  laborActual: number;
  unpaidLabor: number;
  
  subsBudget: number;
  subsActual: number;
  
  materialsBudget: number;
  materialsActual: number;
  
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

/**
 * Adapter hook that transforms V3 data into V2 format.
 * Used by FinancialSummaryTabV2 and CostByCategoryTabV2.
 */
export function useProjectFinancialsV2(projectId: string) {
  const { data: v3Data, isLoading, error } = useProjectFinancialsV3(projectId);

  // Transform V3 data into V2 format
  const data: ProjectFinancialsV2 | undefined = v3Data ? {
    totalBudget: v3Data.budget.total,
    actualCost: v3Data.actuals.total,
    variance: v3Data.budget.total - v3Data.actuals.total,
    percentConsumed: v3Data.budget.total > 0 
      ? (v3Data.actuals.total / v3Data.budget.total) * 100 
      : 0,

    laborBudget: v3Data.budget.labor,
    laborActual: v3Data.actuals.labor,
    unpaidLabor: v3Data.unpaid.labor,

    subsBudget: v3Data.budget.subs,
    subsActual: v3Data.actuals.subs,

    materialsBudget: v3Data.budget.materials,
    materialsActual: v3Data.actuals.materials,

    categories: {
      labor: {
        budget: v3Data.budget.labor,
        actual: v3Data.actuals.labor,
        variance: v3Data.budget.labor - v3Data.actuals.labor,
        percentConsumed: v3Data.budget.labor > 0 
          ? (v3Data.actuals.labor / v3Data.budget.labor) * 100 
          : 0,
        entryCount: 0, // V3 doesn't track entry counts
      },
      subs: {
        budget: v3Data.budget.subs,
        actual: v3Data.actuals.subs,
        variance: v3Data.budget.subs - v3Data.actuals.subs,
        percentConsumed: v3Data.budget.subs > 0 
          ? (v3Data.actuals.subs / v3Data.budget.subs) * 100 
          : 0,
        entryCount: 0,
      },
      materials: {
        budget: v3Data.budget.materials,
        actual: v3Data.actuals.materials,
        variance: v3Data.budget.materials - v3Data.actuals.materials,
        percentConsumed: v3Data.budget.materials > 0 
          ? (v3Data.actuals.materials / v3Data.budget.materials) * 100 
          : 0,
        entryCount: 0,
      },
    },
  } : undefined;

  return { data, isLoading, error };
}
