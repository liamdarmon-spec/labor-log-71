import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/company/CompanyProvider';
import { Plus, Pencil, Archive, Search, Info } from 'lucide-react';

// CANONICAL categories - must match cost_codes_category_check constraint
type CostCodeCategory = 'labor' | 'material' | 'sub';

const CATEGORIES: Array<{ value: CostCodeCategory; label: string }> = [
  { value: 'labor', label: 'Labor' },
  { value: 'material', label: 'Material' },
  { value: 'sub', label: 'Subcontractor' },
];

type CompanyTrade = {
  id: string;
  name: string;
  description: string | null;
  code_prefix: string;
  is_active: boolean;
  default_labor_cost_code_id: string | null;
  default_material_cost_code_id: string | null;
  default_sub_cost_code_id: string | null;
  defaults_complete: boolean;
};

type CostCodeRow = {
  id: string;
  company_id: string;
  company_trade_id: string | null;
  code: string;
  name: string;
  category: CostCodeCategory;
  is_active: boolean;
  created_at: string;
};

export const CostCodesTab = () => {
  const { activeCompanyId } = useCompany();

  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<CompanyTrade[]>([]);
  const [costCodes, setCostCodes] = useState<CostCodeRow[]>([]);

  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState<string>('all'); // company_trade_id
  const [typeFilter, setTypeFilter] = useState<string>('all'); // category
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [onlyMissingDefaults, setOnlyMissingDefaults] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CostCodeRow | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    category: 'labor' as CostCodeCategory,
    notes: '',
    is_active: true,
    company_trade_id: 'unassigned' as string, // trade id or 'unassigned'
    set_as_default: false,
    default_kind: 'labor' as CostCodeCategory, // only labor/material/sub (canonical)
  });

  const tradeById = useMemo(() => {
    const map = new Map<string, CompanyTrade>();
    for (const t of trades) map.set(t.id, t);
    return map;
  }, [trades]);

  const missingDefaultsTrades = useMemo(() => trades.filter(t => !t.defaults_complete && t.is_active), [trades]);

  const filteredCodes = useMemo(() => {
    let rows = [...costCodes];

    if (statusFilter !== 'all') {
      rows = rows.filter(r => (statusFilter === 'active' ? r.is_active : !r.is_active));
    }

    if (typeFilter !== 'all') {
      rows = rows.filter(r => r.category === typeFilter);
    }

    if (tradeFilter !== 'all') {
      if (tradeFilter === 'unassigned') rows = rows.filter(r => !r.company_trade_id);
      else rows = rows.filter(r => r.company_trade_id === tradeFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(r => {
        const t = r.company_trade_id ? tradeById.get(r.company_trade_id) : null;
        const hay = `${r.code} ${r.name} ${r.category} ${t?.name ?? ''}`.toLowerCase();
        return hay.includes(q);
      });
    }

    return rows;
  }, [costCodes, search, statusFilter, typeFilter, tradeFilter, tradeById]);

  const load = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const [tradesRes, codesRes] = await Promise.all([
        supabase.rpc('list_company_trades', { p_company_id: activeCompanyId }),
        supabase
      .from('cost_codes')
          .select('id, company_id, company_trade_id, code, name, category, is_active, created_at')
          .eq('company_id', activeCompanyId)
          .order('code'),
      ]);

      if (tradesRes.error) throw tradesRes.error;
      if (codesRes.error) throw codesRes.error;

      setTrades((tradesRes.data || []) as unknown as CompanyTrade[]);
      setCostCodes((codesRes.data || []) as unknown as CostCodeRow[]);
    } catch (err: any) {
      console.error('Cost Code Library load error:', err);
      toast.error(err?.message ?? 'Failed to load cost code library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      code: '',
      name: '',
      category: 'labor',
      notes: '',
      is_active: true,
      company_trade_id: 'unassigned',
      set_as_default: false,
      default_kind: 'labor',
    });
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (row: CostCodeRow) => {
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      category: row.category,
      notes: '',
      is_active: row.is_active,
      company_trade_id: row.company_trade_id ?? 'unassigned',
      set_as_default: false,
      default_kind: row.category === 'material' ? 'material' : row.category === 'sub' ? 'sub' : 'labor',
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!activeCompanyId) {
      toast.error('No company selected');
      return;
    }
    const company_trade_id = form.company_trade_id === 'unassigned' ? null : form.company_trade_id;

    try {
      if (editing) {
        // Update: keep code immutable for safety; allow name/category/status/assignment changes
        const { error } = await supabase
          .from('cost_codes')
          .update({
            name: form.name,
            category: form.category,
            is_active: form.is_active,
            company_trade_id,
          })
          .eq('id', editing.id)
          .eq('company_id', activeCompanyId);
        if (error) throw error;

        // Optional: set as default
        if (company_trade_id && form.set_as_default && (form.default_kind === 'labor' || form.default_kind === 'material' || form.default_kind === 'sub')) {
          const { data, error: setErr } = await supabase.rpc('set_company_trade_default_cost_code', {
            p_company_trade_id: company_trade_id,
            p_default_kind: form.default_kind,
            p_cost_code_id: editing.id,
          });
          if (setErr) throw setErr;
          if (data && (data as any).success === false) throw new Error((data as any).error ?? 'Failed setting default');
        }

        toast.success('Cost code updated');
      } else {
        // Create: collision-safe via RPC
        const { data, error } = await supabase.rpc('create_cost_code_safe', {
          p_company_id: activeCompanyId,
          p_code: form.code,
          p_name: form.name,
          p_category: form.category,
          p_company_trade_id: company_trade_id,
          p_is_active: form.is_active,
        });
        if (error) throw error;
        if (!data || (data as any).success === false) throw new Error((data as any)?.error ?? 'Failed to create cost code');

        const newId = (data as any).id as string;

        // Optional: set as default
        if (company_trade_id && form.set_as_default && (form.default_kind === 'labor' || form.default_kind === 'material' || form.default_kind === 'sub')) {
          const { data: setData, error: setErr } = await supabase.rpc('set_company_trade_default_cost_code', {
            p_company_trade_id: company_trade_id,
            p_default_kind: form.default_kind,
            p_cost_code_id: newId,
          });
          if (setErr) throw setErr;
          if (setData && (setData as any).success === false) throw new Error((setData as any).error ?? 'Failed setting default');
        }

        toast.success(`Cost code created: ${(data as any).code}`);
      }

      setDialogOpen(false);
      resetForm();
      await load();
    } catch (err: any) {
      console.error('Cost code save error:', err);
      toast.error(err?.message ?? 'Failed to save cost code');
    }
  };

  const archive = async (row: CostCodeRow) => {
    if (!activeCompanyId) return;
    if (!confirm(`Archive cost code ${row.code}?`)) return;
    try {
      const { error } = await supabase
        .from('cost_codes')
        .update({ is_active: false })
        .eq('id', row.id)
        .eq('company_id', activeCompanyId);
      if (error) throw error;
      toast.success('Archived');
      await load();
    } catch (err: any) {
      console.error('Archive error:', err);
      toast.error(err?.message ?? 'Failed to archive');
    }
  };

  if (!activeCompanyId) {
    return (
      <Card className="shadow-medium">
        <CardContent className="py-12 text-center">
          <Info className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">Select a Company</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Cost codes are tenant-scoped. Select or create a company to continue.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-medium">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Cost Code Library</CardTitle>
            <CardDescription>
              Browse and manage cost codes. Trade defaults are generated in <span className="font-medium">Trades &amp; Defaults</span>.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
                <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Add Cost Code
              </Button>
            </DialogTrigger>
              <DialogContent className="max-w-lg">
              <DialogHeader>
                  <DialogTitle>{editing ? 'Edit Cost Code' : 'Add Cost Code'}</DialogTitle>
                  <DialogDescription>
                    Cost codes can be unassigned (custom) or linked to a trade. Defaults are set on trades.
                  </DialogDescription>
              </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                        value={form.code}
                        onChange={(e) => setForm((s) => ({ ...s, code: e.target.value.toUpperCase() }))}
                        placeholder="e.g., PLB-L"
                        disabled={!!editing} // keep immutable for safety
                      />
                      {editing && (
                        <p className="text-xs text-muted-foreground">Code is immutable after creation.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type *</Label>
                      <Select value={form.category} onValueChange={(v) => setForm((s) => ({ ...s, category: v as CostCodeCategory, default_kind: v as any }))}>
                        <SelectTrigger id="type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                </div>

                  <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                    <Input id="name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g., Plumbing Labor" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trade">Trade (optional)</Label>
                    <Select value={form.company_trade_id} onValueChange={(v) => setForm((s) => ({ ...s, company_trade_id: v }))}>
                      <SelectTrigger id="trade">
                        <SelectValue placeholder="Unassigned / Custom" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned / Custom</SelectItem>
                        {trades.filter(t => t.is_active).map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t.code_prefix})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea id="notes" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} rows={2} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_active} onCheckedChange={(checked) => setForm((s) => ({ ...s, is_active: checked }))} />
                    <span className="text-sm">Active</span>
                  </div>

                  {form.company_trade_id !== 'unassigned' && (form.category === 'labor' || form.category === 'material' || form.category === 'sub') && (
                    <div className="rounded-md border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Trade Defaults</div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={form.set_as_default}
                            onCheckedChange={(checked) => setForm((s) => ({ ...s, set_as_default: checked }))}
                          />
                          <span className="text-sm">Set as default</span>
                        </div>
                </div>
                      {form.set_as_default && (
                        <div className="space-y-2">
                          <Label>Default slot</Label>
                  <Select
                            value={form.default_kind}
                            onValueChange={(v) => setForm((s) => ({ ...s, default_kind: v as CostCodeCategory }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                              <SelectItem value="labor">Labor</SelectItem>
                              <SelectItem value="material">Material</SelectItem>
                              <SelectItem value="sub">Subcontractor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                      )}
                </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={save} disabled={!form.name.trim() || (!editing && !form.code.trim())}>
                    {editing ? 'Save changes' : 'Create'}
                  </Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {missingDefaultsTrades.length > 0 && (
          <div className="mt-4">
            <Alert>
              <AlertTitle>Trade defaults are incomplete</AlertTitle>
              <AlertDescription>
                {missingDefaultsTrades.length} trade(s) are missing default L/M/S cost codes. Use <span className="font-medium">Trades &amp; Defaults</span> → “Generate missing defaults”.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-4">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, name, trade…" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Trade</Label>
              <Select value={tradeFilter} onValueChange={setTradeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All trades</SelectItem>
                  <SelectItem value="unassigned">Unassigned / Custom</SelectItem>
                  {trades.filter(t => t.is_active).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.code_prefix})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[160px]">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

            <div className="min-w-[140px]">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Switch checked={onlyMissingDefaults} onCheckedChange={setOnlyMissingDefaults} />
              <span className="text-sm">Only missing defaults</span>
            </div>
          </div>
        </div>

        {onlyMissingDefaults && missingDefaultsTrades.length > 0 && (
          <div className="mb-6 rounded-lg border p-4">
            <div className="font-medium mb-2">Trades missing defaults</div>
            <div className="text-sm text-muted-foreground mb-3">
              Defaults are generated and managed in Trades &amp; Defaults.
            </div>
            <div className="flex flex-wrap gap-2">
              {missingDefaultsTrades.map((t) => (
                <Badge key={t.id} variant="outline">
                  {t.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filteredCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No cost codes found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCodes.map((row) => {
                  const trade = row.company_trade_id ? tradeById.get(row.company_trade_id) : null;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono font-medium">{row.code}</TableCell>
                      <TableCell>{row.name}</TableCell>
                    <TableCell>
                        <Badge variant="outline">
                          {CATEGORIES.find(c => c.value === row.category)?.label ?? row.category}
                      </Badge>
                    </TableCell>
                      <TableCell className="text-muted-foreground">
                        {trade ? `${trade.name} (${trade.code_prefix})` : 'Unassigned'}
                    </TableCell>
                    <TableCell>
                        <Badge variant={row.is_active ? 'default' : 'secondary'}>
                          {row.is_active ? 'Active' : 'Archived'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {row.is_active && (
                            <Button variant="ghost" size="icon" onClick={() => archive(row)}>
                              <Archive className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
