import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Trash2, Search, ExternalLink } from 'lucide-react';
import { useProjectsSimple } from '@/hooks/useProjects';
import { useSubsSimple } from '@/hooks/useSubs';

interface Document {
  id: string;
  title: string | null;
  file_name: string;
  doc_type: string | null;
  tags: string[] | null;
  uploaded_at: string;
  owner_type: string | null;
  owner_id: string | null;
  source: string | null;
  file_url: string;
  storage_path: string | null;
}

export function DocumentsTab() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerTypeFilter, setOwnerTypeFilter] = useState<string>('all');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const { data: docsData, error } = await supabase
        .from('documents')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(docsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getOwnerName = (doc: Document) => {
    if (!doc.owner_type || !doc.owner_id) return '-';

    if (doc.owner_type === 'project') {
      const project = projects.find((p) => p.id === doc.owner_id);
      return project?.project_name || 'Unknown Project';
    } else if (doc.owner_type === 'sub') {
      const sub = subs.find((s) => s.id === doc.owner_id);
      return sub?.name || 'Unknown Sub';
    }

    return doc.owner_type;
  };

  const handleDelete = async (docId: string, storagePath: string | null) => {
    try {
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([storagePath]);
        if (storageError) throw storageError;
      }

      const { error: dbError } = await supabase.from('documents').delete().eq('id', docId);
      if (dbError) throw dbError;

      toast({ title: 'Success', description: 'Document deleted' });
      fetchAllData();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getOwnerName(doc).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOwnerType =
      ownerTypeFilter === 'all' || doc.owner_type === ownerTypeFilter;
    const matchesDocType = docTypeFilter === 'all' || doc.doc_type === docTypeFilter;

    return matchesSearch && matchesOwnerType && matchesDocType;
  });

  if (loading) {
    return <div>Loading documents...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Documents</CardTitle>
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, file name, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={ownerTypeFilter} onValueChange={setOwnerTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Owner Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="project">Projects</SelectItem>
              <SelectItem value="sub">Subs</SelectItem>
              <SelectItem value="company">Companies</SelectItem>
              <SelectItem value="global">Global</SelectItem>
            </SelectContent>
          </Select>
          <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Doc Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Docs</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="invoice">Invoice</SelectItem>
              <SelectItem value="receipt">Receipt</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="COI">COI</SelectItem>
              <SelectItem value="license">License</SelectItem>
              <SelectItem value="plan_set">Plan Set</SelectItem>
              <SelectItem value="photo">Photo</SelectItem>
            </SelectContent>
          </Select>
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
                <TableHead>Owner Type</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Doc Type</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    {doc.title || doc.file_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{doc.owner_type || '-'}</Badge>
                  </TableCell>
                  <TableCell>{getOwnerName(doc)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{doc.doc_type || '-'}</Badge>
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
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
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
    </Card>
  );
}
