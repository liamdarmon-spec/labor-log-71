import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Plus, GripVertical, Edit2, Trash2, Eye, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProposalDesignerProps {
  proposalId: string;
  onBack: () => void;
}

interface Section {
  id: string;
  title: string;
  sort_order: number;
  is_lump_sum: boolean;
}

interface SectionItem {
  id: string;
  estimate_item_id: string;
  sort_order: number;
  display_description: string | null;
  display_quantity: number | null;
  display_unit: string | null;
  display_unit_price: number | null;
  show_line_item: boolean;
  estimate_items: {
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    category: string;
  };
}

export function ProposalDesigner({ proposalId, onBack }: ProposalDesignerProps) {
  const [proposal, setProposal] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [sectionItems, setSectionItems] = useState<SectionItem[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);

  useEffect(() => {
    fetchProposal();
    fetchSections();
    fetchAvailableItems();
  }, [proposalId]);

  useEffect(() => {
    if (selectedSectionId) {
      fetchSectionItems(selectedSectionId);
    }
  }, [selectedSectionId]);

  const fetchProposal = async () => {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (error) {
      toast.error('Failed to load proposal');
      return;
    }

    setProposal(data);
  };

  const fetchSections = async () => {
    const { data, error } = await supabase
      .from('proposal_sections')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('sort_order');

    if (error) {
      toast.error('Failed to load sections');
      return;
    }

    setSections(data || []);
    if (data && data.length > 0 && !selectedSectionId) {
      setSelectedSectionId(data[0].id);
    }
  };

  const fetchSectionItems = async (sectionId: string) => {
    const { data, error } = await supabase
      .from('proposal_section_items')
      .select(`
        *,
        estimate_items(description, quantity, unit, unit_price, category)
      `)
      .eq('proposal_section_id', sectionId)
      .order('sort_order');

    if (error) {
      toast.error('Failed to load section items');
      return;
    }

    setSectionItems(data || []);
  };

  const fetchAvailableItems = async () => {
    // Fetch estimate items from the budget source estimate
    const { data: project } = await supabase
      .from('proposals')
      .select('project_id')
      .eq('id', proposalId)
      .single();

    if (!project) return;

    const { data: estimate } = await supabase
      .from('estimates')
      .select('id')
      .eq('project_id', project.project_id)
      .eq('is_budget_source', true)
      .maybeSingle();

    if (!estimate) {
      setAvailableItems([]);
      return;
    }

    const { data: items } = await supabase
      .from('estimate_items')
      .select('*')
      .eq('estimate_id', estimate.id)
      .order('description');

    setAvailableItems(items || []);
  };

  const handleAddSection = async () => {
    const newSortOrder = sections.length;
    const { data, error } = await supabase
      .from('proposal_sections')
      .insert({
        proposal_id: proposalId,
        title: 'New Section',
        sort_order: newSortOrder,
        is_lump_sum: false,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add section');
      return;
    }

    setSections([...sections, data]);
    setSelectedSectionId(data.id);
  };

  const handleUpdateSectionTitle = async (sectionId: string, newTitle: string) => {
    const { error } = await supabase
      .from('proposal_sections')
      .update({ title: newTitle })
      .eq('id', sectionId);

    if (error) {
      toast.error('Failed to update section');
      return;
    }

    setSections(sections.map(s => s.id === sectionId ? { ...s, title: newTitle } : s));
  };

  const handleToggleLumpSum = async (sectionId: string, isLumpSum: boolean) => {
    const { error } = await supabase
      .from('proposal_sections')
      .update({ is_lump_sum: isLumpSum })
      .eq('id', sectionId);

    if (error) {
      toast.error('Failed to update section');
      return;
    }

    setSections(sections.map(s => s.id === sectionId ? { ...s, is_lump_sum: isLumpSum } : s));
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section? All items will be removed.')) return;

    const { error } = await supabase
      .from('proposal_sections')
      .delete()
      .eq('id', sectionId);

    if (error) {
      toast.error('Failed to delete section');
      return;
    }

    const newSections = sections.filter(s => s.id !== sectionId);
    setSections(newSections);
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(newSections[0]?.id || null);
    }
  };

  const handleAddItemToSection = async (estimateItemId: string) => {
    if (!selectedSectionId) return;

    const newSortOrder = sectionItems.length;
    const { error } = await supabase
      .from('proposal_section_items')
      .insert({
        proposal_section_id: selectedSectionId,
        estimate_item_id: estimateItemId,
        sort_order: newSortOrder,
        show_line_item: true,
      });

    if (error) {
      toast.error('Failed to add item');
      return;
    }

    fetchSectionItems(selectedSectionId);
  };

  const handleRemoveItem = async (itemId: string) => {
    const { error } = await supabase
      .from('proposal_section_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      toast.error('Failed to remove item');
      return;
    }

    if (selectedSectionId) {
      fetchSectionItems(selectedSectionId);
    }
  };

  const selectedSection = sections.find(s => s.id === selectedSectionId);
  const sectionTotal = sectionItems.reduce((sum, item) => {
    const qty = item.display_quantity ?? item.estimate_items.quantity;
    const price = item.display_unit_price ?? item.estimate_items.unit_price;
    return sum + (qty * price);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{proposal?.title}</h2>
            <p className="text-sm text-muted-foreground">Proposal Designer</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={() => toast.success('Saved')}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Left: Sections List */}
        <Card className="col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sections</CardTitle>
              <Button size="sm" variant="ghost" onClick={handleAddSection}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {sections.map((section) => (
              <div
                key={section.id}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedSectionId === section.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground'
                }`}
                onClick={() => setSelectedSectionId(section.id)}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium flex-1">{section.title}</span>
                </div>
                {section.is_lump_sum && (
                  <Badge variant="secondary" className="text-xs mt-1">Lump Sum</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Center: Section Items */}
        <Card className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{selectedSection?.title || 'Select a section'}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Section Total: ${sectionTotal.toFixed(2)}
                </p>
              </div>
              {selectedSection && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="lumpsum" className="text-xs">Lump Sum</Label>
                    <Switch
                      id="lumpsum"
                      checked={selectedSection.is_lump_sum}
                      onCheckedChange={(checked) => handleToggleLumpSum(selectedSection.id, checked)}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteSection(selectedSection.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedSection ? (
              <>
                <div className="mb-4">
                  <Label>Section Title</Label>
                  <Input
                    value={selectedSection.title}
                    onChange={(e) => handleUpdateSectionTitle(selectedSection.id, e.target.value)}
                  />
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sectionItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                            No items in this section. Add items from the right panel.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sectionItems.map((item) => {
                          const qty = item.display_quantity ?? item.estimate_items.quantity;
                          const price = item.display_unit_price ?? item.estimate_items.unit_price;
                          const unit = item.display_unit ?? item.estimate_items.unit;
                          const total = qty * price;

                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <GripVertical className="w-4 h-4 text-muted-foreground" />
                              </TableCell>
                              <TableCell>
                                {item.display_description || item.estimate_items.description}
                              </TableCell>
                              <TableCell>{qty}</TableCell>
                              <TableCell>{unit}</TableCell>
                              <TableCell>${price.toFixed(2)}</TableCell>
                              <TableCell className="font-medium">${total.toFixed(2)}</TableCell>
                              <TableCell>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleRemoveItem(item.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Select a section to view its items
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Available Items */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Available Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {availableItems.map((item) => {
                const isUsed = sectionItems.some(si => si.estimate_item_id === item.id);
                
                return (
                  <div
                    key={item.id}
                    className={`p-3 border rounded-lg text-xs ${
                      isUsed ? 'bg-muted opacity-50' : 'hover:bg-muted/50 cursor-pointer'
                    }`}
                    onClick={() => !isUsed && handleAddItemToSection(item.id)}
                  >
                    <div className="font-medium truncate">{item.description}</div>
                    <div className="text-muted-foreground mt-1">
                      {item.quantity} {item.unit} × ${item.unit_price}
                    </div>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {item.category}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
