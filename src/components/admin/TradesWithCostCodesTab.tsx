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
import { Plus, Pencil, Trash2, Wrench, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { z } from 'zod';

const tradeSchema = z.object({
  name: z.string().trim().nonempty({ message: 'Trade name is required' }).max(100),
  description: z.string().max(500).optional(),
});

interface Trade {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface CostCode {
  id: string;
  code: string;
  name: string;
  category: string;
  trade_id: string;
}

export const TradesWithCostCodesTab = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTrades();
    fetchCostCodes();
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

  const fetchCostCodes = async () => {
    const { data, error } = await supabase
      .from('cost_codes')
      .select('*')
      .not('trade_id', 'is', null);

    if (error) {
      console.error('Error fetching cost codes:', error);
    } else {
      setCostCodes(data || []);
    }
  };

  const createCostCodesForTrade = async (tradeId: string, tradeName: string) => {
    const costCodesToCreate = [
      {
        code: `${tradeName.toUpperCase()}-L`,
        name: `${tradeName} Labor`,
        category: 'labor',
        trade_id: tradeId,
        is_active: true,
      },
      {
        code: `${tradeName.toUpperCase()}-M`,
        name: `${tradeName} Materials`,
        category: 'materials',
        trade_id: tradeId,
        is_active: true,
      },
      {
        code: `${tradeName.toUpperCase()}-S`,
        name: `${tradeName} Sub-Contractor`,
        category: 'subs',
        trade_id: tradeId,
        is_active: true,
      },
    ];

    const { error } = await supabase.from('cost_codes').insert(costCodesToCreate);

    if (error) {
      throw error;
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
          })
          .eq('id', editingTrade.id);

        if (error) throw error;

        // Update cost code names if trade name changed
        if (validatedData.name !== editingTrade.name) {
          const tradeCostCodes = costCodes.filter(cc => cc.trade_id === editingTrade.id);
          
          for (const cc of tradeCostCodes) {
            let newName = '';
            let newCode = '';
            
            if (cc.category === 'labor') {
              newName = `${validatedData.name} Labor`;
              newCode = `${validatedData.name.toUpperCase()}-L`;
            } else if (cc.category === 'materials') {
              newName = `${validatedData.name} Materials`;
              newCode = `${validatedData.name.toUpperCase()}-M`;
            } else if (cc.category === 'subs') {
              newName = `${validatedData.name} Sub-Contractor`;
              newCode = `${validatedData.name.toUpperCase()}-S`;
            }
            
            await supabase
              .from('cost_codes')
              .update({ name: newName, code: newCode })
              .eq('id', cc.id);
          }
        }

        toast({
          title: 'Success',
          description: 'Trade updated successfully',
        });
      } else {
        const { data: newTrade, error } = await supabase
          .from('trades')
          .insert([
            {
              name: validatedData.name,
              description: validatedData.description || null,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        // Create the 3 cost codes for this trade
        await createCostCodesForTrade(newTrade.id, validatedData.name);

        toast({
          title: 'Success',
          description: 'Trade and cost codes created successfully',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchTrades();
      fetchCostCodes();
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
    if (!confirm('Are you sure you want to delete this trade? This will also delete all associated cost codes.')) return;

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
      fetchCostCodes();
    }
  };

  const handleEdit = (trade: Trade) => {
    setEditingTrade(trade);
    setFormData({
      name: trade.name,
      description: trade.description || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTrade(null);
    setFormData({
      name: '',
      description: '',
    });
  };

  const getTradeCostCodes = (tradeId: string) => {
    return costCodes.filter(cc => cc.trade_id === tradeId);
  };

  const hasAllCostCodes = (tradeId: string) => {
    const codes = getTradeCostCodes(tradeId);
    return codes.length === 3;
  };

  return (
    <Card className="shadow-medium">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Wrench className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-xl">Trades & Cost Codes</CardTitle>
        </div>
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
              <p className="text-sm text-muted-foreground">
                {!editingTrade && 'This will automatically create 3 cost codes: Labor, Materials, and Sub-Contractor'}
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Trade Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Painting, Electrical"
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
              <Button type="submit" className="w-full">
                {editingTrade ? 'Update Trade' : 'Create Trade with Cost Codes'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Trade Name</TableHead>
                <TableHead className="font-semibold">Cost Codes</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => {
                const tradeCostCodes = getTradeCostCodes(trade.id);
                const allCodesPresent = hasAllCostCodes(trade.id);
                
                return (
                  <TableRow key={trade.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{trade.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {allCodesPresent ? (
                          <>
                            {tradeCostCodes.map(cc => (
                              <Badge key={cc.id} variant="outline" className="text-xs w-fit">
                                {cc.code}: {cc.name}
                              </Badge>
                            ))}
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-orange-600">
                            <XCircle className="w-4 h-4" />
                            <span className="text-xs">Missing cost codes</span>
                          </div>
                        )}
                      </div>
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
