import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { useUploadDocument, UploadDocumentParams } from '@/hooks/useDocumentsHub';
import { getDocumentTypeOptions, inferDocumentType, DocumentType } from '@/lib/documents/storagePaths';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string | null;
  defaultType?: DocumentType;
  sourceContext?: string;
}

interface FileToUpload {
  file: File;
  id: string;
  title: string;
  documentType: DocumentType;
  notes: string;
  tags: string;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  projectId: initialProjectId,
  defaultType = 'other',
  sourceContext,
}: UploadDocumentDialogProps) {
  const [files, setFiles] = useState<FileToUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(initialProjectId || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // AI auto-analysis temporarily disabled
  // const [autoRunAI, setAutoRunAI] = useState(true);

  const uploadDocument = useUploadDocument();
  // AI analysis hook - temporarily not used
  // const analyzeDocument = useAnalyzeDocument();
  const { toast } = useToast();

  const { data: projects } = useQuery({
    queryKey: ['projects-for-upload'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name');
      if (error) throw error;
      return data;
    },
  });

  const documentTypes = getDocumentTypeOptions();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [defaultType, sourceContext]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const uploads: FileToUpload[] = newFiles.map((file) => ({
      file,
      id: crypto.randomUUID(),
      title: file.name.replace(/\.[^/.]+$/, ''),
      documentType: inferDocumentType(file.name, sourceContext) || defaultType,
      notes: '',
      tags: '',
    }));
    setFiles((prev) => [...prev, ...uploads]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFile = (id: string, field: keyof FileToUpload, value: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const handleUploadAll = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    const total = files.length;
    let completed = 0;
    const uploadedDocIds: string[] = [];

    for (const fileData of files) {
      try {
        const result = await uploadDocument.mutateAsync({
          projectId,
          file: fileData.file,
          documentType: fileData.documentType,
          title: fileData.title,
          sourceContext,
          notes: fileData.notes || undefined,
          tags: fileData.tags ? fileData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        });
        
        if (result?.id) {
          uploadedDocIds.push(result.id);
        }
        
        completed++;
        setUploadProgress((completed / total) * 100);
      } catch (error) {
        // Error already handled by mutation
      }
    }

    // AI auto-analysis TEMPORARILY DISABLED
    // Documents upload without triggering AI analysis
    if (uploadedDocIds.length > 0) {
      toast({
        title: 'Upload successful',
        description: `${uploadedDocIds.length} document(s) uploaded`,
      });
    }

    setIsUploading(false);
    setFiles([]);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!isUploading) {
      setFiles([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Project selector (if not pre-set) */}
          {!initialProjectId && (
            <div>
              <Label>Project (optional)</Label>
              <Select value={projectId || 'none'} onValueChange={(v) => setProjectId(v === 'none' ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Company-wide (no project)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Company-wide (no project)</SelectItem>
                  {projects?.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop files here, or
            </p>
            <Button variant="outline" size="sm" onClick={() => document.getElementById('upload-input')?.click()}>
              Browse Files
            </Button>
            <input
              id="upload-input"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* AI auto-analysis toggle - TEMPORARILY HIDDEN
          <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Auto-run AI analysis after upload</span>
            </div>
            <Switch
              checked={autoRunAI}
              onCheckedChange={setAutoRunAI}
              disabled={isUploading}
            />
          </div>
          */}

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Files to upload ({files.length})</h4>
              </div>

              {files.map((fileData) => (
                <div key={fileData.id} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{fileData.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeFile(fileData.id)}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Title</Label>
                      <Input
                        value={fileData.title}
                        onChange={(e) => updateFile(fileData.id, 'title', e.target.value)}
                        disabled={isUploading}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={fileData.documentType}
                        onValueChange={(v) => updateFile(fileData.id, 'documentType', v)}
                        disabled={isUploading}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {documentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Tags (comma-separated)</Label>
                    <Input
                      value={fileData.tags}
                      onChange={(e) => updateFile(fileData.id, 'tags', e.target.value)}
                      placeholder="e.g., kitchen, phase-1"
                      disabled={isUploading}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-muted-foreground">
                Uploading... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUploadAll} disabled={files.length === 0 || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {files.length > 0 && `(${files.length})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
