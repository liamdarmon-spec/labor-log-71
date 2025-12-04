import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  MoreHorizontal,
  Archive,
  Edit,
  Building2,
  Shield,
  FileCheck,
  FileSignature,
  Camera,
  Wallet,
  Sparkles,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format, differenceInMinutes } from 'date-fns';
import { DocumentRecord, useDeleteDocument, useAnalyzeDocument } from '@/hooks/useDocumentsHub';
import { getDocumentTypeLabel } from '@/lib/documents/storagePaths';

interface DocumentHubTableProps {
  documents: DocumentRecord[];
  onDocumentClick: (doc: DocumentRecord) => void;
  showProjectColumn?: boolean;
  isLoading?: boolean;
}

const TYPE_ICONS: Record<string, typeof FileText> = {
  invoice: FileCheck,
  receipt: Wallet,
  contract: FileSignature,
  permit: Shield,
  plan: Building2,
  photo: Camera,
  proposal: FileText,
  COI: Shield,
  license: Shield,
  other: FileText,
};

const TYPE_COLORS: Record<string, string> = {
  invoice: 'bg-purple-500',
  receipt: 'bg-green-500',
  contract: 'bg-orange-500',
  permit: 'bg-red-500',
  plan: 'bg-blue-500',
  photo: 'bg-pink-500',
  proposal: 'bg-yellow-500',
  COI: 'bg-cyan-500',
  license: 'bg-indigo-500',
  other: 'bg-muted-foreground',
};

function getAIStatusBadge(status: string | null, lastRunAt: string | null) {
  if (!status && !lastRunAt) {
    return (
      <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
        <Clock className="h-3 w-3" />
        Not analyzed
      </Badge>
    );
  }

  if (status === 'pending' || status === 'running' || status === 'queued') {
    return (
      <Badge variant="secondary" className="text-xs gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </Badge>
    );
  }

  if (status?.startsWith('success') || (lastRunAt && !status?.startsWith('error'))) {
    return (
      <Badge variant="default" className="text-xs gap-1 bg-emerald-600">
        <CheckCircle className="h-3 w-3" />
        Analyzed
      </Badge>
    );
  }

  if (status?.startsWith('error')) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className="text-xs gap-1 cursor-help">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs max-w-[200px]">{status}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
      <Clock className="h-3 w-3" />
      Not analyzed
    </Badge>
  );
}

export function DocumentHubTable({
  documents,
  onDocumentClick,
  showProjectColumn = true,
  isLoading = false,
}: DocumentHubTableProps) {
  const deleteDocument = useDeleteDocument();
  const analyzeDocument = useAnalyzeDocument();
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());

  const handleDownload = (e: React.MouseEvent, doc: DocumentRecord) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = doc.file_url;
    link.download = doc.file_name;
    link.click();
  };

  const handleView = (e: React.MouseEvent, doc: DocumentRecord) => {
    e.stopPropagation();
    window.open(doc.file_url, '_blank');
  };

  const handleArchive = (e: React.MouseEvent, doc: DocumentRecord) => {
    e.stopPropagation();
    deleteDocument.mutate(doc.id);
  };

  const handleAnalyze = async (e: React.MouseEvent, doc: DocumentRecord) => {
    e.stopPropagation();
    
    // Guard: if already analyzing this doc, don't re-run
    if (analyzingIds.has(doc.id)) return;
    
    // Guard: if status is running/pending, show tooltip instead
    const status = doc.ai_last_run_status;
    if (status === 'pending' || status === 'running' || status === 'queued') {
      return;
    }

    // Guard: if recently analyzed (within 2 minutes), skip
    if (doc.ai_last_run_at) {
      const lastRun = new Date(doc.ai_last_run_at);
      if (differenceInMinutes(new Date(), lastRun) < 2) {
        return; // Don't re-analyze too quickly
      }
    }

    setAnalyzingIds(prev => new Set(prev).add(doc.id));
    
    try {
      await analyzeDocument.mutateAsync(doc.id);
    } finally {
      setAnalyzingIds(prev => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
    }
  };

  const isAnalyzing = (docId: string) => analyzingIds.has(docId);
  
  const canAnalyze = (doc: DocumentRecord) => {
    if (analyzingIds.has(doc.id)) return false;
    const status = doc.ai_last_run_status;
    if (status === 'pending' || status === 'running' || status === 'queued') return false;
    return true;
  };

  const wasRecentlyAnalyzed = (doc: DocumentRecord) => {
    if (!doc.ai_last_run_at) return false;
    return differenceInMinutes(new Date(), new Date(doc.ai_last_run_at)) < 2;
  };

  const getAnalyzeButtonLabel = (doc: DocumentRecord) => {
    if (!doc.ai_last_run_at && !doc.ai_last_run_status) return 'Run AI';
    if (doc.ai_last_run_status?.startsWith('error')) return 'Retry AI';
    return 'Re-run';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading documents...
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No documents found</p>
        <p className="text-sm">Upload your first document to get started</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Type</TableHead>
            <TableHead>Title</TableHead>
            {showProjectColumn && <TableHead>Project</TableHead>}
            <TableHead>Date</TableHead>
            <TableHead className="w-[110px]">AI Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const docType = doc.document_type || doc.doc_type || 'other';
            const Icon = TYPE_ICONS[docType] || FileText;
            const colorClass = TYPE_COLORS[docType] || TYPE_COLORS.other;
            const analyzing = isAnalyzing(doc.id);
            const recentlyAnalyzed = wasRecentlyAnalyzed(doc);

            return (
              <TableRow
                key={doc.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onDocumentClick(doc)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${colorClass}`}>
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-xs capitalize hidden sm:inline">
                      {getDocumentTypeLabel(docType as any)}
                    </span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-medium truncate max-w-[200px] sm:max-w-[300px]">
                      {doc.ai_title || doc.title || doc.file_name}
                    </p>
                    {doc.ai_summary && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                        {doc.ai_summary}
                      </p>
                    )}
                  </div>
                </TableCell>
                
                {showProjectColumn && (
                  <TableCell>
                    {doc.projects?.project_name ? (
                      <Badge variant="outline" className="text-xs">
                        {doc.projects.project_name}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Company-wide</span>
                    )}
                  </TableCell>
                )}
                
                <TableCell className="text-sm text-muted-foreground">
                  {doc.uploaded_at 
                    ? format(new Date(doc.uploaded_at), 'MMM d, yyyy')
                    : doc.created_at 
                      ? format(new Date(doc.created_at), 'MMM d, yyyy')
                      : '-'
                  }
                </TableCell>

                <TableCell>
                  {analyzing ? (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing
                    </Badge>
                  ) : (
                    getAIStatusBadge(doc.ai_last_run_status, doc.ai_last_run_at)
                  )}
                </TableCell>
                
                <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {/* Inline AI button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={!canAnalyze(doc) || analyzing}
                          onClick={(e) => handleAnalyze(e, doc)}
                        >
                          {analyzing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : doc.ai_last_run_at ? (
                            <RefreshCw className="h-3.5 w-3.5" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          <span className="ml-1 hidden sm:inline">{getAnalyzeButtonLabel(doc)}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {!canAnalyze(doc) ? (
                          <p>Analysis already in progress</p>
                        ) : recentlyAnalyzed ? (
                          <p>Recently analyzed. Wait a moment before re-running.</p>
                        ) : (
                          <p>{getAnalyzeButtonLabel(doc)} Analysis</p>
                        )}
                      </TooltipContent>
                    </Tooltip>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleView(e as any, doc)}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleDownload(e as any, doc)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDocumentClick(doc)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => handleAnalyze(e as any, doc)}
                          disabled={!canAnalyze(doc)}
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          {getAnalyzeButtonLabel(doc)} Analysis
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={(e) => handleArchive(e as any, doc)}
                          className="text-destructive"
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}