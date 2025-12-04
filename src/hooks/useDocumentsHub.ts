import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  getDocumentBucket, 
  getDocumentStoragePath, 
  inferDocumentType,
  DocumentType 
} from '@/lib/documents/storagePaths';

// ============================================
// AI Analysis Hook (TEMPORARILY DISABLED)
// ============================================

/**
 * Run AI analysis on a document
 * TEMPORARILY DISABLED - uncomment the supabase.functions.invoke call to re-enable
 */
export function useAnalyzeDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (documentId: string) => {
      // TEMPORARILY DISABLED - AI analysis is disabled
      // To re-enable, uncomment the block below and remove this return
      console.log('[AI DISABLED] Skipping AI analysis for document:', documentId);
      return { disabled: true, message: 'AI analysis is temporarily disabled' };

      /* UNCOMMENT TO RE-ENABLE AI ANALYSIS
      const { data, error } = await supabase.functions.invoke('analyze-document', {
        body: { documentId },
      });

      if (error) throw error;
      return data;
      */
    },
    onSuccess: (_, documentId) => {
      // TEMPORARILY DISABLED - Don't show success toast for disabled feature
      // toast({ title: 'AI analysis completed' });
      queryClient.invalidateQueries({ queryKey: ['documents-hub'] });
      queryClient.invalidateQueries({ queryKey: ['documents-list'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    },
    onError: (error: any) => {
      console.error('AI analysis error:', error);
      toast({
        title: 'AI analysis failed',
        description: error.message || 'You can try again.',
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Types
// ============================================

export interface DocumentRecord {
  id: string;
  project_id: string | null;
  document_type: string | null;
  doc_type: string | null;
  title: string | null;
  file_name: string;
  file_url: string;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
  created_at: string | null;
  source_context: string | null;
  related_cost_id: string | null;
  related_invoice_id: string | null;
  is_private: boolean;
  is_archived: boolean;
  notes: string | null;
  tags: string[] | null;
  ai_status: string | null;
  ai_doc_type: string | null;
  ai_summary: string | null;
  ai_last_run_status: string | null;
  ai_last_run_at: string | null;
  ai_title: string | null;
  ai_counterparty_name: string | null;
  ai_total_amount: number | null;
  ai_tags: string[] | null;
  ai_effective_date: string | null;
  ai_expiration_date: string | null;
  ai_currency: string | null;
  owner_type: string | null;
  owner_id: string | null;
  // Joined data
  projects?: { id: string; project_name: string } | null;
  cost_codes?: { code: string; name: string } | null;
}

export interface DocumentsQueryParams {
  projectId?: string | null;
  documentTypes?: string[];
  searchTerm?: string;
  isArchived?: boolean;
  pageSize?: number;
}

export interface UploadDocumentParams {
  projectId?: string | null;
  file: File;
  documentType?: DocumentType;
  title?: string;
  sourceContext?: string;
  relatedCostId?: string | null;
  relatedInvoiceId?: string | null;
  notes?: string;
  tags?: string[];
}

export interface UpdateDocumentParams {
  id: string;
  title?: string;
  documentType?: string;
  notes?: string;
  isPrivate?: boolean;
  isArchived?: boolean;
}

// ============================================
// Hooks
// ============================================

/**
 * Fetch documents with filtering and pagination
 */
export function useDocumentsHub(params: DocumentsQueryParams = {}) {
  const { 
    projectId, 
    documentTypes, 
    searchTerm, 
    isArchived = false,
    pageSize = 50 
  } = params;

  return useInfiniteQuery({
    queryKey: ['documents-hub', projectId, documentTypes, searchTerm, isArchived],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('documents')
        .select(`
          *,
          projects (id, project_name),
          cost_codes (code, name)
        `)
        .eq('is_archived', isArchived)
        .order('uploaded_at', { ascending: false })
        .range(pageParam * pageSize, (pageParam + 1) * pageSize - 1);

      // Filter by project
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      // Filter by document types
      if (documentTypes && documentTypes.length > 0) {
        query = query.or(
          documentTypes.map(t => `document_type.eq.${t},doc_type.eq.${t}`).join(',')
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return {
        documents: data as DocumentRecord[],
        nextPage: data?.length === pageSize ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 30000,
  });
}

/**
 * Simple documents query (non-paginated) for smaller lists
 */
export function useDocumentsList(params: { projectId?: string | null; isArchived?: boolean } = {}) {
  const { projectId, isArchived = false } = params;

  return useQuery({
    queryKey: ['documents-list', projectId, isArchived],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select(`
          *,
          projects (id, project_name),
          cost_codes (code, name)
        `)
        .eq('is_archived', isArchived)
        .order('uploaded_at', { ascending: false })
        .limit(200);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DocumentRecord[];
    },
    staleTime: 30000,
  });
}

/**
 * Upload a document to storage and create database record
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: UploadDocumentParams) => {
      const {
        projectId,
        file,
        documentType: providedType,
        title,
        sourceContext,
        relatedCostId,
        relatedInvoiceId,
        notes,
        tags,
      } = params;

      // Determine document type
      const documentType = providedType || inferDocumentType(file.name, sourceContext);
      
      // Get storage bucket and path
      const bucket = getDocumentBucket(projectId);
      const storagePath = getDocumentStoragePath({
        projectId,
        documentType,
        fileName: file.name,
      });

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(storagePath);

      // Create database record
      const { data: docData, error: dbError } = await supabase
        .from('documents')
        .insert({
          project_id: projectId || null,
          owner_type: projectId ? 'project' : 'global',
          owner_id: projectId || null,
          document_type: documentType,
          doc_type: documentType,
          title: title || file.name.replace(/\.[^/.]+$/, ''),
          file_name: file.name,
          file_url: urlData.publicUrl,
          storage_path: storagePath,
          mime_type: file.type,
          size_bytes: file.size,
          file_size: file.size,
          source_context: sourceContext || 'manual_upload',
          source: 'manual_upload',
          related_cost_id: relatedCostId || null,
          related_invoice_id: relatedInvoiceId || null,
          notes: notes || null,
          tags: tags || null,
          is_private: false,
          is_archived: false,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return docData;
    },
    onSuccess: (data) => {
      toast({ title: 'Document uploaded successfully' });
      queryClient.invalidateQueries({ queryKey: ['documents-hub'] });
      queryClient.invalidateQueries({ queryKey: ['documents-list'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update document metadata
 */
export function useUpdateDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: UpdateDocumentParams) => {
      const { id, ...updates } = params;
      
      const updateData: Record<string, any> = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.documentType !== undefined) {
        updateData.document_type = updates.documentType;
        updateData.doc_type = updates.documentType;
      }
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.isPrivate !== undefined) updateData.is_private = updates.isPrivate;
      if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived;

      const { data, error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Document updated' });
      queryClient.invalidateQueries({ queryKey: ['documents-hub'] });
      queryClient.invalidateQueries({ queryKey: ['documents-list'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Soft delete a document (set is_archived = true)
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('documents')
        .update({ is_archived: true })
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Document archived' });
      queryClient.invalidateQueries({ queryKey: ['documents-hub'] });
      queryClient.invalidateQueries({ queryKey: ['documents-list'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Manage document tags
 */
export function useDocumentTags(documentId: string | null) {
  const queryClient = useQueryClient();

  const tagsQuery = useQuery({
    queryKey: ['document-tags', documentId],
    queryFn: async () => {
      if (!documentId) return [];
      
      const { data, error } = await supabase
        .from('document_tags')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!documentId,
  });

  const addTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      if (!documentId) throw new Error('No document ID');
      
      const { error } = await supabase
        .from('document_tags')
        .insert({ document_id: documentId, tag });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-tags', documentId] });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('document_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-tags', documentId] });
    },
  });

  return {
    tags: tagsQuery.data || [],
    isLoading: tagsQuery.isLoading,
    addTag: addTagMutation.mutate,
    removeTag: removeTagMutation.mutate,
  };
}
