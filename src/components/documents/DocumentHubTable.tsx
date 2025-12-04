import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { DocumentRecord, useDeleteDocument } from '@/hooks/useDocumentsHub';
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

export function DocumentHubTable({
  documents,
  onDocumentClick,
  showProjectColumn = true,
  isLoading = false,
}: DocumentHubTableProps) {
  const deleteDocument = useDeleteDocument();

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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Type</TableHead>
          <TableHead>Title</TableHead>
          {showProjectColumn && <TableHead>Project</TableHead>}
          <TableHead>Date</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => {
          const docType = doc.document_type || doc.doc_type || 'other';
          const Icon = TYPE_ICONS[docType] || FileText;
          const colorClass = TYPE_COLORS[docType] || TYPE_COLORS.other;

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
                    {doc.title || doc.file_name}
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
                {doc.tags && doc.tags.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {doc.tags.slice(0, 2).map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {doc.tags.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{doc.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              
              <TableCell className="text-right" onClick={e => e.stopPropagation()}>
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
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => handleArchive(e as any, doc)}
                      className="text-destructive"
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
