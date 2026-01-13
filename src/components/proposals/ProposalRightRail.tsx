// src/components/proposals/ProposalRightRail.tsx
// Unified right rail with semantic accordion sections
//
// Sections:
// A) Contract Logic (OPEN by default) - Contract type, billing, terms
// B) Display Options (collapsed) - Presentation toggles
// C) Signature & Approval (collapsed unless Review/Approved)
//
// UI SMOKE TEST CHECKLIST:
// □ Contract Logic section is open by default and visually emphasized
// □ Display Options uses neutral styling (secondary importance)
// □ Approval controls show only when appropriate
// □ All billing readiness warnings are visible inline
// □ Contract type shows clear consequences

import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  Percent,
  ClipboardCheck,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Eye,
  Signature,
  Settings2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { ProposalSettings } from '@/hooks/useProposalData';
import { ContractPhase } from './ContractPhaseIndicator';
import { cn } from '@/lib/utils';

export type ContractType = 'fixed_price' | 'milestone' | 'progress_billing';
export type AcceptanceStatus = 'pending' | 'accepted' | 'changes_requested' | 'rejected';

interface ProposalRightRailProps {
  // Contract panel props
  proposalId: string;
  contractType: ContractType | null;
  billingTerms: string | null;
  retainagePercent: number | null;
  acceptanceStatus: AcceptanceStatus;
  approvedAt: string | null;
  approvedBy: string | null;
  totalAmount: number;
  isLocked: boolean;
  onContractChange?: () => void;
  billingReadiness?: string | null;
  milestoneCount?: number;
  milestoneTotal?: number;
  sovTotal?: number;
  // Settings panel props
  settings: ProposalSettings;
  onSettingsChange: (settings: Partial<ProposalSettings>) => void;
  // Phase
  currentPhase: ContractPhase;
  onPhaseChange?: (phase: ContractPhase) => void;
}

const CONTRACT_TYPES = [
  {
    value: 'fixed_price' as const,
    label: 'Fixed Price',
    description: 'Single lump-sum payment upon completion',
    consequence: 'No milestones or SOV required. Standalone invoices allowed.',
    icon: DollarSign,
  },
  {
    value: 'milestone' as const,
    label: 'Milestone Schedule',
    description: 'Payments tied to project milestones',
    consequence: 'You must define milestones that total the contract value.',
    icon: ClipboardCheck,
  },
  {
    value: 'progress_billing' as const,
    label: 'Progress Billing (SOV)',
    description: 'Monthly billing based on % complete per line item',
    consequence: 'You must allocate a Schedule of Values equaling the contract.',
    icon: FileCheck,
  },
];


export function ProposalRightRail({
  proposalId,
  contractType,
  billingTerms,
  retainagePercent,
  acceptanceStatus,
  approvedAt,
  approvedBy,
  totalAmount,
  isLocked,
  onContractChange,
  billingReadiness,
  milestoneCount = 0,
  milestoneTotal = 0,
  sovTotal = 0,
  settings,
  onSettingsChange,
  currentPhase,
  onPhaseChange,
}: ProposalRightRailProps) {
  const queryClient = useQueryClient();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [localContractType, setLocalContractType] = useState<ContractType>(
    contractType || 'fixed_price'
  );
  const [localRetainage, setLocalRetainage] = useState(retainagePercent || 0);
  const [approverName, setApproverName] = useState('');

  // Control accordion open state. This MUST be effect-driven (never setState during render).
  const [openSections, setOpenSections] = useState<string[]>(() => {
    const initial = ['contract-logic'];
    if (currentPhase === 'review' || currentPhase === 'approved') initial.push('signature-approval');
    return initial;
  });

  // Sync open sections with phase changes
  useEffect(() => {
    if (currentPhase === 'review' || currentPhase === 'approved') {
      setOpenSections((prev) => Array.from(new Set([...prev, 'signature-approval'])));
    }
  }, [currentPhase]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  // ============================================================
  // Contract Logic Handlers
  // ============================================================

  const handleContractTypeChange = async (value: ContractType) => {
    if (isLocked) {
      toast.error('Contract type is locked after approval');
      return;
    }
    setLocalContractType(value);
    await updateContractSettings({ contract_type: value });
  };


  const handleRetainageChange = async (value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    setLocalRetainage(clamped);
    await updateContractSettings({ retainage_percent: clamped });
  };

  const updateContractSettings = async (updates: {
    contract_type?: string;
    billing_terms?: string;
    retainage_percent?: number;
  }) => {
    setIsUpdating(true);
    try {
      const { data, error } = await (supabase as any).rpc('update_proposal_contract_settings', {
        p_proposal_id: proposalId,
        p_contract_type: updates.contract_type || null,
        p_billing_terms: updates.billing_terms || null,
        p_retainage_percent: updates.retainage_percent ?? null,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Update failed');
      toast.success('Contract settings updated');
      queryClient.invalidateQueries({ queryKey: ['proposal-data', proposalId] });
      onContractChange?.();
    } catch (err) {
      console.error('Failed to update contract settings:', err);
      toast.error('Failed to update contract settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApprove = async () => {
    setIsUpdating(true);
    try {
      const { data, error } = await (supabase as any).rpc('approve_proposal_manual', {
        p_proposal_id: proposalId,
        p_approved_by: approverName || null,
        p_create_baseline: false, // Baseline creation now happens explicitly in Billing
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Approval failed');
      toast.success(data.message || 'Proposal approved successfully');
      setShowApproveDialog(false);
      queryClient.invalidateQueries({ queryKey: ['proposal-data', proposalId] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      onContractChange?.();
    } catch (err: any) {
      console.error('Failed to approve proposal:', err);
      toast.error(err.message || 'Failed to approve proposal');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('proposals')
        .update({
          acceptance_status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId);
      if (error) throw error;
      toast.success('Proposal marked as rejected');
      setShowRejectDialog(false);
      queryClient.invalidateQueries({ queryKey: ['proposal-data', proposalId] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      onContractChange?.();
    } catch (err) {
      console.error('Failed to reject proposal:', err);
      toast.error('Failed to reject proposal');
    } finally {
      setIsUpdating(false);
    }
  };

  // ============================================================
  // Billing Readiness
  // ============================================================

  const getBillingReadiness = (): {
    status: 'ready' | 'locked' | 'incomplete';
    reason: string;
    isReady: boolean;
    progress?: number;
  } => {
    // If backend provides billing_readiness, treat it as authoritative for gating.
    if (billingReadiness === 'locked' || acceptanceStatus === 'accepted') {
      return { status: 'locked', reason: 'Billing configuration is locked', isReady: true };
    }
    if (billingReadiness === 'ready') {
      return { status: 'ready', reason: 'Billing configuration is ready', isReady: true, progress: 100 };
    }
    if (billingReadiness === 'incomplete') {
      // We still show local guidance below, but do NOT allow approval from the UI.
      // This mirrors the DB guarantee: approval cannot proceed until ready.
      // Keep a generic reason here; the detailed requirement messaging remains contract-type-specific.
      // NOTE: We intentionally do not guess about server-side totals here.
      // The DB will always be the final authority.
      // (If we later add a read-only RPC to fetch readiness reasons, we can surface them here.)
      // For now: fail closed.
      // We'll set progress based on our local heuristics below where possible.
    }

    const type = localContractType;
    if (type === 'fixed_price') {
      // Fixed price is allowed without milestone/SOV configuration.
      // If backend marked it incomplete, we still fail closed above (billingReadiness === 'incomplete').
      const failClosed = billingReadiness === 'incomplete';
      return failClosed
        ? { status: 'incomplete', reason: 'Billing configuration is incomplete', isReady: false }
        : { status: 'ready', reason: 'Fixed price is always billable', isReady: true };
    }

    if (type === 'milestone') {
      if (milestoneCount === 0) {
        return {
          status: 'incomplete',
          reason: 'At least one milestone is required',
          isReady: false,
          progress: 0,
        };
      }
      const diff = Math.abs(milestoneTotal - totalAmount);
      const progress = totalAmount > 0 ? Math.min(100, (milestoneTotal / totalAmount) * 100) : 0;
      if (diff > 0.01) {
        return {
          status: 'incomplete',
          reason: `Milestone total must equal contract (${formatCurrency(milestoneTotal)} of ${formatCurrency(totalAmount)})`,
          isReady: false,
          progress,
        };
      }
      // If backend marked incomplete, fail closed even if local heuristic says ready.
      if (billingReadiness === 'incomplete') {
        return { status: 'incomplete', reason: 'Billing configuration is incomplete', isReady: false, progress };
      }
      return { status: 'ready', reason: 'Milestone schedule is complete', isReady: true, progress: 100 };
    }

    if (type === 'progress_billing') {
      if (sovTotal === 0) {
        return {
          status: 'incomplete',
          reason: 'SOV allocation is required',
          isReady: false,
          progress: 0,
        };
      }
      const diff = Math.abs(sovTotal - totalAmount);
      const progress = totalAmount > 0 ? Math.min(100, (sovTotal / totalAmount) * 100) : 0;
      if (diff > 0.01) {
        return {
          status: 'incomplete',
          reason: `SOV total must equal contract (${formatCurrency(sovTotal)} of ${formatCurrency(totalAmount)})`,
          isReady: false,
          progress,
        };
      }
      if (billingReadiness === 'incomplete') {
        return { status: 'incomplete', reason: 'Billing configuration is incomplete', isReady: false, progress };
      }
      return { status: 'ready', reason: 'SOV allocation is complete', isReady: true, progress: 100 };
    }

    return {
      status: 'incomplete',
      reason: billingReadiness === 'incomplete' ? 'Billing configuration is incomplete' : 'Set contract type to continue',
      isReady: false,
    };
  };

  const readiness = getBillingReadiness();
  const selectedContractInfo = CONTRACT_TYPES.find((c) => c.value === localContractType);

  // ============================================================
  // Settings Toggle Handler
  // ============================================================

  const handleToggle = (key: keyof ProposalSettings, value: boolean) => {
    onSettingsChange({ [key]: value });
  };

  return (
    <div className={cn(
      "sticky top-20 space-y-2",
      "max-h-[calc(100vh-6rem)] overflow-y-auto pr-1"
    )}>
      <Accordion 
        type="multiple" 
        value={openSections} 
        onValueChange={setOpenSections} 
        className="w-full"
      >
        {/* ============================================================ */}
        {/* A) CONTRACT LOGIC - Primary section */}
        {/* ============================================================ */}
        <AccordionItem value="contract-logic" className="border rounded-lg mb-3 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 hover:no-underline">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-primary" />
              Contract Logic
              {!readiness.isReady && (
                <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300 text-[10px]">
                  Action Required
                </Badge>
              )}
              {readiness.status === 'locked' && (
                <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-700 text-[10px]">
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-4 space-y-5">
            {/* Contract Type Selector */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Contract Type
              </Label>
              <Select
                value={localContractType}
                onValueChange={(v) => handleContractTypeChange(v as ContractType)}
                disabled={isLocked || isUpdating}
              >
                <SelectTrigger
                  className={cn(
                    'h-auto py-3',
                    isLocked && 'opacity-60 cursor-not-allowed bg-muted'
                  )}
                >
                  <div className="flex items-center gap-2 text-left">
                    {selectedContractInfo && (
                      <>
                        <selectedContractInfo.icon className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <div className="font-medium">{selectedContractInfo.label}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {selectedContractInfo.description}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="py-3">
                      <div className="flex items-start gap-2">
                        <type.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Contract type consequence helper */}
              {selectedContractInfo && (
                <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground flex gap-2">
                   <div className="shrink-0 w-1 h-full bg-primary/20 rounded-full" />
                   <span>{selectedContractInfo.consequence}</span>
                </div>
              )}
            </div>

            {/* Billing Readiness Indicator */}
            {localContractType !== 'fixed_price' && (
              <div
                className={cn(
                  'rounded-lg p-3 space-y-2',
                  readiness.status === 'locked'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200'
                    : readiness.status === 'ready'
                      ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200'
                      : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {readiness.status === 'locked' ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    ) : readiness.status === 'ready' ? (
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    )}
                    <span className="text-xs font-medium">
                      {readiness.status === 'locked'
                        ? 'Configuration Locked'
                        : readiness.status === 'ready'
                          ? 'Ready to Approve'
                          : 'Configuration Incomplete'}
                    </span>
                  </div>
                  {readiness.progress !== undefined && readiness.status !== 'locked' && (
                    <span className="text-xs font-sans font-bold tabular-nums tracking-tight text-muted-foreground">
                      {readiness.progress.toFixed(0)}%
                    </span>
                  )}
                </div>

                {readiness.progress !== undefined && readiness.status !== 'locked' && (
                  <Progress value={readiness.progress} className="h-1.5" />
                )}

                <p className="text-xs text-muted-foreground">{readiness.reason}</p>

                {!readiness.isReady && localContractType === 'milestone' && (
                  <div className="text-xs pt-1">
                    <strong className="text-amber-800 dark:text-amber-300">Required:</strong>{' '}
                    <span className="text-muted-foreground">
                      Add milestones totaling {formatCurrency(totalAmount)}
                    </span>
                  </div>
                )}

                {!readiness.isReady && localContractType === 'progress_billing' && (
                  <div className="text-xs pt-1">
                    <strong className="text-amber-800 dark:text-amber-300">Required:</strong>{' '}
                    <span className="text-muted-foreground">
                      Allocate SOV totaling {formatCurrency(totalAmount)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Retainage (only for progress billing) */}
            {localContractType === 'progress_billing' && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Retainage
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={localRetainage}
                    onChange={(e) => handleRetainageChange(parseFloat(e.target.value) || 0)}
                    className="w-20 font-sans tabular-nums"
                    disabled={isUpdating}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Held from each payment until completion
                </p>
              </div>
            )}

            {/* Contract Summary */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Contract Value</span>
                <span className="font-sans font-bold tabular-nums tracking-tight">{formatCurrency(totalAmount)}</span>
              </div>
              {localContractType === 'progress_billing' && localRetainage > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Retainage ({localRetainage}%)</span>
                  <span className="text-amber-600 font-sans font-medium tabular-nums tracking-tight">
                    {formatCurrency(totalAmount * (localRetainage / 100))}
                  </span>
                </div>
              )}
            </div>

            {isLocked && (
              <p className="text-xs text-amber-600 flex items-center gap-1 pl-1">
                <Lock className="h-3 w-3" />
                Contract logic is locked after approval
              </p>
            )}

            {/* Phase Progression: Draft -> Review */}
            {!isLocked && currentPhase === 'draft' && (
              <Button
                className="w-full mt-4 transition-all duration-300 hover:shadow-md active:scale-[0.98]"
                onClick={() => onPhaseChange?.('review')}
                disabled={!readiness.isReady}
                variant={readiness.isReady ? 'default' : 'secondary'}
              >
                {readiness.isReady ? 'Proceed to Review' : 'Complete Setup to Review'}
              </Button>
            )}
            
            {!isLocked && currentPhase === 'review' && (
               <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-muted-foreground"
                onClick={() => onPhaseChange?.('draft')}
              >
                ← Back to Editing
              </Button>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* ============================================================ */}
        {/* B) DISPLAY OPTIONS - Secondary section */}
        {/* ============================================================ */}
        <AccordionItem value="display-options" className="border rounded-lg mb-3 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Eye className="h-4 w-4" />
              Display Options
              <span className="text-[10px] text-muted-foreground/70 ml-1">(presentation only)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-2 space-y-4">
            <p className="text-[11px] text-muted-foreground mb-3">
              These settings only affect how the proposal appears to clients. They do not impact billing.
            </p>

            {/* Basic Display */}
            <div className="space-y-3">
              {[
                { key: 'show_project_info', label: 'Show project info' },
                { key: 'show_client_info', label: 'Show client info' },
                { key: 'show_address', label: 'Show job address' },
                { key: 'show_scope_summary', label: 'Show scope summary' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key} className="text-sm text-muted-foreground">
                    {label}
                  </Label>
                  <Switch
                    id={key}
                    checked={(settings as any)[key] ?? true}
                    onCheckedChange={(checked) => handleToggle(key as keyof ProposalSettings, checked)}
                  />
                </div>
              ))}
            </div>

            <Separator className="my-3" />

            {/* Pricing Display */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Pricing</Label>
              {[
                { key: 'show_line_items', label: 'Show line items' },
                { key: 'show_line_item_totals', label: 'Show item prices' },
                { key: 'group_line_items_by_area', label: 'Group by area' },
                { key: 'show_allowances', label: 'Show allowances' },
                { key: 'show_exclusions', label: 'Show exclusions' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key} className="text-sm text-muted-foreground">
                    {label}
                  </Label>
                  <Switch
                    id={key}
                    checked={(settings as any)[key] ?? true}
                    onCheckedChange={(checked) => handleToggle(key as keyof ProposalSettings, checked)}
                  />
                </div>
              ))}
            </div>

            <Separator className="my-3" />

            {/* Terms */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Terms & Documents
              </Label>
              {[
                { key: 'show_payment_schedule', label: 'Show payment schedule' },
                { key: 'show_terms', label: 'Show terms & conditions' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key} className="text-sm text-muted-foreground">
                    {label}
                  </Label>
                  <Switch
                    id={key}
                    checked={(settings as any)[key] ?? true}
                    onCheckedChange={(checked) => handleToggle(key as keyof ProposalSettings, checked)}
                  />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ============================================================ */}
        {/* C) SIGNATURE & APPROVAL - Contextual section */}
        {/* ============================================================ */}
        <AccordionItem value="signature-approval" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Signature className="h-4 w-4" />
              Signature & Approval
              {acceptanceStatus === 'accepted' && (
                <Badge variant="default" className="ml-2 bg-emerald-600 text-[10px]">
                  Approved
                </Badge>
              )}
              {acceptanceStatus === 'rejected' && (
                <Badge variant="destructive" className="ml-2 text-[10px]">
                  Rejected
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-2 space-y-4">
            {/* Signature Block Toggle */}
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="show_signature_block" className="text-sm">
                Show signature block
              </Label>
              <Switch
                id="show_signature_block"
                checked={settings.show_signature_block ?? true}
                onCheckedChange={(checked) => handleToggle('show_signature_block', checked)}
              />
            </div>

            <Separator />

            {/* Approval Status & Actions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge
                  variant={
                    acceptanceStatus === 'accepted'
                      ? 'default'
                      : acceptanceStatus === 'rejected'
                        ? 'destructive'
                        : 'outline'
                  }
                  className={acceptanceStatus === 'accepted' ? 'bg-emerald-600' : ''}
                >
                  {acceptanceStatus === 'pending'
                    ? 'Pending Approval'
                    : acceptanceStatus === 'accepted'
                      ? 'Approved'
                      : acceptanceStatus === 'changes_requested'
                        ? 'Changes Requested'
                        : 'Rejected'}
                </Badge>
              </div>

              {acceptanceStatus === 'accepted' ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 space-y-1">
                  {approvedAt && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Approved on {new Date(approvedAt).toLocaleDateString()}
                    </p>
                  )}
                  {approvedBy && (
                    <p className="text-xs text-muted-foreground">by {approvedBy}</p>
                  )}
                  <p className="text-xs text-muted-foreground pt-2 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Contract is now locked. Changes require a Change Order.
                  </p>
                </div>
              ) : (
                <>
                  {/* Pre-approval warning */}
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-xs space-y-1">
                    <p className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      What happens when approved:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5 pl-1">
                      <li>Contract type and billing basis are locked</li>
                      <li>Milestone/SOV schedule becomes immutable</li>
                      <li>Changes require a formal Change Order</li>
                      <li>Billing baseline is created for invoicing</li>
                    </ul>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex-1">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 w-full"
                              onClick={() => setShowApproveDialog(true)}
                              disabled={isUpdating || !readiness.isReady}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1.5" />
                              Mark as Approved
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {!readiness.isReady && (
                          <TooltipContent>
                            <p className="text-xs">{readiness.reason}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => setShowRejectDialog(true)}
                      disabled={isUpdating}
                    >
                      <XCircle className="h-4 w-4 mr-1.5" />
                      Reject
                    </Button>
                  </div>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* ============================================================ */}
      {/* DIALOGS */}
      {/* ============================================================ */}

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Approve Proposal
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the proposal as approved and lock the contract configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approver">Approved By (optional)</Label>
              <Input
                id="approver"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="Your name or client name"
              />
            </div>

            <div className="rounded-lg bg-slate-100 dark:bg-slate-900 p-4 space-y-2">
              <p className="text-sm">
                <strong>Contract:</strong> {selectedContractInfo?.label}
              </p>
              <p className="text-sm">
                <strong>Amount:</strong> {formatCurrency(totalAmount)}
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-xs">
              <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">
                ⚠️ This action cannot be undone
              </p>
              <p className="text-muted-foreground">
                After approval, contract changes require a formal Change Order.
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleApprove();
              }}
              disabled={isUpdating}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isUpdating ? 'Approving...' : 'Confirm Approval'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the proposal as rejected. You can still change this later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleReject();
              }}
              disabled={isUpdating}
              className="bg-red-600 hover:bg-red-700"
            >
              {isUpdating ? 'Rejecting...' : 'Confirm Rejection'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

