import { Layout } from '@/components/Layout';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Receipt, TrendingUp, DollarSign, Package } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function Materials() {
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const { data: receipts, isLoading } = useQuery({
    queryKey: ['material-receipts', projectFilter],
    queryFn: async () => {
      let query = supabase
        .from('material_receipts')
        .select(`
          *,
          projects (project_name),
          cost_codes (code, name)
        `)
        .order('date', { ascending: false });

      if (projectFilter !== 'all') {
        query = query.eq('project_id', projectFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name');
      if (error) throw error;
      return data;
    },
  });

  const filteredReceipts = receipts?.filter(receipt =>
    receipt.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    receipt.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate vendor spend
  const vendorSpend = receipts?.reduce((acc: Record<string, number>, receipt) => {
    acc[receipt.vendor] = (acc[receipt.vendor] || 0) + Number(receipt.total);
    return acc;
  }, {});

  const topVendors = vendorSpend ? Object.entries(vendorSpend)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5) : [];

  const stats = {
    total: receipts?.reduce((sum, r) => sum + Number(r.total), 0) || 0,
    count: receipts?.length || 0,
    avgReceipt: receipts && receipts.length > 0 
      ? receipts.reduce((sum, r) => sum + Number(r.total), 0) / receipts.length 
      : 0,
    vendors: vendorSpend ? Object.keys(vendorSpend).length : 0,
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Materials</h1>
            <p className="text-muted-foreground">Material receipts and vendor tracking</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Receipt
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Spend</span>
              </div>
              <div className="text-2xl font-bold">${stats.total.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Receipts</span>
              </div>
              <div className="text-2xl font-bold">{stats.count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Avg Receipt</span>
              </div>
              <div className="text-2xl font-bold">${stats.avgReceipt.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Vendors</span>
              </div>
              <div className="text-2xl font-bold">{stats.vendors}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Vendors */}
          <Card>
            <CardHeader>
              <CardTitle>Top Vendors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topVendors.map(([vendor, amount], index) => (
                  <div key={vendor} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                        {index + 1}
                      </div>
                      <span className="font-medium">{vendor}</span>
                    </div>
                    <span className="text-muted-foreground">${amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Filters and Search */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Filter Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search vendor or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects?.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Receipts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Material Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading receipts...</div>
            ) : filteredReceipts && filteredReceipts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Cost Code</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((receipt: any) => (
                    <TableRow key={receipt.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>{format(new Date(receipt.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="font-medium">{receipt.vendor}</TableCell>
                      <TableCell>{receipt.projects?.project_name}</TableCell>
                      <TableCell>
                        {receipt.cost_codes ? (
                          <Badge variant="outline">{receipt.cost_codes.code}</Badge>
                        ) : (
                          <Badge variant="secondary">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell>${Number(receipt.subtotal).toFixed(2)}</TableCell>
                      <TableCell>${Number(receipt.tax).toFixed(2)}</TableCell>
                      <TableCell className="font-bold">${Number(receipt.total).toFixed(2)}</TableCell>
                      <TableCell>
                        {receipt.auto_classified && (
                          <Badge variant="secondary">AI</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No receipts found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first material receipt to track spending
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Receipt
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
