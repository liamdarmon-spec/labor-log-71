import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ScheduleConflict {
  hasConflicts: boolean;
  scheduleCount: number;
  projectNames: string[];
}

export function useScheduleConflicts(workerId: string | null, date: string | null) {
  const [conflicts, setConflicts] = useState<ScheduleConflict>({
    hasConflicts: false,
    scheduleCount: 0,
    projectNames: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workerId || !date) {
      setConflicts({ hasConflicts: false, scheduleCount: 0, projectNames: [] });
      return;
    }

    checkConflicts();
  }, [workerId, date]);

  const checkConflicts = async () => {
    if (!workerId || !date) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("scheduled_shifts")
      .select(`
        id,
        project:projects(project_name)
      `)
      .eq("worker_id", workerId)
      .eq("scheduled_date", date);

    setLoading(false);

    if (error || !data) {
      console.error("Error checking schedule conflicts:", error);
      return;
    }

    const projectNames = data
      .map(s => s.project?.project_name)
      .filter((name): name is string => !!name);

    setConflicts({
      hasConflicts: data.length > 1,
      scheduleCount: data.length,
      projectNames
    });
  };

  return { conflicts, loading, refetch: checkConflicts };
}
