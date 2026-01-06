import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Wrench, Package, Loader2, ChevronDown, ChevronRight, Sparkles, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useCompany } from '@/company/CompanyProvider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TradePack {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

interface TradePackItem {
  id: string;
  trade_pack_id: string;
  name: string;
  description: string | null;
  code_prefix: string | null;
  sort_order: number;
}

interface CompanyTrade {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  code_prefix: string;
  is_active: boolean;
  cost_codes: CostCode[];
}

interface CostCode {
  id: string;
  code: string;
  name: string;
  category: string;
  is_active: boolean;
}

export const TradesTab = () => {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedTrades, setExpandedTrades] = useState<Set<string>>(new Set());
  
  const [newTradeName, setNewTradeName] = useState('');
  const [newTradeDescription, setNewTradeDescription] = useState('');
  const [newTradePrefix, setNewTradePrefix] = useState('');
  const [generateDefaults, setGenerateDefaults] = useState(true);
  
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();

  // Fetch trade packs
  const { data: tradePacks = [], isLoading: packsLoading } = useQuery({
    queryKey: ['trade-packs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_packs')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name');
      if (error) throw error;
      return data as TradePack[];
    },
  });

  // Fetch pack items for selected pack
  const { data: packItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['trade-pack-items', selectedPackId],
    queryFn: async () => {
      if (!selectedPackId) return [];
      const { data, error } = await supabase
        .from('trade_pack_items')
        .select('*')
        .eq('trade_pack_id', selectedPackId)
        .order('sort_order');
      if (error) throw error;
      return data as TradePackItem[];
    },
    enabled: !!selectedPackId,
  });

  // Fetch company trades with cost codes
  const { data: companyTrades = [], isLoading: tradesLoading, refetch: refetchTrades } = useQuery({
    queryKey: ['company-trades', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase.rpc('get_company_trades_with_codes', {
        p_company_id: activeCompanyId
      });
      if (error) throw error;
      return (data || []) as CompanyTrade[];
    },
    enabled: !!activeCompanyId,
  });

  // Import pack mutation
  const importPackMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPackId || !activeCompanyId) throw new Error('No pack or company selected');
      
      const { data, error } = await supabase.rpc('import_trade_pack', {
        p_trade_pack_id: selectedPackId,
        p_company_id: activeCompanyId,
        p_generate_defaults: true,
        p_mode: 'LMS'
      });
      
      if (error) throw error;
      return data as { success: boolean; trades_created: number; codes_created: number; error?: string };
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Imported ${result.trades_created} trades with ${result.codes_created} cost codes`);
        setIsImportOpen(false);
        setSelectedPackId(null);
        setSelectedItems(new Set());
        queryClient.invalidateQueries({ queryKey: ['company-trades'] });
        queryClient.invalidateQueries({ queryKey: ['costCodes'] });
      } else {
        toast.error(result.error || 'Import failed');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import trade pack');
    },
  });

  // Create trade mutation - uses atomic RPC that creates trade + cost codes in one transaction
  const createTradeMutation = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId || !newTradeName.trim()) throw new Error('Company and name required');
      
      // Use canonical atomic RPC: create_trade_with_default_cost_codes
      const { data, error } = await supabase.rpc('create_trade_with_default_cost_codes', {
        p_company_id: activeCompanyId,
        p_name: newTradeName.trim(),
        p_description: newTradeDescription.trim() || null,
        p_code_prefix: newTradePrefix.trim() || null,
        p_auto_generate: generateDefaults
      });
      
      if (error) {
        // Surface exact constraint violation to user
        throw new Error(error.message || 'Database error');
      }
      return data as { 
        success: boolean; 
        trade_id: string; 
        trade_name: string;
        code_prefix: string;
        auto_generated: boolean;
        labor_code_id?: string;
        material_code_id?: string;
        sub_code_id?: string;
        labor_code?: string;
        material_code?: string;
        sub_code?: string;
      };
    },
    onSuccess: (result) => {
      if (result.success) {
        const codesCreated = result.auto_generated ? 3 : 0;
        toast.success(
          result.auto_generated 
            ? `Created "${result.trade_name}" with ${codesCreated} cost codes (${result.labor_code}, ${result.material_code}, ${result.sub_code})`
            : `Created "${result.trade_name}" trade (no cost codes generated)`
        );
        setIsAddTradeOpen(false);
        resetAddForm();
        queryClient.invalidateQueries({ queryKey: ['company-trades'] });
        queryClient.invalidateQueries({ queryKey: ['costCodes'] });
      } else {
        toast.error('Failed to create trade');
      }
    },
    onError: (error: Error) => {
      // Show exact error message from constraint violation
      toast.error(`Failed to create trade: ${error.message}`);
    },
  });

  // Generate defaults for a single trade
  const generateDefaultsMutation = useMutation({
    mutationFn: async (tradeId: string) => {
      const { data, error } = await supabase.rpc('generate_company_trade_defaults', {
        p_company_trade_id: tradeId,
        p_mode: 'LMS'
      });
      if (error) throw error;
      return data as { success: boolean; codes_created: number; error?: string };
    },
    onSuccess: (result) => {
      if (result.success && result.codes_created > 0) {
        toast.success(`Generated ${result.codes_created} cost codes`);
        queryClient.invalidateQueries({ queryKey: ['company-trades'] });
        queryClient.invalidateQueries({ queryKey: ['costCodes'] });
      } else if (result.codes_created === 0) {
        toast.info('All cost codes already exist for this trade');
      } else {
        toast.error(result.error || 'Failed to generate codes');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate cost codes');
    },
  });

  const resetAddForm = () => {
    setNewTradeName('');
    setNewTradeDescription('');
    setNewTradePrefix('');
    setGenerateDefaults(true);
  };

  const toggleExpanded = (tradeId: string) => {
    const newExpanded = new Set(expandedTrades);
    if (newExpanded.has(tradeId)) {
      newExpanded.delete(tradeId);
    } else {
      newExpanded.add(tradeId);
    }
    setExpandedTrades(newExpanded);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === packItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(packItems.map(i => i.id)));
    }
  };

  if (!activeCompanyId) {
    return (
      <Card className="shadow-medium">
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Company Selected</h3>
          <p className="text-muted-foreground">
            Please select or create a company to manage trades and cost codes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-medium">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Wrench className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Trades & Cost Codes</CardTitle>
            <CardDescription>
              Import from packs or create custom trades. Each trade auto-generates L/M/S cost codes.
            </CardDescription>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Package className="w-4 h-4 mr-2" />
            Import Pack
          </Button>
          <Button onClick={() => setIsAddTradeOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Trade
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {tradesLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Loading trades...</p>
          </div>
        ) : companyTrades.length === 0 ? (
          <div className="py-12 text-center">
            <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Trades Yet</h3>
            <p className="text-muted-foreground mb-4">
              Import a standard pack or create custom trades to get started.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                <Package className="w-4 h-4 mr-2" />
                Import Pack
              </Button>
              <Button onClick={() => setIsAddTradeOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Trade
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {companyTrades.map((trade) => (
              <Collapsible
                key={trade.id}
                open={expandedTrades.has(trade.id)}
                onOpenChange={() => toggleExpanded(trade.id)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      {expandedTrades.has(trade.id) ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{trade.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {trade.code_prefix}
                          </Badge>
                        </div>
                        {trade.description && (
                          <p className="text-sm text-muted-foreground">{trade.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-1">
                        {trade.cost_codes.length > 0 ? (
                          trade.cost_codes.map((cc) => (
                            <Badge key={cc.id} variant="secondary" className="text-xs">
                              {cc.code.split('-').pop()}
                            </Badge>
                          ))
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              generateDefaultsMutation.mutate(trade.id);
                            }}
                            disabled={generateDefaultsMutation.isPending}
                          >
                            {generateDefaultsMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-1" />
                            )}
                            Generate Codes
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-6 pb-4 pl-12">
                    {trade.cost_codes.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-xs">Code</TableHead>
                            <TableHead className="text-xs">Name</TableHead>
                            <TableHead className="text-xs">Category</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trade.cost_codes.map((cc) => (
                            <TableRow key={cc.id}>
                              <TableCell className="font-mono text-sm">{cc.code}</TableCell>
                              <TableCell>{cc.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {cc.category}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={cc.is_active ? "default" : "secondary"}>
                                  {cc.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">
                        No cost codes generated yet. Click "Generate Codes" to create L/M/S codes.
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>

      {/* Import Pack Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Trade Pack</DialogTitle>
            <DialogDescription>
              Select a pack to import standard trades with auto-generated cost codes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Pack Selection */}
            <div className="grid grid-cols-2 gap-2">
              {packsLoading ? (
                <div className="col-span-2 text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : (
                tradePacks.map((pack) => (
                  <Button
                    key={pack.id}
                    variant={selectedPackId === pack.id ? "default" : "outline"}
                    className="justify-start h-auto py-3"
                    onClick={() => setSelectedPackId(pack.id)}
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span className="font-medium">{pack.name}</span>
                        {pack.is_system && (
                          <Badge variant="secondary" className="text-xs">System</Badge>
                        )}
                      </div>
                      {pack.description && (
                        <p className="text-xs text-muted-foreground mt-1">{pack.description}</p>
                      )}
                    </div>
                  </Button>
                ))
              )}
            </div>

            {/* Pack Items Preview */}
            {selectedPackId && (
              <div className="border rounded-lg">
                <div className="px-4 py-2 bg-muted/50 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Trades to Import ({packItems.length})
                  </span>
                  <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                    {selectedItems.size === packItems.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <ScrollArea className="h-64">
                  <div className="divide-y">
                    {itemsLoading ? (
                      <div className="py-4 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </div>
                    ) : (
                      packItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30"
                        >
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedItems);
                              if (checked) {
                                newSelected.add(item.id);
                              } else {
                                newSelected.delete(item.id);
                              }
                              setSelectedItems(newSelected);
                            }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span>{item.name}</span>
                              {item.code_prefix && (
                                <Badge variant="outline" className="text-xs">
                                  {item.code_prefix}
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => importPackMutation.mutate()}
              disabled={!selectedPackId || importPackMutation.isPending}
            >
              {importPackMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Import Pack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Trade Dialog */}
      <Dialog open={isAddTradeOpen} onOpenChange={(open) => {
        setIsAddTradeOpen(open);
        if (!open) resetAddForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Trade</DialogTitle>
            <DialogDescription>
              Create a custom trade with auto-generated cost codes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trade-name">Trade Name *</Label>
              <Input
                id="trade-name"
                value={newTradeName}
                onChange={(e) => setNewTradeName(e.target.value)}
                placeholder="e.g., Custom Millwork"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="trade-prefix">Code Prefix (optional)</Label>
              <Input
                id="trade-prefix"
                value={newTradePrefix}
                onChange={(e) => setNewTradePrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="Auto-generated from name"
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to auto-generate from trade name
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="trade-description">Description (optional)</Label>
              <Textarea
                id="trade-description"
                value={newTradeDescription}
                onChange={(e) => setNewTradeDescription(e.target.value)}
                placeholder="Brief description..."
                rows={2}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="generate-defaults"
                checked={generateDefaults}
                onCheckedChange={(checked) => setGenerateDefaults(checked === true)}
              />
              <Label htmlFor="generate-defaults" className="text-sm">
                Auto-generate Labor, Material, and Subcontractor cost codes
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTradeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createTradeMutation.mutate()}
              disabled={!newTradeName.trim() || createTradeMutation.isPending}
            >
              {createTradeMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Trade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
