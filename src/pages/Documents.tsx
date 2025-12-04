import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, FileCheck, Receipt, FileSignature, Sparkles, Loader2 } from 'lucide-react';
import { DocumentHubFilters } from '@/components/documents/DocumentHubFilters';
import { DocumentHubTable } from '@/components/documents/DocumentHubTable';
import { UploadDocumentDialog } from '@/components/documents/UploadDocumentDialog';
import { DocumentDetailDrawer } from '@/components/documents/DocumentDetailDrawer';
import { useDocumentsList, DocumentRecord, useAnalyzeDocument } from '@/hooks/useDocumentsHub';
import { DocumentType } from '@/lib/documents/storagePaths';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Documents() {
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadDefaultType, setUploadDefaultType] = useState<DocumentType>('other');
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  const { toast } = useToast();
  const analyzeDocument = useAnalyzeDocument();

  const { data: documents, isLoading } = useDocumentsList({
    projectId: projectFilter,
    isArchived: false,
  });

  // Client-side filtering for search and types
  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    
    return documents.filter(doc => {
      // Type filter
      if (typeFilters.length > 0) {
        const docType = doc.document_type || doc.doc_type || 'other';
        if (!typeFilters.includes(docType)) return false;
      }
      
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          doc.file_name?.toLowerCase().includes(term) ||
          doc.title?.toLowerCase().includes(term) ||
          doc.ai_summary?.toLowerCase().includes(term) ||
          doc.ai_title?.toLowerCase().includes(term) ||
          doc.notes?.toLowerCase().includes(term) ||
          doc.tags?.some(tag => tag.toLowerCase().includes(term));
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [documents, typeFilters, searchTerm]);

  // Stats including AI status
  const stats = useMemo(() => {
    if (!documents) return { total: 0, invoices: 0, receipts: 0, contracts: 0, analyzed: 0, unanalyzed: 0 };
    
    const analyzed = documents.filter(d => 
      d.ai_last_run_status?.startsWith('success') || 
      (d.ai_last_run_at && !d.ai_last_run_status?.startsWith('error'))
    ).length;
    
    return {
      total: documents.length,
      invoices: documents.filter(d => d.document_type === 'invoice' || d.doc_type === 'invoice').length,
      receipts: documents.filter(d => d.document_type === 'receipt' || d.doc_type === 'receipt').length,
      contracts: documents.filter(d => d.document_type === 'contract' || d.doc_type === 'contract').length,
      analyzed,
      unanalyzed: documents.length - analyzed,
    };
  }, [documents]);

  // Get documents that need analysis
  const unanalyzedDocs = useMemo(() => {
    if (!documents) return [];
    return documents.filter(d => 
      !d.ai_last_run_at || 
      d.ai_last_run_status?.startsWith('error')
    );
  }, [documents]);

  // Bulk analyze handler
  const handleBulkAnalyze = async () => {
    if (unanalyzedDocs.length === 0) return;
    
    setBulkAnalyzing(true);
    setBulkProgress({ current: 0, total: unanalyzedDocs.length });
    
    for (let i = 0; i < unanalyzedDocs.length; i++) {
      try {
        await analyzeDocument.mutateAsync(unanalyzedDocs[i].id);
      } catch (error) {
        // Continue with next doc on error
      }
      setBulkProgress({ current: i + 1, total: unanalyzedDocs.length });
    }
    
    setBulkAnalyzing(false);
    toast({
      title: 'Bulk analysis complete',
      description: `Analyzed ${unanalyzedDocs.length} documents`,
    });
  };

  const handleUploadWithType = (type: DocumentType) => {
    setUploadDefaultType(type);
    setUploadDialogOpen(true);
  };

  const handleDocumentClick = (doc: DocumentRecord) => {
    setSelectedDoc(doc);
    setDetailDrawerOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Documents</h1>
            <p className="text-sm text-muted-foreground">
              Central document hub for all your project files
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleUploadWithType('invoice')}>
                <FileCheck className="mr-2 h-4 w-4" />
                Upload Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUploadWithType('receipt')}>
                <Receipt className="mr-2 h-4 w-4" />
                Upload Receipt
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUploadWithType('contract')}>
                <FileSignature className="mr-2 h-4 w-4" />
                Upload Contract
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUploadWithType('permit')}>
                Upload Permit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUploadWithType('plan')}>
                Upload Plan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUploadWithType('other')}>
                <FileText className="mr-2 h-4 w-4" />
                Upload Other
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Documents</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-emerald-600">{stats.analyzed}</div>
              <p className="text-xs text-muted-foreground">AI Analyzed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">{stats.invoices}</div>
              <p className="text-xs text-muted-foreground">Invoices</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">{stats.receipts}</div>
              <p className="text-xs text-muted-foreground">Receipts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">{stats.contracts}</div>
              <p className="text-xs text-muted-foreground">Contracts</p>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Analyze Button */}
        {stats.unanalyzed > 0 && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleBulkAnalyze}
              disabled={bulkAnalyzing}
            >
              {bulkAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing {bulkProgress.current}/{bulkProgress.total}...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze {stats.unanalyzed} Unprocessed
                </>
              )}
            </Button>
            {bulkAnalyzing && (
              <span className="text-sm text-muted-foreground">
                Please wait...
              </span>
            )}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <DocumentHubFilters
              projectId={projectFilter}
              onProjectChange={setProjectFilter}
              selectedTypes={typeFilters}
              onTypesChange={setTypeFilters}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              showProjectFilter={true}
            />
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              All Documents
              {filteredDocuments.length !== (documents?.length || 0) && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({filteredDocuments.length} of {documents?.length || 0})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentHubTable
              documents={filteredDocuments}
              onDocumentClick={handleDocumentClick}
              showProjectColumn={true}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Upload Dialog */}
      <UploadDocumentDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        defaultType={uploadDefaultType}
      />

      {/* Detail Drawer */}
      {selectedDoc && (
        <DocumentDetailDrawer
          documentId={selectedDoc.id}
          open={detailDrawerOpen}
          onOpenChange={setDetailDrawerOpen}
        />
      )}
    </Layout>
  );
}
