import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Save,
  ArrowLeft,
  Copy,
  Check,
  Send,
} from 'lucide-react';
import { useProposalWithSections } from '@/hooks/useProposalWithSections';
import { useUpdateProposal } from '@/hooks/useProposals';
import { useCreateProposalSection, useReorderProposalSections } from '@/hooks/useProposalSections';
import { getClientIP } from '@/hooks/useProposalEvents';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableSection } from '@/components/proposals/SortableSection';
import { BlockToolbox } from '@/components/proposals/BlockToolbox';
import { ProposalCanvas } from '@/components/proposals/ProposalCanvas';
import { ProposalPDFView } from '@/components/proposals/ProposalPDFView';
import { ProposalActivityTimeline } from '@/components/proposals/ProposalActivityTimeline';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

export default function ProposalBuilderV2() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // Use optimized hook to fetch proposal + sections in single query
  const { data: proposalData, isLoading, isError } = useProposalWithSections(id);
  const proposal = proposalData;
  const sections = proposalData?.proposal_sections || [];
  
  const createSection = useCreateProposalSection();
  const reorderSections = useReorderProposalSections();
  const updateProposal = useUpdateProposal();
  
  const [localSections, setLocalSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [tab, setTab] = useState('builder');
  const [publicLinkCopied, setPublicLinkCopied] = useState(false);

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

  const handleGeneratePublicLink = async () => {
    try {
      // Check if token already exists
      if (proposal?.public_token) {
        toast.info('Public link already exists');
        return;
      }

      // Generate token
      const { data, error } = await supabase.rpc('generate_proposal_public_token');
      if (error) throw error;

      const token = data as string;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

      // Update proposal
      await updateProposal.mutateAsync({
        id: id!,
        public_token: token,
        token_expires_at: expiresAt.toISOString(),
      });

      // Log "sent" event
      try {
        const ip = await getClientIP();
        await supabase.rpc('log_proposal_event', {
          p_proposal_id: id!,
          p_event_type: 'sent',
          p_actor_ip: ip,
          p_metadata: { expires_at: expiresAt.toISOString() },
        });
      } catch {
        // Silent fail for event logging
      }

      toast.success('Public link generated');
    } catch (error: any) {
      console.error('Error generating public link:', error);
      toast.error('Failed to generate public link. Please try again.');
    }
  };

  const handleCopyPublicLink = () => {
    if (!proposal?.public_token) return;

    const url = `${window.location.origin}/public/proposal/${proposal.public_token}`;
    navigator.clipboard.writeText(url);
    setPublicLinkCopied(true);
    toast.success('Link copied to clipboard');
    
    setTimeout(() => setPublicLinkCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'default';
      case 'changes_requested': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  if (isError || !proposal) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Proposal not found</p>
          <Button onClick={() => navigate('/proposals')} className="mt-4" variant="outline">
            Back to Proposals
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-col md:flex-row">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold truncate">{proposal.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant={getStatusColor(proposal.acceptance_status)}>
                {proposal.acceptance_status?.replace('_', ' ') || 'pending'}
              </Badge>
              <p className="text-sm text-muted-foreground">
                {proposal.projects?.project_name || 'No project'}
              </p>
            </div>
          </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate('/proposals')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {proposal.public_token ? (
            <Button variant="outline" size="sm" onClick={handleCopyPublicLink}>
              {publicLinkCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {publicLinkCopied ? 'Copied!' : 'Copy Link'}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleGeneratePublicLink}>
              <Send className="h-4 w-4 mr-2" />
              Generate Link
            </Button>
          )}
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="builder">Editor</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="pdf">PDF</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Builder Tab */}
        <TabsContent value="builder">
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
                          <p>No sections yet. Add blocks from the toolbox.</p>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              </Card>
            </div>

            {/* Properties */}
            <div className="lg:col-span-3">
              <Card className="p-6 sticky top-6">
                <h3 className="text-lg font-semibold mb-4">Properties</h3>
                {selectedSection ? (
                  <p className="text-sm text-muted-foreground">
                    Configure the selected section's properties
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a section to edit its properties
                  </p>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <ProposalCanvas proposal={proposal} sections={localSections} />
        </TabsContent>

        {/* PDF Tab */}
        <TabsContent value="pdf">
          <ProposalPDFView proposal={proposal} sections={localSections} />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <ProposalActivityTimeline proposalId={id!} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Proposal Settings</h3>
            <p className="text-sm text-muted-foreground">
              Additional settings and metadata configuration will be available here.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
