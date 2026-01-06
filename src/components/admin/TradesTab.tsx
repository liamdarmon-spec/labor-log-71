import { useState } from 'react';
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
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES (matches RPC return shape)
// ============================================================================

type TradeWithDefaults = {
  id: string;
  name: string;
  description: string | null;
  code_prefix: string | null;
  labor_code: string | null;
  labor_code_id: string | null;
  material_code: string | null;
  material_code_id: string | null;
  sub_code: string | null;
  sub_code_id: string | null;
  status: 'complete' | 'incomplete' | 'invalid';
};

// ============================================================================
// TRADES TAB COMPONENT (SOURCE OF TRUTH)
// ============================================================================

/**
 * Trades Page (Source of Truth)
 *
 * Trades define your work categories. Each trade has exactly 3 default cost codes:
 * Labor, Material, and Subcontractor.
 *
 * This page is the ONLY place where default cost codes are created/managed.
 * Cost Codes page is a read-only projection.
 */
export const TradesTab = () => {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  // Modal states
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<TradeWithDefaults | null>(null);
  const [regenerateTrade, setRegenerateTrade] = useState<TradeWithDefaults | null>(null);

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

  const openEditModal = (trade: TradeWithDefaults) => {
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
  // DATA FETCHING (SINGLE QUERY VIA RPC)
  // ============================================================================

  const { data: trades = [], isLoading, error } = useQuery({
    queryKey: ['trades-with-defaults', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase.rpc('get_trades_with_default_codes', {
        p_company_id: activeCompanyId,
      });

      if (error) throw new Error(error.message);
      return (data || []) as TradeWithDefaults[];
    },
    enabled: !!activeCompanyId,
    retry: false,
  });

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
      return result;
    },
    onSuccess: () => {
      toast.success(`Trade created: ${formName}`);
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['trades-with-defaults', activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['cost-codes-with-trades', activeCompanyId] });
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
      queryClient.invalidateQueries({ queryKey: ['trades-with-defaults', activeCompanyId] });
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
      toast.success('Default cost codes generated');
      setRegenerateTrade(null);
      queryClient.invalidateQueries({ queryKey: ['trades-with-defaults', activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['cost-codes-with-trades', activeCompanyId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setRegenerateTrade(null);
    },
  });

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderDefaultCell = (code: string | null, label: string) => {
    if (code) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="font-mono text-xs text-muted-foreground">{code}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{label} default: {code}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-amber-600">
        <X className="w-4 h-4" />
        <span className="text-xs">Missing</span>
      </div>
    );
  };

  const renderStatusBadge = (status: TradeWithDefaults['status']) => {
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
                  Mismatch
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Data mismatch detected.</p>
                <p className="text-xs text-muted-foreground">
                  Defaults must point to active, trade-linked cost codes with matching categories.
                </p>
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

  if (error) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto text-destructive mb-3" />
          <h3 className="text-lg font-medium">Failed to load trades</h3>
          <p className="text-sm text-muted-foreground mt-1">{(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

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
              Trades define your work categories. Each trade has exactly 3 default cost codes: Labor, Material, and Subcontractor.
            </CardDescription>
          </div>
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4 mr-2" />
            Add Trade
          </Button>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Mismatch banner (no silent fixes) */}
          {!isLoading && trades.some((t) => t.status === 'invalid') && (
            <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="text-sm">
                  <div className="font-medium">Data mismatch detected</div>
                  <div className="text-amber-800">
                    One or more trades have default pointers that don’t match trade-linked cost codes. Use “Ensure Defaults” per trade.
                  </div>
                </div>
              </div>
            </div>
          )}

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
                    <TableHead className="w-[120px]">Labor</TableHead>
                    <TableHead className="w-[120px]">Material</TableHead>
                    <TableHead className="w-[120px]">Sub</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>
                        <div className="font-medium">{trade.name}</div>
                        {trade.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">{trade.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-muted-foreground">
                          {trade.code_prefix || '—'}
                        </span>
                      </TableCell>
                      <TableCell>{renderDefaultCell(trade.labor_code, 'Labor')}</TableCell>
                      <TableCell>{renderDefaultCell(trade.material_code, 'Material')}</TableCell>
                      <TableCell>{renderDefaultCell(trade.sub_code, 'Subcontractor')}</TableCell>
                      <TableCell>{renderStatusBadge(trade.status)}</TableCell>
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
                            {trade.status === 'invalid' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setRegenerateTrade(trade)}
                                  className={cn("text-amber-700 focus:text-amber-800")}
                                >
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Ensure Defaults
                                </DropdownMenuItem>
                              </>
                            )}
                            {trade.status === 'incomplete' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setRegenerateTrade(trade)}>
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Generate Defaults
                                </DropdownMenuItem>
                              </>
                            )}
                            {trade.status === 'complete' && (
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
                  ))}
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
              {regenerateTrade?.status === 'incomplete'
                ? 'Generate Default Cost Codes'
                : regenerateTrade?.status === 'invalid'
                  ? 'Ensure Default Cost Codes'
                  : 'Regenerate Default Cost Codes'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {regenerateTrade?.status === 'incomplete' ? (
                <>
                  This will create 3 cost codes for <strong>{regenerateTrade?.name}</strong>:
                  <ul className="mt-2 ml-4 list-disc text-sm">
                    <li>Labor</li>
                    <li>Material</li>
                    <li>Subcontractor</li>
                  </ul>
                </>
              ) : regenerateTrade?.status === 'invalid' ? (
                <>
                  This will attempt to generate defaults only if the trade currently has <strong>0</strong> cost codes.
                  If it has a partial/mismatched set, you’ll get a clear error to resolve it explicitly.
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
              {regenerateTrade?.status === 'incomplete'
                ? 'Generate'
                : regenerateTrade?.status === 'invalid'
                  ? 'Ensure'
                  : 'Regenerate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
