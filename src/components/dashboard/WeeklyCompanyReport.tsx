import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileDown, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface WeeklyData {
  company: string;
  workers: {
    name: string;
    jobs: { project: string; hours: number }[];
    total: number;
  }[];
  companyTotal: number;
}

export const WeeklyCompanyReport = () => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [reportData, setReportData] = useState<WeeklyData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getWeekRange = (date: Date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
    const weekEnd = endOfWeek(date, { weekStartsOn: 0 }); // Saturday
    return { weekStart, weekEnd };
  };

  const generateWeeklyReport = async () => {
    if (!selectedDate) {
      toast({
        title: 'Error',
        description: 'Please select a week',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { weekStart, weekEnd } = getWeekRange(selectedDate);
      
      // Fetch all logs for the week with company info
      const { data: logs, error } = await supabase
        .from('daily_logs')
        .select(`
          *,
          workers (name),
          projects (
            project_name,
            company_id,
            companies (name)
          )
        `)
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'))
        .order('date');

      if (error) throw error;

      if (!logs || logs.length === 0) {
        toast({
          title: 'No Data',
          description: 'No time logs found for this week',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Group by company
      const companyMap = new Map<string, any>();

      logs.forEach((log) => {
        const companyName = (log.projects as any)?.companies?.name || 'No Company';
        const workerName = (log.workers as any)?.name || 'Unknown';
        const projectName = (log.projects as any)?.project_name || 'Unknown Project';
        const hours = parseFloat(log.hours_worked.toString());

        if (!companyMap.has(companyName)) {
          companyMap.set(companyName, {
            company: companyName,
            workers: new Map(),
            companyTotal: 0,
          });
        }

        const company = companyMap.get(companyName);
        company.companyTotal += hours;

        if (!company.workers.has(workerName)) {
          company.workers.set(workerName, {
            name: workerName,
            jobs: [],
            total: 0,
          });
        }

        const worker = company.workers.get(workerName);
        
        // Find or create job entry
        let job = worker.jobs.find((j: any) => j.project === projectName);
        if (!job) {
          job = { project: projectName, hours: 0 };
          worker.jobs.push(job);
        }
        
        job.hours += hours;
        worker.total += hours;
      });

      // Convert to array format
      const reportData: WeeklyData[] = Array.from(companyMap.values()).map(company => ({
        company: company.company,
        workers: Array.from(company.workers.values()),
        companyTotal: company.companyTotal,
      }));

      setReportData(reportData);
      setShowPreview(true);
      setLoading(false);

      toast({
        title: 'Success',
        description: 'Weekly report generated',
      });
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!selectedDate || reportData.length === 0) return;

    const { weekStart, weekEnd } = getWeekRange(selectedDate);
    
    // Create text content
    let content = `Weekly Company Report\n`;
    content += `Week: ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}\n`;
    content += `${'='.repeat(80)}\n\n`;

    let grandTotal = 0;

    reportData.forEach((company) => {
      content += `${company.company}\n`;
      content += `${'-'.repeat(80)}\n`;
      content += `Worker                  | Project                    | Hours\n`;
      content += `${'-'.repeat(80)}\n`;

      company.workers.forEach((worker) => {
        worker.jobs.forEach((job, index) => {
          const workerName = index === 0 ? worker.name.padEnd(22) : ' '.repeat(22);
          content += `${workerName} | ${job.project.padEnd(26)} | ${job.hours.toFixed(2)}\n`;
        });
        content += `${' '.repeat(22)} | ${'TOTAL'.padEnd(26)} | ${worker.total.toFixed(2)}\n`;
        content += `${'-'.repeat(80)}\n`;
      });

      content += `\nCompany Total: ${company.companyTotal.toFixed(2)} hours\n`;
      content += `${'='.repeat(80)}\n\n`;
      grandTotal += company.companyTotal;
    });

    content += `\nGRAND TOTAL: ${grandTotal.toFixed(2)} hours\n`;

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-report-${format(weekStart, 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded',
      description: 'Report downloaded successfully',
    });
  };

  const weekRange = selectedDate 
    ? (() => {
        const { weekStart, weekEnd } = getWeekRange(selectedDate);
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      })()
    : null;

  const grandTotal = reportData.reduce((sum, company) => sum + company.companyTotal, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Weekly Company Report</CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate a report showing worker hours by company for a selected week (Sunday-Saturday)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Select Week</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {weekRange || "Pick a week"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button 
              onClick={generateWeeklyReport}
              disabled={!selectedDate || loading}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Weekly Report: {weekRange}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {reportData.map((company, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <h3 className="text-lg font-bold mb-4">{company.company}</h3>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {company.workers.map((worker, widx) => (
                      <>
                        {worker.jobs.map((job, jidx) => (
                          <TableRow key={`${widx}-${jidx}`}>
                            <TableCell className={jidx === 0 ? "font-medium" : "text-muted-foreground"}>
                              {jidx === 0 ? worker.name : ''}
                            </TableCell>
                            <TableCell>{job.project}</TableCell>
                            <TableCell className="text-right">{job.hours.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50">
                          <TableCell className="font-semibold"></TableCell>
                          <TableCell className="font-semibold">Worker Total</TableCell>
                          <TableCell className="text-right font-semibold">{worker.total.toFixed(2)}</TableCell>
                        </TableRow>
                      </>
                    ))}
                    <TableRow className="bg-primary/10">
                      <TableCell className="font-bold" colSpan={2}>Company Total</TableCell>
                      <TableCell className="text-right font-bold">{company.companyTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ))}

            <div className="border-t-2 pt-4">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>GRAND TOTAL</span>
                <span>{grandTotal.toFixed(2)} hours</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button onClick={downloadReport}>
              <FileDown className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
