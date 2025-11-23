import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, FileText, Eye, Calendar, DollarSign } from 'lucide-react';
import { useProposals } from '@/hooks/useProposals';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function Proposals() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: proposals, isLoading } = useProposals();

  const getStatusColor = (status: string): 'secondary' | 'default' | 'destructive' => {
    switch (status) {
      case 'accepted': return 'default';
      case 'sent': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const filteredProposals = proposals?.filter((p: any) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Proposals</h1>
            <p className="text-muted-foreground">Manage client proposals and bids</p>
          </div>
          <Button onClick={() => navigate('/proposals/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Proposal
          </Button>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Proposals</p>
                <p className="text-2xl font-semibold">{proposals?.length || 0}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-semibold">
                  {proposals?.filter((p: any) => p.status === 'sent').length || 0}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-2xl font-semibold">
                  {proposals?.filter((p: any) => p.status === 'accepted').length || 0}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-semibold">
                  ${proposals?.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0).toLocaleString() || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search proposals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proposal</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Response</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredProposals?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-1">No proposals yet</p>
                    <p className="text-sm">Create your first proposal to get started</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProposals?.map((proposal: any) => (
                  <TableRow
                    key={proposal.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/proposals/${proposal.id}`)}
                  >
                    <TableCell className="font-medium">{proposal.title}</TableCell>
                    <TableCell>{proposal.client_name || '-'}</TableCell>
                    <TableCell>{proposal.projects?.project_name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(proposal.status)}>
                        {proposal.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(proposal.acceptance_status || 'pending')}>
                        {(proposal.acceptance_status || 'pending').replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(proposal.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${proposal.total_amount?.toLocaleString() || '0'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/proposals/${proposal.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
}
