import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, DollarSign, Search, ChevronRight } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, isToday, isYesterday } from 'date-fns';
import { safeParseDate, safeFormat } from '@/lib/utils/safeDate';
import { useNavigate } from 'react-router-dom';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimeLogsTableView } from './TimeLogsTableView';
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

type ActivityEvent = {
  id: string;
  event_type: string;
  event_at: string;
  worker_id?: string;
  worker_name?: string;
  company_id?: string;
  company_name?: string;
  project_id?: string;
  project_name?: string;
  hours?: number;
  amount?: number;
  meta: any;
};

export function ActivityTab() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const workerParam = searchParams.get('worker');
  const dateParam = searchParams.get('date');
  const projectParam = searchParams.get('project');
  
  const [activeView, setActiveView] = useState(viewParam || 'feed');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [dateRange, setDateRange] = useState('7'); // days
  
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Update active view when URL param changes
  useEffect(() => {
    if (viewParam === 'time-logs') {
      setActiveView('time-logs');
    }
  }, [viewParam]);

  // Fetch companies for filter
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      return data || [];
    },
  });

  // Fetch activity feed with filters
  const { data: events, isLoading } = useQuery({
    queryKey: ['workforce-activity-feed', selectedEventType, selectedCompany, dateRange, debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('workforce_activity_feed')
        .select('*')
        .gte('event_at', subDays(new Date(), parseInt(dateRange)).toISOString())
        .order('event_at', { ascending: false });

      // Filter by event type
      if (selectedEventType !== 'all') {
        const types = {
          'scheduled': ['schedule_created', 'schedule_updated'],
          'logs': ['time_log_created', 'time_log_updated'],
          'payments': ['payment_created', 'payment_updated'],
        };
        query = query.in('event_type', types[selectedEventType as keyof typeof types]);
      }

      // Filter by company
      if (selectedCompany !== 'all') {
        query = query.eq('company_id', selectedCompany);
      }

      // Search filter
      if (debouncedSearch) {
        query = query.or(`worker_name.ilike.%${debouncedSearch}%,project_name.ilike.%${debouncedSearch}%,company_name.ilike.%${debouncedSearch}%`);
      }

      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      return data as ActivityEvent[];
    },
  });

  // Group events by day
  const groupedEvents = useMemo(() => {
    if (!events) return {};
    
    return events.reduce((groups, event) => {
      const parsedDate = safeParseDate(event.event_at);
      if (!parsedDate) return groups; // Skip events with invalid dates
      const date = startOfDay(parsedDate).toISOString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
      return groups;
    }, {} as Record<string, ActivityEvent[]>);
  }, [events]);

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('schedule')) {
      return <Calendar className="h-5 w-5 text-blue-600" />;
    } else if (eventType.includes('time_log')) {
      return <Clock className="h-5 w-5 text-green-600" />;
    } else if (eventType.includes('payment')) {
      return <DollarSign className="h-5 w-5 text-orange-600" />;
    }
    return <Calendar className="h-5 w-5" />;
  };

  const getEventBadge = (eventType: string) => {
    if (eventType.includes('schedule')) {
      return { label: 'Scheduled', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' };
    } else if (eventType.includes('time_log')) {
      return { label: 'Time Log', className: 'bg-green-100 text-green-700 hover:bg-green-100' };
    } else if (eventType.includes('payment')) {
      return { label: 'Payment', className: 'bg-orange-100 text-orange-700 hover:bg-orange-100' };
    }
    return { label: 'Event', className: '' };
  };

  const getEventTitle = (event: ActivityEvent) => {
    if (event.event_type.includes('schedule')) {
      return event.event_type === 'schedule_created' ? 'Worker scheduled' : 'Schedule updated';
    } else if (event.event_type.includes('time_log')) {
      return event.event_type === 'time_log_created' ? 'Time log created' : 'Time log updated';
    } else if (event.event_type.includes('payment')) {
      return event.event_type === 'payment_created' ? 'Payment batch created' : 'Payment updated';
    }
    return 'Event';
  };

  const getEventSubtitle = (event: ActivityEvent) => {
    if (event.event_type.includes('schedule') || event.event_type.includes('time_log')) {
      const parts = [];
      if (event.worker_name) parts.push(event.worker_name);
      if (event.project_name) parts.push(event.project_name);
      return parts.join(' → ');
    } else if (event.event_type.includes('payment')) {
      const meta = event.meta || {};
      const parts = [];
      if (event.company_name) parts.push(event.company_name);
      if (meta.start_date && meta.end_date) {
        const startStr = safeFormat(meta.start_date, 'MMM d', '');
        const endStr = safeFormat(meta.end_date, 'd', '');
        if (startStr && endStr) {
          parts.push(`${startStr}–${endStr}`);
        }
      }
      return parts.join(' – ');
    }
    return '';
  };

  const handleEventClick = (event: ActivityEvent) => {
    if (event.event_type.includes('schedule')) {
      const date = event.meta?.date;
      navigate(`/schedule?date=${date}&worker_id=${event.worker_id}`);
    } else if (event.event_type.includes('time_log')) {
      const date = event.meta?.date;
      navigate(`/view-logs?worker_id=${event.worker_id}&date=${date}`);
    } else if (event.event_type.includes('payment')) {
      navigate(`/workforce?tab=pay-center&payment_id=${event.meta?.payment_id}`);
    }
  };

  const getTooltipText = (event: ActivityEvent) => {
    if (event.event_type.includes('schedule')) return 'View in schedule';
    if (event.event_type.includes('time_log')) return 'View time logs';
    if (event.event_type.includes('payment')) return 'View payment batch';
    return 'View details';
  };

  const formatDayHeading = (dateString: string) => {
    const date = safeParseDate(dateString);
    if (!date) return dateString; // Fallback to raw string if invalid
    if (isToday(date)) return `Today – ${format(date, 'EEE, MMM d, yyyy')}`;
    if (isYesterday(date)) return `Yesterday – ${format(date, 'EEE, MMM d, yyyy')}`;
    return format(date, 'EEE, MMM d, yyyy');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-bold mb-2">Activity Feed</h3>
          <p className="text-muted-foreground">
            Real-time feed of all workforce-related events
          </p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Activity</h3>
        <p className="text-muted-foreground">
          Track workforce events, time logs, and payments
        </p>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList>
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="time-logs">Time Logs Table</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-4 mt-6">
          {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Event Type Filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedEventType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedEventType('all')}
              >
                All
              </Button>
              <Button
                variant={selectedEventType === 'scheduled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedEventType('scheduled')}
              >
                Scheduled
              </Button>
              <Button
                variant={selectedEventType === 'logs' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedEventType('logs')}
              >
                Time Logs
              </Button>
              <Button
                variant={selectedEventType === 'payments' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedEventType('payments')}
              >
                Payments
              </Button>
            </div>

            {/* Company Filter */}
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger>
                <SelectValue placeholder="All companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All companies</SelectItem>
                {companies?.map(company => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by worker, project, company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      {events && events.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([dateString, dayEvents]) => (
            <div key={dateString}>
              <div className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm px-4 py-2 rounded-lg mb-3">
                <h4 className="font-semibold text-sm">{formatDayHeading(dateString)}</h4>
              </div>
              <div className="space-y-2">
                {dayEvents.map((event) => {
                  const badge = getEventBadge(event.event_type);
                  return (
                    <Card 
                      key={event.id}
                      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                      onClick={() => handleEventClick(event)}
                      title={getTooltipText(event)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="mt-1 p-2 rounded-lg bg-muted flex-shrink-0">
                            {getEventIcon(event.event_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={badge.className}>{badge.label}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {safeFormat(event.event_at, 'h:mm a')}
                                </span>
                              </div>
                              {event.amount !== undefined && event.amount > 0 && (
                                <span className="text-lg font-bold text-orange-600 flex-shrink-0">
                                  ${event.amount.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium mb-1">
                              {getEventTitle(event)}
                            </p>
                            {getEventSubtitle(event) && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {getEventSubtitle(event)}
                              </p>
                            )}
                            {event.hours && (
                              <p className="text-xs text-muted-foreground">
                                {event.hours}h {event.event_type.includes('schedule') ? 'scheduled' : 'logged'}
                              </p>
                            )}
                            {event.event_type.includes('payment') && event.meta?.log_count && (
                              <p className="text-xs text-muted-foreground">
                                Covers {event.meta.log_count} time logs
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground mb-2">No activity yet</p>
              <p className="text-sm text-muted-foreground">
                Try changing the filters or expanding the date range
              </p>
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="time-logs" className="mt-6">
          <TimeLogsTableView 
            initialWorkerId={workerParam || undefined}
            initialDate={dateParam || undefined}
            initialProjectId={projectParam || undefined}
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Payment History</p>
                <p className="text-sm">View payments in the Pay Center tab</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
