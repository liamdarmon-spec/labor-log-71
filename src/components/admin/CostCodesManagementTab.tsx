import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Zap, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

interface Trade {
  id: string;
  name: string;
  default_labor_cost_code_id: string | null;
  default_sub_cost_code_id: string | null;
  default_material_cost_code_id: string | null;
}

interface CostCode {
  id: string;
  code: string;
  name: string;
  category: string;
  trade_id: string | null;
  is_active: boolean;
  trade?: { name: string };
}

export function CostCodesManagementTab() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tradesRes, costCodesRes] = await Promise.all([
        supabase.from('trades').select('*').order('name'),
        supabase.from('cost_codes').select('*').order('code'),
      ]);

      if (tradesRes.error) throw tradesRes.error;
      if (costCodesRes.error) throw costCodesRes.error;

      setTrades(tradesRes.data || []);
      
      // Manually join trade data
      const enrichedCostCodes = (costCodesRes.data || []).map(code => {
        const trade = tradesRes.data?.find(t => t.id === code.trade_id);
        return {
          ...code,
          trade: trade ? { name: trade.name } : undefined,
        };
      });
      
      setCostCodes(enrichedCostCodes);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load cost codes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const autoGenerateCostCodes = async () => {
    try {
      setGenerating(true);

      // For each trade, ensure it has 3 cost codes
      for (const trade of trades) {
        const tradePrefix = trade.name.substring(0, 3).toUpperCase();
        
        // Check what cost codes already exist for this trade
        const existingCodes = costCodes.filter(cc => cc.trade_id === trade.id);
        const hasLabor = existingCodes.some(cc => cc.category === 'labor');
        const hasSub = existingCodes.some(cc => cc.category === 'subs');
        const hasMaterial = existingCodes.some(cc => cc.category === 'materials');

        const codesToCreate = [];

        if (!hasLabor) {
          codesToCreate.push({
            trade_id: trade.id,
            code: `${tradePrefix}-L`,
            name: `${trade.name} - Labor`,
            category: 'labor',
            is_active: true,
          });
        }

        if (!hasSub) {
          codesToCreate.push({
            trade_id: trade.id,
            code: `${tradePrefix}-S`,
            name: `${trade.name} - Sub`,
            category: 'subs',
            is_active: true,
          });
        }

        if (!hasMaterial) {
          codesToCreate.push({
            trade_id: trade.id,
            code: `${tradePrefix}-M`,
            name: `${trade.name} - Material`,
            category: 'materials',
            is_active: true,
          });
        }

        if (codesToCreate.length > 0) {
          const { data: newCodes, error } = await supabase
            .from('cost_codes')
            .insert(codesToCreate)
            .select();

          if (error) throw error;

          // Link the new cost codes back to the trade
          if (newCodes) {
            const updates: any = {};
            newCodes.forEach(code => {
              if (code.category === 'labor') updates.default_labor_cost_code_id = code.id;
              if (code.category === 'subs') updates.default_sub_cost_code_id = code.id;
              if (code.category === 'materials') updates.default_material_cost_code_id = code.id;
            });

            if (Object.keys(updates).length > 0) {
              await supabase
                .from('trades')
                .update(updates)
                .eq('id', trade.id);
            }
          }
        }
      }

      // Create Misc cost codes if they don't exist
      const miscCodes = costCodes.filter(cc => cc.trade_id === null);
      const hasMiscLabor = miscCodes.some(cc => cc.category === 'labor');
      const hasMiscOther = miscCodes.some(cc => cc.category === 'other');

      const miscToCreate = [];
      if (!hasMiscLabor) {
        miscToCreate.push({
          trade_id: null,
          code: 'MISC-L',
          name: 'Miscellaneous - Labor',
          category: 'labor',
          is_active: true,
        });
      }
      if (!hasMiscOther) {
        miscToCreate.push({
          trade_id: null,
          code: 'MISC-O',
          name: 'Miscellaneous - Other',
          category: 'other',
          is_active: true,
        });
      }

      if (miscToCreate.length > 0) {
        const { error } = await supabase.from('cost_codes').insert(miscToCreate);
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Cost codes generated successfully',
      });

      fetchData();
    } catch (error) {
      console.error('Error generating cost codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate cost codes',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      labor: 'bg-blue-100 text-blue-800 border-blue-200',
      subs: 'bg-green-100 text-green-800 border-green-200',
      materials: 'bg-purple-100 text-purple-800 border-purple-200',
      other: 'bg-gray-100 text-gray-800 border-gray-200',
      equipment: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    return colors[category] || colors.other;
  };

  const missingCostCodes = trades.filter(
    t => !t.default_labor_cost_code_id || !t.default_sub_cost_code_id || !t.default_material_cost_code_id
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cost Codes Management</CardTitle>
            <Button onClick={autoGenerateCostCodes} disabled={generating}>
              <Zap className="h-4 w-4 mr-2" />
              {generating ? 'Generating...' : 'Auto-Generate Missing Codes'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {missingCostCodes.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {missingCostCodes.length} trade(s) are missing cost codes: {missingCostCodes.map(t => t.name).join(', ')}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">All Cost Codes</h3>
              <div className="text-sm text-muted-foreground">
                {costCodes.length} total codes
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costCodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No cost codes yet. Click "Auto-Generate" to create them.
                    </TableCell>
                  </TableRow>
                ) : (
                  costCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-medium">{code.code}</TableCell>
                      <TableCell>{code.name}</TableCell>
                      <TableCell>
                        <Badge className={getCategoryBadge(code.category)} variant="outline">
                          {code.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {code.trade ? code.trade.name : <span className="text-muted-foreground">None</span>}
                      </TableCell>
                      <TableCell>
                        {code.is_active ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trade Cost Code Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trade</TableHead>
                <TableHead>Labor Code</TableHead>
                <TableHead>Sub Code</TableHead>
                <TableHead>Material Code</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => {
                const laborCode = costCodes.find(cc => cc.id === trade.default_labor_cost_code_id);
                const subCode = costCodes.find(cc => cc.id === trade.default_sub_cost_code_id);
                const materialCode = costCodes.find(cc => cc.id === trade.default_material_cost_code_id);
                const complete = laborCode && subCode && materialCode;

                return (
                  <TableRow key={trade.id}>
                    <TableCell className="font-medium">{trade.name}</TableCell>
                    <TableCell>
                      {laborCode ? (
                        <span className="font-mono text-sm">{laborCode.code}</span>
                      ) : (
                        <span className="text-muted-foreground">Missing</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {subCode ? (
                        <span className="font-mono text-sm">{subCode.code}</span>
                      ) : (
                        <span className="text-muted-foreground">Missing</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {materialCode ? (
                        <span className="font-mono text-sm">{materialCode.code}</span>
                      ) : (
                        <span className="text-muted-foreground">Missing</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {complete ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                          Complete
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                          Incomplete
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
