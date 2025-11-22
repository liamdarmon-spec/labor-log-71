import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, FileText, CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

export default function FinancialEstimates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(statusFilter);
  const [selectedProject, setSelectedProject] = useState('all');

  const { data: estimates, isLoading } = useQuery({
    queryKey: ['financial-estimates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          projects(id, project_name)
        `)
        .order('created_at', { ascending: false });
      
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

  const setBudgetMutation = useMutation({
    mutationFn: async (estimateId: string) => {
      const { error } = await supabase.rpc('sync_estimate_to_budget', {
        p_estimate_id: estimateId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Estimate set as budget baseline');
      queryClient.invalidateQueries({ queryKey: ['financial-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
    },
    onError: (error) => {
      toast.error('Failed to set budget: ' + error.message);
    },
  });

  const filteredEstimates = estimates?.filter(estimate => {
    if (selectedStatus !== 'all' && estimate.status !== selectedStatus) return false;
    if (selectedProject !== 'all' && estimate.project_id !== selectedProject) return false;
    if (searchTerm && !(estimate as any).projects?.project_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Estimates</h1>
          <p className="text-muted-foreground">
            All project estimates and proposals
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

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
            </div>
          </CardContent>
        </Card>

        {/* Estimates Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              All Estimates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : !filteredEstimates || filteredEstimates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No estimates found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Budget Baseline</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEstimates.map((estimate) => (
                    <TableRow 
                      key={estimate.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/projects/${estimate.project_id}`)}
                    >
                      <TableCell className="font-medium">
                        {(estimate as any).projects?.project_name || 'Unknown'}
                      </TableCell>
                      <TableCell>{estimate.title}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            estimate.status === 'accepted' ? 'default' :
                            estimate.status === 'sent' ? 'secondary' :
                            'outline'
                          }
                        >
                          {estimate.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${estimate.total_amount?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell>
                        {new Date(estimate.created_at || '').toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {estimate.is_budget_source ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Budget Source
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {estimate.status === 'accepted' && !estimate.is_budget_source && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBudgetMutation.mutate(estimate.id);
                            }}
                            disabled={setBudgetMutation.isPending}
                          >
                            Set as Budget
                          </Button>
                        )}
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
