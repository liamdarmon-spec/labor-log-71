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
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CostCodeSelect } from "@/components/cost-codes/CostCodeSelect";
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
  const [selectedCostCode, setSelectedCostCode] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(defaultDate || new Date());
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");

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

    const dueDate = meetingTime 
      ? `${format(meetingDate, "yyyy-MM-dd")}T${meetingTime}:00`
      : format(meetingDate, "yyyy-MM-dd");

    const { error } = await supabase.from("project_todos").insert({
      title: meetingTitle,
      description: meetingNotes || null,
      status: "pending",
      due_date: dueDate,
      assigned_worker_id: meetingAssignee || null,
      task_type: meetingType,
      project_id: meetingProject
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create meeting/inspection",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: `${meetingType === 'meeting' ? 'Meeting' : 'Inspection'} scheduled successfully`
    });

    if (addAnother) {
      setMeetingTitle("");
      setMeetingTime("");
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
    setSelectedCostCode("");
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
    setMeetingDate(new Date());
    setMeetingTime("");
    setMeetingTitle("");
    setMeetingProject("");
    setMeetingAssignee("");
    setMeetingType('meeting');
    setMeetingNotes("");
    setAddAnother(false);
    setWorkerBookingWarnings({});
    setSubBookingWarning(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to Schedule</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as ScheduleMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workers">
              <User className="w-4 h-4 mr-2" />
              Workers
            </TabsTrigger>
            <TabsTrigger value="subs">
              <Users className="w-4 h-4 mr-2" />
              Subs
            </TabsTrigger>
            <TabsTrigger value="meetings">
              <CalendarIcon className="w-4 h-4 mr-2" />
              Meetings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workers" className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={bulkEntryMode === 'single' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBulkEntryMode('single')}
              >
                <User className="w-4 h-4 mr-2" />
                Single Worker
              </Button>
              <Button
                type="button"
                variant={bulkEntryMode === 'bulk' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBulkEntryMode('bulk')}
              >
                <Users className="w-4 h-4 mr-2" />
                Bulk Entry
              </Button>
            </div>

            {bulkEntryMode === 'single' ? (
              <form onSubmit={handleSingleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <DatePickerWithPresets
                      date={selectedDate}
                      onDateChange={setSelectedDate}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Worker *</Label>
                    <Select value={selectedWorker} onValueChange={handleWorkerChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select worker" />
                      </SelectTrigger>
                      <SelectContent>
                        {workers.map((worker) => (
                          <SelectItem key={worker.id} value={worker.id}>
                            {worker.name}
                            {workerBookingWarnings[worker.id] && (
                              <Badge variant="secondary" className="ml-2">Already scheduled</Badge>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Project *</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
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
                    <Label>Hours *</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      placeholder="8"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Trade</Label>
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
                  </div>

                  <div className="space-y-2">
                    <CostCodeSelect
                      value={selectedCostCode}
                      onChange={(value) => setSelectedCostCode(value)}
                      label="Cost Code"
                      required={false}
                      placeholder="Select cost code (optional)"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="add-another"
                    checked={addAnother}
                    onCheckedChange={(checked) => setAddAnother(checked as boolean)}
                  />
                  <Label htmlFor="add-another" className="text-sm">
                    Add another after saving
                  </Label>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Schedule Worker
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Date for All *</Label>
                  <DatePickerWithPresets date={bulkDate} onDateChange={setBulkDate} />
                </div>

                <div className="space-y-3">
                  {workers.map((worker) => {
                    const isExcluded = excludedWorkers.has(worker.id);
                    const entries = workerProjectEntries[worker.id] || [];

                    return (
                      <Card key={worker.id} className={isExcluded ? 'opacity-50' : ''}>
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={!isExcluded}
                                onCheckedChange={() => handleToggleWorker(worker.id)}
                              />
                              <Label className="font-medium">{worker.name}</Label>
                              <Badge variant="secondary">{worker.trade}</Badge>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addProjectEntry(worker.id)}
                              disabled={isExcluded}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Project
                            </Button>
                          </div>

                          {!isExcluded && entries.map((entry, idx) => (
                            <div key={entry.id} className="grid grid-cols-12 gap-2 items-end">
                              <div className="col-span-5">
                                <Label className="text-xs">Project</Label>
                                <Select
                                  value={entry.project_id}
                                  onValueChange={(val) => updateProjectEntry(worker.id, entry.id, 'project_id', val)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {projects.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="col-span-3">
                                <Label className="text-xs">Trade</Label>
                                <Select
                                  value={entry.trade_id}
                                  onValueChange={(val) => updateProjectEntry(worker.id, entry.id, 'trade_id', val)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Trade" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {trades.map((t) => (
                                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="col-span-2">
                                <Label className="text-xs">Hours</Label>
                                <Input
                                  type="number"
                                  step="0.5"
                                  value={entry.hours}
                                  onChange={(e) => updateProjectEntry(worker.id, entry.id, 'hours', e.target.value)}
                                  placeholder="8"
                                />
                              </div>

                              <div className="col-span-2 flex items-end">
                                {entries.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeProjectEntry(worker.id, entry.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Schedule All
                  </Button>
                </div>
              </form>
            )}
          </TabsContent>

          <TabsContent value="subs">
            <form onSubmit={handleSubSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <DatePickerWithPresets date={subDate} onDateChange={setSubDate} />
                </div>

                <div className="space-y-2">
                  <Label>Subcontractor *</Label>
                  <Select value={selectedSub} onValueChange={handleSubChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcontractor" />
                    </SelectTrigger>
                    <SelectContent>
                      {subs.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                          {subBookingWarning && selectedSub === sub.id && (
                            <Badge variant="secondary" className="ml-2">Already scheduled</Badge>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Project *</Label>
                  <Select value={subProject} onValueChange={setSubProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
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
                  <Label>Hours *</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={subHours}
                    onChange={(e) => setSubHours(e.target.value)}
                    placeholder="8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={subNotes}
                  onChange={(e) => setSubNotes(e.target.value)}
                  placeholder="Add any notes..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-another-sub"
                  checked={addAnother}
                  onCheckedChange={(checked) => setAddAnother(checked as boolean)}
                />
                <Label htmlFor="add-another-sub" className="text-sm">
                  Add another after saving
                </Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Schedule Sub
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="meetings">
            <form onSubmit={handleMeetingSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={meetingType} onValueChange={(v: any) => setMeetingType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <DatePickerWithPresets date={meetingDate} onDateChange={setMeetingDate} />
                </div>

                <div className="space-y-2">
                  <Label>Time (optional)</Label>
                  <Input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g., Client walkthrough"
                />
              </div>

              <div className="space-y-2">
                <Label>Project *</Label>
                <Select value={meetingProject} onValueChange={setMeetingProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
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
                <Label>Assignee (optional)</Label>
                <Select value={meetingAssignee} onValueChange={setMeetingAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  placeholder="Add any notes..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-another-meeting"
                  checked={addAnother}
                  onCheckedChange={(checked) => setAddAnother(checked as boolean)}
                />
                <Label htmlFor="add-another-meeting" className="text-sm">
                  Add another after saving
                </Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Schedule {meetingType === 'meeting' ? 'Meeting' : 'Inspection'}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
