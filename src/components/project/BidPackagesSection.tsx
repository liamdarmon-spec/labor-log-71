import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, DollarSign } from 'lucide-react';
import { CreateBidPackageDialog } from './CreateBidPackageDialog';

interface BidPackage {
  id: string;
  title: string;
  scope_summary: string | null;
  status: string;
  bid_due_date: string | null;
  created_at: string;
  bid_count?: number;
  lowest_bid?: number;
}

interface BidPackagesSectionProps {
  projectId: string;
}

export function BidPackagesSection({ projectId }: BidPackagesSectionProps) {
  const [packages, setPackages] = useState<BidPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBidPackages();
  }, [projectId]);

  const fetchBidPackages = async () => {
    try {
      const { data: packagesData, error: packagesError } = await supabase
        .from('bid_packages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (packagesError) throw packagesError;

      // Fetch bid counts and lowest bids
      const packagesWithStats = await Promise.all(
        (packagesData || []).map(async (pkg) => {
          const { data: bids, error: bidsError } = await supabase
            .from('sub_bids')
            .select('bid_amount')
            .eq('bid_package_id', pkg.id);

          if (bidsError) throw bidsError;

          const lowestBid =
            bids && bids.length > 0
              ? Math.min(...bids.map((b) => Number(b.bid_amount)))
              : undefined;

          return {
            ...pkg,
            bid_count: bids?.length || 0,
            lowest_bid: lowestBid,
          };
        })
      );

      setPackages(packagesWithStats);
    } catch (error) {
      console.error('Error fetching bid packages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bid packages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-muted text-muted-foreground';
      case 'open':
        return 'bg-blue-500/10 text-blue-500';
      case 'awarded':
        return 'bg-green-500/10 text-green-500';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return <div>Loading bid packages...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Bid Packages</CardTitle>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Bid Package
        </Button>
      </CardHeader>
      <CardContent>
        {packages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No bid packages yet</p>
            <p className="text-sm mb-4">Create bid packages to request quotes from subcontractors</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Bid Package
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-center">Bids</TableHead>
                <TableHead className="text-right">Lowest Bid</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{pkg.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(pkg.status)}>
                      {pkg.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {pkg.bid_due_date
                      ? new Date(pkg.bid_due_date).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{pkg.bid_count || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {pkg.lowest_bid ? (
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {pkg.lowest_bid.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <CreateBidPackageDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
        onSuccess={() => {
          fetchBidPackages();
          setCreateDialogOpen(false);
        }}
      />
    </Card>
  );
}
