import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, AlertTriangle, Upload } from 'lucide-react';

interface ComplianceDocument {
  id: string;
  doc_type: string;
  status: string;
  expiry_date: string | null;
  file_url: string | null;
}

interface SubComplianceCardProps {
  subId: string;
}

export function SubComplianceCard({ subId }: SubComplianceCardProps) {
  const [docs, setDocs] = useState<ComplianceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompliance();
  }, [subId]);

  const fetchCompliance = async () => {
    try {
      const { data, error } = await supabase
        .from('sub_compliance_documents')
        .select('*')
        .eq('sub_id', subId);

      if (error) throw error;
      setDocs(data || []);
    } catch (error) {
      console.error('Error fetching compliance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getComplianceStatus = (docType: string) => {
    const doc = docs.find((d) => d.doc_type === docType);
    if (!doc || !doc.file_url) return 'missing';

    if (doc.expiry_date) {
      const daysUntilExpiry = Math.floor(
        (new Date(doc.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry < 0) return 'expired';
      if (daysUntilExpiry < 30) return 'expiring';
    }

    return 'valid';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'expiring':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'missing':
        return <XCircle className="h-5 w-5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'valid':
        return 'Valid';
      case 'expiring':
        return 'Expiring Soon';
      case 'expired':
        return 'Expired';
      case 'missing':
        return 'Missing';
      default:
        return 'Unknown';
    }
  };

  const complianceItems = [
    { type: 'w9', label: 'W-9' },
    { type: 'insurance', label: 'Insurance (COI)' },
    { type: 'license', label: 'License' },
    { type: 'master_agreement', label: 'Master Agreement' },
  ];

  const overallStatus = complianceItems.every((item) => getComplianceStatus(item.type) === 'valid')
    ? 'compliant'
    : complianceItems.some((item) =>
        ['expired', 'expiring'].includes(getComplianceStatus(item.type))
      )
    ? 'warning'
    : 'not_compliant';

  if (loading) {
    return <div>Loading compliance...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Compliance Status</CardTitle>
          <Badge
            variant={
              overallStatus === 'compliant'
                ? 'default'
                : overallStatus === 'warning'
                ? 'secondary'
                : 'destructive'
            }
          >
            {overallStatus === 'compliant'
              ? '✓ Compliant'
              : overallStatus === 'warning'
              ? '⚠ Warning'
              : '✗ Not Compliant'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {complianceItems.map((item) => {
            const status = getComplianceStatus(item.type);
            const doc = docs.find((d) => d.doc_type === item.type);

            return (
              <div key={item.type} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status)}
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {status === 'valid' && doc?.expiry_date
                        ? `Expires ${new Date(doc.expiry_date).toLocaleDateString()}`
                        : getStatusLabel(status)}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  {doc ? 'Update' : 'Upload'}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
