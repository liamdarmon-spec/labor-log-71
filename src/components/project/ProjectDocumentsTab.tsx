import { useState } from 'react';
import { DocumentsUploadZone } from './DocumentsUploadZone';
import { DocumentsTable } from './DocumentsTable';

interface ProjectDocumentsTabProps {
  projectId: string;
}

export function ProjectDocumentsTab({ projectId }: ProjectDocumentsTabProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <DocumentsUploadZone
        ownerType="project"
        ownerId={projectId}
        onUploadComplete={() => setRefreshKey((k) => k + 1)}
      />
      <DocumentsTable
        ownerType="project"
        ownerId={projectId}
        onRefresh={refreshKey}
      />
    </div>
  );
}
