// src/components/proposals/ProposalContractPanel.tsx
// Contract settings & manual approval controls for proposals

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  Percent,
  Banknote,
  ClipboardCheck,
  FileCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export type ContractType = 'fixed_price' | 'milestone' | 'progress_billing';
export type AcceptanceStatus = 'pending' | 'accepted' | 'changes_requested' | 'rejected';

interface ProposalContractPanelProps {
  proposalId: string;
  contractType: ContractType | null;
  billingTerms: string | null;
  retainagePercent: number | null;
  acceptanceStatus: AcceptanceStatus;
  approvedAt: string | null;
  approvedBy: string | null;
  totalAmount: number;
  isLocked: boolean; // True after baseline created
  onContractChange?: () => void;
}

const CONTRACT_TYPES = [
  {
    value: 'fixed_price' as const,
    label: 'Fixed Price',
    description: 'Single lump-sum payment upon completion',
    icon: DollarSign,
  },
  {
    value: 'milestone' as const,
    label: 'Milestone Schedule',
    description: 'Payments tied to project milestones',
    icon: ClipboardCheck,
  },
  {
    value: 'progress_billing' as const,
    label: 'Progress Billing (SOV)',
    description: 'Monthly billing based on % complete per line item',
    icon: FileCheck,
  },
];

const BILLING_TERMS = [
  { value: 'due_on_receipt', label: 'Due on Receipt' },
  { value: 'net15', label: 'Net 15' },
  { value: 'net30', label: 'Net 30' },
  { value: 'net45', label: 'Net 45' },
  { value: 'net60', label: 'Net 60' },
];

export function ProposalContractPanel({
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
}: ProposalContractPanelProps) {
  const queryClient = useQueryClient();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [localContractType, setLocalContractType] = useState<ContractType>(contractType || 'fixed_price');
  const [localBillingTerms, setLocalBillingTerms] = useState(billingTerms || 'net30');
  const [localRetainage, setLocalRetainage] = useState(retainagePercent || 0);
  const [approverName, setApproverName] = useState('');
  const [createBaseline, setCreateBaseline] = useState(true);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const handleContractTypeChange = async (value: ContractType) => {
    if (isLocked) {
      toast.error('Contract type is locked after approval');
      return;
    }
    setLocalContractType(value);
    await updateContractSettings({ contract_type: value });
  };

  const handleBillingTermsChange = async (value: string) => {
    setLocalBillingTerms(value);
    await updateContractSettings({ billing_terms: value });
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
        p_create_baseline: createBaseline,
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

  const getStatusIcon = () => {
    switch (acceptanceStatus) {
      case 'accepted':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'changes_requested':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    const variants: Record<AcceptanceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      accepted: 'default',
      changes_requested: 'secondary',
      rejected: 'destructive',
    };
    const labels: Record<AcceptanceStatus, string> = {
      pending: 'Pending Approval',
      accepted: 'Approved',
      changes_requested: 'Changes Requested',
      rejected: 'Rejected',
    };
    return (
      <Badge variant={variants[acceptanceStatus]} className="text-xs">
        {labels[acceptanceStatus]}
      </Badge>
    );
  };

  const selectedContractInfo = CONTRACT_TYPES.find(c => c.value === localContractType);

  return (
    <div className="space-y-4">
      {/* Approval Status Card */}
      <Card className={acceptanceStatus === 'accepted' ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {getStatusIcon()}
              Approval Status
            </CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {acceptanceStatus === 'accepted' ? (
            <div className="text-sm space-y-1">
              {approvedAt && (
                <p className="text-muted-foreground">
                  Approved on {new Date(approvedAt).toLocaleDateString()}
                </p>
              )}
              {approvedBy && (
                <p className="text-muted-foreground">by {approvedBy}</p>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 flex-1"
                onClick={() => setShowApproveDialog(true)}
                disabled={isUpdating}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Mark as Approved
              </Button>
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
          )}
        </CardContent>
      </Card>

      {/* Contract Type Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Contract Type
          </CardTitle>
          <CardDescription className="text-xs">
            Determines how billing will be structured
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={localContractType}
            onValueChange={(v) => handleContractTypeChange(v as ContractType)}
            disabled={isLocked || isUpdating}
          >
            <SelectTrigger className={isLocked ? 'opacity-60 cursor-not-allowed' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTRACT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <type.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{type.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedContractInfo && (
            <p className="text-xs text-muted-foreground">
              {selectedContractInfo.description}
            </p>
          )}

          {isLocked && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Contract type is locked after approval
            </p>
          )}
        </CardContent>
      </Card>

      {/* Billing Terms */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Billing Terms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Payment Terms</Label>
            <Select
              value={localBillingTerms}
              onValueChange={handleBillingTermsChange}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILLING_TERMS.map((term) => (
                  <SelectItem key={term.value} value={term.value}>
                    {term.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {localContractType === 'progress_billing' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Percent className="h-3 w-3" />
                Retainage Percentage
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={localRetainage}
                  onChange={(e) => handleRetainageChange(parseFloat(e.target.value) || 0)}
                  onBlur={(e) => handleRetainageChange(parseFloat(e.target.value) || 0)}
                  className="w-24"
                  disabled={isUpdating}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Held back from each progress payment until project completion
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Contract Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Contract Value</span>
            <span className="font-semibold">{formatCurrency(totalAmount)}</span>
          </div>

          {localContractType === 'progress_billing' && localRetainage > 0 && (
            <>
              <Separator />
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Retainage ({localRetainage}%)</span>
                <span className="text-amber-600">
                  {formatCurrency(totalAmount * (localRetainage / 100))}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Proposal</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the proposal as approved and optionally create a billing baseline.
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

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createBaseline"
                checked={createBaseline}
                onChange={(e) => setCreateBaseline(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="createBaseline" className="text-sm font-normal">
                Create billing baseline (enables invoicing)
              </Label>
            </div>

            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <p><strong>Contract:</strong> {selectedContractInfo?.label}</p>
              <p><strong>Amount:</strong> {formatCurrency(totalAmount)}</p>
              <p><strong>Terms:</strong> {BILLING_TERMS.find(t => t.value === localBillingTerms)?.label}</p>
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

