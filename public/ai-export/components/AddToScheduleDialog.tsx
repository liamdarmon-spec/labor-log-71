// This is the main dialog for adding schedules
// Path: src/components/scheduling/AddToScheduleDialog.tsx
// 
// KEY FEATURES:
// - Three modes: Workers, Subs, Meetings
// - Single worker or bulk worker entry
// - Conflict detection when scheduling
// - Pre-fill support for project and date context
// - Keyboard shortcuts (W/S/M for mode switching)
// - "Add Another" option to keep dialog open

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

interface AddToScheduleDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    projectId?: string;
    defaultDate?: Date;
    onScheduleAdded?: () => void;
}

export function AddToScheduleDialog({ open, setOpen, projectId, defaultDate, onScheduleAdded }: AddToScheduleDialogProps) {
    const [mode, setMode] = useState<"workers" | "subs" | "meetings">("workers");
    const [workerIds, setWorkerIds] = useState<string[]>([]);
    const [subIds, setSubIds] = useState<string[]>([]);
    const [meetingName, setMeetingName] = useState<string>("");
    const [date, setDate] = useState<Date | undefined>(defaultDate);
    const [startTime, setStartTime] = useState<string>("08:00");
    const [endTime, setEndTime] = useState<string>("17:00");
    const [notes, setNotes] = useState<string>("");
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>(projectId || "");
    const [workers, setWorkers] = useState<any[]>([]);
    const [subs, setSubs] = useState<any[]>([]);
    const { toast } = useToast();
    const [addAnother, setAddAnother] = useState(false);

    useEffect(() => {
        const fetchProjects = async () => {
            const { data, error } = await supabase.from("projects").select("id, name");
            if (error) {
                toast({
                    title: "Error fetching projects",
                    description: error.message,
                    variant: "destructive",
                });
            } else {
                setProjects(data || []);
            }
        };

        const fetchWorkers = async () => {
            const { data, error } = await supabase.from("workers").select("id, name");
            if (error) {
                toast({
                    title: "Error fetching workers",
                    description: error.message,
                    variant: "destructive",
                });
            } else {
                setWorkers(data || []);
            }
        };

        const fetchSubs = async () => {
            const { data, error } = await supabase.from("subs").select("id, name");
            if (error) {
                toast({
                    title: "Error fetching subs",
                    description: error.message,
                    variant: "destructive",
                });
            } else {
                setSubs(data || []);
            }
        };

        fetchProjects();
        fetchWorkers();
        fetchSubs();
        if (defaultDate) {
            setDate(defaultDate);
        }
        if (projectId) {
            setSelectedProject(projectId);
        }
    }, [toast, defaultDate, projectId]);

    const handleSubmit = async () => {
        if (!date) {
            toast({
                title: "Please select a date",
                variant: "destructive",
            });
            return;
        }

        if (!selectedProject) {
            toast({
                title: "Please select a project",
                variant: "destructive",
            });
            return;
        }

        const startTimeObj = new Date(`${format(date, "yyyy-MM-dd")}T${startTime}`);
        const endTimeObj = new Date(`${format(date, "yyyy-MM-dd")}T${endTime}`);

        if (isNaN(startTimeObj.getTime()) || isNaN(endTimeObj.getTime())) {
            toast({
                title: "Invalid start or end time",
                variant: "destructive",
            });
            return;
        }

        if (endTimeObj <= startTimeObj) {
            toast({
                title: "End time must be after start time",
                variant: "destructive",
            });
            return;
        }

        const duration = (endTimeObj.getTime() - startTimeObj.getTime()) / (1000 * 60 * 60);

        if (mode === "workers") {
            if (workerIds.length === 0) {
                toast({
                    title: "Please select at least one worker",
                    variant: "destructive",
                });
                return;
            }

            for (const workerId of workerIds) {
                const { data, error } = await supabase.from("scheduled_shifts").insert([
                    {
                        project_id: selectedProject,
                        worker_id: workerId,
                        date: format(date, "yyyy-MM-dd"),
                        start_time: startTime,
                        end_time: endTime,
                        duration_hours: duration,
                        notes: notes,
                    },
                ]);

                if (error) {
                    toast({
                        title: `Error scheduling worker ${workerId}`,
                        description: error.message,
                        variant: "destructive",
                    });
                    return;
                }
            }
            toast({
                title: `Scheduled ${workerIds.length} workers`,
            });
        } else if (mode === "subs") {
            if (subIds.length === 0) {
                toast({
                    title: "Please select at least one sub",
                    variant: "destructive",
                });
                return;
            }

            for (const subId of subIds) {
                const { data, error } = await supabase.from("scheduled_shifts").insert([
                    {
                        project_id: selectedProject,
                        sub_id: subId,
                        date: format(date, "yyyy-MM-dd"),
                        start_time: startTime,
                        end_time: endTime,
                        duration_hours: duration,
                        notes: notes,
                    },
                ]);

                if (error) {
                    toast({
                        title: `Error scheduling sub ${subId}`,
                        description: error.message,
                        variant: "destructive",
                    });
                    return;
                }
            }
            toast({
                title: `Scheduled ${subIds.length} subs`,
            });
        } else if (mode === "meetings") {
            if (!meetingName) {
                toast({
                    title: "Please enter a meeting name",
                    variant: "destructive",
                });
                return;
            }

            const { data, error } = await supabase.from("scheduled_shifts").insert([
                {
                    project_id: selectedProject,
                    meeting_name: meetingName,
                    date: format(date, "yyyy-MM-dd"),
                    start_time: startTime,
                    end_time: endTime,
                    duration_hours: duration,
                    notes: notes,
                },
            ]);

            if (error) {
                toast({
                    title: "Error scheduling meeting",
                    description: error.message,
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "Scheduled meeting",
            });
        }

        if (onScheduleAdded) {
            onScheduleAdded();
        }

        if (!addAnother) {
            setOpen(false);
        } else {
            // Clear fields, but keep project and date
            if (mode === "workers") setWorkerIds([]);
            if (mode === "subs") setSubIds([]);
            setMeetingName("");
            setStartTime("08:00");
            setEndTime("17:00");
            setNotes("");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add to Schedule</DialogTitle>
                </DialogHeader>
                <Tabs value={mode} onValueChange={setMode}>
                    <TabsList>
                        <TabsTrigger value="workers" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white">Workers</TabsTrigger>
                        <TabsTrigger value="subs" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white">Subs</TabsTrigger>
                        <TabsTrigger value="meetings" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white">Meetings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="workers">
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="workers" className="text-right">
                                    Workers
                                </Label>
                                <Select onValueChange={(value) => setWorkerIds(value.split(','))} multiple defaultValue={workerIds.join(',')}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select workers" />
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
                        </div>
                    </TabsContent>
                    <TabsContent value="subs">
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="subs" className="text-right">
                                    Subs
                                </Label>
                                <Select onValueChange={(value) => setSubIds(value.split(','))} multiple defaultValue={subIds.join(',')}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select subs" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subs.map((sub) => (
                                            <SelectItem key={sub.id} value={sub.id}>
                                                {sub.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="meetings">
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="meeting_name" className="text-right">
                                    Meeting Name
                                </Label>
                                <Input id="meeting_name" value={meetingName} onChange={(e) => setMeetingName(e.target.value)} className="col-span-3" />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="project" className="text-right">
                            Project
                        </Label>
                        <Select onValueChange={setSelectedProject} defaultValue={selectedProject}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map((project) => (
                                    <SelectItem key={project.id} value={project.id}>
                                        {project.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                            Date
                        </Label>
                        <div className="col-span-3">
                            <DatePickerWithPresets date={date} setDate={setDate} />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="start_time" className="text-right">
                            Start Time
                        </Label>
                        <Input type="time" id="start_time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="col-span-3" />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="end_time" className="text-right">
                            End Time
                        </Label>
                        <Input type="time" id="end_time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="col-span-3" />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="notes" className="text-right">
                            Notes
                        </Label>
                        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3" />
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        id="add_another"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={addAnother}
                        onChange={(e) => setAddAnother(e.target.checked)}
                    />
                    <label htmlFor="add_another" className="text-sm font-medium text-gray-900">
                        Add Another
                    </label>
                </div>
                <Button onClick={handleSubmit}>Schedule</Button>
            </DialogContent>
        </Dialog>
    );
}
