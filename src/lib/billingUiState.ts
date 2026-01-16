export type BillingBasis = 'payment_schedule' | 'sov' | null;

export type ContractType = 'fixed_price' | 'milestone' | 'progress_billing' | null;

export interface AcceptedProposalInfo {
  id: string;
  contract_type: ContractType;
  billing_basis: BillingBasis;
  billing_readiness: string | null;
  approved_at: string | null;
}

export interface BillingUiCta {
  label: string;
  onClick: () => void;
  variant: 'default' | 'ghost' | 'outline';
  disabled?: boolean;
}

export interface BillingUiState {
  status: 'loading' | 'active' | 'contract_pending' | 'pre_contract';
  heroCopy: { title: string; body: string } | null;
  primaryCta: BillingUiCta | null;
  secondaryCtas: BillingUiCta[];
  kpiMode: 'ghosted' | 'normal';
  tabs: {
    summary: boolean;
    milestones: boolean;
    sov: boolean;
    changeOrders: 'enabled' | 'readOnly';
    invoices: boolean;
    payments: boolean;
  };
}

export interface BillingUiInput {
  summaryLoading: boolean;
  hasBaseline: boolean;
  billingBasis: BillingBasis;
  acceptedProposal: AcceptedProposalInfo | null | undefined;
  onCreateInvoice: () => void;
  onCreateBaseline: (proposalId: string) => void;
  onViewProposals: () => void;
  isCreateInvoicePending: boolean;
  isCreateBaselinePending: boolean;
}

export function deriveBillingUiState(input: BillingUiInput): BillingUiState {
  const {
    summaryLoading,
    hasBaseline,
    billingBasis,
    acceptedProposal,
    onCreateInvoice,
    onCreateBaseline,
    onViewProposals,
    isCreateInvoicePending,
    isCreateBaselinePending,
  } = input;

  if (summaryLoading) {
    return {
      status: 'loading',
      heroCopy: { title: 'Loading...', body: '' },
      primaryCta: null,
      secondaryCtas: [],
      kpiMode: 'ghosted',
      tabs: { summary: true, milestones: false, sov: false, changeOrders: 'readOnly', invoices: true, payments: true },
    };
  }

  const hasAcceptedProposal = !!acceptedProposal;
  const derivedContractType = acceptedProposal?.contract_type ?? null;

  const isEffectivelyLocked = hasAcceptedProposal && (
    acceptedProposal?.billing_readiness === 'locked' ||
    acceptedProposal?.approved_at !== null ||
    derivedContractType !== null
  );

  const derivedBillingBasis = acceptedProposal?.billing_basis || (
    derivedContractType === 'progress_billing' ? 'sov' :
    derivedContractType === 'milestone' ? 'payment_schedule' :
    null
  );

  if (hasBaseline) {
    const getActiveCta = () => {
      if (billingBasis === 'sov') {
        return { label: 'New Pay App', onClick: onCreateInvoice, variant: 'default' as const };
      }
      if (billingBasis === 'payment_schedule') {
        return { label: 'Bill Milestone', onClick: onCreateInvoice, variant: 'default' as const };
      }
      return { label: 'Create Invoice', onClick: onCreateInvoice, variant: 'default' as const };
    };

    return {
      status: 'active',
      heroCopy: null,
      primaryCta: { ...getActiveCta(), disabled: isCreateInvoicePending },
      secondaryCtas: [],
      kpiMode: 'normal',
      tabs: {
        summary: true,
        milestones: billingBasis === 'payment_schedule',
        sov: billingBasis === 'sov',
        changeOrders: 'enabled',
        invoices: true,
        payments: true,
      },
    };
  }

  if (hasAcceptedProposal && derivedContractType && isEffectivelyLocked) {
    if (derivedContractType === 'fixed_price') {
      return {
        status: 'contract_pending',
        heroCopy: {
          title: 'Contract Approved — Ready to Invoice',
          body: 'This is a Fixed Price contract. Create the billing baseline to record contract value and enable invoicing.',
        },
        primaryCta: {
          label: 'Initialize Contract Billing',
          onClick: () => acceptedProposal?.id && onCreateBaseline(acceptedProposal.id),
          variant: 'default',
          disabled: isCreateBaselinePending,
        },
        secondaryCtas: [{ label: 'Create Standalone Invoice', onClick: onCreateInvoice, variant: 'ghost' }],
        kpiMode: 'normal',
        tabs: { summary: true, milestones: false, sov: false, changeOrders: 'readOnly', invoices: true, payments: true },
      };
    }

    const basisLabel = derivedBillingBasis === 'sov' ? 'Schedule of Values' : 'Payment Schedule';
    return {
      status: 'contract_pending',
      heroCopy: {
        title: 'Ready to Start Billing?',
        body: `The proposal was accepted. Confirm the ${basisLabel.toLowerCase()} to lock the contract value and enable progress invoicing.`,
      },
      primaryCta: {
        label: 'Initialize Contract Billing',
        onClick: () => acceptedProposal?.id && onCreateBaseline(acceptedProposal.id),
        variant: 'default',
        disabled: isCreateBaselinePending,
      },
      secondaryCtas: [{ label: 'Create Standalone Invoice', onClick: onCreateInvoice, variant: 'ghost' }],
      kpiMode: 'ghosted',
      tabs: { summary: true, milestones: false, sov: false, changeOrders: 'readOnly', invoices: true, payments: true },
    };
  }

  return {
    status: 'pre_contract',
    heroCopy: {
      title: 'No Contract Yet',
      body: 'To enable progress invoicing, you need an accepted proposal with a defined contract type. You can create standalone invoices for deposits or T&M.',
    },
    primaryCta: { label: 'View Proposals', onClick: onViewProposals, variant: 'outline' },
    secondaryCtas: [{ label: 'Create Standalone Invoice', onClick: onCreateInvoice, variant: 'ghost' }],
    kpiMode: 'ghosted',
    tabs: { summary: true, milestones: false, sov: false, changeOrders: 'readOnly', invoices: true, payments: true },
  };
}


