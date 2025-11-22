import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  Building2, 
  Tag, 
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Download,
  Sparkles
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
  const [analyzing, setAnalyzing] = useState(false);
  const [showExtractedText, setShowExtractedText] = useState(false);
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

  const handleRunAI = async () => {
    if (!documentId) return;

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-document', {
        body: { documentId },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'AI analysis completed',
      });

      // Refresh document
      fetchDocument();
    } catch (error: any) {
      console.error('Error analyzing document:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to analyze document',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const variants: Record<string, { variant: any; icon: any }> = {
      'success': { variant: 'default', icon: CheckCircle },
      'pending': { variant: 'secondary', icon: Clock },
      'error': { variant: 'destructive', icon: AlertCircle },
    };

    const config = variants[status.split(':')[0]] || variants['error'];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

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
                  <p className="text-sm text-muted-foreground">Manual Type</p>
                  <Badge variant="outline">{document.doc_type || 'Unknown'}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Uploaded</p>
                  <p className="text-sm">
                    {document.uploaded_at ? format(new Date(document.uploaded_at), 'PPp') : 'Unknown'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* AI Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm">AI Analysis</CardTitle>
                  </div>
                  {document.ai_last_run_status && getStatusBadge(document.ai_last_run_status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!document.ai_last_run_at ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-4">
                      This document hasn't been analyzed yet
                    </p>
                    <Button onClick={handleRunAI} disabled={analyzing}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
                    </Button>
                  </div>
                ) : (
                  <>
                    {document.ai_title && (
                      <div>
                        <p className="text-sm text-muted-foreground">AI Title</p>
                        <p className="font-medium">{document.ai_title}</p>
                      </div>
                    )}

                    {document.ai_doc_type && (
                      <div>
                        <p className="text-sm text-muted-foreground">AI Type</p>
                        <Badge variant="default">{document.ai_doc_type}</Badge>
                      </div>
                    )}

                    {document.ai_counterparty_name && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Counterparty</p>
                          <p className="font-medium">{document.ai_counterparty_name}</p>
                        </div>
                      </div>
                    )}

                    {(document.ai_effective_date || document.ai_expiration_date) && (
                      <div className="grid grid-cols-2 gap-4">
                        {document.ai_effective_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Effective</p>
                              <p className="text-sm">{format(new Date(document.ai_effective_date), 'PP')}</p>
                            </div>
                          </div>
                        )}
                        {document.ai_expiration_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Expires</p>
                              <p className="text-sm">{format(new Date(document.ai_expiration_date), 'PP')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {document.ai_total_amount && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Amount</p>
                          <p className="font-medium">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: document.ai_currency || 'USD',
                            }).format(document.ai_total_amount)}
                          </p>
                        </div>
                      </div>
                    )}

                    {document.ai_tags && document.ai_tags.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">AI Tags</p>
                        <div className="flex flex-wrap gap-1">
                          {document.ai_tags.map((tag: string, idx: number) => (
                            <Badge key={idx} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {document.ai_summary && (
                      <div>
                        <p className="text-sm text-muted-foreground">Summary</p>
                        <p className="text-sm mt-1">{document.ai_summary}</p>
                      </div>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Last analyzed: {format(new Date(document.ai_last_run_at), 'PPp')}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRunAI}
                        disabled={analyzing}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Re-run
                      </Button>
                    </div>

                    {document.ai_summary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowExtractedText(!showExtractedText)}
                      >
                        {showExtractedText ? 'Hide' : 'Show'} Extracted Text
                      </Button>
                    )}

                    {showExtractedText && document.ai_summary && (
                      <div className="bg-muted p-4 rounded-md">
                        <p className="text-xs font-mono whitespace-pre-wrap">
                          {document.ai_summary}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Compliance Info (if linked to sub) */}
            {document.owner_type === 'sub' && (document.ai_doc_type === 'COI' || document.ai_doc_type === 'W9' || document.ai_doc_type === 'license') && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Compliance Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {document.ai_doc_type === 'COI' && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">COI Tracking</span>
                        <Badge variant={document.ai_expiration_date && new Date(document.ai_expiration_date) > new Date() ? 'default' : 'destructive'}>
                          {document.ai_expiration_date ? 
                            new Date(document.ai_expiration_date) > new Date() ? 'Active' : 'Expired' 
                            : 'Unknown'}
                        </Badge>
                      </div>
                    )}
                    {document.ai_doc_type === 'W9' && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">W-9 Status</span>
                        <Badge variant="default">Received</Badge>
                      </div>
                    )}
                    {document.ai_doc_type === 'license' && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">License Status</span>
                        <Badge variant={document.ai_expiration_date && new Date(document.ai_expiration_date) > new Date() ? 'default' : 'destructive'}>
                          {document.ai_expiration_date ? 
                            new Date(document.ai_expiration_date) > new Date() ? 'Valid' : 'Expired' 
                            : 'Unknown'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}