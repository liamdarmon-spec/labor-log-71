import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { SnapshotBar } from '@/components/project-hub/SnapshotBar';
import { ActionRow } from '@/components/project-hub/ActionRow';
import { WeeklySummary } from '@/components/project-hub/WeeklySummary';
import { BudgetMiniOverview } from '@/components/project-hub/BudgetMiniOverview';
import { WorkforceMiniTable } from '@/components/project-hub/WorkforceMiniTable';
import { ProjectFeed } from '@/components/project-hub/ProjectFeed';

interface ProjectOverviewTabProps {
  projectId: string;
}

export function ProjectOverviewTab({ projectId }: ProjectOverviewTabProps) {
  // Fetch project details for snapshot bar
  const { data: project, isLoading } = useQuery({
    queryKey: ['project-details', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('project_name, client_name, status')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8 px-2 md:px-4 lg:px-8 pt-4 pb-8">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-10" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 px-2 md:px-4 lg:px-8 pt-4 pb-8">
      {/* Tier 1: Snapshot Bar */}
      <SnapshotBar
        projectId={projectId}
        projectName={project?.project_name || 'Project'}
        clientName={project?.client_name || 'Client'}
        status={project?.status || 'Active'}
      />

      {/* Tier 2: Action Row */}
      <ActionRow projectId={projectId} />

      {/* Tier 3: Weekly Summary */}
      <WeeklySummary projectId={projectId} />

      {/* Tier 4: Budget & Workforce Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetMiniOverview projectId={projectId} />
        <WorkforceMiniTable projectId={projectId} />
      </div>

      {/* Tier 5: Activity Feed */}
      <ProjectFeed projectId={projectId} />
    </div>
  );
}
