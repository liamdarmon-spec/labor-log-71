import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FinancialMaterials() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [unpaidOnly, setUnpaidOnly] = useState(false);

  const { data: materials, isLoading } = useQuery({
    queryKey: ['financial-materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_receipts')
        .select(`
          *,
          projects(project_name),
          cost_codes(code, name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name');
      if (error) throw error;
      return data;
    },
  });

  const filteredMaterials = materials?.filter(material => {
    if (selectedProject !== 'all' && material.project_id !== selectedProject) return false;
    // payment_status field coming soon
    if (searchTerm && !material.vendor.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Materials</h1>
          <p className="text-muted-foreground">
            Material receipts and vendor transactions
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
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

              <Button
                variant={unpaidOnly ? 'default' : 'outline'}
                onClick={() => setUnpaidOnly(!unpaidOnly)}
              >
                Unpaid Only
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Materials Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Material Receipts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : !filteredMaterials || filteredMaterials.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No material receipts found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Cost Code</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material) => (
                    <TableRow 
                      key={material.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/projects/${material.project_id}`)}
                    >
                      <TableCell>{new Date(material.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{material.vendor}</TableCell>
                      <TableCell>
                        {(material as any).projects?.project_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {(material as any).cost_codes?.code || '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${material.total.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          Coming Soon
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
