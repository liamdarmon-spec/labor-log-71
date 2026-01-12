// src/components/proposals/ProposalContextPanel.tsx
// Left column: Project info, estimate info, data sources

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  User, 
  MapPin, 
  FileSpreadsheet, 
  RefreshCw,
  AlertTriangle,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';
import { ProposalData } from '@/hooks/useProposalData';

interface ProposalContextPanelProps {
  proposal: ProposalData;
  onRefreshFromEstimate: () => void;
  isRefreshing: boolean;
}

export function ProposalContextPanel({
  proposal,
  onRefreshFromEstimate,
  isRefreshing,
}: ProposalContextPanelProps) {
  const project = proposal.project;
  const estimate = proposal.estimate;

  // Check if estimate totals differ from proposal
  const estimateOutOfSync = estimate && (
    Math.abs(estimate.total_amount - proposal.total_amount) > 0.01
  );

  return (
    <div className="space-y-4">
      {/* Project Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Project
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">{project?.project_name || 'No project'}</p>
          </div>
          
          <Separator />
          
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-muted-foreground text-xs">Client</p>
              <p>{proposal.client_name || project?.client_name || 'Not specified'}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-muted-foreground text-xs">Job Address</p>
              {project?.address ? (
                <p>{project.address}</p>
              ) : (
                <p className="text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  No address set
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estimate Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Source Estimate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {estimate ? (
            <>
              <div>
                <p className="font-medium">{estimate.title}</p>
                <p className="text-muted-foreground text-xs">
                  Updated {format(new Date(estimate.updated_at), 'MMM d, yyyy')}
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-sans tabular-nums tracking-tight">${estimate.subtotal_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-sans tabular-nums tracking-tight">${estimate.tax_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span className="font-sans font-bold tabular-nums tracking-tight">${estimate.total_amount.toLocaleString()}</span>
                </div>
              </div>
              
              {estimateOutOfSync && (
                <>
                  <Separator />
                  <div className="bg-amber-50 dark:bg-amber-950 p-2 rounded text-xs">
                    <p className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      Estimate has changed
                    </p>
                    <p className="text-muted-foreground mt-1 font-sans tabular-nums tracking-tight">
                      Proposal total: ${proposal.total_amount.toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={onRefreshFromEstimate}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh Totals
                  </Button>
                </>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No estimate linked</p>
          )}
        </CardContent>
      </Card>

      {/* Proposal Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Proposal Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Areas</span>
            <Badge variant="secondary">{proposal.scopeByArea.length}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Line Items</span>
            <Badge variant="secondary">{proposal.allItems.length}</Badge>
          </div>
          <Separator />
          <div className="flex justify-between items-baseline">
            <span className="text-muted-foreground">Total</span>
            <span className="text-xl font-bold font-sans tabular-nums tracking-tight">
              ${proposal.total_amount.toLocaleString()}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
            <Calendar className="h-3 w-3" />
            Valid for {proposal.validity_days} days from{' '}
            {format(new Date(proposal.proposal_date), 'MMM d, yyyy')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
