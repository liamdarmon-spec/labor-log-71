import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Wrench, AlertTriangle, Sparkles } from 'lucide-react';
import { z } from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCostCodes } from '@/hooks/useCostCodes';
import { STANDARD_REMODELING_TRADES, generateCostCodesForTrade } from '@/utils/tradesSeeding';

const tradeSchema = z.object({
  name: z.string().trim().nonempty({ message: 'Trade name is required' }).max(100),
  description: z.string().max(500).optional(),
});

interface Trade {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  default_labor_cost_code_id: string | null;
  default_material_cost_code_id: string | null;
  default_sub_cost_code_id: string | null;
}

export const TradesTab = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_labor_cost_code_id: '',
    default_material_cost_code_id: '',
    default_sub_cost_code_id: '',
  });
  const { toast } = useToast();
  
  const { data: laborCostCodes = [] } = useCostCodes('labor');
  const { data: materialCostCodes = [] } = useCostCodes('materials');
  const { data: subCostCodes = [] } = useCostCodes('subs');

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load trades',
        variant: 'destructive',
      });
    } else {
      setTrades(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = tradeSchema.parse({
        ...formData,
        description: formData.description || undefined,
      });

      if (editingTrade) {
        const { error } = await supabase
          .from('trades')
          .update({
            name: validatedData.name,
            description: validatedData.description || null,
            default_labor_cost_code_id: formData.default_labor_cost_code_id || null,
            default_material_cost_code_id: formData.default_material_cost_code_id || null,
            default_sub_cost_code_id: formData.default_sub_cost_code_id || null,
          })
          .eq('id', editingTrade.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Trade updated successfully',
        });
      } else {
        // Create new trade
        const { data: newTrade, error: tradeError } = await supabase
          .from('trades')
          .insert([{
            name: validatedData.name,
            description: validatedData.description || null,
          }])
          .select()
          .single();

        if (tradeError) throw tradeError;

        // Auto-create 3 default cost codes for the new trade
        const baseCode = validatedData.name.substring(0, 3).toUpperCase();
        
        const costCodesToCreate = [
          { code: `${baseCode}-L`, name: `${validatedData.name} Labor`, category: 'labor' },
          { code: `${baseCode}-M`, name: `${validatedData.name} Material`, category: 'materials' },
          { code: `${baseCode}-S`, name: `${validatedData.name} Sub`, category: 'subs' },
        ];

        const { data: createdCodes, error: codesError } = await supabase
          .from('cost_codes')
          .insert(
            costCodesToCreate.map(cc => ({
              ...cc,
              trade_id: newTrade.id,
              is_active: true,
            }))
          )
          .select();

        if (codesError) throw codesError;

        // Link the created cost codes back to the trade
        const { error: updateError } = await supabase
          .from('trades')
          .update({
            default_labor_cost_code_id: createdCodes.find(c => c.category === 'labor')?.id,
            default_material_cost_code_id: createdCodes.find(c => c.category === 'materials')?.id,
            default_sub_cost_code_id: createdCodes.find(c => c.category === 'subs')?.id,
          })
          .eq('id', newTrade.id);

        if (updateError) throw updateError;

        toast({
          title: 'Success',
          description: 'Trade and default cost codes created successfully',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTrades();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to save trade',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trade? Workers with this trade will need to be updated.')) return;

    const { error } = await supabase.from('trades').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete trade',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Trade deleted successfully',
      });
      fetchTrades();
    }
  };

  const handleEdit = (trade: Trade) => {
    setEditingTrade(trade);
    setFormData({
      name: trade.name,
      description: trade.description || '',
      default_labor_cost_code_id: trade.default_labor_cost_code_id || '',
      default_material_cost_code_id: trade.default_material_cost_code_id || '',
      default_sub_cost_code_id: trade.default_sub_cost_code_id || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTrade(null);
    setFormData({
      name: '',
      description: '',
      default_labor_cost_code_id: '',
      default_material_cost_code_id: '',
      default_sub_cost_code_id: '',
    });
  };

  const tradesWithMissingCodes = trades.filter(
    t => !t.default_labor_cost_code_id || !t.default_material_cost_code_id || !t.default_sub_cost_code_id
  );

  const handleGenerateMissingCodes = async () => {
    if (!confirm(
      `This will auto-generate missing cost codes for ${tradesWithMissingCodes.length} trade(s).\n\n` +
      `Each trade will get Labor (-L), Material (-M), and Sub (-S) codes.\n\n` +
      `Continue?`
    )) return;

    setIsSeeding(true);
    let generated = 0;
    const errors: string[] = [];

    try {
      for (const trade of tradesWithMissingCodes) {
        try {
          const baseCode = trade.name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
          const codes = generateCostCodesForTrade(baseCode, trade.name);
          const updates: any = {};

          // Generate missing codes
          if (!trade.default_labor_cost_code_id) {
            const { data: laborCode } = await supabase
              .from('cost_codes')
              .insert({
                code: codes[0].code,
                name: codes[0].name,
                category: codes[0].category,
                trade_id: trade.id,
                is_active: true,
              })
              .select()
              .single();
            
            if (laborCode) updates.default_labor_cost_code_id = laborCode.id;
          }

          if (!trade.default_material_cost_code_id) {
            const { data: materialCode } = await supabase
              .from('cost_codes')
              .insert({
                code: codes[1].code,
                name: codes[1].name,
                category: codes[1].category,
                trade_id: trade.id,
                is_active: true,
              })
              .select()
              .single();
            
            if (materialCode) updates.default_material_cost_code_id = materialCode.id;
          }

          if (!trade.default_sub_cost_code_id) {
            const { data: subCode } = await supabase
              .from('cost_codes')
              .insert({
                code: codes[2].code,
                name: codes[2].name,
                category: codes[2].category,
                trade_id: trade.id,
                is_active: true,
              })
              .select()
              .single();
            
            if (subCode) updates.default_sub_cost_code_id = subCode.id;
          }

          // Update trade with new code IDs
          if (Object.keys(updates).length > 0) {
            await supabase
              .from('trades')
              .update(updates)
              .eq('id', trade.id);
            
            generated++;
          }
        } catch (err) {
          errors.push(`${trade.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      toast({
        title: 'Cost Codes Generated',
        description: `Generated cost codes for ${generated} trade(s).${errors.length > 0 ? ` ${errors.length} errors occurred.` : ''}`,
      });

      if (errors.length > 0) {
        console.error('Generation errors:', errors);
      }

      fetchTrades();
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate cost codes. Check console for details.',
        variant: 'destructive',
      });
      console.error('Generation error:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSeedTrades = async () => {
    if (!confirm(
      `This will populate ${STANDARD_REMODELING_TRADES.length} standard trades for remodeling.\n\n` +
      `Existing trades will NOT be deleted or modified.\n\n` +
      `Each new trade will auto-generate 3 cost codes (Labor, Materials, Subcontract).\n\n` +
      `Continue?`
    )) return;

    setIsSeeding(true);
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      for (const standardTrade of STANDARD_REMODELING_TRADES) {
        try {
          // Check if trade already exists by name
          const { data: existing } = await supabase
            .from('trades')
            .select('id')
            .eq('name', standardTrade.name)
            .maybeSingle();

          if (existing) {
            skipped++;
            continue;
          }

          // Create trade
          const { data: newTrade, error: tradeError } = await supabase
            .from('trades')
            .insert([{
              name: standardTrade.name,
              description: standardTrade.description,
            }])
            .select()
            .single();

          if (tradeError) throw tradeError;

          // Generate cost codes using the proper trade key
          const costCodes = generateCostCodesForTrade(standardTrade.key, standardTrade.name);

          const { data: createdCodes, error: codesError } = await supabase
            .from('cost_codes')
            .insert(
              costCodes.map(cc => ({
                ...cc,
                trade_id: newTrade.id,
                is_active: true,
              }))
            )
            .select();

          if (codesError) throw codesError;

          // Link cost codes back to trade
          const { error: updateError } = await supabase
            .from('trades')
            .update({
              default_labor_cost_code_id: createdCodes.find(c => c.category === 'labor')?.id,
              default_material_cost_code_id: createdCodes.find(c => c.category === 'materials')?.id,
              default_sub_cost_code_id: createdCodes.find(c => c.category === 'subs')?.id,
            })
            .eq('id', newTrade.id);

          if (updateError) throw updateError;

          created++;
        } catch (err) {
          errors.push(`${standardTrade.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      toast({
        title: 'Seeding Complete',
        description: `Created ${created} trades with ${created * 3} cost codes. Skipped ${skipped} existing trades.${errors.length > 0 ? ` ${errors.length} errors occurred.` : ''}`,
      });

      if (errors.length > 0) {
        console.error('Seeding errors:', errors);
      }

      fetchTrades();
    } catch (error) {
      toast({
        title: 'Seeding Failed',
        description: 'Failed to seed trades. Check console for details.',
        variant: 'destructive',
      });
      console.error('Seeding error:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card className="shadow-medium">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Wrench className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Trades Management</CardTitle>
            {tradesWithMissingCodes.length > 0 && (
              <div className="flex items-center gap-2 mt-1 text-sm text-orange-600">
                <AlertTriangle className="w-4 h-4" />
                <span>{tradesWithMissingCodes.length} trade(s) missing default cost codes</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {trades.length === 0 && (
            <Button 
              onClick={handleSeedTrades}
              disabled={isSeeding}
              variant="outline"
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isSeeding ? 'Seeding...' : 'Seed Standard Trades'}
            </Button>
          )}
          {tradesWithMissingCodes.length > 0 && (
            <Button 
              onClick={handleGenerateMissingCodes}
              disabled={isSeeding}
              variant="outline"
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isSeeding ? 'Generating...' : 'Auto-Generate Cost Codes'}
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Trade
              </Button>
            </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>
                {editingTrade ? 'Edit Trade' : 'Add New Trade'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Trade Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Carpenter, Electrician"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this trade..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="labor_cost_code">Default Labor Cost Code</Label>
                <Select
                  value={formData.default_labor_cost_code_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, default_labor_cost_code_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select labor cost code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {laborCostCodes.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.code} – {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="material_cost_code">Default Material Cost Code</Label>
                <Select
                  value={formData.default_material_cost_code_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, default_material_cost_code_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select material cost code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {materialCostCodes.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.code} – {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sub_cost_code">Default Sub Cost Code</Label>
                <Select
                  value={formData.default_sub_cost_code_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, default_sub_cost_code_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub cost code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {subCostCodes.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.code} – {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                {editingTrade ? 'Update Trade' : 'Add Trade'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Trade Name</TableHead>
                <TableHead className="font-semibold">Labor Code</TableHead>
                <TableHead className="font-semibold">Material Code</TableHead>
                <TableHead className="font-semibold">Sub Code</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => {
                const laborCode = laborCostCodes.find(cc => cc.id === trade.default_labor_cost_code_id);
                const materialCode = materialCostCodes.find(cc => cc.id === trade.default_material_cost_code_id);
                const subCode = subCostCodes.find(cc => cc.id === trade.default_sub_cost_code_id);
                
                return (
                  <TableRow key={trade.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{trade.name}</TableCell>
                    <TableCell>
                      {laborCode ? (
                        <Badge variant="outline" className="text-xs">
                          {laborCode.code}
                        </Badge>
                      ) : (
                        <span className="text-orange-600 text-xs flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Not set
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {materialCode ? (
                        <Badge variant="outline" className="text-xs">
                          {materialCode.code}
                        </Badge>
                      ) : (
                        <span className="text-orange-600 text-xs flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Not set
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {subCode ? (
                        <Badge variant="outline" className="text-xs">
                          {subCode.code}
                        </Badge>
                      ) : (
                        <span className="text-orange-600 text-xs flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Not set
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{trade.description || '-'}</TableCell>
                    <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(trade)}
                        className="hover:bg-primary/10"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(trade.id)}
                        className="hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
