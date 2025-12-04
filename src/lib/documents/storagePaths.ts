/**
 * Document storage path utilities
 */

export type DocumentType = 
  | 'invoice' 
  | 'receipt' 
  | 'contract' 
  | 'permit' 
  | 'plan' 
  | 'photo' 
  | 'proposal'
  | 'COI'
  | 'license'
  | 'other';

export interface StoragePathParams {
  projectId?: string | null;
  documentType: DocumentType;
  fileName: string;
}

/**
 * Get the storage bucket name based on whether it's a project doc or company-wide doc
 */
export function getDocumentBucket(projectId?: string | null): string {
  return projectId ? 'project-docs' : 'company-docs';
}

/**
 * Get the full storage path for a document
 * 
 * For project-level docs: {project_id}/{document_type}/{yyyy}/{mm}/{filename}
 * For company-level docs: global/{document_type}/{yyyy}/{mm}/{filename}
 */
export function getDocumentStoragePath(params: StoragePathParams): string {
  const { projectId, documentType, fileName } = params;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  // Sanitize filename - remove special chars, keep extension
  const sanitizedName = sanitizeFileName(fileName);
  
  // Add unique identifier to prevent collisions
  const uniqueId = crypto.randomUUID().slice(0, 8);
  const nameParts = sanitizedName.split('.');
  const ext = nameParts.length > 1 ? nameParts.pop() : '';
  const baseName = nameParts.join('.');
  const uniqueFileName = ext ? `${baseName}-${uniqueId}.${ext}` : `${baseName}-${uniqueId}`;
  
  if (projectId) {
    return `${projectId}/${documentType}/${year}/${month}/${uniqueFileName}`;
  }
  
  return `global/${documentType}/${year}/${month}/${uniqueFileName}`;
}

/**
 * Sanitize a filename for storage
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

/**
 * Infer document type from filename
 */
export function inferDocumentType(fileName: string, sourceContext?: string | null): DocumentType {
  // First check source context
  if (sourceContext) {
    const ctx = sourceContext.toLowerCase();
    if (ctx.includes('invoice') || ctx.includes('billing')) return 'invoice';
    if (ctx.includes('receipt') || ctx.includes('cost') || ctx.includes('expense')) return 'receipt';
    if (ctx.includes('contract') || ctx.includes('proposal')) return 'contract';
    if (ctx.includes('permit') || ctx.includes('inspection')) return 'permit';
    if (ctx.includes('plan') || ctx.includes('drawing')) return 'plan';
    if (ctx.includes('photo') || ctx.includes('image')) return 'photo';
  }
  
  // Then check filename
  const lowerName = fileName.toLowerCase();
  
  if (lowerName.includes('invoice')) return 'invoice';
  if (lowerName.includes('receipt')) return 'receipt';
  if (lowerName.includes('permit')) return 'permit';
  if (lowerName.includes('contract') || lowerName.includes('agreement')) return 'contract';
  if (lowerName.includes('plan') || lowerName.includes('drawing') || lowerName.includes('blueprint')) return 'plan';
  if (lowerName.includes('coi') || lowerName.includes('insurance')) return 'COI';
  if (lowerName.includes('license')) return 'license';
  if (lowerName.includes('proposal')) return 'proposal';
  
  // Check file extension for photos
  const photoExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];
  if (photoExts.some(ext => lowerName.endsWith(ext))) return 'photo';
  
  return 'other';
}

/**
 * Get a display label for a document type
 */
export function getDocumentTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    invoice: 'Invoice',
    receipt: 'Receipt',
    contract: 'Contract',
    permit: 'Permit',
    plan: 'Plan',
    photo: 'Photo',
    proposal: 'Proposal',
    COI: 'Certificate of Insurance',
    license: 'License',
    other: 'Other',
  };
  return labels[type] || 'Other';
}

/**
 * Get all document type options for dropdowns
 */
export function getDocumentTypeOptions(): Array<{ value: DocumentType; label: string }> {
  return [
    { value: 'invoice', label: 'Invoice' },
    { value: 'receipt', label: 'Receipt' },
    { value: 'contract', label: 'Contract' },
    { value: 'permit', label: 'Permit' },
    { value: 'plan', label: 'Plan' },
    { value: 'photo', label: 'Photo' },
    { value: 'proposal', label: 'Proposal' },
    { value: 'COI', label: 'Certificate of Insurance' },
    { value: 'license', label: 'License' },
    { value: 'other', label: 'Other' },
  ];
}
