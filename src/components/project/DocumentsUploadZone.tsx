import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface DocumentsUploadZoneProps {
  ownerType: 'project' | 'sub' | 'company' | 'worker' | 'global';
  ownerId: string;
  onUploadComplete: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  title: string;
  docType: string;
  description: string;
  tags: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

const DOC_TYPES = [
  { value: 'proposal', label: 'Proposal' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'contract', label: 'Contract' },
  { value: 'COI', label: 'Certificate of Insurance' },
  { value: 'license', label: 'License' },
  { value: 'plan_set', label: 'Plan Set' },
  { value: 'photo', label: 'Photo' },
  { value: 'scope', label: 'Scope Document' },
  { value: 'RFI', label: 'RFI' },
  { value: 'other', label: 'Other' },
];

export function DocumentsUploadZone({
  ownerType,
  ownerId,
  onUploadComplete,
}: DocumentsUploadZoneProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const uploads: UploadFile[] = newFiles.map((file) => ({
      file,
      id: crypto.randomUUID(),
      title: file.name,
      docType: 'other',
      description: '',
      tags: '',
      progress: 0,
      status: 'pending',
    }));

    setFiles((prev) => [...prev, ...uploads]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFileMetadata = (id: string, field: string, value: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    try {
      // Update status
      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f))
      );

      // Generate storage path
      const docId = crypto.randomUUID();
      const ext = uploadFile.file.name.split('.').pop();
      const storagePath = `${ownerType}s/${ownerId}/${docId}/${uploadFile.file.name}`;

      // Upload to storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(storagePath, uploadFile.file);

      if (storageError) throw storageError;

      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: 50 } : f))
      );

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      // Insert document record
      const { error: dbError } = await supabase.from('documents').insert({
        owner_type: ownerType,
        owner_id: ownerId,
        file_name: uploadFile.file.name,
        storage_path: storagePath,
        mime_type: uploadFile.file.type,
        size_bytes: uploadFile.file.size,
        doc_type: uploadFile.docType,
        title: uploadFile.title,
        description: uploadFile.description || null,
        tags: uploadFile.tags ? uploadFile.tags.split(',').map((t) => t.trim()) : null,
        source: 'manual_upload',
        status: 'final',
        file_url: urlData.publicUrl,
      });

      if (dbError) throw dbError;

      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'complete', progress: 100 } : f))
      );

      toast({
        title: 'Success',
        description: `${uploadFile.title} uploaded successfully`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'error', error: error.message, progress: 0 }
            : f
        )
      );
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const uploadAll = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');

    for (const file of pendingFiles) {
      await uploadFile(file);
    }

    onUploadComplete();
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop files here, or
          </p>
          <Button variant="outline" onClick={() => document.getElementById('file-input')?.click()}>
            Browse Files
          </Button>
          <input
            id="file-input"
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Files to Upload ({files.length})</h3>
              <Button onClick={uploadAll} disabled={files.every((f) => f.status !== 'pending')}>
                Upload All
              </Button>
            </div>

            {files.map((uploadFile) => (
              <Card key={uploadFile.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{uploadFile.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    {uploadFile.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadFile.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {uploadFile.status === 'uploading' && (
                    <Progress value={uploadFile.progress} />
                  )}

                  {uploadFile.status === 'error' && (
                    <p className="text-sm text-destructive">{uploadFile.error}</p>
                  )}

                  {uploadFile.status === 'complete' && (
                    <p className="text-sm text-green-600">✓ Uploaded successfully</p>
                  )}

                  {uploadFile.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Title</Label>
                        <Input
                          value={uploadFile.title}
                          onChange={(e) =>
                            updateFileMetadata(uploadFile.id, 'title', e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label>Document Type</Label>
                        <Select
                          value={uploadFile.docType}
                          onValueChange={(v) => updateFileMetadata(uploadFile.id, 'docType', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DOC_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label>Tags (comma-separated)</Label>
                        <Input
                          value={uploadFile.tags}
                          onChange={(e) =>
                            updateFileMetadata(uploadFile.id, 'tags', e.target.value)
                          }
                          placeholder="e.g., kitchen, electrical, change-order"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Description (optional)</Label>
                        <Textarea
                          value={uploadFile.description}
                          onChange={(e) =>
                            updateFileMetadata(uploadFile.id, 'description', e.target.value)
                          }
                          placeholder="Add notes about this document..."
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
