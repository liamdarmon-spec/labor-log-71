import { Layout } from '@/components/Layout';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Phone, Mail, DollarSign, Search, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AddSubcontractorDialog } from '@/components/subs/AddSubcontractorDialog';

export default function Subs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { data: subs, isLoading } = useQuery({
    queryKey: ['subs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subs')
        .select(`
          *,
          trades (name)
        `)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: contracts } = useQuery({
    queryKey: ['sub-contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_contracts')
        .select('sub_id, contract_value, amount_billed, amount_paid, retention_held');
      if (error) throw error;
      return data;
    },
  });

  const getSubSummary = (subId: string) => {
    const subContracts = contracts?.filter(c => c.sub_id === subId) || [];
    const totalContracted = subContracts.reduce((sum, c) => sum + Number(c.contract_value), 0);
    const totalPaid = subContracts.reduce((sum, c) => sum + Number(c.amount_paid), 0);
    const outstanding = subContracts.reduce((sum, c) => 
      sum + (Number(c.amount_billed) - Number(c.amount_paid)), 0
    );
    const activeProjects = subContracts.length;
    return { totalContracted, totalPaid, outstanding, activeProjects };
  };

  const filteredSubs = subs?.filter(sub =>
    sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.trades?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Subcontractors</h1>
            <p className="text-muted-foreground">All subcontractor relationships and contracts</p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Subcontractor
          </Button>
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

        {/* Subs Grid */}
        {isLoading ? (
          <div className="text-center py-8">Loading subcontractors...</div>
        ) : filteredSubs && filteredSubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubs.map((sub: any) => {
              const summary = getSubSummary(sub.id);
              return (
                <Card
                  key={sub.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/subs/${sub.id}`)}
                >
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-bold text-lg">{sub.name}</div>
                        {sub.company_name && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {sub.company_name}
                          </div>
                        )}
                        <Badge variant="outline" className="mt-2">
                          {sub.trades?.name}
                        </Badge>
                      </div>
                      <Badge variant={sub.active ? 'default' : 'secondary'}>
                        {sub.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      {sub.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {sub.phone}
                        </div>
                      )}
                      {sub.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {sub.email}
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Active Projects</span>
                        <span className="font-medium">{summary.activeProjects}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Contracted</span>
                        <span className="font-medium">${summary.totalContracted.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Outstanding</span>
                        <span className="font-medium text-orange-600">
                          ${summary.outstanding.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No subcontractors found</p>
          </div>
        )}
      </div>

      <AddSubcontractorDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </Layout>
  );
}
