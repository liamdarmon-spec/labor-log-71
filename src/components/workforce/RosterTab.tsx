import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, DollarSign, Clock, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function RosterTab() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [unpaidOnly, setUnpaidOnly] = useState(false);

  const { data: workersData, isLoading } = useQuery({
    queryKey: ['workforce-roster', companyFilter, tradeFilter, statusFilter, unpaidOnly],
    queryFn: async () => {
      // Fetch all workers
      let query = supabase
        .from('workers')
        .select('*, trades(name)');

      if (statusFilter !== 'all') {
        query = query.eq('active', statusFilter === 'active');
      }

      if (tradeFilter !== 'all') {
        query = query.eq('trade_id', tradeFilter);
      }

      const { data: workers } = await query.order('name');

      if (!workers) return [];

      // For each worker, get this week's hours and unpaid amount
      const enrichedWorkers = await Promise.all(
        workers.map(async (worker) => {
          // Get this week's hours
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);

          const { data: weekLogs } = await supabase
            .from('daily_logs')
            .select('hours_worked')
            .eq('worker_id', worker.id)
            .gte('date', weekStart.toISOString().split('T')[0])
            .lte('date', weekEnd.toISOString().split('T')[0]);

          const weekHours = weekLogs?.reduce((sum, log) => sum + (log.hours_worked || 0), 0) || 0;

          // Get unpaid amount
          const { data: unpaidLogs } = await supabase
            .from('daily_logs')
            .select('hours_worked, payment_status')
            .eq('worker_id', worker.id)
            .eq('payment_status', 'unpaid');

          const unpaidAmount = unpaidLogs?.reduce(
            (sum, log) => sum + ((log.hours_worked || 0) * worker.hourly_rate),
            0
          ) || 0;

          return {
            ...worker,
            weekHours,
            unpaidAmount,
            company: 'Forma', // TODO: Add company field to workers table
          };
        })
      );

      // Apply filters
      let filtered = enrichedWorkers;

      if (searchTerm) {
        filtered = filtered.filter(w =>
          w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.trade.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (unpaidOnly) {
        filtered = filtered.filter(w => w.unpaidAmount > 0);
      }

      return filtered;
    },
  });

  const { data: trades } = useQuery({
    queryKey: ['trades-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('trades')
        .select('id, name')
        .order('name');
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={tradeFilter} onValueChange={setTradeFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Trades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                {trades?.map(trade => (
                  <SelectItem key={trade.id} value={trade.id}>{trade.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={unpaidOnly ? 'default' : 'outline'}
              onClick={() => setUnpaidOnly(!unpaidOnly)}
              className="w-full"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              {unpaidOnly ? 'Showing Unpaid' : 'Show Unpaid Only'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Worker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {workersData?.map((worker) => (
          <Card
            key={worker.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate(`/workforce/worker/${worker.id}`)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {worker.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{worker.name}</h3>
                  <p className="text-sm text-muted-foreground">{worker.trades?.name || worker.trade}</p>
                </div>
                <Badge variant={worker.active ? 'default' : 'secondary'}>
                  {worker.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Company
                  </span>
                  <span className="font-medium">{worker.company}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Hourly Rate</span>
                  <span className="font-medium">${worker.hourly_rate}/hr</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    This Week
                  </span>
                  <span className="font-medium">{worker.weekHours}h</span>
                </div>

                {worker.unpaidAmount > 0 && (
                  <div className="flex items-center justify-between text-sm pt-3 border-t">
                    <span className="text-orange-600 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Unpaid
                    </span>
                    <span className="font-bold text-orange-600">
                      ${worker.unpaidAmount.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {workersData && workersData.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-2">No workers found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
