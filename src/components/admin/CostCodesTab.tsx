import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/company/CompanyProvider';
import { Search } from 'lucide-react';

type CostCodeCategory = 'labor' | 'material' | 'sub';

const CATEGORY_LABEL: Record<CostCodeCategory, string> = {
  labor: 'Labor',
  material: 'Material',
  sub: 'Subcontractor',
};

type TradeRow = {
  id: string;
  name: string;
  company_id: string;
};

type CostCodeRow = {
  id: string;
  company_id: string;
  trade_id: string | null;
  code: string;
  name: string;
  category: CostCodeCategory;
  is_active: boolean;
  created_at: string;
};

/**
 * Cost Codes page (READ-ONLY)
 * - No auto-generate button
 * - No writes
 * - Trades page owns generation via a single RPC call
 */
export const CostCodesTab = () => {
  const { activeCompanyId } = useCompany();

  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [costCodes, setCostCodes] = useState<CostCodeRow[]>([]);

  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState<string>('all'); // trade_id
  const [typeFilter, setTypeFilter] = useState<string>('all'); // category
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [onlyMissingDefaults, setOnlyMissingDefaults] = useState(false);

  const tradeById = useMemo(() => {
    const map = new Map<string, TradeRow>();
    for (const t of trades) map.set(t.id, t);
    return map;
  }, [trades]);

  const missingDefaultsTradeIds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const cc of costCodes) {
      if (!cc.trade_id) continue;
      counts.set(cc.trade_id, (counts.get(cc.trade_id) ?? 0) + 1);
    }
    return trades.filter((t) => (counts.get(t.id) ?? 0) !== 3).map((t) => t.id);
  }, [trades, costCodes]);

  const filteredCodes = useMemo(() => {
    let rows = [...costCodes];

    if (statusFilter !== 'all') {
      rows = rows.filter((r) => (statusFilter === 'active' ? r.is_active : !r.is_active));
    }

    if (typeFilter !== 'all') {
      rows = rows.filter((r) => r.category === typeFilter);
    }

    if (tradeFilter !== 'all') {
      rows = rows.filter((r) => r.trade_id === tradeFilter);
    }

    if (onlyMissingDefaults) {
      rows = rows.filter((r) => r.trade_id && missingDefaultsTradeIds.includes(r.trade_id));
    }

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const t = r.trade_id ? tradeById.get(r.trade_id) : null;
        const hay = `${r.code} ${r.name} ${r.category} ${t?.name ?? ''}`.toLowerCase();
        return hay.includes(q);
      });
    }

    return rows;
  }, [costCodes, search, statusFilter, typeFilter, tradeFilter, onlyMissingDefaults, tradeById, missingDefaultsTradeIds]);

  useEffect(() => {
    const load = async () => {
      if (!activeCompanyId) return;
      setLoading(true);
      try {
        const [tradesRes, codesRes] = await Promise.all([
          supabase.from('trades').select('id, name, company_id').eq('company_id', activeCompanyId).order('name'),
          supabase
            .from('cost_codes')
            .select('id, company_id, trade_id, code, name, category, is_active, created_at')
            .eq('company_id', activeCompanyId)
            .order('code'),
        ]);

        if (tradesRes.error) throw tradesRes.error;
        if (codesRes.error) throw codesRes.error;

        setTrades((tradesRes.data || []) as TradeRow[]);
        setCostCodes((codesRes.data || []) as unknown as CostCodeRow[]);
      } catch (err: any) {
        console.error('CostCodesTab load error:', err);
        toast.error(err?.message ?? 'Failed to load cost codes');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [activeCompanyId]);

  if (!activeCompanyId) {
    return (
      <Card className="shadow-medium">
        <CardContent className="py-12 text-center text-muted-foreground">
          Select a company to view cost codes.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-medium">
      <CardHeader className="border-b border-border">
        <CardTitle>Cost Code Library</CardTitle>
        <CardDescription>Read-only summary. Cost codes are generated from Trades.</CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2 space-y-1">
            <Label>Search</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, name, trade…" className="pl-9" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Trade</Label>
            <Select value={tradeFilter} onValueChange={setTradeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All trades</SelectItem>
                {trades.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="sub">Subcontractor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
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
            <span className="text-sm text-muted-foreground">Only missing defaults</span>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filteredCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No cost codes found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCodes.map((row) => {
                  const t = row.trade_id ? tradeById.get(row.trade_id) : null;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono font-medium">{row.code}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{CATEGORY_LABEL[row.category]}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t?.name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={row.is_active ? 'default' : 'secondary'}>{row.is_active ? 'Active' : 'Archived'}</Badge>
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


