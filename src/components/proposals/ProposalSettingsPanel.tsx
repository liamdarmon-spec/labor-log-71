// src/components/proposals/ProposalSettingsPanel.tsx
// Right column: Settings toggles and appearance options

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings, Eye, FileText, CreditCard, Signature } from 'lucide-react';
import { ProposalSettings } from '@/hooks/useProposalData';

interface ProposalSettingsPanelProps {
  settings: ProposalSettings;
  onSettingsChange: (settings: Partial<ProposalSettings>) => void;
}

export function ProposalSettingsPanel({
  settings,
  onSettingsChange,
}: ProposalSettingsPanelProps) {
  const handleToggle = (key: keyof ProposalSettings, value: boolean) => {
    onSettingsChange({ [key]: value });
  };

  return (
    <div className="space-y-4 sticky top-20">
      {/* Display Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Display Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show_project_info" className="text-sm">
              Show project info
            </Label>
            <Switch
              id="show_project_info"
              checked={settings.show_project_info}
              onCheckedChange={(checked) => handleToggle('show_project_info', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="show_client_info" className="text-sm">
              Show client info
            </Label>
            <Switch
              id="show_client_info"
              checked={settings.show_client_info}
              onCheckedChange={(checked) => handleToggle('show_client_info', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="show_address" className="text-sm">
              Show job address
            </Label>
            <Switch
              id="show_address"
              checked={settings.show_address}
              onCheckedChange={(checked) => handleToggle('show_address', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="show_scope_summary" className="text-sm">
              Show scope summary
            </Label>
            <Switch
              id="show_scope_summary"
              checked={settings.show_scope_summary}
              onCheckedChange={(checked) => handleToggle('show_scope_summary', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing Display */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Pricing Display
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show_line_items" className="text-sm">
              Show line items
            </Label>
            <Switch
              id="show_line_items"
              checked={settings.show_line_items}
              onCheckedChange={(checked) => handleToggle('show_line_items', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="show_line_item_totals" className="text-sm">
              Show item prices
            </Label>
            <Switch
              id="show_line_item_totals"
              checked={settings.show_line_item_totals}
              onCheckedChange={(checked) => handleToggle('show_line_item_totals', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="group_line_items_by_area" className="text-sm">
              Group by area
            </Label>
            <Switch
              id="group_line_items_by_area"
              checked={settings.group_line_items_by_area}
              onCheckedChange={(checked) => handleToggle('group_line_items_by_area', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <Label htmlFor="show_allowances" className="text-sm">
              Show allowances
            </Label>
            <Switch
              id="show_allowances"
              checked={settings.show_allowances}
              onCheckedChange={(checked) => handleToggle('show_allowances', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="show_exclusions" className="text-sm">
              Show exclusions
            </Label>
            <Switch
              id="show_exclusions"
              checked={settings.show_exclusions}
              onCheckedChange={(checked) => handleToggle('show_exclusions', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment & Terms */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment & Terms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show_payment_schedule" className="text-sm">
              Show payment schedule
            </Label>
            <Switch
              id="show_payment_schedule"
              checked={settings.show_payment_schedule}
              onCheckedChange={(checked) => handleToggle('show_payment_schedule', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="show_terms" className="text-sm">
              Show terms & conditions
            </Label>
            <Switch
              id="show_terms"
              checked={settings.show_terms}
              onCheckedChange={(checked) => handleToggle('show_terms', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Signature */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Signature className="h-4 w-4" />
            Signature
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show_signature_block" className="text-sm">
              Show signature block
            </Label>
            <Switch
              id="show_signature_block"
              checked={settings.show_signature_block}
              onCheckedChange={(checked) => handleToggle('show_signature_block', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
