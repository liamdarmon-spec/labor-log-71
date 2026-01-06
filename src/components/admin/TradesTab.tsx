import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/company/CompanyProvider';
import { Loader2, Plus, MoreHorizontal, Pencil, RefreshCw, Check, X, AlertTriangle, Info } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// STATUS HELPERS
// ============================================================================

type TradeStatus = 'complete' | 'incomplete' | 'invalid';

function getTradeStatus(codes: CostCodeRow[]): TradeStatus {
  if (codes.length === 3) return 'complete';
  if (codes.length === 0) return 'incomplete';
  return 'invalid'; // 1-2 codes = configuration error
}

function getCodeForCategory(codes: CostCodeRow[], category: 'labor' | 'material' | 'sub'): CostCodeRow | null {
  return codes.find((c) => c.category === category) ?? null;
}

// ============================================================================
// TRADES TAB COMPONENT
// ============================================================================

export const TradesTab = () => {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();
  
  // Modal states
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<TradeRow | null>(null);
  const [regenerateTrade, setRegenerateTrade] = useState<TradeRow | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrefix, setFormPrefix] = useState('');
  const [formAutoGenerate, setFormAutoGenerate] = useState(true);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormPrefix('');
    setFormAutoGenerate(true);
  };

  const openAddModal = () => {
      resetForm();
    setEditingTrade(null);
    setIsAddTradeOpen(true);
  };

  const openEditModal = (trade: TradeRow) => {
    setFormName(trade.name);
    setFormDescription(trade.description ?? '');
    setFormPrefix(''); // Prefix is derived, not editable after creation
    setFormAutoGenerate(false); // Don't regenerate on edit by default
    setEditingTrade(trade);
    setIsAddTradeOpen(true);
  };

  const closeModal = () => {
    setIsAddTradeOpen(false);
    setEditingTrade(null);
    resetForm();
  };

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const { data, isLoading } = useQuery({
    queryKey: ['trades-admin', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return { trades: [] as TradeRow[], costCodes: [] as CostCodeRow[] };

      const [tradesRes, codesRes] = await Promise.all([
        supabase
          .from('trades')
          .select('id, company_id, name, description, default_labor_cost_code_id, default_material_cost_code_id, default_sub_cost_code_id')
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

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const createTradeMutation = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId) throw new Error('No company selected');
      if (!formName.trim()) throw new Error('Trade name is required');

      const { data: result, error } = await supabase.rpc('create_trade_with_default_cost_codes', {
        p_company_id: activeCompanyId,
        p_name: formName.trim(),
        p_description: formDescription.trim() || null,
        p_code_prefix: formPrefix.trim() || null,
        p_auto_generate: formAutoGenerate,
      });

      if (error) throw new Error(error.message || 'Database error');
      return result as TradeRow;
    },
    onSuccess: (trade) => {
      toast.success(`Trade created: ${trade.name}`);
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['trades-admin', activeCompanyId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const updateTradeMutation = useMutation({
    mutationFn: async () => {
      if (!editingTrade) throw new Error('No trade selected');
      if (!formName.trim()) throw new Error('Trade name is required');

      const { error } = await supabase
            .from('trades')
            .update({
          name: formName.trim(),
          description: formDescription.trim() || null,
        })
        .eq('id', editingTrade.id)
        .eq('company_id', activeCompanyId);

      if (error) throw new Error(error.message || 'Database error');
      return formName.trim();
    },
    onSuccess: (name) => {
      toast.success(`Trade updated: ${name}`);
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['trades-admin', activeCompanyId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const regenerateDefaultsMutation = useMutation({
    mutationFn: async (tradeId: string) => {
      const { data: result, error } = await supabase.rpc('ensure_trade_has_default_cost_codes', {
        p_trade_id: tradeId,
      });

      if (error) throw new Error(error.message || 'Database error');
      return result;
    },
    onSuccess: () => {
      toast.success('Default cost codes regenerated');
      setRegenerateTrade(null);
      queryClient.invalidateQueries({ queryKey: ['trades-admin', activeCompanyId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setRegenerateTrade(null);
    },
  });

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderDefaultCell = (code: CostCodeRow | null, label: string) => {
    if (code) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="font-mono text-xs text-muted-foreground">{code.code}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{label} default: {code.code}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <X className="w-4 h-4" />
        <span className="text-xs">—</span>
      </div>
    );
  };

  const renderStatusBadge = (status: TradeStatus) => {
    switch (status) {
      case 'complete':
        return <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">Complete</Badge>;
      case 'incomplete':
        return <Badge variant="secondary">Incomplete</Badge>;
      case 'invalid':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="cursor-help">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Error
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Configuration error: expected 0 or 3 cost codes.</p>
                <p className="text-xs text-muted-foreground">Contact support.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
    }
  };

  // ============================================================================
  // EMPTY / LOADING STATES
  // ============================================================================

  if (!activeCompanyId) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Info className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">Select a Company</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Trades are tenant-scoped. Select or create a company to continue.
          </p>
        </CardContent>
      </Card>
    );
  }

  const trades = data?.trades ?? [];

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4 border-b">
          <div className="space-y-1">
            <CardTitle className="text-xl">Trades</CardTitle>
            <CardDescription className="max-w-xl">
              Trades define categories of work. Each trade can have default cost codes (Labor, Material, Subcontractor)
              generated automatically.
            </CardDescription>
          </div>
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4 mr-2" />
            Add Trade
          </Button>
        </CardHeader>

        <CardContent className="pt-6">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground">Loading…</div>
          ) : trades.length === 0 ? (
            <div className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                <Info className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No trades yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Create a trade to define a category of work. You can optionally generate default cost codes
                (Labor, Material, Subcontractor) for each trade.
              </p>
              <Button onClick={openAddModal} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Trade
              </Button>
              </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[200px]">Trade Name</TableHead>
                    <TableHead className="w-[100px]">Prefix</TableHead>
                    <TableHead className="w-[100px]">Labor</TableHead>
                    <TableHead className="w-[100px]">Material</TableHead>
                    <TableHead className="w-[100px]">Sub</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => {
                    const codes = codesByTradeId.get(trade.id) ?? [];
                    const status = getTradeStatus(codes);
                    const laborCode = getCodeForCategory(codes, 'labor');
                    const materialCode = getCodeForCategory(codes, 'material');
                    const subCode = getCodeForCategory(codes, 'sub');

                    // Derive prefix from existing codes if available
                    const prefix = codes.length > 0
                      ? codes[0].code.split('-')[0]
                      : '—';
                
                return (
                      <TableRow key={trade.id}>
                    <TableCell>
                          <div className="font-medium">{trade.name}</div>
                          {trade.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">{trade.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                          <span className="font-mono text-sm text-muted-foreground">{prefix}</span>
                    </TableCell>
                        <TableCell>{renderDefaultCell(laborCode, 'Labor')}</TableCell>
                        <TableCell>{renderDefaultCell(materialCode, 'Material')}</TableCell>
                        <TableCell>{renderDefaultCell(subCode, 'Subcontractor')}</TableCell>
                        <TableCell>{renderStatusBadge(status)}</TableCell>
                    <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(trade)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit Trade
                              </DropdownMenuItem>
                              {status === 'incomplete' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setRegenerateTrade(trade)}>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Generate Defaults
                                  </DropdownMenuItem>
                                </>
                              )}
                              {status === 'complete' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setRegenerateTrade(trade)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Regenerate Defaults
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
          )}
      </CardContent>
    </Card>

      {/* ================================================================ */}
      {/* ADD / EDIT TRADE MODAL */}
      {/* ================================================================ */}
      <Dialog open={isAddTradeOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTrade ? 'Edit Trade' : 'Add Trade'}</DialogTitle>
            <DialogDescription>
              {editingTrade
                ? 'Update the trade name or description.'
                : 'Create a trade. Optionally auto-generate Labor, Material, and Subcontractor cost codes.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trade-name">Trade Name *</Label>
              <Input
                id="trade-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Plumbing"
                autoFocus
              />
            </div>

            {!editingTrade && (
              <div className="space-y-2">
                <Label htmlFor="trade-prefix">Code Prefix</Label>
                <Input
                  id="trade-prefix"
                  value={formPrefix}
                  onChange={(e) => setFormPrefix(e.target.value)}
                  placeholder="Optional"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Defaults to first letters of trade name. Non-letters are stripped.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="trade-description">Description</Label>
              <Textarea
                id="trade-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                placeholder="Optional notes about this trade"
              />
            </div>

            {!editingTrade && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Checkbox
                  id="auto-generate"
                  checked={formAutoGenerate}
                  onCheckedChange={(v) => setFormAutoGenerate(v === true)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="auto-generate" className="font-medium cursor-pointer">
                    Auto-generate Labor, Material, and Subcontractor cost codes
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Creates 3 cost codes using the prefix (e.g., PLB-L, PLB-M, PLB-S). Uncheck if you want to
                    generate cost codes later.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={() => (editingTrade ? updateTradeMutation.mutate() : createTradeMutation.mutate())}
              disabled={
                (editingTrade ? updateTradeMutation.isPending : createTradeMutation.isPending) ||
                !formName.trim()
              }
            >
              {(editingTrade ? updateTradeMutation.isPending : createTradeMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingTrade ? 'Save Changes' : 'Create Trade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* REGENERATE DEFAULTS CONFIRMATION */}
      {/* ================================================================ */}
      <AlertDialog open={!!regenerateTrade} onOpenChange={(open) => !open && setRegenerateTrade(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {codesByTradeId.get(regenerateTrade?.id ?? '')?.length === 0
                ? 'Generate Default Cost Codes'
                : 'Regenerate Default Cost Codes'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {codesByTradeId.get(regenerateTrade?.id ?? '')?.length === 0 ? (
                <>
                  This will create 3 cost codes for <strong>{regenerateTrade?.name}</strong>:
                  <ul className="mt-2 ml-4 list-disc text-sm">
                    <li>Labor</li>
                    <li>Material</li>
                    <li>Subcontractor</li>
                  </ul>
                </>
              ) : (
                <>
                  This will regenerate the default cost codes for <strong>{regenerateTrade?.name}</strong>.
                  Existing codes will be preserved if they already exist.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => regenerateTrade && regenerateDefaultsMutation.mutate(regenerateTrade.id)}
              disabled={regenerateDefaultsMutation.isPending}
            >
              {regenerateDefaultsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {codesByTradeId.get(regenerateTrade?.id ?? '')?.length === 0 ? 'Generate' : 'Regenerate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
