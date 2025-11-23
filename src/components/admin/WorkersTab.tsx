import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Users as UsersIcon } from 'lucide-react';
import { z } from 'zod';
import { useWorkers, Worker } from '@/hooks/useWorkers';
import { useTradesSimple } from '@/hooks/useTrades';
import { useQueryClient } from '@tanstack/react-query';

const workerSchema = z.object({
  name: z.string().trim().nonempty({ message: 'Name is required' }).max(100),
  trade_id: z.string().trim().nonempty({ message: 'Trade is required' }),
  hourly_rate: z.number().positive({ message: 'Hourly rate must be positive' }),
  phone: z.string().max(20).optional(),
});

export const WorkersTab = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    trade_id: '',
    hourly_rate: '',
    phone: '',
    active: true,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use centralized hooks with caching
  const { data: workers = [], isLoading: workersLoading } = useWorkers(true);
  const { data: trades = [], isLoading: tradesLoading } = useTradesSimple();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = workerSchema.parse({
        ...formData,
        hourly_rate: parseFloat(formData.hourly_rate),
        phone: formData.phone || undefined,
      });

      // Find the selected trade name
      const selectedTrade = trades.find(t => t.id === validatedData.trade_id);
      const tradeName = selectedTrade?.name || '';

      if (editingWorker) {
        const { error } = await supabase
          .from('workers')
          .update({
            name: validatedData.name,
            trade: tradeName,
            trade_id: validatedData.trade_id,
            hourly_rate: validatedData.hourly_rate,
            phone: validatedData.phone || null,
            active: formData.active,
          })
          .eq('id', editingWorker.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Worker updated successfully',
        });
      } else {
        const { error } = await supabase.from('workers').insert([
          {
            name: validatedData.name,
            trade: tradeName,
            trade_id: validatedData.trade_id,
            hourly_rate: validatedData.hourly_rate,
            phone: validatedData.phone || null,
            active: formData.active,
          },
        ]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Worker added successfully',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        console.error('Worker save error:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to save worker',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this worker?')) return;

    const { error } = await supabase.from('workers').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete worker',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Worker deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    }
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      name: worker.name,
      trade_id: worker.trade_id || '',
      hourly_rate: worker.hourly_rate.toString(),
      phone: worker.phone || '',
      active: worker.active,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingWorker(null);
    setFormData({
      name: '',
      trade_id: '',
      hourly_rate: '',
      phone: '',
      active: true,
    });
  };

  const toggleActive = async (worker: Worker) => {
    const { error } = await supabase
      .from('workers')
      .update({ active: !worker.active })
      .eq('id', worker.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update worker status',
        variant: 'destructive',
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Workers Management</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Worker
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>
                {editingWorker ? 'Edit Worker' : 'Add New Worker'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trade">Trade</Label>
                <Select
                  value={formData.trade_id}
                  onValueChange={(value) => setFormData({ ...formData, trade_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a trade" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {trades.map((trade) => (
                      <SelectItem key={trade.id} value={trade.id}>
                        {trade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
              <Button type="submit" className="w-full">
                {editingWorker ? 'Update Worker' : 'Add Worker'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((worker) => (
                <TableRow key={worker.id}>
                  <TableCell className="font-medium">{worker.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {worker.trades?.name || 'No Trade'}
                    </span>
                  </TableCell>
                  <TableCell>${worker.hourly_rate.toFixed(2)}</TableCell>
                  <TableCell>{worker.phone || '-'}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleActive(worker)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        worker.active
                          ? 'bg-success/10 text-success'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {worker.active ? 'Active' : 'Inactive'}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(worker)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(worker.id)}
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
