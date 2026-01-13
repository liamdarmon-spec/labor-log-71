import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompany } from '@/company/CompanyProvider';
import { Search, Info, ArrowRight, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchCostCodes, type CanonicalCostCodeCategory, type CostCodeStatusFilter } from '@/data/catalog';
import { useCostCodeCategoriesMeta } from '@/hooks/useCostCodeCategoriesMeta';

// ============================================================================
// TYPES (matches RPC return shape)
// ============================================================================

type CostCodeCategory = CanonicalCostCodeCategory;

type CostCodeWithTrade = {
  id: string;
  code: string;
  name: string;
  category: CostCodeCategory;
  is_active: boolean;
  trade_id: string | null;
  trade_name: string | null;
  is_legacy: boolean;
};

// ============================================================================
// COST CODES TAB (READ-ONLY PROJECTION)
// ============================================================================

/**
 * Cost Code Library (Read-Only Projection)
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
  const { data: categoryMeta = [] } = useCostCodeCategoriesMeta();
  const categoryMetaByKey = useMemo(() => new Map(categoryMeta.map((c) => [c.key, c])), [categoryMeta]);

  // Filters
  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [showLegacy, setShowLegacy] = useState(false);

  // ============================================================================
  // DATA FETCHING (SINGLE QUERY VIA RPC)
  // ============================================================================

  const { data: costCodes = [], isLoading, error } = useQuery({
    queryKey: [
      'cost-codes-with-trades',
      activeCompanyId,
      search,
      tradeFilter,
      categoryFilter,
      statusFilter,
      showLegacy,
    ],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const tradeIdParam =
        tradeFilter === 'all' ? null : tradeFilter === 'unassigned' ? null : tradeFilter;
      const categoryParam = categoryFilter === 'all' ? null : (categoryFilter as CostCodeCategory);
      const statusParam = statusFilter as CostCodeStatusFilter;

      return await fetchCostCodes(activeCompanyId, {
        search: search.trim() || undefined,
        tradeId: tradeFilter === 'unassigned' ? null : tradeIdParam,
        category: categoryParam ?? undefined,
        status: statusParam,
        includeLegacy: showLegacy,
        limit: 200,
        offset: 0,
      });
    },
    enabled: !!activeCompanyId,
    retry: false,
  });

  // Build unique trades list for filter dropdown
  const uniqueTrades = useMemo(() => {
    const map = new Map<string, string>();
    for (const cc of costCodes) {
      if (cc.trade_id && cc.trade_name) {
        map.set(cc.trade_id, cc.trade_name);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [costCodes]);

  // Count legacy codes
  const legacyCount = useMemo(() => costCodes.filter((cc) => cc.is_legacy).length, [costCodes]);

  // Server-side filtered (RPC). Keep client-side view as-is.
  const filteredCodes = useMemo(() => costCodes, [costCodes]);

  // ============================================================================
  // EMPTY / LOADING / ERROR STATES
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

  if (error) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto text-destructive mb-3" />
          <h3 className="text-lg font-medium">Failed to load cost codes</h3>
          <p className="text-sm text-muted-foreground mt-1">{(error as Error).message}</p>
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
          Read-only list of all cost codes generated from Trades. Manage defaults in the <span className="font-medium">Trades</span> tab.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {/* Legacy codes notice */}
        {legacyCount > 0 && !showLegacy && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span>
                <strong>{legacyCount}</strong> legacy/unassigned cost codes hidden.
              </span>
            </div>
            <button
              onClick={() => setShowLegacy(true)}
              className="text-amber-700 hover:text-amber-900 underline underline-offset-2 text-sm"
            >
              Show
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
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
                <SelectItem value="unassigned">Legacy / Unassigned</SelectItem>
                {uniqueTrades.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {categoryMeta.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'active' | 'archived' | 'all')}>
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

          <div className="flex items-center gap-2 pb-1">
            <Switch
              id="show-legacy"
              checked={showLegacy}
              onCheckedChange={setShowLegacy}
            />
            <Label htmlFor="show-legacy" className="text-xs text-muted-foreground cursor-pointer">
              Show legacy
            </Label>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[120px]">Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[130px]">Category</TableHead>
                <TableHead className="w-[180px]">Trade</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
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
                filteredCodes.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono font-medium">{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{categoryMetaByKey.get(row.category)?.label || row.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {row.trade_name ? (
                        <span className="text-muted-foreground">{row.trade_name}</span>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Legacy
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.is_active ? 'default' : 'secondary'}>
                        {row.is_active ? 'Active' : 'Archived'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Lineage education footer */}
        {!isLoading && costCodes.length > 0 && (
          <div className="text-xs text-muted-foreground text-center pt-2">
            Cost codes are derived from Trades. Edit trades in the <span className="font-medium">Trades</span> tab to
            modify defaults.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
