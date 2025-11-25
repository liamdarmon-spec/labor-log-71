import { ProjectFinancialsTab } from './ProjectFinancialsTab';

interface ProjectFinancialsTabV2Props {
  projectId: string;
}

/**
 * Legacy alias – forwards to the canonical ProjectFinancialsTab
 * so anything still importing V2 uses the new ledger-based system.
 */
export function ProjectFinancialsTabV2({ projectId }: ProjectFinancialsTabV2Props) {
  return <ProjectFinancialsTab projectId={projectId} />;
}
