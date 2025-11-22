import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProjectDocumentsTabProps {
  projectId: string;
}

export function ProjectDocumentsTab({ projectId }: ProjectDocumentsTabProps) {
  const { data: documents, isLoading } = useQuery({
    queryKey: ['project-documents', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          cost_codes (code, name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const documentsByType = documents?.reduce((acc: Record<string, number>, doc) => {
    const type = doc.document_type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Project Documents
          </CardTitle>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading documents...</div>
        ) : documents && documents.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(documentsByType || {}).map(([type, count]) => (
                <div key={type} className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground capitalize">{type}</div>
                </div>
              ))}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Cost Code</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc: any) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.file_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{doc.document_type || 'other'}</Badge>
                    </TableCell>
                    <TableCell>
                      {doc.cost_codes ? (
                        <Badge variant="secondary">{doc.cost_codes.code}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {doc.document_date ? format(new Date(doc.document_date), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {doc.amount ? `$${Number(doc.amount).toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>
                      {doc.auto_classified && (
                        <Badge variant="secondary">AI</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No documents uploaded yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Upload contracts, plans, invoices, receipts, photos, permits, and other project documents.
            </p>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload First Document
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
