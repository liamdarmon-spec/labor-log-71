import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Plus, Code, AlertCircle, CheckCircle } from 'lucide-react';
import { AddSubcontractorDialog } from '@/components/subs/AddSubcontractorDialog';
import { toast } from 'sonner';

export function SubcontractorsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [showCostCodes, setShowCostCodes] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all subs
  const { data: subs, isLoading } = useQuery({
    queryKey: ['admin-subs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('subs')
        .select(`
          *,
          trades(id, name)
        `)
        .order('name');
      return data || [];
    },
  });

  // Fetch cost codes to check what's auto-generated
  const { data: costCodes } = useQuery({
    queryKey: ['sub-cost-codes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cost_codes')
        .select('*')
        .in('category', ['subs', 'sub']);
      return data || [];
    },
  });

  // Auto-generate cost codes for subs
  const handleGenerateCostCodes = async () => {
    try {
      const codesToGenerate: any[] = [];

      subs?.forEach(sub => {
        if (!sub.trades?.name) return;
        
        const tradePrefix = sub.trades.name.substring(0, 3).toUpperCase();
        
        // Check if codes already exist
        const laborCodeExists = costCodes?.some(cc => cc.code === `${tradePrefix}-S`);
        const materialCodeExists = costCodes?.some(cc => cc.code === `${tradePrefix}-SM`);
        const contractCodeExists = costCodes?.some(cc => cc.code === `${tradePrefix}-C`);

        if (!laborCodeExists) {
          codesToGenerate.push({
            code: `${tradePrefix}-S`,
            name: `${sub.trades.name} Subcontract Labor`,
            category: 'subs',
            trade_id: sub.trade_id,
            is_active: true,
          });
        }

        if (!materialCodeExists) {
          codesToGenerate.push({
            code: `${tradePrefix}-SM`,
            name: `${sub.trades.name} Subcontract Materials`,
            category: 'subs',
            trade_id: sub.trade_id,
            is_active: true,
          });
        }

        if (!contractCodeExists) {
          codesToGenerate.push({
            code: `${tradePrefix}-C`,
            name: `${sub.trades.name} Contract / Lump Sum`,
            category: 'subs',
            trade_id: sub.trade_id,
            is_active: true,
          });
        }
      });

      if (codesToGenerate.length === 0) {
        toast.success('All cost codes already exist');
        return;
      }

      const { error } = await supabase
        .from('cost_codes')
        .insert(codesToGenerate);

      if (error) throw error;

      toast.success(`Generated ${codesToGenerate.length} cost code(s)`);
      queryClient.invalidateQueries({ queryKey: ['sub-cost-codes'] });
    } catch (error) {
      console.error('Error generating cost codes:', error);
      toast.error('Failed to generate cost codes');
    }
  };

  const getSubCostCodes = (sub: any) => {
    if (!sub.trades?.name) return [];
    const tradePrefix = sub.trades.name.substring(0, 3).toUpperCase();
    return costCodes?.filter(cc => 
      cc.code.startsWith(tradePrefix) && cc.category === 'subs'
    ) || [];
  };

  const filteredSubs = subs?.filter(sub =>
    sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.trades?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Subcontractors</h2>
            <p className="text-muted-foreground">Master subcontractor database with auto-generated cost codes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCostCodes(!showCostCodes)}>
              <Code className="h-4 w-4 mr-2" />
              {showCostCodes ? 'Hide' : 'Show'} Cost Codes
            </Button>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subcontractor
            </Button>
          </div>
        </div>

        {/* Cost Code Auto-Generation Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Each subcontractor automatically generates 3 cost codes: {'{TRADE}'}-S (Labor), {'{TRADE}'}-SM (Materials), {'{TRADE}'}-C (Contract)
            </span>
            <Button size="sm" variant="outline" onClick={handleGenerateCostCodes}>
              Generate Missing Codes
            </Button>
          </AlertDescription>
        </Alert>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search subcontractors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Subs Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Subcontractors ({subs?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSubs && filteredSubs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Default Rate</TableHead>
                    {showCostCodes && <TableHead>Auto Cost Codes</TableHead>}
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubs.map((sub: any) => {
                    const subCostCodes = getSubCostCodes(sub);
                    return (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{sub.trades?.name || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{sub.company_name || '—'}</TableCell>
                        <TableCell>
                          {sub.default_rate ? `$${Number(sub.default_rate).toFixed(2)}/hr` : '—'}
                        </TableCell>
                        {showCostCodes && (
                          <TableCell>
                            <div className="flex gap-1">
                              {subCostCodes.length > 0 ? (
                                subCostCodes.map(cc => (
                                  <Badge key={cc.id} variant="secondary" className="text-xs">
                                    {cc.code}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant={sub.active ? 'default' : 'secondary'}>
                            {sub.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No subcontractors found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost Code Mapping Preview */}
        {showCostCodes && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Cost Code Mapping Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sub Name</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead>Generated Codes</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subs?.map(sub => {
                    const subCostCodes = getSubCostCodes(sub);
                    const hasAllCodes = subCostCodes.length === 3;
                    return (
                      <TableRow key={sub.id}>
                        <TableCell>{sub.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{sub.trades?.name || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {subCostCodes.map(cc => (
                              <Badge key={cc.id} variant="secondary" className="text-xs">
                                {cc.code}: {cc.name}
                              </Badge>
                            ))}
                            {subCostCodes.length === 0 && (
                              <span className="text-xs text-muted-foreground">No codes generated</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {hasAllCodes ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm">Complete</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-orange-600">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-sm">Missing {3 - subCostCodes.length}</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <AddSubcontractorDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </>
  );
}
