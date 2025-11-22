import { Layout } from '@/components/Layout';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, Search, FileText, Image, FileCheck, FileSignature, Building2, Shield, Camera, FileWarning } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

const documentTypeIcons = {
  plans: Building2,
  receipts: FileText,
  invoices: FileCheck,
  contracts: FileSignature,
  submittals: FileText,
  permits: Shield,
  photos: Camera,
  proposals: FileWarning,
  other: FileText,
};

const documentTypeColors = {
  plans: 'bg-blue-500',
  receipts: 'bg-green-500',
  invoices: 'bg-purple-500',
  contracts: 'bg-orange-500',
  submittals: 'bg-cyan-500',
  permits: 'bg-red-500',
  photos: 'bg-pink-500',
  proposals: 'bg-yellow-500',
  other: 'bg-gray-500',
};

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', typeFilter, projectFilter],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select(`
          *,
          projects (project_name),
          cost_codes (code, name)
        `)
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('document_type', typeFilter);
      }

      if (projectFilter !== 'all') {
        query = query.eq('project_id', projectFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name');
      if (error) throw error;
      return data;
    },
  });

  const filteredDocuments = documents?.filter(doc =>
    doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.extracted_text?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: documents?.length || 0,
    aiClassified: documents?.filter(d => d.auto_classified).length || 0,
    receipts: documents?.filter(d => d.document_type === 'receipts').length || 0,
    invoices: documents?.filter(d => d.document_type === 'invoices').length || 0,
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-muted-foreground">AI-powered document management and organization</p>
          </div>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Documents
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total Documents</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.aiClassified}</div>
              <p className="text-sm text-muted-foreground">AI Classified</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.receipts}</div>
              <p className="text-sm text-muted-foreground">Receipts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.invoices}</div>
              <p className="text-sm text-muted-foreground">Invoices</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="plans">Plans</SelectItem>
                  <SelectItem value="receipts">Receipts</SelectItem>
                  <SelectItem value="invoices">Invoices</SelectItem>
                  <SelectItem value="contracts">Contracts</SelectItem>
                  <SelectItem value="submittals">Submittals</SelectItem>
                  <SelectItem value="permits">Permits</SelectItem>
                  <SelectItem value="photos">Photos</SelectItem>
                  <SelectItem value="proposals">Proposals</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading documents...</div>
            ) : filteredDocuments && filteredDocuments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Cost Code</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc: any) => {
                    const Icon = documentTypeIcons[doc.document_type as keyof typeof documentTypeIcons] || FileText;
                    return (
                      <TableRow key={doc.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded ${documentTypeColors[doc.document_type as keyof typeof documentTypeColors]}`}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <span className="capitalize">{doc.document_type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{doc.file_name}</TableCell>
                        <TableCell>{doc.projects?.project_name || '-'}</TableCell>
                        <TableCell>
                          {doc.document_date ? format(new Date(doc.document_date), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {doc.cost_codes ? (
                            <Badge variant="outline">
                              {doc.cost_codes.code}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {doc.amount ? `$${doc.amount.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>
                          {doc.auto_classified && (
                            <Badge variant="secondary">AI Classified</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No documents found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your first document to get started
                </p>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
