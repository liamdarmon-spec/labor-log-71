import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
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
  useRefreshProposalFromEstimate,
  ProposalSettings,
} from '@/hooks/useProposalData';
import { ProposalContextPanel } from '@/components/proposals/ProposalContextPanel';
import { ProposalContentEditor } from '@/components/proposals/ProposalContentEditor';
import { ProposalSettingsPanel } from '@/components/proposals/ProposalSettingsPanel';
import { ProposalPDFPreview } from '@/components/proposals/ProposalPDFPreview';
import { useCompany } from '@/company/CompanyProvider';
import { useProposalAutosave } from '@/hooks/useProposalAutosave';

type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

function isUuid(v: string | undefined): boolean {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export default function ProposalBuilderV2() {
  // Support both route patterns: /proposals/:id and /projects/:projectId/proposals/:proposalId
  const params = useParams<{ projectId?: string; proposalId?: string; id?: string }>();
  const proposalId = params.proposalId || params.id;
  const projectId = params.projectId;
  const navigate = useNavigate();

  const { activeCompanyId } = useCompany();
  const { data: proposal, isLoading, error } = useProposalData(proposalId);
  const refreshFromEstimate = useRefreshProposalFromEstimate();

  // Local draft state (source of truth for autosave payload)
  const [draftTitle, setDraftTitle] = useState<string>('');
  const [draftIntro, setDraftIntro] = useState<string>('');
  const [draftSettings, setDraftSettings] = useState<ProposalSettings | null>(null);

  // Initialize local draft when proposal loads/changes
  useEffect(() => {
    if (!proposal) return;
    setDraftTitle(proposal.title ?? '');
    setDraftIntro(proposal.intro_text ?? '');
    setDraftSettings(proposal.settings ?? null);
  }, [proposal?.id]);

  const snapshot = useMemo(() => {
    return {
      title: draftTitle,
      intro_text: draftIntro,
      settings: draftSettings ?? proposal?.settings ?? null,
    };
  }, [draftTitle, draftIntro, draftSettings, proposal?.settings]);

  const autosave = useProposalAutosave({
    companyId: activeCompanyId,
    proposalId: proposalId || '',
    projectId: proposal?.project_id || projectId || '',
    getSnapshot: () => snapshot,
    debounceMs: 1000,
    onServerAck: (ack) => {
      // keep expected version for optimistic locking; version stored server-side
      autosave.setExpectedVersion(ack.draft_version);
    },
  });

  const [showPDFPreview, setShowPDFPreview] = useState(false);

  // Update field with debounce
  const handleFieldChange = useCallback(
    (field: string, value: any) => {
      if (!proposalId) return;
      if (proposal?.status && proposal.status !== 'draft') return; // no autosave for non-drafts

      if (field === 'title') setDraftTitle(String(value ?? ''));
      if (field === 'intro_text') setDraftIntro(String(value ?? ''));

      autosave.markDirtyAndSchedule();
    },
    [proposalId, autosave, proposal?.status]
  );

  // Update settings immediately (merge logic is inside the hook)
  const handleSettingsChange = useCallback(
    (settings: Partial<ProposalSettings>) => {
      if (!proposalId) return;
      if (proposal?.status && proposal.status !== 'draft') return;

      setDraftSettings((prev) => ({ ...(prev ?? proposal?.settings ?? ({} as any)), ...settings }));
      autosave.markDirtyAndSchedule();
    },
    [proposalId, autosave, proposal?.settings, proposal?.status]
  );

  // Refresh totals from estimate
  const handleRefreshFromEstimate = useCallback(() => {
    if (!proposalId) return;
    refreshFromEstimate.mutate(proposalId);
  }, [proposalId, refreshFromEstimate]);

  // Navigate back
  const handleBack = () => {
    if (projectId) {
      navigate(`/app/projects/${projectId}?tab=proposals`);
    } else if (proposal?.project_id) {
      navigate(`/app/projects/${proposal.project_id}?tab=proposals`);
    } else {
      navigate('/app/proposals');
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

  // Route stability: invalid/missing proposalId should not redirect silently
  if (!proposalId || !isUuid(proposalId)) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Invalid proposal link</h2>
          <p className="text-muted-foreground mb-4">This proposal URL is missing or malformed.</p>
          <Button variant="outline" onClick={() => navigate('/app/proposals')}>
            Back to Proposals
          </Button>
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
                value={draftTitle}
                className="text-lg font-semibold bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1 w-full max-w-md"
                onChange={(e) => handleFieldChange('title', e.target.value)}
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
              {autosave.status === 'saving' && (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Saving...</span>
                </>
              )}
              {autosave.status === 'dirty' && (
                <>
                  <span className="text-muted-foreground">Unsaved</span>
                </>
              )}
              {autosave.status === 'saved' && (
                <>
                  <Check className="h-3.5 w-3.5 text-success" />
                  <span className="text-success">Saved</span>
                </>
              )}
              {autosave.status === 'error' && (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  <button
                    className="text-destructive underline underline-offset-2"
                    onClick={autosave.retry}
                    title={autosave.errorMessage ?? 'Save failed'}
                    type="button"
                  >
                    Error (retry)
                  </button>
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
            proposal={{
              ...proposal,
              title: draftTitle,
              intro_text: draftIntro,
              settings: draftSettings ?? proposal.settings,
            }}
            onFieldChange={handleFieldChange}
            onSettingsChange={handleSettingsChange}
          />
        </div>

        {/* Right Column: Settings & Toggles */}
        <div className="lg:col-span-3">
          <ProposalSettingsPanel
            settings={draftSettings ?? proposal.settings}
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
