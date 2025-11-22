import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface SubComplianceCardProps {
  sub: {
    compliance_coi_expiration: string | null;
    compliance_w9_received: boolean | null;
    compliance_license_expiration: string | null;
    compliance_notes: string | null;
  };
}

export function SubComplianceCard({ sub }: SubComplianceCardProps) {
  const getComplianceStatus = () => {
    const now = new Date();
    const issues: string[] = [];
    
    // Check COI
    if (!sub.compliance_coi_expiration) {
      issues.push('Missing COI');
    } else if (new Date(sub.compliance_coi_expiration) < now) {
      issues.push('COI Expired');
    } else if (differenceInDays(new Date(sub.compliance_coi_expiration), now) < 30) {
      issues.push('COI Expiring Soon');
    }

    // Check W-9
    if (!sub.compliance_w9_received) {
      issues.push('Missing W-9');
    }

    // Check License
    if (!sub.compliance_license_expiration) {
      issues.push('Missing License');
    } else if (new Date(sub.compliance_license_expiration) < now) {
      issues.push('License Expired');
    } else if (differenceInDays(new Date(sub.compliance_license_expiration), now) < 30) {
      issues.push('License Expiring Soon');
    }

    if (issues.length === 0) {
      return { status: 'compliant', label: 'Compliant', variant: 'default' as const, icon: CheckCircle };
    } else if (issues.some(i => i.includes('Expired'))) {
      return { status: 'expired', label: 'Non-Compliant', variant: 'destructive' as const, icon: XCircle };
    } else if (issues.some(i => i.includes('Expiring'))) {
      return { status: 'expiring', label: 'Expiring Soon', variant: 'secondary' as const, icon: AlertTriangle };
    } else {
      return { status: 'incomplete', label: 'Incomplete', variant: 'outline' as const, icon: AlertTriangle };
    }
  };

  const compliance = getComplianceStatus();
  const StatusIcon = compliance.icon;

  const getDateStatus = (date: string | null, label: string) => {
    if (!date) {
      return { variant: 'outline' as const, label: 'Missing', color: 'text-muted-foreground' };
    }

    const now = new Date();
    const expirationDate = new Date(date);
    const daysUntil = differenceInDays(expirationDate, now);

    if (expirationDate < now) {
      return { variant: 'destructive' as const, label: 'Expired', color: 'text-destructive' };
    } else if (daysUntil < 30) {
      return { variant: 'secondary' as const, label: `${daysUntil} days left`, color: 'text-orange-600' };
    } else if (daysUntil < 60) {
      return { variant: 'secondary' as const, label: `${daysUntil} days left`, color: 'text-yellow-600' };
    } else {
      return { variant: 'default' as const, label: 'Active', color: 'text-green-600' };
    }
  };

  const coiStatus = getDateStatus(sub.compliance_coi_expiration, 'COI');
  const licenseStatus = getDateStatus(sub.compliance_license_expiration, 'License');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <div>
              <CardTitle>Compliance Status</CardTitle>
              <CardDescription>Insurance, licensing, and tax documents</CardDescription>
            </div>
          </div>
          <Badge variant={compliance.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {compliance.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* COI */}
        <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
          <div>
            <p className="font-medium text-sm">Certificate of Insurance (COI)</p>
            {sub.compliance_coi_expiration && (
              <p className="text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 inline mr-1" />
                Expires: {format(new Date(sub.compliance_coi_expiration), 'PP')}
              </p>
            )}
          </div>
          <Badge variant={coiStatus.variant}>{coiStatus.label}</Badge>
        </div>

        {/* W-9 */}
        <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
          <div>
            <p className="font-medium text-sm">W-9 Form</p>
            <p className="text-xs text-muted-foreground">Tax information</p>
          </div>
          <Badge variant={sub.compliance_w9_received ? 'default' : 'outline'}>
            {sub.compliance_w9_received ? 'Received' : 'Missing'}
          </Badge>
        </div>

        {/* License */}
        <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
          <div>
            <p className="font-medium text-sm">Trade License</p>
            {sub.compliance_license_expiration && (
              <p className="text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 inline mr-1" />
                Expires: {format(new Date(sub.compliance_license_expiration), 'PP')}
              </p>
            )}
          </div>
          <Badge variant={licenseStatus.variant}>{licenseStatus.label}</Badge>
        </div>

        {sub.compliance_notes && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{sub.compliance_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}