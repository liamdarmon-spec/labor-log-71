export type MilestoneAllocationMode = 'percentage' | 'fixed' | 'remaining';

export interface MilestoneComputeInput {
  id: string;
  allocationMode: MilestoneAllocationMode;
  percent_of_contract: number | null;
  fixed_amount: number | null;
  scheduled_amount: number;
  sort_order?: number | null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function normalizeMilestoneAmounts<T extends MilestoneComputeInput>(
  items: T[],
  contractTotal: number
): T[] {
  const normalized = items
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((m) => ({ ...m }));

  let sumNonRemaining = 0;
  for (const m of normalized) {
    if (m.allocationMode === 'fixed') {
      const fixed = Number(m.fixed_amount ?? 0);
      m.scheduled_amount = fixed;
      sumNonRemaining += fixed;
      continue;
    }
    if (m.allocationMode === 'percentage') {
      const pct = Number(m.percent_of_contract ?? 0);
      const amt = round2((contractTotal * pct) / 100);
      m.scheduled_amount = amt;
      sumNonRemaining += amt;
      continue;
    }
  }

  const remainingRows = normalized.filter((m) => m.allocationMode === 'remaining');
  if (remainingRows.length > 0) {
    const remainingAmt = Math.max(0, round2(contractTotal - sumNonRemaining));
    remainingRows.forEach((m, idx) => {
      m.scheduled_amount = idx === remainingRows.length - 1 ? remainingAmt : 0;
    });
  }

  return normalized;
}


