import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DocumentDetailDrawer } from '@/components/documents/DocumentDetailDrawer';
import {
  FileText,
  Download,
  Edit,
  Trash2,
  Search,
  ExternalLink,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface Document {
  id: string;
  title: string | null;
  file_name: string;
  doc_type: string | null;
  tags: string[] | null;
  uploaded_at: string;
  uploaded_by: string | null;
  source: string | null;
  file_url: string;
  storage_path: string | null;
  ai_doc_type: string | null;
  ai_summary: string | null;
  ai_last_run_status: string | null;
  ai_last_run_at: string | null;
}

interface DocumentsTableProps {
  ownerType: 'project' | 'sub' | 'company' | 'worker' | 'global';
  ownerId: string;
  onRefresh?: number;
}

export function DocumentsTable({ ownerType, ownerId, onRefresh }: DocumentsTableProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, [ownerId, onRefresh]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_type', ownerType)
        .eq('owner_id', ownerId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId: string, storagePath: string | null) => {
    try {
      // Delete from storage
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([storagePath]);

        if (storageError) throw storageError;
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'Document deleted',
      });

      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  const getAIBadge = (doc: Document) => {
    if (!doc.ai_last_run_status) {
      return (
        <Badge variant="outline" className="gap-1 text-xs">
          <Sparkles className="h-3 w-3" />
          Not Analyzed
        </Badge>
      );
    }

    const status = doc.ai_last_run_status.split(':')[0];
    if (status === 'success') {
      return (
        <Badge variant="default" className="gap-1 text-xs bg-green-600">
          <CheckCircle className="h-3 w-3" />
          AI
        </Badge>
      );
    } else if (status === 'pending') {
      return (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Clock className="h-3 w-3" />
          Processing
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="gap-1 text-xs">
          <XCircle className="h-3 w-3" />
          Error
        </Badge>
      );
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
      doc.ai_summary?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || doc.doc_type === typeFilter || doc.ai_doc_type === typeFilter;

    return matchesSearch && matchesType;
  });

  if (loading) {
    return <div>Loading documents...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Documents</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="COI">COI</SelectItem>
                <SelectItem value="license">License</SelectItem>
                <SelectItem value="plan_set">Plan Set</SelectItem>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredDocs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No documents found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => (
                <TableRow 
                  key={doc.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    setDetailDrawerOpen(true);
                  }}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{doc.title || doc.file_name}</p>
                      {doc.ai_summary && (
                        <p className="text-xs text-muted-foreground mt-1">{doc.ai_summary}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">
                        {doc.doc_type || doc.ai_doc_type || 'Unknown'}
                      </Badge>
                      {getAIBadge(doc)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {doc.tags && doc.tags.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {doc.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {doc.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{doc.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {doc.source || 'manual'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc.file_url, doc.file_name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.id, doc.storage_path)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <DocumentDetailDrawer
        documentId={selectedDocId}
        open={detailDrawerOpen}
        onOpenChange={(open) => {
          setDetailDrawerOpen(open);
          if (!open) {
            setSelectedDocId(null);
            // Refresh documents after closing detail drawer
            fetchDocuments();
          }
        }}
      />
    </Card>
  );
}
