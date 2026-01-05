import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit2, Trash2, Filter, Sparkles, Loader2 } from 'lucide-react';
import { useCompany } from '@/company/CompanyProvider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface CostCode {
  id: string;
  code: string;
  name: string;
  category: 'labor' | 'materials' | 'subs' | 'equipment' | 'other';
  description?: string;
  is_active: boolean;
  created_at: string;
  trade_id: string | null;
  trades: { name: string } | null;
}

const CATEGORIES = [
  { value: 'labor', label: 'Labor' },
  { value: 'materials', label: 'Materials' },
  { value: 'subs', label: 'Subcontractors' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'other', label: 'Other' },
] as const;

export const CostCodesTab = () => {
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [filteredCostCodes, setFilteredCostCodes] = useState<CostCode[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<CostCode | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('active');
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'labor' as CostCode['category'],
    description: '',
    is_active: true,
  });
  const { toast } = useToast();
  const { activeCompanyId } = useCompany();

  useEffect(() => {
    fetchCostCodes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [costCodes, categoryFilter, activeFilter]);

  const fetchCostCodes = async () => {
    const { data, error } = await supabase
      .from('cost_codes')
      .select('*, trades!cost_codes_trade_id_fkey(name)')
      .order('code');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch cost codes',
        variant: 'destructive',
      });
      return;
    }

    setCostCodes((data || []) as CostCode[]);
  };

  const applyFilters = () => {
    let filtered = [...costCodes];

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(cc => cc.category === categoryFilter);
    }

    if (activeFilter === 'active') {
      filtered = filtered.filter(cc => cc.is_active);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(cc => !cc.is_active);
    }

    setFilteredCostCodes(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCode) {
      const { error } = await supabase
        .from('cost_codes')
        .update({
          code: formData.code,
          name: formData.name,
          category: formData.category,
          description: formData.description || null,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingCode.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update cost code',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Cost code updated successfully',
      });
    } else {
      if (!activeCompanyId) {
        toast({
          title: 'Error',
          description: 'No company selected',
          variant: 'destructive',
        });
        return;
      }
      
      const { error } = await supabase.from('cost_codes').insert({
        company_id: activeCompanyId,
        code: formData.code,
        name: formData.name,
        category: formData.category,
        description: formData.description || null,
        is_active: formData.is_active,
      });

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to create cost code: ' + error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Cost code created successfully',
      });
    }

    setIsDialogOpen(false);
    resetForm();
    fetchCostCodes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this cost code?')) return;

    const { error } = await supabase
      .from('cost_codes')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to deactivate cost code',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Cost code deactivated successfully',
    });
    fetchCostCodes();
  };

  const handleEdit = (code: CostCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      name: code.name,
      category: code.category,
      description: code.description || '',
      is_active: code.is_active,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCode(null);
    setFormData({
      code: '',
      name: '',
      category: 'labor',
      description: '',
      is_active: true,
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      labor: 'bg-blue-500',
      materials: 'bg-green-500',
      subs: 'bg-purple-500',
      equipment: 'bg-orange-500',
      other: 'bg-gray-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  // Auto-generate cost codes from trades
  const handleAutoGenerate = async () => {
    if (!activeCompanyId) {
      toast({
        title: 'Error',
        description: 'No company selected',
        variant: 'destructive',
      });
      return;
    }

    setIsAutoGenerating(true);
    try {
      const { data, error } = await supabase.rpc('auto_generate_trade_cost_codes', {
        p_company_id: activeCompanyId,
      });

      if (error) throw error;

      const result = data as { created_count: number; skipped_count: number; codes: any[] };
      
      if (result.message) {
        // Special message from function (e.g., "No trades found")
        toast({
          title: 'Info',
          description: result.message,
        });
      } else if (result.created_count > 0) {
        toast({
          title: 'Cost Codes Generated',
          description: `Created ${result.created_count} new cost codes. (${result.skipped_count} already existed)`,
        });
        fetchCostCodes();
      } else {
        toast({
          title: 'No New Codes',
          description: `All trades already have cost codes (${result.skipped_count} existing).`,
        });
      }
    } catch (err: any) {
      console.error('Auto-generate error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to auto-generate cost codes',
        variant: 'destructive',
      });
    } finally {
      setIsAutoGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Cost Codes</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleAutoGenerate}
              disabled={isAutoGenerating}
            >
              {isAutoGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Auto-Generate from Trades
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Cost Code
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingCode ? 'Edit Cost Code' : 'Add New Cost Code'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., 3300-L"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Painting Labor"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as CostCode['category'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCode ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <Label>Category:</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label>Status:</Label>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCostCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No cost codes found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCostCodes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-medium">{code.code}</TableCell>
                    <TableCell>{code.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {code.trades?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(code.category)}>
                        {CATEGORIES.find(c => c.value === code.category)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {code.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={code.is_active ? 'default' : 'secondary'}>
                        {code.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(code)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {code.is_active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(code.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
