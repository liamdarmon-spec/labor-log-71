import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/company/CompanyProvider';
import { fetchCostCodeCatalog } from '@/data/costCodeCatalog';

export function FinancialSearchBar() {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { activeCompanyId } = useCompany();

  const { data: results } = useQuery({
    queryKey: ['financial-search', activeCompanyId, search],
    queryFn: async () => {
      if (!search || search.length < 2) {
        return {
          subs: [],
          invoices: [],
          materials: [],
          costCodes: [],
        };
      }

      if (!activeCompanyId) {
        return { subs: [], invoices: [], materials: [], costCodes: [] };
      }

      const searches = await Promise.all([
        supabase
          .from('subs')
          .select('id, name, company_name')
          .ilike('name', `%${search}%`)
          .limit(3),
        supabase
          .from('sub_invoices')
          .select('id, invoice_number, subs(name)')
          .ilike('invoice_number', `%${search}%`)
          .limit(3),
        supabase
          .from('material_receipts')
          .select('id, vendor, total')
          .ilike('vendor', `%${search}%`)
          .limit(3),
      ]);

      const catalog = await fetchCostCodeCatalog(activeCompanyId);
      const q = search.toLowerCase();
      const costCodes = catalog.rows
        .filter((r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q))
        .slice(0, 3)
        .map((r) => ({ id: r.cost_code_id, code: r.code, name: r.name }));

      return {
        subs: searches[0].data || [],
        invoices: searches[1].data || [],
        materials: searches[2].data || [],
        costCodes,
      };
    },
    enabled: search.length >= 2,
    retry: false,
  });

  const handleSelect = (type: string, id: string) => {
    setIsOpen(false);
    setSearch('');
    
    switch (type) {
      case 'sub':
        navigate(`/subs/${id}`);
        break;
      case 'invoice':
        navigate(`/subs?invoice=${id}`);
        break;
      case 'material':
        navigate(`/materials?receipt=${id}`);
        break;
      case 'costCode':
        navigate(`/admin?tab=cost-codes&code=${id}`);
        break;
    }
  };

  const hasResults = results ? (
    results.subs.length > 0 ||
    results.invoices.length > 0 ||
    results.materials.length > 0 ||
    results.costCodes.length > 0
  ) : false;

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search subs, invoices, materials, cost codes..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(e.target.value.length >= 2);
          }}
          onFocus={() => setIsOpen(search.length >= 2)}
          className="pl-9"
        />
      </div>

      {isOpen && hasResults && results && (
        <div className="absolute top-full mt-2 w-full bg-popover border rounded-lg shadow-lg z-50">
          <Command>
            <CommandList>
              {results.subs.length > 0 && (
                <CommandGroup heading="Subcontractors">
                  {results.subs.map((sub: any) => (
                    <CommandItem
                      key={sub.id}
                      onSelect={() => handleSelect('sub', sub.id)}
                    >
                      {sub.name} {sub.company_name && `(${sub.company_name})`}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.invoices.length > 0 && (
                <CommandGroup heading="Sub Invoices">
                  {results.invoices.map((inv: any) => (
                    <CommandItem
                      key={inv.id}
                      onSelect={() => handleSelect('invoice', inv.id)}
                    >
                      {inv.invoice_number} - {inv.subs?.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.materials.length > 0 && (
                <CommandGroup heading="Material Vendors">
                  {results.materials.map((mat: any) => (
                    <CommandItem
                      key={mat.id}
                      onSelect={() => handleSelect('material', mat.id)}
                    >
                      {mat.vendor} - ${mat.total.toFixed(2)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.costCodes.length > 0 && (
                <CommandGroup heading="Cost Codes">
                  {results.costCodes.map((code: any) => (
                    <CommandItem
                      key={code.id}
                      onSelect={() => handleSelect('costCode', code.id)}
                    >
                      {code.code} - {code.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {!hasResults && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
