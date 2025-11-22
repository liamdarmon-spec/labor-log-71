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

  // Fetch all cost codes for display purposes
  const { data: costCodes } = useQuery({
    queryKey: ['trade-cost-codes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('is_active', true)
        .not('trade_id', 'is', null);
      return data || [];
    },
  });

  const getSubTradeCodes = (sub: any) => {
    if (!sub.trades?.name) return [];
    const tradePrefix = sub.trades.name.substring(0, 3).toUpperCase();
    return costCodes?.filter(cc => cc.code.startsWith(tradePrefix)) || [];
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
            <p className="text-muted-foreground">Manage subcontractors and link them to trades</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCostCodes(!showCostCodes)}>
              <Code className="h-4 w-4 mr-2" />
              {showCostCodes ? 'Hide' : 'Show'} Trade Codes
            </Button>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subcontractor
            </Button>
          </div>
        </div>

        {/* Trade-Based Cost Code Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Trade-Based Cost Code System</p>
              <p className="text-sm">
                Each <strong>trade</strong> has 3 standard cost codes: <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{'{TRADE}'}-L</code> (Labor), 
                <code className="px-1.5 py-0.5 bg-muted rounded text-xs ml-1">{'{TRADE}'}-M</code> (Materials), 
                <code className="px-1.5 py-0.5 bg-muted rounded text-xs ml-1">{'{TRADE}'}-S</code> (Subs/Contract).
              </p>
              <p className="text-sm text-muted-foreground">
                Subcontractors are linked to trades and use the trade's Sub code for costs. We still track which subcontractor was used via the subcontractor ID.
              </p>
            </div>
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
                    {showCostCodes && <TableHead>Trade Cost Codes</TableHead>}
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredSubs.map((sub: any) => {
                    const tradeCodes = getSubTradeCodes(sub);
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
                            <div className="flex gap-1 flex-wrap">
                              {tradeCodes.length > 0 ? (
                                tradeCodes.map(cc => (
                                  <Badge key={cc.id} variant="secondary" className="text-xs">
                                    {cc.code}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">No trade</span>
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

        {/* Trade Cost Code Reference */}
        {showCostCodes && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Trade Cost Code Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  All subcontractors use their trade's standard cost codes. Below is a reference showing each trade's codes.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trade</TableHead>
                      <TableHead>Labor Code</TableHead>
                      <TableHead>Materials Code</TableHead>
                      <TableHead>Sub Code</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from(new Set(subs?.map(s => s.trade_id).filter(Boolean))).map(tradeId => {
                      const sub = subs?.find(s => s.trade_id === tradeId);
                      if (!sub?.trades?.name) return null;
                      
                      const tradeCodes = getSubTradeCodes(sub);
                      const laborCode = tradeCodes.find(c => c.category === 'labor');
                      const materialCode = tradeCodes.find(c => c.category === 'materials');
                      const subCode = tradeCodes.find(c => c.category === 'subs');
                      
                      return (
                        <TableRow key={tradeId}>
                          <TableCell className="font-medium">{sub.trades.name}</TableCell>
                          <TableCell>
                            {laborCode ? (
                              <Badge variant="secondary" className="text-xs font-mono">
                                {laborCode.code}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {materialCode ? (
                              <Badge variant="secondary" className="text-xs font-mono">
                                {materialCode.code}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {subCode ? (
                              <Badge variant="secondary" className="text-xs font-mono">
                                {subCode.code}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AddSubcontractorDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </>
  );
}
