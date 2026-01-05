import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Download,
  Eye,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  useProposalData,
  useUpdateProposalField,
  useUpdateProposalSettings,
  useRefreshProposalFromEstimate,
  ProposalSettings,
} from '@/hooks/useProposalData';
import { ProposalContextPanel } from '@/components/proposals/ProposalContextPanel';
import { ProposalContentEditor } from '@/components/proposals/ProposalContentEditor';
import { ProposalSettingsPanel } from '@/components/proposals/ProposalSettingsPanel';
import { ProposalPDFPreview } from '@/components/proposals/ProposalPDFPreview';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function ProposalBuilderV2() {
  // Support both route patterns: /proposals/:id and /projects/:projectId/proposals/:proposalId
  const params = useParams<{ projectId?: string; proposalId?: string; id?: string }>();
  const proposalId = params.proposalId || params.id;
  const projectId = params.projectId;
  const navigate = useNavigate();

  const { data: proposal, isLoading, error } = useProposalData(proposalId);
  const updateField = useUpdateProposalField();
  const updateSettings = useUpdateProposalSettings();
  const refreshFromEstimate = useRefreshProposalFromEstimate();

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  // Update field with debounce
  const handleFieldChange = useCallback(
    (field: string, value: any) => {
      if (!proposalId) return;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      setSaveStatus('saving');

      debounceRef.current = setTimeout(() => {
        updateField.mutate(
          { id: proposalId, field, value },
          {
            onSuccess: () => {
              setSaveStatus('saved');
              if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
              savedTimeoutRef.current = setTimeout(() => {
                setSaveStatus('idle');
              }, 2000);
            },
            onError: () => {
              setSaveStatus('error');
            },
          }
        );
      }, 600);
    },
    [proposalId, updateField]
  );

  // Update settings immediately (merge logic is inside the hook)
  const handleSettingsChange = useCallback(
    (settings: Partial<ProposalSettings>) => {
      if (!proposalId) return;

      setSaveStatus('saving');
      updateSettings.mutate(
        { id: proposalId, settings },
        {
          onSuccess: () => {
            setSaveStatus('saved');
            if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
            savedTimeoutRef.current = setTimeout(() => {
              setSaveStatus('idle');
            }, 2000);
          },
          onError: () => {
            setSaveStatus('error');
          },
        }
      );
    },
    [proposalId, updateSettings]
  );

  // Refresh totals from estimate
  const handleRefreshFromEstimate = useCallback(() => {
    if (!proposalId) return;
    refreshFromEstimate.mutate(proposalId);
  }, [proposalId, refreshFromEstimate]);

  // Navigate back
  const handleBack = () => {
    if (projectId) {
      navigate(`/projects/${projectId}?tab=proposals`);
    } else if (proposal?.project_id) {
      navigate(`/projects/${proposal.project_id}?tab=proposals`);
    } else {
      navigate('/proposals');
    }
  };

  // Status badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'sent':
        return 'default';
      case 'accepted':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Layout hideNav>
        <div className="space-y-4 p-6">
          <Skeleton className="h-14 w-full" />
          <div className="grid grid-cols-12 gap-6">
            <Skeleton className="col-span-3 h-[600px]" />
            <Skeleton className="col-span-6 h-[600px]" />
            <Skeleton className="col-span-3 h-[600px]" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !proposal) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Proposal not found</h2>
          <p className="text-muted-foreground mb-4">
            This proposal may have been deleted or you don&apos;t have access.
          </p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideNav>
      {/* Top Bar */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3 gap-4">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="min-w-0 flex-1">
              <input
                type="text"
                defaultValue={proposal.title}
                className="text-lg font-semibold bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1 w-full max-w-md"
                onBlur={(e) => {
                  if (e.target.value !== proposal.title) {
                    handleFieldChange('title', e.target.value);
                  }
                }}
              />
              <div className="flex items-center gap-2 mt-0.5 px-2">
                <Badge variant={getStatusColor(proposal.status)} className="text-xs">
                  {proposal.status}
                </Badge>
                <span className="text-sm text-muted-foreground truncate">
                  {proposal.project?.project_name}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Save Status + Actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Save Status */}
            <div className="flex items-center gap-1.5 text-sm min-w-[100px] justify-end">
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check className="h-3.5 w-3.5 text-success" />
                  <span className="text-success">Saved</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-destructive">Error</span>
                </>
              )}
            </div>

            <Separator orientation="vertical" className="h-6" />

            {proposal.primary_estimate_id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/app/estimates/${proposal.primary_estimate_id}`)}
                className="text-muted-foreground"
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                View Estimate
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPDFPreview(true)}
            >
              <Eye className="h-4 w-4 mr-1.5" />
              Preview
            </Button>
            <Button size="sm" onClick={() => setShowPDFPreview(true)}>
              <Download className="h-4 w-4 mr-1.5" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-[1600px] mx-auto">
        {/* Left Column: Context & Data Source */}
        <div className="lg:col-span-3 space-y-4">
          <ProposalContextPanel
            proposal={proposal}
            onRefreshFromEstimate={handleRefreshFromEstimate}
            isRefreshing={refreshFromEstimate.isPending}
          />
        </div>

        {/* Middle Column: Content Editor */}
        <div className="lg:col-span-6">
          <ProposalContentEditor
            proposal={proposal}
            onFieldChange={handleFieldChange}
            onSettingsChange={handleSettingsChange}
          />
        </div>

        {/* Right Column: Settings & Toggles */}
        <div className="lg:col-span-3">
          <ProposalSettingsPanel
            settings={proposal.settings}
            onSettingsChange={handleSettingsChange}
          />
        </div>
      </div>

      {/* PDF Preview Modal */}
      {showPDFPreview && (
        <ProposalPDFPreview
          proposal={proposal}
          onClose={() => setShowPDFPreview(false)}
        />
      )}
    </Layout>
  );
}
