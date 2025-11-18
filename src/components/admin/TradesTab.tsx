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
import { Plus, Pencil, Trash2, Wrench } from 'lucide-react';
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

export const TradesTab = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const { toast } = useToast();

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
          })
          .eq('id', editingTrade.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Trade updated successfully',
        });
      } else {
        const { error } = await supabase.from('trades').insert([
          {
            name: validatedData.name,
            description: validatedData.description || null,
          },
        ]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Trade added successfully',
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

  return (
    <Card className="shadow-medium">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Wrench className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-xl">Trades Management</CardTitle>
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
              <Button type="submit" className="w-full">
                {editingTrade ? 'Update Trade' : 'Add Trade'}
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
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{trade.name}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
