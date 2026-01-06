import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/company/CompanyProvider';
import { Search, Info, ArrowRight } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// COST CODES TAB (READ-ONLY)
// ============================================================================

/**
 * Cost Code Library (Read-Only)
 *
 * This page displays cost codes for visibility, filtering, and education.
 * Cost codes are generated from Trades — this page cannot create or modify them.
 *
 * Mental model:
 * - Trades define *what* work exists
 * - Cost Codes define *how* costs are tracked
 * - Default cost codes are a convenience (Labor, Material, Sub per trade)
 */
export const CostCodesTab = () => {
  const { activeCompanyId } = useCompany();

  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [costCodes, setCostCodes] = useState<CostCodeRow[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');

  const tradeById = useMemo(() => {
    const map = new Map<string, TradeRow>();
    for (const t of trades) map.set(t.id, t);
    return map;
  }, [trades]);

  const filteredCodes = useMemo(() => {
    let rows = [...costCodes];

    // Status filter
    if (statusFilter !== 'all') {
      rows = rows.filter((r) => (statusFilter === 'active' ? r.is_active : !r.is_active));
    }

    // Type filter
    if (typeFilter !== 'all') {
      rows = rows.filter((r) => r.category === typeFilter);
    }

    // Trade filter
    if (tradeFilter !== 'all') {
      if (tradeFilter === 'unassigned') {
        rows = rows.filter((r) => !r.trade_id);
      } else {
        rows = rows.filter((r) => r.trade_id === tradeFilter);
      }
    }

    // Search
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const t = r.trade_id ? tradeById.get(r.trade_id) : null;
        const hay = `${r.code} ${r.name} ${r.category} ${t?.name ?? ''}`.toLowerCase();
        return hay.includes(q);
      });
    }

    return rows;
  }, [costCodes, search, statusFilter, typeFilter, tradeFilter, tradeById]);

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

  // ============================================================================
  // EMPTY / LOADING STATES
  // ============================================================================

  if (!activeCompanyId) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Info className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">Select a Company</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Cost codes are tenant-scoped. Select or create a company to continue.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-xl">Cost Codes</CardTitle>
        <CardDescription className="max-w-xl">
          A read-only view of all cost codes in your company. Cost codes are generated from Trades.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2 space-y-1">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, name, trade…"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Trade</Label>
            <Select value={tradeFilter} onValueChange={setTradeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All trades</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {trades.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Category</Label>
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
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[120px]">Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[120px]">Category</TableHead>
                <TableHead className="w-[180px]">Trade</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filteredCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                      <Info className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">
                      {costCodes.length === 0 ? 'No cost codes yet' : 'No results found'}
                    </h3>
                    {costCodes.length === 0 ? (
                      <div className="text-sm text-muted-foreground max-w-sm mx-auto space-y-2">
                        <p>Cost codes are generated from Trades.</p>
                        <p className="flex items-center justify-center gap-2 text-muted-foreground">
                          <span>Create or edit a Trade</span>
                          <ArrowRight className="w-4 h-4" />
                          <span>Generate default cost codes</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Try adjusting your filters or search term.
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCodes.map((row) => {
                  const trade = row.trade_id ? tradeById.get(row.trade_id) : null;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono font-medium">{row.code}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{CATEGORY_LABEL[row.category]}</Badge>
                      </TableCell>
                      <TableCell>
                        {trade ? (
                          <span className="text-muted-foreground">{trade.name}</span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.is_active ? 'default' : 'secondary'}>
                          {row.is_active ? 'Active' : 'Archived'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Lineage education footer */}
        {!loading && costCodes.length > 0 && (
          <div className="text-xs text-muted-foreground text-center pt-2">
            Cost codes are derived from Trades. Edit trades in the <span className="font-medium">Trades</span> tab to
            modify defaults.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
