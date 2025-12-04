import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, X } from 'lucide-react';
import { DocumentHubFilters } from '@/components/documents/DocumentHubFilters';
import { DocumentHubTable } from '@/components/documents/DocumentHubTable';
import { DocumentDetailDrawer } from '@/components/documents/DocumentDetailDrawer';
import { useDocumentsList, useUploadDocument, DocumentRecord } from '@/hooks/useDocumentsHub';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDocumentTypeOptions, inferDocumentType, DocumentType } from '@/lib/documents/storagePaths';

interface ProjectDocumentsTabProps {
  projectId: string;
}

export function ProjectDocumentsTab({ projectId }: ProjectDocumentsTabProps) {
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  
  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Array<{
    file: File;
    id: string;
    type: DocumentType;
    status: 'pending' | 'uploading' | 'done' | 'error';
    progress: number;
  }>>([]);
  const [quickUploadType, setQuickUploadType] = useState<DocumentType>('other');

  const { data: documents, isLoading } = useDocumentsList({
    projectId,
    isArchived: false,
  });

  const uploadDocument = useUploadDocument();
  const documentTypes = getDocumentTypeOptions();

  // Client-side filtering
  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    
    return documents.filter(doc => {
      if (typeFilters.length > 0) {
        const docType = doc.document_type || doc.doc_type || 'other';
        if (!typeFilters.includes(docType)) return false;
      }
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          doc.file_name?.toLowerCase().includes(term) ||
          doc.title?.toLowerCase().includes(term) ||
          doc.ai_summary?.toLowerCase().includes(term) ||
          doc.notes?.toLowerCase().includes(term) ||
          doc.tags?.some(tag => tag.toLowerCase().includes(term));
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [documents, typeFilters, searchTerm]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [quickUploadType]);

  const addFiles = (files: File[]) => {
    const newFiles = files.map(file => ({
      file,
      id: crypto.randomUUID(),
      type: inferDocumentType(file.name) || quickUploadType,
      status: 'pending' as const,
      progress: 0,
    }));
    setPendingFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setPendingFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileType = (id: string, type: DocumentType) => {
    setPendingFiles(prev => prev.map(f => f.id === id ? { ...f, type } : f));
  };

  const uploadAllFiles = async () => {
    const pending = pendingFiles.filter(f => f.status === 'pending');
    
    for (const pf of pending) {
      setPendingFiles(prev => 
        prev.map(f => f.id === pf.id ? { ...f, status: 'uploading', progress: 50 } : f)
      );
      
      try {
        await uploadDocument.mutateAsync({
          projectId,
          file: pf.file,
          documentType: pf.type,
          sourceContext: 'project_upload',
        });
        
        setPendingFiles(prev => 
          prev.map(f => f.id === pf.id ? { ...f, status: 'done', progress: 100 } : f)
        );
      } catch {
        setPendingFiles(prev => 
          prev.map(f => f.id === pf.id ? { ...f, status: 'error', progress: 0 } : f)
        );
      }
    }
    
    // Clear completed files after a short delay
    setTimeout(() => {
      setPendingFiles(prev => prev.filter(f => f.status !== 'done'));
    }, 2000);
  };

  const handleDocumentClick = (doc: DocumentRecord) => {
    setSelectedDoc(doc);
    setDetailDrawerOpen(true);
  };

  const pendingCount = pendingFiles.filter(f => f.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card>
        <CardContent className="pt-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Drop files here or click to upload
            </p>
            
            <div className="flex items-center justify-center gap-3">
              <Select value={quickUploadType} onValueChange={(v) => setQuickUploadType(v as DocumentType)}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => document.getElementById('project-file-input')?.click()}
              >
                Browse Files
              </Button>
              <input
                id="project-file-input"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))}
              />
            </div>
          </div>

          {/* Pending files */}
          {pendingFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Files to upload ({pendingFiles.length})</span>
                {pendingCount > 0 && (
                  <Button size="sm" onClick={uploadAllFiles}>
                    Upload All
                  </Button>
                )}
              </div>
              
              {pendingFiles.map(pf => (
                <div key={pf.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{pf.file.name}</span>
                  
                  {pf.status === 'pending' && (
                    <>
                      <Select 
                        value={pf.type} 
                        onValueChange={(v) => updateFileType(pf.id, v as DocumentType)}
                      >
                        <SelectTrigger className="w-[100px] h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {documentTypes.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => removeFile(pf.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  
                  {pf.status === 'uploading' && (
                    <div className="w-20">
                      <Progress value={pf.progress} className="h-1" />
                    </div>
                  )}
                  
                  {pf.status === 'done' && (
                    <Badge variant="default" className="text-xs bg-green-600">Done</Badge>
                  )}
                  
                  {pf.status === 'error' && (
                    <Badge variant="destructive" className="text-xs">Error</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <DocumentHubFilters
        selectedTypes={typeFilters}
        onTypesChange={setTypeFilters}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showProjectFilter={false}
      />

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Project Documents
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
            showProjectColumn={false}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      {selectedDoc && (
        <DocumentDetailDrawer
          documentId={selectedDoc.id}
          open={detailDrawerOpen}
          onOpenChange={setDetailDrawerOpen}
        />
      )}
    </div>
  );
}
