import { DocumentsUploadZone } from '../project/DocumentsUploadZone';
import { DocumentsTable } from '../project/DocumentsTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface SubDocumentsSectionProps {
  subId: string;
}

export function SubDocumentsSection({ subId }: SubDocumentsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <div>
            <CardTitle>Documents</CardTitle>
            <CardDescription>
              Contracts, COIs, W-9s, and other compliance documents
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <DocumentsUploadZone
          ownerType="sub"
          ownerId={subId}
          onUploadComplete={() => {}}
        />
        <DocumentsTable
          ownerType="sub"
          ownerId={subId}
          onRefresh={0}
        />
      </CardContent>
    </Card>
  );
}
