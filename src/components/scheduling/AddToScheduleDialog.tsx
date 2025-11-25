/**
 * AddToScheduleDialog - Multi-mode schedule creator
 * 
 * CANONICAL: Creates entries in work_schedules (workers) and sub_scheduled_shifts (subs)
 * 
 * Modes:
 * - Workers (single or bulk): Insert into work_schedules
 * - Subs: Insert into sub_scheduled_shifts
 * - Meetings: Insert into project_todos
 * 
 * Triggers handle auto-population of company_id and cost_code_id.
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerWithPresets } from "@/components/ui/date-picker-with-presets";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, User, Users, Trash2, Plus, Briefcase, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCostCodes } from "@/hooks/useCostCodes";
import { useQueryClient } from "@tanstack/react-query";

interface Worker {
  id: string;
  name: string;
  trade: string;
  trade_id: string | null;
}

interface Project {
  id: string;
  project_name: string;
  client_name: string;
}

interface Trade {
  id: string;
  name: string;
}

interface Sub {
  id: string;
  name: string;
  company_name: string | null;
  trade: string | null;
}

interface WorkerProjectEntry {
  id: string;
  project_id: string;
  trade_id: string;
  hours: string;
}

interface AddToScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleCreated: () => void;
  defaultDate?: Date;
  defaultProjectId?: string;
  defaultProjectName?: string;
}

type ScheduleMode = 'workers' | 'subs' | 'meetings';

export function AddToScheduleDialog({ 
  open, 
  onOpenChange, 
  onScheduleCreated, 
  defaultDate,
  defaultProjectId,
  defaultProjectName
}: AddToScheduleDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ScheduleMode>('workers');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(false);

  // Single worker form
  const [selectedWorker, setSelectedWorker] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTrade, setSelectedTrade] = useState("");
  const [selectedCostCode, setSelectedCostCode] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(defaultDate || new Date());
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");

  const { data: laborCostCodes } = useCostCodes('labor');

  // Multiple workers form
  const [bulkDate, setBulkDate] = useState<Date | undefined>(defaultDate || new Date());
  const [workerProjectEntries, setWorkerProjectEntries] = useState<Record<string, WorkerProjectEntry[]>>({});
  const [excludedWorkers, setExcludedWorkers] = useState<Set<string>>(new Set());

  // Subs form
  const [subDate, setSubDate] = useState<Date | undefined>(defaultDate || new Date());
  const [selectedSub, setSelectedSub] = useState("");
  const [subProject, setSubProject] = useState("");
  const [subHours, setSubHours] = useState("8");
  const [subNotes, setSubNotes] = useState("");

  // Meetings form
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(defaultDate || new Date());
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingProject, setMeetingProject] = useState("");
  const [meetingAssignee, setMeetingAssignee] = useState("");
  const [meetingType, setMeetingType] = useState<'meeting' | 'inspection'>('meeting');
  const [meetingNotes, setMeetingNotes] = useState("");

  // UX enhancements
  const [addAnother, setAddAnother] = useState(false);
  const [workerBookingWarnings, setWorkerBookingWarnings] = useState<Record<string, boolean>>({});
  const [subBookingWarning, setSubBookingWarning] = useState(false);
  const [bulkEntryMode, setBulkEntryMode] = useState<'single' | 'bulk'>('single');

  useEffect(() => {
    if (open) {
      fetchData();
      if (defaultDate) {
        setSelectedDate(defaultDate);
        setBulkDate(defaultDate);
        setSubDate(defaultDate);
        setMeetingDate(defaultDate);
      }
      if (defaultProjectId) {
        setSelectedProject(defaultProjectId);
        setSubProject(defaultProjectId);
        setMeetingProject(defaultProjectId);
      }
    }
  }, [open, defaultDate, defaultProjectId]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
        return;
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.querySelector('form');
        if (form) {
          form.requestSubmit();
        }
        return;
      }

      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === 'w' || e.key === 'W') {
          setMode('workers');
        } else if (e.key === 's' || e.key === 'S') {
          setMode('subs');
        } else if (e.key === 'm' || e.key === 'M') {
          setMode('meetings');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const fetchData = async () => {
    const [workersRes, projectsRes, tradesRes, subsRes] = await Promise.all([
      supabase.from("workers").select("*").eq("active", true).order("name"),
      supabase.from("projects").select("*").eq("status", "Active").order("project_name"),
      supabase.from("trades").select("*").order("name"),
      supabase.from("subs").select("*").eq("active", true).order("name")
    ]);

    if (workersRes.data) {
      setWorkers(workersRes.data);
      const initialEntries: Record<string, WorkerProjectEntry[]> = {};
      workersRes.data.forEach(worker => {
        initialEntries[worker.id] = [{
          id: crypto.randomUUID(),
          project_id: "",
          trade_id: worker.trade_id || "",
          hours: "8"
        }];
      });
      setWorkerProjectEntries(initialEntries);
    }
    if (projectsRes.data) setProjects(projectsRes.data);
    if (tradesRes.data) setTrades(tradesRes.data);
    if (subsRes.data) setSubs(subsRes.data);
  };

  const handleWorkerChange = async (workerId: string) => {
    setSelectedWorker(workerId);
    const worker = workers.find(w => w.id === workerId);
    if (worker?.trade_id) {
      setSelectedTrade(worker.trade_id);
      
      // Auto-select cost code based on trade
      const defaultCode = laborCostCodes?.find(cc => cc.default_trade_id === worker.trade_id);
      if (defaultCode) {
        setSelectedCostCode(defaultCode.id);
      }
    }

    // Check for existing bookings on selected date
    if (selectedDate) {
      const { data } = await supabase
        .from('work_schedules')
        .select('id')
        .eq('worker_id', workerId)
        .eq('scheduled_date', format(selectedDate, 'yyyy-MM-dd'))
        .maybeSingle();
      
      setWorkerBookingWarnings(prev => ({
        ...prev,
        [workerId]: !!data
      }));
    }
  };

  const handleToggleWorker = (workerId: string) => {
    const newExcluded = new Set(excludedWorkers);
    if (newExcluded.has(workerId)) {
      newExcluded.delete(workerId);
    } else {
      newExcluded.add(workerId);
    }
    setExcludedWorkers(newExcluded);
  };

  const addProjectEntry = (workerId: string) => {
    setWorkerProjectEntries(prev => ({
      ...prev,
      [workerId]: [
        ...(prev[workerId] || []),
        {
          id: crypto.randomUUID(),
          project_id: "",
          trade_id: workers.find(w => w.id === workerId)?.trade_id || "",
          hours: ""
        }
      ]
    }));
  };

  const removeProjectEntry = (workerId: string, entryId: string) => {
    setWorkerProjectEntries(prev => ({
      ...prev,
      [workerId]: prev[workerId].filter(entry => entry.id !== entryId)
    }));
  };

  const updateProjectEntry = (workerId: string, entryId: string, field: keyof Omit<WorkerProjectEntry, 'id'>, value: string) => {
    setWorkerProjectEntries(prev => ({
      ...prev,
      [workerId]: prev[workerId].map(entry =>
        entry.id === entryId
          ? { ...entry, [field]: value }
          : entry
      )
    }));
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedWorker || !selectedProject || !selectedDate || !hours) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("work_schedules").insert({
      worker_id: selectedWorker,
      project_id: selectedProject,
      trade_id: selectedTrade || null,
      cost_code_id: selectedCostCode || null,
      scheduled_date: format(selectedDate, "yyyy-MM-dd"),
      scheduled_hours: parseFloat(hours),
      notes: notes || null,
      created_by: userData.user?.id
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create schedule",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Shift created successfully"
    });

    // Invalidate all schedule queries to refresh all views
    queryClient.invalidateQueries({ queryKey: ['schedules'] });

    if (addAnother) {
      // Keep modal open, only reset worker-specific fields
      setSelectedWorker("");
      setHours("");
      setNotes("");
      setWorkerBookingWarnings({});
      onScheduleCreated();
    } else {
      resetForm();
      onScheduleCreated();
      onOpenChange(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bulkDate) {
      toast({
        title: "Missing date",
        description: "Please select a date",
        variant: "destructive"
      });
      return;
    }

    const activeWorkers = workers.filter(w => !excludedWorkers.has(w.id));
    
    const allSchedules: any[] = [];
    activeWorkers.forEach(worker => {
      const entries = workerProjectEntries[worker.id] || [];
      entries.forEach(entry => {
        if (entry.project_id && entry.hours && parseFloat(entry.hours) > 0) {
          allSchedules.push({
            worker_id: worker.id,
            project_id: entry.project_id,
            trade_id: entry.trade_id || null,
            hours: parseFloat(entry.hours)
          });
        }
      });
    });

    if (allSchedules.length === 0) {
      toast({
        title: "No valid entries",
        description: "Please add at least one worker with project and hours",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    const schedules = allSchedules.map(schedule => ({
      worker_id: schedule.worker_id,
      project_id: schedule.project_id,
      trade_id: schedule.trade_id,
      scheduled_date: format(bulkDate, "yyyy-MM-dd"),
      scheduled_hours: schedule.hours,
      created_by: userData.user?.id
    }));

    const { error } = await supabase.from("work_schedules").insert(schedules);

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create schedules",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: `${schedules.length} shift(s) scheduled successfully`
    });

    // Invalidate all schedule queries to refresh all views
    queryClient.invalidateQueries({ queryKey: ['schedules'] });

    resetForm();
    onScheduleCreated();
    onOpenChange(false);
  };

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSub || !subProject || !subDate) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("sub_scheduled_shifts").insert({
      sub_id: selectedSub,
      project_id: subProject,
      scheduled_date: format(subDate, "yyyy-MM-dd"),
      scheduled_hours: parseFloat(subHours),
      notes: subNotes || null,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create sub schedule",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Sub schedule created successfully"
    });

    // Invalidate all schedule queries to refresh all views
    queryClient.invalidateQueries({ queryKey: ['schedules'] });

    if (addAnother) {
      setSelectedSub("");
      setSubHours("8");
      setSubNotes("");
      setSubBookingWarning(false);
      onScheduleCreated();
    } else {
      resetForm();
      onScheduleCreated();
      onOpenChange(false);
    }
  };

  const handleSubChange = async (subId: string) => {
    setSelectedSub(subId);
    
    // Check for existing bookings
    if (subDate) {
      const { data } = await supabase
        .from('sub_scheduled_shifts')
        .select('id')
        .eq('sub_id', subId)
        .eq('scheduled_date', format(subDate, 'yyyy-MM-dd'))
        .maybeSingle();
      
      setSubBookingWarning(!!data);
    }
  };

  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!meetingTitle || !meetingProject || !meetingDate) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("project_todos").insert({
      title: meetingTitle,
      project_id: meetingProject,
      task_type: meetingType,
      due_date: format(meetingDate, "yyyy-MM-dd"),
      assigned_worker_id: meetingAssignee || null,
      description: meetingNotes || null,
      status: 'open',
      priority: 'medium',
      created_by: userData.user?.id
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create meeting",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: `${meetingType === 'meeting' ? 'Meeting' : 'Inspection'} created successfully`
    });

    if (addAnother) {
      setMeetingTitle("");
      setMeetingTime("");
      setMeetingAssignee("");
      setMeetingNotes("");
      onScheduleCreated();
    } else {
      resetForm();
      onScheduleCreated();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setSelectedWorker("");
    setSelectedProject("");
    setSelectedTrade("");
    setSelectedDate(new Date());
    setHours("");
    setNotes("");
    setBulkDate(new Date());
    setExcludedWorkers(new Set());
    setSelectedSub("");
    setSubProject("");
    setSubDate(new Date());
    setSubHours("8");
    setSubNotes("");
    setMeetingTitle("");
    setMeetingProject("");
    setMeetingDate(new Date());
    setMeetingTime("");
    setMeetingAssignee("");
    setMeetingType('meeting');
    setMeetingNotes("");
    setAddAnother(false);
    setWorkerBookingWarnings({});
    setSubBookingWarning(false);
    const initialEntries: Record<string, WorkerProjectEntry[]> = {};
    workers.forEach(worker => {
      initialEntries[worker.id] = [{
        id: crypto.randomUUID(),
        project_id: "",
        trade_id: worker.trade_id || "",
        hours: "8"
      }];
    });
    setWorkerProjectEntries(initialEntries);
  };

  const activeWorkerCount = workers.filter(w => !excludedWorkers.has(w.id)).length;
  const selectedWorkerData = workers.find(w => w.id === selectedWorker);
  const selectedSubData = subs.find(s => s.id === selectedSub);

  // Count how many shifts will be created in bulk mode
  const bulkShiftCount = workers.filter(w => !excludedWorkers.has(w.id))
    .reduce((count, worker) => {
      const entries = workerProjectEntries[worker.id] || [];
      return count + entries.filter(e => e.project_id && e.hours && parseFloat(e.hours) > 0).length;
    }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Add to Schedule</span>
            <div className="text-sm font-normal text-muted-foreground flex items-center gap-2">
              <kbd className="px-2 py-1 text-xs bg-muted rounded">W</kbd>
              <kbd className="px-2 py-1 text-xs bg-muted rounded">S</kbd>
              <kbd className="px-2 py-1 text-xs bg-muted rounded">M</kbd>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Context Bar */}
        {(defaultProjectName || defaultDate) && (
          <div className="flex items-center gap-4 px-4 py-2 bg-muted/50 rounded-lg text-sm">
            {defaultProjectName && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Project:</span>
                <span className="font-medium">{defaultProjectName}</span>
              </div>
            )}
            {defaultDate && (
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{format(defaultDate, 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>
        )}

        {/* Mode Selector */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as ScheduleMode)} className="w-full mb-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Workers
            </TabsTrigger>
            <TabsTrigger value="subs" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Subs
            </TabsTrigger>
            <TabsTrigger value="meetings" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Meetings
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Workers Mode */}
        {mode === 'workers' && (
          <Tabs value={bulkEntryMode} onValueChange={(v) => setBulkEntryMode(v as 'single' | 'bulk')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Single Worker
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Multiple Workers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single">
              <form onSubmit={handleSingleSubmit} className="space-y-6">
                {/* Date & Project Section */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Date & Project</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date *</Label>
                      <DatePickerWithPresets
                        date={selectedDate}
                        onDateChange={setSelectedDate}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="project">Project *</Label>
                      <Select value={selectedProject} onValueChange={setSelectedProject}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.project_name} - {project.client_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Worker Selection Section */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Worker Selection</h3>
                  <div className="space-y-2">
                    <Label htmlFor="worker">Worker *</Label>
                    <Select value={selectedWorker} onValueChange={handleWorkerChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select worker" />
                      </SelectTrigger>
                      <SelectContent>
                        {workers.map((worker) => (
                          <SelectItem key={worker.id} value={worker.id}>
                            {worker.name} - {worker.trade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedWorkerData && (
                      <p className="text-xs text-muted-foreground">
                        Default trade: {selectedWorkerData.trade}
                      </p>
                    )}
                    {workerBookingWarnings[selectedWorker] && selectedDate && (
                      <Alert variant="default" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="flex flex-col gap-2">
                          <div className="text-xs">
                            This worker already has shifts on this day. Click to review the full day.
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-fit gap-2"
                            onClick={() => {
                              // Open a day detail view - we'd need to pass this as a prop
                              // For now, just inform the user
                              toast({
                                title: "Worker Conflict",
                                description: "This worker already has shifts scheduled on this date"
                              });
                            }}
                          >
                            View Day Schedule
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                {/* Shift Details Section */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Shift Details</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="trade">Trade</Label>
                      <Select value={selectedTrade} onValueChange={setSelectedTrade}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select trade (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {trades.map((trade) => (
                            <SelectItem key={trade.id} value={trade.id}>
                              {trade.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Auto-filled from worker's default trade</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cost_code">Cost Code</Label>
                      <Select value={selectedCostCode} onValueChange={setSelectedCostCode}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select cost code (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {laborCostCodes?.map((code) => (
                            <SelectItem key={code.id} value={code.id}>
                              {code.code} - {code.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">For budget tracking and cost analysis</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hours">Scheduled Hours *</Label>
                      <Input
                        id="hours"
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        placeholder="8"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional notes"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Add Another Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="add-another" 
                    checked={addAnother}
                    onCheckedChange={(checked) => setAddAnother(checked as boolean)}
                  />
                  <label
                    htmlFor="add-another"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Keep modal open to add another shift
                  </label>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Shift"
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="bulk">
              <form onSubmit={handleBulkSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="bulk-date">Date *</Label>
                  <DatePickerWithPresets
                    date={bulkDate}
                    onDateChange={setBulkDate}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Configure Workers ({activeWorkerCount} active)</Label>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {workers.map((worker) => {
                      const isExcluded = excludedWorkers.has(worker.id);
                      const entries = workerProjectEntries[worker.id] || [];

                      return (
                        <Card key={worker.id} className={`p-4 ${isExcluded ? "opacity-50" : ""}`}>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <h4 className="font-medium">{worker.name}</h4>
                                <span className="text-sm text-muted-foreground">{worker.trade}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleWorker(worker.id)}
                              >
                                {isExcluded ? <Plus className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>

                            {!isExcluded && (
                              <div className="space-y-3">
                                {entries.map((entry, index) => (
                                  <div key={entry.id} className="space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      <div className="space-y-2">
                                        <Label className="text-xs">Project *</Label>
                                        <Select
                                          value={entry.project_id}
                                          onValueChange={(value) => updateProjectEntry(worker.id, entry.id, "project_id", value)}
                                        >
                                          <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Select" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {projects.map((project) => (
                                              <SelectItem key={project.id} value={project.id}>
                                                {project.project_name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="space-y-2">
                                        <Label className="text-xs">Trade</Label>
                                        <Select
                                          value={entry.trade_id}
                                          onValueChange={(value) => updateProjectEntry(worker.id, entry.id, "trade_id", value)}
                                        >
                                          <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Select" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {trades.map((trade) => (
                                              <SelectItem key={trade.id} value={trade.id}>
                                                {trade.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="space-y-2">
                                        <Label className="text-xs">Hours *</Label>
                                        <div className="flex gap-2">
                                          <Input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            max="24"
                                            className="h-9"
                                            value={entry.hours}
                                            onChange={(e) => updateProjectEntry(worker.id, entry.id, "hours", e.target.value)}
                                            placeholder="8"
                                          />
                                          {entries.length > 1 && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-9 w-9"
                                              onClick={() => removeProjectEntry(worker.id, entry.id)}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addProjectEntry(worker.id)}
                                  className="w-full"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Another Project
                                </Button>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      `Create ${bulkShiftCount} Shift${bulkShiftCount !== 1 ? 's' : ''}`
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        )}

        {/* Subs Mode */}
        {mode === 'subs' && (
          <form onSubmit={handleSubSubmit} className="space-y-6">
            {/* Date & Project Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Date & Project</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sub-date">Date *</Label>
                  <DatePickerWithPresets
                    date={subDate}
                    onDateChange={setSubDate}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sub-project">Project *</Label>
                  <Select value={subProject} onValueChange={setSubProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.project_name} - {project.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Subcontractor Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Subcontractor</h3>
              <div className="space-y-2">
                <Label htmlFor="sub">Sub *</Label>
                <Select value={selectedSub} onValueChange={handleSubChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub" />
                  </SelectTrigger>
                  <SelectContent>
                    {subs.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name} {sub.company_name ? `(${sub.company_name})` : ''} {sub.trade ? `- ${sub.trade}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSubData && (
                  <div className="text-xs text-muted-foreground space-y-1 mt-2">
                    {selectedSubData.trade && <p>Trade: {selectedSubData.trade}</p>}
                    {selectedSubData.company_name && <p>Company: {selectedSubData.company_name}</p>}
                  </div>
                )}
                {subBookingWarning && (
                  <Alert variant="default" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      This sub already has a schedule on this date
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            {/* Shift Details Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Shift Details</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sub-hours">Scheduled Hours *</Label>
                  <Input
                    id="sub-hours"
                    type="number"
                    step="0.5"
                    min="0"
                    value={subHours}
                    onChange={(e) => setSubHours(e.target.value)}
                    placeholder="8"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sub-notes">Notes</Label>
                  <Textarea
                    id="sub-notes"
                    value={subNotes}
                    onChange={(e) => setSubNotes(e.target.value)}
                    placeholder="Optional notes"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Add Another Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="add-another-sub" 
                checked={addAnother}
                onCheckedChange={(checked) => setAddAnother(checked as boolean)}
              />
              <label
                htmlFor="add-another-sub"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Keep modal open to add another sub schedule
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Sub Schedule"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Meetings Mode */}
        {mode === 'meetings' && (
          <form onSubmit={handleMeetingSubmit} className="space-y-6">
            {/* Meeting Details Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Meeting Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="meeting-date">Date *</Label>
                    <DatePickerWithPresets
                      date={meetingDate}
                      onDateChange={setMeetingDate}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meeting-time">Time</Label>
                    <Input
                      id="meeting-time"
                      type="time"
                      value={meetingTime}
                      onChange={(e) => setMeetingTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meeting-title">Title *</Label>
                  <Input
                    id="meeting-title"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="e.g., City inspection, Client walkthrough"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meeting-type">Type *</Label>
                  <Select value={meetingType} onValueChange={(v) => setMeetingType(v as 'meeting' | 'inspection')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Project & Assignee Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Project & Assignee</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="meeting-project">Project *</Label>
                  <Select value={meetingProject} onValueChange={setMeetingProject} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.project_name} - {project.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meeting-assignee">Assignee</Label>
                  <Select value={meetingAssignee} onValueChange={setMeetingAssignee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select worker (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {workers.map((worker) => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.name} - {worker.trade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Notes</h3>
              <div className="space-y-2">
                <Textarea
                  id="meeting-notes"
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  placeholder="Meeting details, agenda items, etc."
                  rows={3}
                />
              </div>
            </div>

            {/* Add Another Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="add-another-meeting" 
                checked={addAnother}
                onCheckedChange={(checked) => setAddAnother(checked as boolean)}
              />
              <label
                htmlFor="add-another-meeting"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Keep modal open to add another {meetingType}
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  `Create ${meetingType === 'meeting' ? 'Meeting' : 'Inspection'}`
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
