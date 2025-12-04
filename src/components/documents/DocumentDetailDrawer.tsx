import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  ExternalLink,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';

interface DocumentDetailDrawerProps {
  documentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentDetailDrawer({ documentId, open, onOpenChange }: DocumentDetailDrawerProps) {
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (documentId && open) {
      fetchDocument();
    }
  }, [documentId, open]);

  const fetchDocument = async () => {
    if (!documentId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) throw error;
      setDocument(data);
    } catch (error) {
      console.error('Error fetching document:', error);
      toast({
        title: 'Error',
        description: 'Failed to load document details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // AI ANALYSIS TEMPORARILY DISABLED
  // const handleRunAI = async () => { ... }

  if (!document && !loading) {
    return null;
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>Document Details</DrawerTitle>
        </DrawerHeader>

        {loading ? (
          <div className="p-6">Loading...</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Basic Information</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(document.file_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = document.file_url;
                        link.download = document.file_name;
                        link.click();
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">File Name</p>
                  <p className="font-medium">{document.file_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <Badge variant="outline">{document.doc_type || document.document_type || 'Unknown'}</Badge>
                </div>
                {document.title && (
                  <div>
                    <p className="text-sm text-muted-foreground">Title</p>
                    <p className="font-medium">{document.title}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Uploaded</p>
                  <p className="text-sm">
                    {document.uploaded_at ? format(new Date(document.uploaded_at), 'PPp') : 'Unknown'}
                  </p>
                </div>
                {document.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{document.notes}</p>
                  </div>
                )}
                {document.tags && document.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {document.tags.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI ANALYSIS SECTION - TEMPORARILY HIDDEN
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm">AI Analysis</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                AI analysis is temporarily disabled.
              </CardContent>
            </Card>
            */}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
