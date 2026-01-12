import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  GripVertical,
} from 'lucide-react';
import {
  ProposalData,
  PaymentScheduleItem,
  ProposalSettings,
} from '@/hooks/useProposalData';

interface ProposalContentEditorProps {
  proposal: ProposalData;
  onFieldChange: (field: string, value: any) => void;
  onSettingsChange: (settings: Partial<ProposalSettings>) => void;
}

// Generate unique ID without external dependency
const generateId = () => Math.random().toString(36).substring(2, 15);

type PresentationMode = 'summary' | 'detailed' | 'flat';

const getModeFromSettings = (settings: ProposalSettings): PresentationMode => {
  if (!settings.show_line_items) return 'summary';
  if (settings.group_line_items_by_area) return 'detailed';
  return 'flat';
};

export function ProposalContentEditor({
  proposal,
  onFieldChange,
  onSettingsChange,
}: ProposalContentEditorProps) {
  const settings = proposal.settings;
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());

  // Local state for text fields
  const [introText, setIntroText] = useState(proposal.intro_text || '');
  const [termsText, setTermsText] = useState(settings.terms_text || '');
  const [exclusionsText, setExclusionsText] = useState(settings.exclusions_text || '');
  const [allowancesText, setAllowancesText] = useState(settings.allowances_text || '');
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[]>(
    settings.payment_schedule || []
  );
  const [displayMode, setDisplayMode] = useState<PresentationMode>(
    getModeFromSettings(settings)
  );

  // Sync when proposal changes
  useEffect(() => {
    setIntroText(proposal.intro_text || '');
  }, [proposal.intro_text]);

  useEffect(() => {
    setTermsText(settings.terms_text || '');
    setExclusionsText(settings.exclusions_text || '');
    setAllowancesText(settings.allowances_text || '');
    setPaymentSchedule(settings.payment_schedule || []);
    setDisplayMode(getModeFromSettings(settings));
  }, [settings]);

  const toggleArea = (area: string) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(area)) {
      newExpanded.delete(area);
    } else {
      newExpanded.add(area);
    }
    setExpandedAreas(newExpanded);
  };

  // Payment schedule handlers
  const addPaymentRow = () => {
    const newSchedule = [
      ...paymentSchedule,
      { id: generateId(), label: '', percentage: 0, amount: 0, due_on: '' },
    ];
    setPaymentSchedule(newSchedule);
  };

  const updatePaymentRow = (
    id: string,
    field: keyof PaymentScheduleItem,
    value: any
  ) => {
    const newSchedule = paymentSchedule.map((row) =>
      row.id === id ? { ...row, [field]: value } : row
    );
    setPaymentSchedule(newSchedule);
  };

  const removePaymentRow = (id: string) => {
    const newSchedule = paymentSchedule.filter((row) => row.id !== id);
    setPaymentSchedule(newSchedule);
  };

  const savePaymentSchedule = () => {
    onSettingsChange({ payment_schedule: paymentSchedule });
  };

  // Category badge color
  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'labor':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'subs':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'materials':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const applyDisplayMode = (mode: PresentationMode) => {
    setDisplayMode(mode);
    if (mode === 'summary') {
      onSettingsChange({
        show_line_items: false,
        show_line_item_totals: false,
        group_line_items_by_area: true,
      });
    } else if (mode === 'detailed') {
      onSettingsChange({
        show_line_items: true,
        show_line_item_totals: true,
        group_line_items_by_area: true,
      });
    } else {
      // flat
      onSettingsChange({
        show_line_items: true,
        show_line_item_totals: true,
        group_line_items_by_area: false,
      });
    }
  };

  const renderGroupedScope = () => {
    if (proposal.scopeByArea.length === 0) {
      return (
        <p className="text-muted-foreground text-sm text-center py-8">
          No scope items found. Link an estimate to populate this section.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {proposal.scopeByArea.map((area) => (
          <Collapsible
            key={area.area_label}
            open={expandedAreas.has(area.area_label) || settings.show_line_items}
          >
            <div className="border rounded-lg overflow-hidden">
              <CollapsibleTrigger
                className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                onClick={() => toggleArea(area.area_label)}
              >
                <div className="flex items-center gap-2">
                  {settings.show_line_items ? (
                    expandedAreas.has(area.area_label) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )
                  ) : null}
                  <span className="font-medium">{area.area_label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {area.items.length} items
                  </Badge>
                </div>
                {settings.show_line_item_totals && (
                  <span className="font-sans font-bold tabular-nums tracking-tight">
                    ${area.subtotal.toLocaleString()}
                  </span>
                )}
              </CollapsibleTrigger>

              {settings.show_line_items && (
                <CollapsibleContent>
                  <div className="divide-y">
                    {area.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs ${getCategoryColor(
                              item.category
                            )}`}
                          >
                            {item.category?.slice(0, 3).toUpperCase() || 'OTH'}
                          </span>
                          <span className="truncate">{item.description}</span>
                        </div>
                        {settings.show_line_item_totals && (
                          <span className="font-sans font-medium tabular-nums tracking-tight text-muted-foreground ml-2">
                            ${item.line_total.toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              )}
            </div>
          </Collapsible>
        ))}
      </div>
    );
  };

  const renderFlatScope = () => {
    if (proposal.allItems.length === 0) {
      return (
        <p className="text-muted-foreground text-sm text-center py-8">
          No scope items found. Link an estimate to populate this section.
        </p>
      );
    }

    return (
      <div className="border rounded-lg divide-y">
        {proposal.allItems.map((item) => (
          <div
            key={item.id}
            className="px-3 py-2 flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className={`px-1.5 py-0.5 rounded text-xs ${getCategoryColor(
                  item.category
                )}`}
              >
                {item.category?.slice(0, 3).toUpperCase() || 'OTH'}
              </span>
              <span className="truncate">{item.description}</span>
            </div>
            {settings.show_line_item_totals && (
              <span className="font-sans font-medium tabular-nums tracking-tight text-muted-foreground ml-2">
                ${item.line_total.toLocaleString()}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cover / Intro Section */}
      {(settings.show_project_info || settings.show_scope_summary) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cover / Introduction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.show_project_info && (
              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Project</p>
                    <p className="font-medium">
                      {proposal.project?.project_name || 'N/A'}
                    </p>
                  </div>
                  {settings.show_client_info && (
                    <div>
                      <p className="text-muted-foreground text-xs">Client</p>
                      <p className="font-medium">
                        {proposal.client_name ||
                          proposal.project?.client_name ||
                          'N/A'}
                      </p>
                    </div>
                  )}
                  {settings.show_address && proposal.project?.address && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Job Address</p>
                      <p className="font-medium">{proposal.project.address}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">
                Introduction / Scope Summary
              </label>
              <Textarea
                value={introText}
                onChange={(e) => setIntroText(e.target.value)}
                onBlur={() => onFieldChange('intro_text', introText)}
                placeholder="Write an introduction for your client..."
                className="min-h-[120px] resize-y"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scope & Pricing Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Scope &amp; Pricing</span>
            <div className="flex items-center gap-1 rounded-full bg-muted px-1 py-0.5">
              {(['summary', 'detailed', 'flat'] as PresentationMode[]).map((mode) => {
                const active = displayMode === mode;
                const label =
                  mode === 'summary'
                    ? 'Summary'
                    : mode === 'detailed'
                    ? 'Detailed'
                    : 'Flat';
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => applyDisplayMode(mode)}
                    className={[
                      'px-2.5 py-1 text-xs rounded-full transition',
                      active
                        ? 'bg-background shadow-sm font-semibold'
                        : 'text-muted-foreground',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.group_line_items_by_area
            ? renderGroupedScope()
            : renderFlatScope()}

          {/* Total */}
          <Separator />
          <div className="flex justify-between items-center pt-2">
            <span className="font-medium">Grand Total</span>
            <span className="text-2xl font-bold font-sans tabular-nums tracking-tighter">
              ${proposal.total_amount.toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Allowances & Exclusions */}
      {(settings.show_allowances || settings.show_exclusions) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Allowances &amp; Exclusions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.show_allowances && (
              <div>
                <label className="text-sm font-medium mb-2 block">Allowances</label>
                <Textarea
                  value={allowancesText}
                  onChange={(e) => setAllowancesText(e.target.value)}
                  onBlur={() =>
                    onSettingsChange({ allowances_text: allowancesText })
                  }
                  placeholder="• Flooring allowance: $X per sq ft&#10;• Fixture allowance: $X"
                  className="min-h-[80px] resize-y"
                />
              </div>
            )}
            {settings.show_exclusions && (
              <div>
                <label className="text-sm font-medium mb-2 block">Exclusions</label>
                <Textarea
                  value={exclusionsText}
                  onChange={(e) => setExclusionsText(e.target.value)}
                  onBlur={() =>
                    onSettingsChange({ exclusions_text: exclusionsText })
                  }
                  placeholder="• Permits and fees&#10;• Structural engineering&#10;• Unforeseen conditions"
                  className="min-h-[80px] resize-y"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Schedule */}
      {settings.show_payment_schedule && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Payment Schedule</span>
              <Button variant="outline" size="sm" onClick={addPaymentRow}>
                <Plus className="h-4 w-4 mr-1" />
                Add Row
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentSchedule.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No payment milestones defined.
              </p>
            ) : (
              <div className="space-y-2">
                {paymentSchedule.map((row) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => updatePaymentRow(row.id, 'label', e.target.value)}
                      onBlur={savePaymentSchedule}
                      placeholder="Milestone name"
                      className="flex-1 px-2 py-1 text-sm border rounded"
                    />
                    <input
                      type="number"
                      value={row.percentage ?? ''}
                      onChange={(e) =>
                        updatePaymentRow(
                          row.id,
                          'percentage',
                          e.target.value === '' ? undefined : Number(e.target.value)
                        )
                      }
                      onBlur={savePaymentSchedule}
                      placeholder="%"
                      className="w-16 px-2 py-1 text-sm border rounded text-right font-sans tabular-nums"
                    />
                    <input
                      type="text"
                      value={row.due_on || ''}
                      onChange={(e) => updatePaymentRow(row.id, 'due_on', e.target.value)}
                      onBlur={savePaymentSchedule}
                      placeholder="Due when..."
                      className="flex-1 px-2 py-1 text-sm border rounded"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        removePaymentRow(row.id);
                        setTimeout(savePaymentSchedule, 0);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Terms & Conditions */}
      {settings.show_terms && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Terms &amp; Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              onBlur={() => onSettingsChange({ terms_text: termsText })}
              placeholder="Enter your standard terms and conditions..."
              className="min-h-[150px] resize-y"
            />
          </CardContent>
        </Card>
      )}

      {/* Signature Block */}
      {settings.show_signature_block && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Signature Block</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="font-medium text-sm">Client Acceptance</p>
                <div className="border-b-2 border-dashed h-12" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Signature</span>
                  <span>Date</span>
                </div>
                <div className="border-b h-8" />
                <p className="text-sm text-muted-foreground">Printed Name</p>
              </div>
              <div className="space-y-4">
                <p className="font-medium text-sm">Contractor</p>
                <div className="border-b-2 border-dashed h-12" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Signature</span>
                  <span>Date</span>
                </div>
                <div className="border-b h-8" />
                <p className="text-sm text-muted-foreground">
                  Printed Name / Title
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
