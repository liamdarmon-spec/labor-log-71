import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjectsList, useWorkers } from '@/hooks/useTasks';

export interface ScheduleFiltersState {
  projectId?: string | null;
  workerId?: string | null;
}

export interface ScheduleFiltersProps {
  projectId?: string | null;
  workerId?: string | null;
  onChange?: (filters: ScheduleFiltersState) => void;
}

export function ScheduleFilters({ projectId, workerId, onChange }: ScheduleFiltersProps) {
  const { data: projects = [] } = useProjectsList();
  const { data: workers = [] } = useWorkers();

  const handleProjectChange = (value: string) => {
    const newProjectId = value === 'all' ? null : value;
    onChange?.({ projectId: newProjectId, workerId });
  };

  const handleWorkerChange = (value: string) => {
    const newWorkerId = value === 'all' ? null : value;
    onChange?.({ projectId, workerId: newWorkerId });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Select value={projectId || 'all'} onValueChange={handleProjectChange}>
        <SelectTrigger className="w-full sm:w-[220px]">
          <SelectValue placeholder="All projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.project_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={workerId || 'all'} onValueChange={handleWorkerChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="All people" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All people</SelectItem>
          {workers.map((worker) => (
            <SelectItem key={worker.id} value={worker.id}>
              {worker.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
