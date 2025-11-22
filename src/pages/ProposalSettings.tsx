import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Settings as SettingsIcon, Palette, FileText, Sparkles } from 'lucide-react';
import { useProposalSettings, useUpsertProposalSettings } from '@/hooks/useProposalSettings';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProposalSettings() {
  const { data: settings, isLoading } = useProposalSettings(undefined, 'global');
  const upsertSettings = useUpsertProposalSettings();

  const [formData, setFormData] = useState({
    default_terms: settings?.default_terms || '',
    default_markup_labor: settings?.default_markup_labor || 0,
    default_markup_materials: settings?.default_markup_materials || 0,
    default_markup_subs: settings?.default_markup_subs || 0,
    default_margin_percent: settings?.default_margin_percent || 0,
    branding_logo_url: settings?.branding_logo_url || '',
    ai_enabled: settings?.ai_enabled || false,
  });

  const handleSave = () => {
    upsertSettings.mutate({
      ...formData,
      setting_type: 'global',
      branding_colors: settings?.branding_colors || {},
      template_config: settings?.template_config || {},
      ai_settings: settings?.ai_settings || {},
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Proposal & Estimate Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure default values, branding, and templates
            </p>
          </div>
          <Button onClick={handleSave} disabled={upsertSettings.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>

        <Tabs defaultValue="defaults" className="w-full">
          <TabsList>
            <TabsTrigger value="defaults">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Defaults
            </TabsTrigger>
            <TabsTrigger value="branding">
              <Palette className="w-4 h-4 mr-2" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Features
            </TabsTrigger>
          </TabsList>

          <TabsContent value="defaults" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Default Markups & Margins</CardTitle>
                <CardDescription>
                  Set default markup percentages for different cost categories
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="labor-markup">Labor Markup (%)</Label>
                    <Input
                      id="labor-markup"
                      type="number"
                      value={formData.default_markup_labor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          default_markup_labor: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="materials-markup">Materials Markup (%)</Label>
                    <Input
                      id="materials-markup"
                      type="number"
                      value={formData.default_markup_materials}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          default_markup_materials: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subs-markup">Subcontractor Markup (%)</Label>
                    <Input
                      id="subs-markup"
                      type="number"
                      value={formData.default_markup_subs}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          default_markup_subs: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="margin">Default Margin (%)</Label>
                    <Input
                      id="margin"
                      type="number"
                      value={formData.default_margin_percent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          default_margin_percent: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Default Terms & Conditions</CardTitle>
                <CardDescription>
                  Standard terms that will appear on all proposals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.default_terms}
                  onChange={(e) =>
                    setFormData({ ...formData, default_terms: e.target.value })
                  }
                  rows={8}
                  placeholder="Enter default terms and conditions..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Branding</CardTitle>
                <CardDescription>
                  Customize how your proposals look to clients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logo-url">Logo URL</Label>
                  <Input
                    id="logo-url"
                    value={formData.branding_logo_url}
                    onChange={(e) =>
                      setFormData({ ...formData, branding_logo_url: e.target.value })
                    }
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                {formData.branding_logo_url && (
                  <div className="border rounded-lg p-4">
                    <img
                      src={formData.branding_logo_url}
                      alt="Company Logo"
                      className="max-h-24 object-contain"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Brand Colors</Label>
                  <p className="text-sm text-muted-foreground">
                    Color customization coming soon
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Proposal Templates</CardTitle>
                <CardDescription>
                  Manage reusable proposal templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Custom templates and layouts coming in Phase 1.1
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI-Powered Features</CardTitle>
                <CardDescription>
                  Enable AI assistance for proposal and estimate creation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="ai-enabled">Enable AI Features</Label>
                    <p className="text-sm text-muted-foreground">
                      Use AI to draft proposals, generate scope descriptions, and estimate costs
                    </p>
                  </div>
                  <Switch
                    id="ai-enabled"
                    checked={formData.ai_enabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, ai_enabled: checked })
                    }
                  />
                </div>

                {formData.ai_enabled && (
                  <div className="border-l-4 border-primary pl-4 space-y-2">
                    <p className="text-sm font-medium">Available AI Features:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Scope of work drafting</li>
                      <li>• Cost estimation suggestions</li>
                      <li>• Change order generation</li>
                      <li>• Content rewriting and refinement</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      AI features coming in future releases
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
