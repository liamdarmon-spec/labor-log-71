import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function FinancialSearchBar() {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const { data: results } = useQuery({
    queryKey: ['financial-search', search],
    queryFn: async () => {
      if (!search || search.length < 2) {
        return {
          subs: [],
          invoices: [],
          materials: [],
          payments: [],
          costCodes: [],
        };
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
        supabase
          .from('payments')
          .select('id, paid_by, amount')
          .ilike('paid_by', `%${search}%`)
          .limit(3),
        supabase
          .from('cost_codes')
          .select('id, code, name')
          .or(`code.ilike.%${search}%,name.ilike.%${search}%`)
          .limit(3),
      ]);

      return {
        subs: searches[0].data || [],
        invoices: searches[1].data || [],
        materials: searches[2].data || [],
        payments: searches[3].data || [],
        costCodes: searches[4].data || [],
      };
    },
    enabled: search.length >= 2,
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
      case 'payment':
        navigate(`/payments?id=${id}`);
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
    results.payments.length > 0 ||
    results.costCodes.length > 0
  ) : false;

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search subs, invoices, materials, payments..."
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

              {results.payments.length > 0 && (
                <CommandGroup heading="Payments">
                  {results.payments.map((pay: any) => (
                    <CommandItem
                      key={pay.id}
                      onSelect={() => handleSelect('payment', pay.id)}
                    >
                      {pay.paid_by} - ${pay.amount.toFixed(2)}
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
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
