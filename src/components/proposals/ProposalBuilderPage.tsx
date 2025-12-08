// src/components/proposals/ProposalBuilderPage.tsx
// Modern 3-column proposal builder with autosave

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  FileText,
  Download,
  Eye,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useProposalData, useUpdateProposalField, useUpdateProposalSettings, useRefreshProposalFromEstimate, ProposalSettings } from '@/hooks/useProposalData';
import { ProposalContextPanel } from './ProposalContextPanel';
import { ProposalContentEditor } from './ProposalContentEditor';
import { ProposalSettingsPanel } from './ProposalSettingsPanel';
import { ProposalPDFPreview } from './ProposalPDFPreview';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function ProposalBuilderPage() {
  const { projectId, proposalId } = useParams<{ projectId: string; proposalId: string }>();
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

  // Update settings immediately
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

  // Download PDF
  const handleDownloadPDF = useCallback(() => {
    setShowPDFPreview(true);
  }, []);

  // Status badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'sent': return 'default';
      case 'accepted': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4 p-6">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-12 gap-6">
            <Skeleton className="col-span-3 h-96" />
            <Skeleton className="col-span-6 h-96" />
            <Skeleton className="col-span-3 h-96" />
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
            This proposal may have been deleted or you don't have access.
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
    <Layout>
      {/* Top Bar */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-4 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/projects/${projectId}?tab=proposals`)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="min-w-0">
              <input
                type="text"
                defaultValue={proposal.title}
                className="text-lg font-semibold bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1 w-full"
                onBlur={(e) => {
                  if (e.target.value !== proposal.title) {
                    handleFieldChange('title', e.target.value);
                  }
                }}
              />
              <div className="flex items-center gap-2 mt-1 px-2">
                <Badge variant={getStatusColor(proposal.status)}>
                  {proposal.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {proposal.project?.project_name}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Save Status + Actions */}
          <div className="flex items-center gap-3">
            {/* Save Status */}
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Saved</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">Save failed</span>
                </>
              )}
            </div>

            <Separator orientation="vertical" className="h-6" />

            <Button variant="outline" size="sm" onClick={() => setShowPDFPreview(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
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
