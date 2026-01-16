import { describe, it, expect } from 'vitest';
import { normalizeMilestoneAmounts } from '../src/lib/milestoneSchedule';

describe('normalizeMilestoneAmounts', () => {
  it('computes scheduled_amount for percentage + remaining', () => {
    const contractTotal = 200;
    const items = [
      {
        id: 'm1',
        allocationMode: 'percentage' as const,
        percent_of_contract: 51,
        fixed_amount: null,
        scheduled_amount: 0,
        sort_order: 0,
      },
      {
        id: 'm2',
        allocationMode: 'remaining' as const,
        percent_of_contract: null,
        fixed_amount: null,
        scheduled_amount: 0,
        sort_order: 1,
      },
    ];

    const result = normalizeMilestoneAmounts(items, contractTotal);
    expect(result[0].scheduled_amount).toBe(102);
    expect(result[1].scheduled_amount).toBe(98);
  });
});


