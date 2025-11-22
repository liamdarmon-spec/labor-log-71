import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Building2, Phone, Mail, DollarSign, Edit, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SubsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    trade_id: '',
    default_rate: '',
    phone: '',
    email: '',
    payment_terms: '',
    retention_rate: '10',
    notes: '',
    active: true,
  });

  const { data: subs, isLoading } = useQuery({
    queryKey: ['subs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subs')
        .select(`
          *,
          trades (id, name)
        `)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: trades } = useQuery({
    queryKey: ['trades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: contracts } = useQuery({
    queryKey: ['sub-contracts-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_contracts')
        .select('sub_id, contract_value, amount_billed, amount_paid, retention_held, status');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('subs')
        .insert([{
          ...data,
          default_rate: data.default_rate ? Number(data.default_rate) : null,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subs'] });
      toast({ title: 'Subcontractor added successfully' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ 
        title: 'Error adding subcontractor', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('subs')
        .update({
          ...data,
          default_rate: data.default_rate ? Number(data.default_rate) : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subs'] });
      toast({ title: 'Subcontractor updated successfully' });
      setEditingSub(null);
      resetForm();
    },
    onError: (error) => {
      toast({ 
        title: 'Error updating subcontractor', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      company_name: '',
      trade_id: '',
      default_rate: '',
      phone: '',
      email: '',
      payment_terms: '',
      retention_rate: '10',
      notes: '',
      active: true,
    });
  };

  const handleEdit = (sub: any) => {
    setEditingSub(sub);
    setFormData({
      name: sub.name,
      company_name: sub.company_name || '',
      trade_id: sub.trade_id || '',
      default_rate: sub.default_rate?.toString() || '',
      phone: sub.phone || '',
      email: sub.email || '',
      payment_terms: '',
      retention_rate: '10',
      notes: '',
      active: sub.active,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSub) {
      updateMutation.mutate({ id: editingSub.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getSubSummary = (subId: string) => {
    const subContracts = contracts?.filter(c => c.sub_id === subId) || [];
    const totalContracted = subContracts.reduce((sum, c) => sum + Number(c.contract_value), 0);
    const totalPaid = subContracts.reduce((sum, c) => sum + Number(c.amount_paid), 0);
    const outstanding = subContracts.reduce((sum, c) => 
      sum + (Number(c.amount_billed) - Number(c.amount_paid)), 0
    );
    return { totalContracted, totalPaid, outstanding };
  };

  const filteredSubs = subs?.filter(sub =>
    sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.trades?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Subcontractors</h2>
          <p className="text-muted-foreground">Manage your subcontractor database</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Subcontractor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Subcontractor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Company Name</Label>
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Trade *</Label>
                  <Select
                    value={formData.trade_id}
                    onValueChange={(value) => setFormData({ ...formData, trade_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trade" />
                    </SelectTrigger>
                    <SelectContent>
                      {trades?.map(trade => (
                        <SelectItem key={trade.id} value={trade.id}>
                          {trade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Default Rate</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.default_rate}
                    onChange={(e) => setFormData({ ...formData, default_rate: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Payment Terms</Label>
                <Input
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="e.g., Net 30"
                />
              </div>
              <div>
                <Label>Retention Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.retention_rate}
                  onChange={(e) => setFormData({ ...formData, retention_rate: e.target.value })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Subcontractor</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search subcontractors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Subs Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Subcontractors</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading subcontractors...</div>
          ) : filteredSubs && filteredSubs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Total Contract $</TableHead>
                  <TableHead>Outstanding $</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubs.map((sub: any) => {
                  const summary = getSubSummary(sub.id);
                  return (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sub.name}</div>
                          {sub.company_name && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {sub.company_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sub.trades?.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {sub.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {sub.phone}
                            </div>
                          )}
                          {sub.email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {sub.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{summary.totalContracted.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${summary.outstanding > 0 ? 'text-orange-600' : ''}`}>
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium">{summary.outstanding.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sub.active ? 'default' : 'secondary'}>
                          {sub.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEdit(sub)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit Subcontractor</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Name *</Label>
                                  <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                  />
                                </div>
                                <div>
                                  <Label>Company Name</Label>
                                  <Input
                                    value={formData.company_name}
                                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label>Trade *</Label>
                                  <Select
                                    value={formData.trade_id}
                                    onValueChange={(value) => setFormData({ ...formData, trade_id: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {trades?.map(trade => (
                                        <SelectItem key={trade.id} value={trade.id}>
                                          {trade.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Default Rate</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.default_rate}
                                    onChange={(e) => setFormData({ ...formData, default_rate: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label>Phone</Label>
                                  <Input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label>Email</Label>
                                  <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={formData.active}
                                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                  id="active"
                                />
                                <Label htmlFor="active">Active</Label>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={() => setEditingSub(null)}>
                                  Cancel
                                </Button>
                                <Button type="submit">Update Subcontractor</Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No subcontractors found</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first subcontractor to get started
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subcontractor
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
