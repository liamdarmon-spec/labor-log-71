import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/company/CompanyProvider';
import { Loader2, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type TradeRow = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  default_labor_cost_code_id: string | null;
  default_material_cost_code_id: string | null;
  default_sub_cost_code_id: string | null;
};

type CostCodeRow = {
  id: string;
  trade_id: string | null;
  code: string;
  category: 'labor' | 'material' | 'sub';
  is_active: boolean;
};

export const TradesTab = () => {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [newTradeName, setNewTradeName] = useState('');
  const [newTradeDescription, setNewTradeDescription] = useState('');
  const [newTradePrefix, setNewTradePrefix] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);

  const resetAddForm = () => {
    setNewTradeName('');
    setNewTradeDescription('');
    setNewTradePrefix('');
    setAutoGenerate(true);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['trades-cost-codes', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return { trades: [] as TradeRow[], costCodes: [] as CostCodeRow[] };

      const [tradesRes, codesRes] = await Promise.all([
        supabase
          .from('trades')
          .select(
            'id, company_id, name, description, default_labor_cost_code_id, default_material_cost_code_id, default_sub_cost_code_id'
          )
          .eq('company_id', activeCompanyId)
          .order('name'),
        supabase
          .from('cost_codes')
          .select('id, trade_id, code, category, is_active')
          .eq('company_id', activeCompanyId)
          .order('code'),
      ]);

      if (tradesRes.error) throw tradesRes.error;
      if (codesRes.error) throw codesRes.error;

      return {
        trades: (tradesRes.data || []) as TradeRow[],
        costCodes: (codesRes.data || []) as unknown as CostCodeRow[],
      };
    },
    enabled: !!activeCompanyId,
  });

  const codesByTradeId = useMemo(() => {
    const map = new Map<string, CostCodeRow[]>();
    for (const cc of data?.costCodes ?? []) {
      if (!cc.trade_id) continue;
      const arr = map.get(cc.trade_id) ?? [];
      arr.push(cc);
      map.set(cc.trade_id, arr);
    }
    return map;
  }, [data?.costCodes]);

  const createTradeMutation = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId) throw new Error('No company selected');
      if (!newTradeName.trim()) throw new Error('Trade name is required');

      // ONE CALL ONLY (no client-side multi-step inserts)
      const { data: trade, error } = await supabase.rpc('create_trade_with_default_cost_codes', {
        p_company_id: activeCompanyId,
        p_name: newTradeName.trim(),
        p_description: newTradeDescription.trim() || null,
        p_code_prefix: newTradePrefix.trim() || null,
        p_auto_generate: autoGenerate,
      });

      if (error) {
        // Surface exact Postgres error message (include constraint name when present)
        throw new Error(error.message || 'Database error');
      }

      return trade as TradeRow;
    },
    onSuccess: async (trade) => {
      toast.success(`Trade created: ${trade.name}`);
      setIsAddTradeOpen(false);
      resetAddForm();
      await queryClient.invalidateQueries({ queryKey: ['trades-cost-codes', activeCompanyId] });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Failed to create trade');
    },
  });

  if (!activeCompanyId) {
    return (
      <Card className="shadow-medium">
        <CardContent className="py-12 text-center text-muted-foreground">
          Select a company to manage trades.
        </CardContent>
      </Card>
    );
  }

  const trades = data?.trades ?? [];

  return (
    <Card className="shadow-medium">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
        <div>
          <CardTitle className="text-xl">Trades</CardTitle>
          <CardDescription>Trades own default cost code generation (labor/material/sub).</CardDescription>
        </div>
        <Button onClick={() => setIsAddTradeOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Trade
        </Button>
      </CardHeader>

      <CardContent className="pt-6">
        {isLoading ? (
          <div className="py-10 text-center text-muted-foreground">Loading…</div>
        ) : trades.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">No trades yet.</div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Trade</TableHead>
                  <TableHead>Defaults</TableHead>
                  <TableHead>Cost Codes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((t) => {
                  const codes = codesByTradeId.get(t.id) ?? [];
                  const defaultsOk = codes.length === 3;
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{t.name}</div>
                        {t.description ? <div className="text-sm text-muted-foreground">{t.description}</div> : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={defaultsOk ? 'default' : 'secondary'}>{defaultsOk ? 'Complete' : 'Missing'}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {codes.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          codes.map((cc) => (
                            <span key={cc.id} className="mr-2">
                              {cc.code}
                            </span>
                          ))
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog
        open={isAddTradeOpen}
        onOpenChange={(open) => {
          setIsAddTradeOpen(open);
          if (!open) resetAddForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Trade</DialogTitle>
            <DialogDescription>Create a trade. Optionally auto-generate labor/material/sub cost codes.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trade-name">Trade Name *</Label>
              <Input
                id="trade-name"
                value={newTradeName}
                onChange={(e) => setNewTradeName(e.target.value)}
                placeholder="e.g., Plumbing"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trade-prefix">Code Prefix (optional)</Label>
              <Input
                id="trade-prefix"
                value={newTradePrefix}
                onChange={(e) => setNewTradePrefix(e.target.value)}
                placeholder="Letters only; otherwise derived from name"
              />
              <p className="text-xs text-muted-foreground">If provided, non-letters will be stripped server-side.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trade-description">Description (optional)</Label>
              <Textarea
                id="trade-description"
                value={newTradeDescription}
                onChange={(e) => setNewTradeDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="auto-generate" checked={autoGenerate} onCheckedChange={(v) => setAutoGenerate(v === true)} />
              <Label htmlFor="auto-generate" className="text-sm">
                Auto-generate Labor, Material, and Subcontractor cost codes
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTradeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => createTradeMutation.mutate()} disabled={createTradeMutation.isPending || !newTradeName.trim()}>
              {createTradeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Trade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};


