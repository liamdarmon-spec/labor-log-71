import { ProjectBudgetBuilderTab } from './ProjectBudgetBuilderTab';

interface ProjectBudgetTabV2Props {
  projectId: string;
}

export function ProjectBudgetTabV2({ projectId }: ProjectBudgetTabV2Props) {
  return <ProjectBudgetBuilderTab projectId={projectId} />;
}
