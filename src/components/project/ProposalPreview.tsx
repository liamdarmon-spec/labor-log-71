import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Download } from 'lucide-react';
import { format } from 'date-fns';

interface ProposalPreviewProps {
  proposalId: string;
  onBack: () => void;
}

interface Section {
  id: string;
  title: string;
  sort_order: number;
  is_lump_sum: boolean;
  items: SectionItem[];
}

interface SectionItem {
  id: string;
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
  };
}

export function ProposalPreview({ proposalId, onBack }: ProposalPreviewProps) {
  const [proposal, setProposal] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProposalData();
  }, [proposalId]);

  const fetchProposalData = async () => {
    try {
      // Fetch proposal
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (proposalError) throw proposalError;
      setProposal(proposalData);

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('proposal_sections')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('sort_order');

      if (sectionsError) throw sectionsError;

      // Fetch items for each section
      const sectionsWithItems = await Promise.all(
        (sectionsData || []).map(async (section) => {
          const { data: items } = await supabase
            .from('proposal_section_items')
            .select(`
              *,
              estimate_items(description, quantity, unit, unit_price)
            `)
            .eq('proposal_section_id', section.id)
            .order('sort_order');

          return {
            ...section,
            items: items || [],
          };
        })
      );

      setSections(sectionsWithItems);
    } catch (error) {
      console.error('Error fetching proposal:', error);
      toast.error('Failed to load proposal');
    } finally {
      setLoading(false);
    }
  };

  const calculateSectionTotal = (section: Section) => {
    return section.items.reduce((sum, item) => {
      const qty = item.display_quantity ?? item.estimate_items.quantity;
      const price = item.display_unit_price ?? item.estimate_items.unit_price;
      return sum + (qty * price);
    }, 0);
  };

  const grandTotal = sections.reduce((sum, section) => sum + calculateSectionTotal(section), 0);

  if (loading) {
    return <div className="text-center py-8">Loading proposal...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{proposal?.title}</h2>
            <p className="text-sm text-muted-foreground">
              {proposal?.version_label && `Version: ${proposal.version_label} • `}
              Created {format(new Date(proposal?.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Badge className={
            proposal?.status === 'accepted' ? 'bg-green-500' :
            proposal?.status === 'sent' ? 'bg-blue-500' : 'bg-gray-500'
          }>
            {proposal?.status}
          </Badge>
        </div>
      </div>

      {/* Client-facing proposal view */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8 space-y-6">
          {/* Proposal Header */}
          <div className="text-center border-b pb-6">
            <h1 className="text-3xl font-bold mb-2">{proposal?.title}</h1>
            {proposal?.version_label && (
              <p className="text-sm text-muted-foreground">{proposal.version_label}</p>
            )}
          </div>

          {/* Sections */}
          {sections.map((section, idx) => {
            const sectionTotal = calculateSectionTotal(section);

            return (
              <div key={section.id} className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                  {section.is_lump_sum && (
                    <Badge variant="outline">Lump Sum</Badge>
                  )}
                </div>

                {section.is_lump_sum || section.items.every(i => !i.show_line_item) ? (
                  /* Lump sum view - only show total */
                  <div className="flex justify-between items-center py-2 px-4 bg-muted/50 rounded">
                    <span className="font-medium">{section.title}</span>
                    <span className="text-lg font-bold">${sectionTotal.toFixed(2)}</span>
                  </div>
                ) : (
                  /* Detailed view - show line items */
                  <div className="space-y-1">
                    {section.items.filter(i => i.show_line_item).map((item) => {
                      const desc = item.display_description || item.estimate_items.description;
                      const qty = item.display_quantity ?? item.estimate_items.quantity;
                      const unit = item.display_unit ?? item.estimate_items.unit;
                      const price = item.display_unit_price ?? item.estimate_items.unit_price;
                      const total = qty * price;

                      return (
                        <div key={item.id} className="flex justify-between items-start py-2 text-sm">
                          <div className="flex-1">
                            <div>{desc}</div>
                            <div className="text-xs text-muted-foreground">
                              {qty} {unit} @ ${price.toFixed(2)}
                            </div>
                          </div>
                          <div className="font-medium">${total.toFixed(2)}</div>
                        </div>
                      );
                    })}
                    <div className="flex justify-between items-center pt-2 border-t font-semibold">
                      <span>Section Total</span>
                      <span>${sectionTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Grand Total */}
          <div className="border-t-2 pt-4 mt-6">
            <div className="flex justify-between items-center text-2xl font-bold">
              <span>Total Investment</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
