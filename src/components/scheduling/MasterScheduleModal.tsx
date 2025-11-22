/**
 * MASTER SCHEDULE MODAL
 * 
 * THE ONE UNIVERSAL MODAL FOR ALL SCHEDULE INTERACTIONS
 * 
 * Replaces:
 * - DayDetailDialog
 * - ProjectSchedule modal
 * - WorkerSchedule modal
 * - Various other schedule dialogs
 * 
 * Features:
 * - Context-aware (global, project, worker, task)
 * - Shows ALL schedule entries for worker/day
 * - Split/rebalance functionality
 * - Payment status awareness
 * - Time log conversion
 * - Conflict detection
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, User, Clock, Briefcase, Split, Edit, Trash2, 
  ExternalLink, AlertCircle, CheckCircle2, DollarSign 
} from "lucide-react";
import { EditScheduleDialog } from "./EditScheduleDialog";
import { SplitScheduleDialog } from "@/components/dashboard/SplitScheduleDialog";
import { ScheduleDeleteButton } from "./ScheduleDeleteButton";
import { getProjectColor, PAYMENT_STATUS } from "@/lib/scheduler/constants";

interface ScheduledShift {
  id: string;
  worker_id: string;
  project_id: string;
  trade_id: string | null;
  scheduled_date: string;
  scheduled_hours: number;
  notes: string | null;
  status?: string | null;
  cost_code_id?: string | null;
  worker: { name: string; trade: string; hourly_rate?: number } | null;
  project: { project_name: string; client_name: string } | null;
  trade: { name: string } | null;
  cost_code?: { code: string; name: string } | null;
}

interface TimeLogSummary {
  totalHours: number;
  projects: Array<{
    project_name: string;
    hours: number;
    cost_code?: string;
    notes?: string;
    payment_status?: string;
  }>;
}

interface MasterScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  workerId?: string | null;
  projectId?: string | null;
  context?: 'global' | 'project' | 'worker' | 'task';
  onRefresh?: () => void;
  onAddSchedule?: () => void;
}

export function MasterScheduleModal({
  open,
  onOpenChange,
  date,
  workerId,
  projectId,
  context = 'global',
  onRefresh,
  onAddSchedule
}: MasterScheduleModalProps) {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<ScheduledShift[]>([]);
  const [timeLogSummary, setTimeLogSummary] = useState<TimeLogSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledShift | null>(null);
  const [splitScheduleData, setSplitScheduleData] = useState<any>(null);
  const [showAllAssignments, setShowAllAssignments] = useState(context !== 'project');

  const isPastDate = date ? (isPast(date) && !isToday(date)) : false;

  useEffect(() => {
    if (open && date) {
      fetchData();
    }
  }, [open, date, workerId, projectId, showAllAssignments]);

  const fetchData = async () => {
    if (!date) return;
    setLoading(true);

    try {
      // Fetch schedules
      let query = supabase
        .from("scheduled_shifts")
        .select(`
          *,
          worker:workers(name, trade, hourly_rate),
          project:projects(project_name, client_name),
          trade:trades(name),
          cost_code:cost_codes(code, name)
        `)
        .eq("scheduled_date", format(date, "yyyy-MM-dd"));

      if (workerId && context === 'worker') {
        query = query.eq("worker_id", workerId);
      }

      if (projectId && !showAllAssignments) {
        query = query.eq("project_id", projectId);
      }

      const { data: scheduleData, error: scheduleError } = await query.order("worker_id");

      if (scheduleError) throw scheduleError;
      setSchedules(scheduleData || []);

      // Fetch time logs if past date
      if (isPastDate) {
        let logQuery = supabase
          .from("daily_logs")
          .select(`
            hours_worked,
            projects(project_name),
            cost_code:cost_codes(code, name),
            notes,
            payment_status
          `)
          .eq("date", format(date, "yyyy-MM-dd"));

        if (workerId) {
          logQuery = logQuery.eq("worker_id", workerId);
        }

        const { data: logData } = await logQuery;

        if (logData && logData.length > 0) {
          const summary: TimeLogSummary = {
            totalHours: logData.reduce((sum: number, log: any) => sum + Number(log.hours_worked), 0),
            projects: logData.map((log: any) => ({
              project_name: log.projects?.project_name || 'Unknown',
              hours: Number(log.hours_worked),
              cost_code: log.cost_code?.code,
              notes: log.notes,
              payment_status: log.payment_status
            }))
          };
          setTimeLogSummary(summary);
        }
      }
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      toast({
        title: "Error",
        description: "Failed to load schedule data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Group schedules by worker
  const schedulesByWorker = schedules.reduce((acc, schedule) => {
    const workerName = schedule.worker?.name || "Unknown";
    if (!acc[workerName]) {
      acc[workerName] = {
        workerId: schedule.worker_id,
        worker: schedule.worker,
        schedules: []
      };
    }
    acc[workerName].schedules.push(schedule);
    return acc;
  }, {} as Record<string, { workerId: string; worker: ScheduledShift['worker']; schedules: ScheduledShift[] }>);

  const uniqueWorkerCount = Object.keys(schedulesByWorker).length;
  const totalHours = schedules.reduce((sum, s) => sum + Number(s.scheduled_hours), 0);
  const totalProjects = new Set(schedules.map(s => s.project_id)).size;

  // Calculate payment status for day
  const getPaymentStatus = () => {
    if (!timeLogSummary) return null;
    const statuses = timeLogSummary.projects.map(p => p.payment_status);
    if (statuses.every(s => s === 'paid')) return 'paid';
    if (statuses.some(s => s === 'paid')) return 'partial';
    return 'unpaid';
  };

  const paymentStatus = getPaymentStatus();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span>{date ? format(date, "EEEE, MMMM d, yyyy") : ""}</span>
                {context === 'project' && (
                  <Badge variant="outline" className="text-xs">
                    Project View
                  </Badge>
                )}
                {paymentStatus && (
                  <Badge className={PAYMENT_STATUS[paymentStatus].badge}>
                    {paymentStatus === 'paid' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {paymentStatus === 'unpaid' && <AlertCircle className="h-3 w-3 mr-1" />}
                    {paymentStatus === 'partial' && <DollarSign className="h-3 w-3 mr-1" />}
                    {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {context === 'project' && schedules.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllAssignments(!showAllAssignments)}
                  >
                    {showAllAssignments ? "Project Only" : "Show All"}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    if (onAddSchedule) {
                      onAddSchedule();
                    }
                    onOpenChange(false);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Schedule
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
              <Card className="p-3 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-primary" />
                  <p className="text-xs font-medium text-muted-foreground">Workers</p>
                </div>
                <p className="text-2xl font-bold text-primary">{uniqueWorkerCount}</p>
              </Card>

              <Card className="p-3 bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-xs font-medium text-muted-foreground">Total Hours</p>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalHours}h</p>
              </Card>

              <Card className="p-3 bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <p className="text-xs font-medium text-muted-foreground">Projects</p>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalProjects}</p>
              </Card>

              <Card className="p-3 bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <p className="text-xs font-medium text-muted-foreground">Entries</p>
                </div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{schedules.length}</p>
              </Card>
            </div>

            {/* Time Log Summary (for past dates) */}
            {isPastDate && timeLogSummary && (
              <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <h3 className="font-semibold">Time Log Summary</h3>
                  </div>
                  <Badge variant="secondary">{timeLogSummary.totalHours}h logged</Badge>
                </div>
                <div className="space-y-2">
                  {timeLogSummary.projects.map((proj, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span>{proj.project_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{proj.hours}h</span>
                        {proj.payment_status && (
                          <Badge className={PAYMENT_STATUS[proj.payment_status as keyof typeof PAYMENT_STATUS]?.badge || ''}>
                            {proj.payment_status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : schedules.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No schedules for this day</p>
                <Button onClick={() => onAddSchedule && onAddSchedule()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Schedule
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(schedulesByWorker).map(([workerName, { workerId, worker, schedules: workerSchedules }]) => {
                  const totalWorkerHours = workerSchedules.reduce((sum, s) => sum + Number(s.scheduled_hours), 0);
                  const hasMultipleProjects = workerSchedules.length > 1;
                  
                  return (
                    <Card key={workerName} className="p-4 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold text-lg">{workerName}</h3>
                            {hasMultipleProjects && (
                              <Badge variant="outline" className="text-xs">
                                {workerSchedules.length} projects
                              </Badge>
                            )}
                          </div>
                          {worker?.trade && (
                            <p className="text-xs text-muted-foreground mt-0.5 ml-7">{worker.trade}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-sm px-3 py-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {totalWorkerHours}h total
                          </Badge>
                          {hasMultipleProjects && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const firstSchedule = workerSchedules[0];
                                setSplitScheduleData({
                                  scheduleId: firstSchedule.id,
                                  workerName: workerName,
                                  date: firstSchedule.scheduled_date,
                                  hours: totalWorkerHours,
                                  projectId: firstSchedule.project_id
                                });
                              }}
                            >
                              <Split className="h-3 w-3 mr-1" />
                              Rebalance
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 ml-7">
                        {workerSchedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            className={`flex items-center justify-between p-2.5 rounded-md border transition-all hover:shadow-sm ${
                              getProjectColor(schedule.project_id)
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-3.5 w-3.5" />
                                <span className="text-sm font-semibold">
                                  {schedule.project?.project_name}
                                </span>
                                {schedule.status && schedule.status !== 'planned' && (
                                  <Badge variant="outline" className="text-[10px] h-5">
                                    {schedule.status}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs opacity-80">
                                {schedule.trade && (
                                  <>
                                    <span>{schedule.trade.name}</span>
                                    <span>•</span>
                                  </>
                                )}
                                <span className="font-medium">{schedule.scheduled_hours}h</span>
                                {schedule.cost_code && (
                                  <>
                                    <span>•</span>
                                    <span>{schedule.cost_code.code}</span>
                                  </>
                                )}
                                {schedule.notes && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-[200px]">{schedule.notes}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {workerSchedules.length === 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSplitScheduleData({
                                      scheduleId: schedule.id,
                                      workerName: workerName,
                                      date: schedule.scheduled_date,
                                      hours: schedule.scheduled_hours,
                                      projectId: schedule.project_id
                                    });
                                  }}
                                >
                                  <Split className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingSchedule(schedule)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <ScheduleDeleteButton 
                                scheduleId={schedule.id}
                                scheduleDate={schedule.scheduled_date}
                                onSuccess={() => {
                                  fetchData();
                                  onRefresh?.();
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {editingSchedule && (
        <EditScheduleDialog
          open={true}
          onOpenChange={(open) => !open && setEditingSchedule(null)}
          schedule={editingSchedule}
          onSuccess={() => {
            fetchData();
            onRefresh?.();
            setEditingSchedule(null);
          }}
        />
      )}

      {splitScheduleData && (
        <SplitScheduleDialog
          isOpen={true}
          onClose={() => setSplitScheduleData(null)}
          scheduleId={splitScheduleData.scheduleId}
          workerName={splitScheduleData.workerName}
          originalDate={splitScheduleData.date}
          originalHours={splitScheduleData.hours}
          originalProjectId={splitScheduleData.projectId}
          onSuccess={() => {
            fetchData();
            onRefresh?.();
            setSplitScheduleData(null);
          }}
        />
      )}
    </>
  );
}
