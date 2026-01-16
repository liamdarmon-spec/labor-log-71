import { describe, it, expect } from 'vitest';
import { deriveBillingUiState } from '../src/lib/billingUiState';

describe('billing flow smoke tests', () => {
  it('milestone flow: active baseline uses Bill Milestone CTA', () => {
    const ui = deriveBillingUiState({
      summaryLoading: false,
      hasBaseline: true,
      billingBasis: 'payment_schedule',
      acceptedProposal: null,
      onCreateInvoice: () => {},
      onCreateBaseline: () => {},
      onViewProposals: () => {},
      isCreateInvoicePending: false,
      isCreateBaselinePending: false,
    });

    expect(ui.status).toBe('active');
    expect(ui.primaryCta?.label).toBe('Bill Milestone');
  });

  it('SOV flow: active baseline uses New Pay App CTA', () => {
    const ui = deriveBillingUiState({
      summaryLoading: false,
      hasBaseline: true,
      billingBasis: 'sov',
      acceptedProposal: null,
      onCreateInvoice: () => {},
      onCreateBaseline: () => {},
      onViewProposals: () => {},
      isCreateInvoicePending: false,
      isCreateBaselinePending: false,
    });

    expect(ui.status).toBe('active');
    expect(ui.primaryCta?.label).toBe('New Pay App');
  });

  it('standalone invoice flow: pre-contract allows standalone invoice', () => {
    const ui = deriveBillingUiState({
      summaryLoading: false,
      hasBaseline: false,
      billingBasis: null,
      acceptedProposal: null,
      onCreateInvoice: () => {},
      onCreateBaseline: () => {},
      onViewProposals: () => {},
      isCreateInvoicePending: false,
      isCreateBaselinePending: false,
    });

    expect(ui.status).toBe('pre_contract');
    expect(ui.primaryCta?.label).toBe('View Proposals');
    expect(ui.secondaryCtas.some((c) => c.label === 'Create Standalone Invoice')).toBe(true);
  });
});


