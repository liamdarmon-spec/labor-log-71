import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { z } from 'zod';

const workerSchema = z.object({
  name: z.string().trim().nonempty({ message: 'Name is required' }).max(100),
  trade: z.string().trim().nonempty({ message: 'Trade is required' }).max(100),
  hourly_rate: z.number().positive({ message: 'Hourly rate must be positive' }),
  phone: z.string().max(20).optional(),
});

interface Worker {
  id: string;
  name: string;
  trade: string;
  hourly_rate: number;
  phone: string | null;
  active: boolean;
}

export const WorkersTab = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    trade: '',
    hourly_rate: '',
    phone: '',
    active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load workers',
        variant: 'destructive',
      });
    } else {
      setWorkers(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = workerSchema.parse({
        ...formData,
        hourly_rate: parseFloat(formData.hourly_rate),
        phone: formData.phone || undefined,
      });

      if (editingWorker) {
        const { error } = await supabase
          .from('workers')
          .update({
            name: validatedData.name,
            trade: validatedData.trade,
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
            trade: validatedData.trade,
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
      fetchWorkers();
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
          description: 'Failed to save worker',
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
      fetchWorkers();
    }
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      name: worker.name,
      trade: worker.trade,
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
      trade: '',
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
      fetchWorkers();
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
                <Input
                  id="trade"
                  value={formData.trade}
                  onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
                  required
                />
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
                  <TableCell>{worker.trade}</TableCell>
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
