import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Save,
  Eye,
  ArrowLeft,
  Plus,
  GripVertical,
  Settings,
  FileText,
  Image,
  DollarSign,
  Calendar,
  Shield,
  Type,
} from 'lucide-react';
import { useProposal } from '@/hooks/useProposals';
import { useProposalSections, useCreateProposalSection, useReorderProposalSections } from '@/hooks/useProposalSections';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableSection } from '@/components/proposals/SortableSection';
import { BlockToolbox } from '@/components/proposals/BlockToolbox';
import { ProposalCanvas } from '@/components/proposals/ProposalCanvas';

export default function ProposalBuilder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: proposal, isLoading: proposalLoading } = useProposal(id!);
  const { data: sections, isLoading: sectionsLoading } = useProposalSections(id);
  const createSection = useCreateProposalSection();
  const reorderSections = useReorderProposalSections();
  
  const [localSections, setLocalSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [view, setView] = useState<'builder' | 'preview'>('builder');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (sections) {
      setLocalSections(sections);
    }
  }, [sections]);

  const handleAddBlock = (type: string) => {
    const blockTitles: Record<string, string> = {
      intro: 'Introduction',
      scope: 'Scope of Work',
      pricing: 'Pricing',
      options: 'Optional Upgrades',
      timeline: 'Project Timeline',
      warranty: 'Warranty',
      gallery: 'Photo Gallery',
      custom: 'Custom Section',
    };

    createSection.mutate({
      proposal_id: id!,
      type,
      title: blockTitles[type] || 'New Section',
      content_richtext: '',
      sort_order: localSections.length,
      config: {},
      group_type: 'section',
      is_lump_sum: false,
      is_visible: true,
      show_section_total: false,
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setLocalSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        
        // Update sort_order in database
        const updates = reordered.map((item, index) => ({
          id: item.id,
          sort_order: index,
        }));
        
        reorderSections.mutate({ proposalId: id!, sections: updates });
        
        return reordered;
      });
    }
  };

  const handleSave = () => {
    toast.success('Proposal saved');
  };

  if (proposalLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  if (!proposal) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p>Proposal not found</p>
          <Button onClick={() => navigate('/proposals')} className="mt-4">
            Back to Proposals
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{proposal.title}</h1>
          <p className="text-muted-foreground">Edit proposal structure and content</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/proposals')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            variant={view === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView(view === 'builder' ? 'preview' : 'builder')}
          >
            <Eye className="h-4 w-4 mr-2" />
            {view === 'preview' ? 'Edit' : 'Preview'}
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
      {view === 'builder' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Toolbox */}
          <div className="lg:col-span-3">
            <BlockToolbox onAddBlock={handleAddBlock} />
          </div>

          {/* Canvas */}
          <div className="lg:col-span-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Proposal Builder</h3>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localSections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {localSections.map((section) => (
                      <SortableSection
                        key={section.id}
                        section={section}
                        isSelected={selectedSection === section.id}
                        onSelect={() => setSelectedSection(section.id)}
                      />
                    ))}
                    {localSections.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-1">No sections yet</p>
                        <p className="text-sm">Add blocks from the toolbox to get started</p>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </Card>
          </div>

          {/* Properties */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Properties</h3>
              </div>
              {selectedSection ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Configure the selected section's properties
                  </p>
                  {/* Section properties will go here */}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a section to edit its properties
                </p>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <ProposalCanvas proposal={proposal} sections={localSections} />
      )}
    </Layout>
  );
}
