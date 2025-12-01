import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { UnitSelect } from '@/components/shared/UnitSelect';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Save,
  FileText,
  Plus,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ProposalSection {
  id: string;
  title: string;
  sort_order: number;
  is_lump_sum: boolean;
  proposal_section_items: ProposalItem[];
}

interface ProposalItem {
  id: string;
  display_description: string | null;
  display_quantity: number | null;
  display_unit: string | null;
  display_unit_price: number | null;
  show_line_item: boolean;
  sort_order: number;
  estimate_item_id: string;
}

interface Proposal {
  id: string;
  title: string;
  status: string;
  version_label: string | null;
  notes_internal: string | null;
  created_at: string;
  updated_at: string;
  project_id: string;
}

export default function ProposalEditor() {
  const { projectId, proposalId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [sections, setSections] = useState<ProposalSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (proposalId) {
      fetchProposal();
    }
  }, [proposalId]);

  const fetchProposal = async () => {
    try {
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (proposalError) throw proposalError;
      setProposal(proposalData);

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('proposal_sections')
        .select('*, proposal_section_items(*)')
        .eq('proposal_id', proposalId)
        .order('sort_order', { ascending: true });

      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);
    } catch (error) {
      console.error('Error fetching proposal:', error);
      toast({
        title: 'Error',
        description: 'Failed to load proposal',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!proposal) return;

    setSaving(true);
    try {
      // Update proposal
      const { error: proposalError } = await supabase
        .from('proposals')
        .update({
          title: proposal.title,
          status: proposal.status,
          version_label: proposal.version_label,
          notes_internal: proposal.notes_internal,
        })
        .eq('id', proposal.id);

      if (proposalError) throw proposalError;

      // Update sections
      for (const section of sections) {
        await supabase
          .from('proposal_sections')
          .update({
            title: section.title,
            is_lump_sum: section.is_lump_sum,
          })
          .eq('id', section.id);

        // Update items
        for (const item of section.proposal_section_items) {
          await supabase
            .from('proposal_section_items')
            .update({
              display_description: item.display_description,
              display_quantity: item.display_quantity,
              display_unit: item.display_unit,
              display_unit_price: item.display_unit_price,
              show_line_item: item.show_line_item,
            })
            .eq('id', item.id);
        }
      }

      toast({
        title: 'Success',
        description: 'Proposal saved successfully',
      });

      fetchProposal();
    } catch (error) {
      console.error('Error saving proposal:', error);
      toast({
        title: 'Error',
        description: 'Failed to save proposal',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addSection = async () => {
    if (!proposalId) return;

    try {
      const { data, error } = await supabase
        .from('proposal_sections')
        .insert({
          proposal_id: proposalId,
          title: 'New Section',
          sort_order: sections.length,
          is_lump_sum: false,
        })
        .select('*, proposal_section_items(*)')
        .single();

      if (error) throw error;
      setSections([...sections, data]);
    } catch (error) {
      console.error('Error adding section:', error);
      toast({
        title: 'Error',
        description: 'Failed to add section',
        variant: 'destructive',
      });
    }
  };

  const addItem = async (sectionId: string) => {
    try {
      // Need to get an estimate_item_id - for now we'll need to handle this differently
      toast({
        title: 'Info',
        description: 'Please add items from the estimate tab',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const deleteItem = async (sectionId: string, itemId: string) => {
    try {
      const { error } = await supabase
        .from('proposal_section_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setSections(
        sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                proposal_section_items: s.proposal_section_items.filter((i) => i.id !== itemId),
              }
            : s
        )
      );
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
    }
  };

  const updateItem = (sectionId: string, itemId: string, field: string, value: any) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              proposal_section_items: s.proposal_section_items.map((i) =>
                i.id === itemId ? { ...i, [field]: value } : i
              ),
            }
          : s
      )
    );
  };

  const updateSection = (sectionId: string, field: string, value: any) => {
    setSections(sections.map((s) => (s.id === sectionId ? { ...s, [field]: value } : s)));
  };

  const getSectionTotal = (section: ProposalSection) => {
    return section.proposal_section_items.reduce((sum, item) => {
      const qty = Number(item.display_quantity) || 0;
      const price = Number(item.display_unit_price) || 0;
      return sum + qty * price;
    }, 0);
  };

  if (loading) {
    return (
      <Layout>
        <div>Loading proposal...</div>
      </Layout>
    );
  }

  if (!proposal) {
    return (
      <Layout>
        <div>Proposal not found</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(`/projects/${projectId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Button>
            <div>
              <Input
                value={proposal.title}
                onChange={(e) => setProposal({ ...proposal, title: e.target.value })}
                className="text-2xl font-bold border-none px-0 focus-visible:ring-0"
              />
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{proposal.version_label || 'v1'}</Badge>
                <Badge variant="outline">{proposal.status}</Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        </div>

        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <div className="space-y-4">
                <div>
                  <Label>Section Title</Label>
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                    className="text-xl font-semibold"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-24">Unit</TableHead>
                    <TableHead className="w-32">Unit Price</TableHead>
                    <TableHead className="w-32">Total</TableHead>
                    <TableHead className="w-24">Visible</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.proposal_section_items.map((item) => {
                    const lineTotal =
                      (Number(item.display_quantity) || 0) *
                      (Number(item.display_unit_price) || 0);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            value={item.display_description || ''}
                            onChange={(e) =>
                              updateItem(section.id, item.id, 'display_description', e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.display_quantity || ''}
                            onChange={(e) =>
                              updateItem(section.id, item.id, 'display_quantity', e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <UnitSelect
                            value={item.display_unit || ''}
                            onChange={(value) =>
                              updateItem(section.id, item.id, 'display_unit', value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.display_unit_price || ''}
                            onChange={(e) =>
                              updateItem(section.id, item.id, 'display_unit_price', e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          ${lineTotal.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateItem(
                                section.id,
                                item.id,
                                'show_line_item',
                                !item.show_line_item
                              )
                            }
                          >
                            {!item.show_line_item ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteItem(section.id, item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => addItem(section.id)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
                <div className="text-lg font-semibold">
                  Section Total: $
                  {getSectionTotal(section).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button onClick={addSection} variant="outline" className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center text-2xl font-bold">
              <span>Total</span>
              <span>
                $
                {sections
                  .reduce((sum, s) => sum + getSectionTotal(s), 0)
                  .toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
