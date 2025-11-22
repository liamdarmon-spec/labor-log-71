import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Save, FileText, Settings, Copy, CheckCircle } from 'lucide-react';
import { useEstimateV2, useUpdateEstimateV2, useDuplicateEstimateV2, useApproveEstimateV2 } from '@/hooks/useEstimatesV2';
import { useScopeBlocks, useCreateScopeBlock } from '@/hooks/useScopeBlocks';
import { ScopeBlockEditor } from '@/components/estimates/ScopeBlockEditor';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function EstimateBuilderV2() {
  const { estimateId } = useParams();
  const navigate = useNavigate();
  const { data: estimate, isLoading } = useEstimateV2(estimateId!);
  const { data: scopeBlocks = [] } = useScopeBlocks('estimate', estimateId!);
  const updateEstimate = useUpdateEstimateV2();
  const duplicateEstimate = useDuplicateEstimateV2();
  const approveEstimate = useApproveEstimateV2();
  const createScopeBlock = useCreateScopeBlock();

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');

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

  if (!estimate) {
    return (
      <Layout>
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Estimate not found</h3>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const calculateTotal = () => {
    return scopeBlocks.reduce((sum, block) => {
      const blockTotal = (block.scope_block_cost_items || []).reduce(
        (blockSum, item) => blockSum + item.line_total,
        0
      );
      return sum + blockTotal;
    }, 0);
  };

  const handleSaveTitle = () => {
    if (title && title !== estimate.title) {
      updateEstimate.mutate({ id: estimate.id, title });
    }
    setEditingTitle(false);
  };

  const handleAddScopeBlock = (blockType: 'section' | 'cost_items' | 'text' | 'image' | 'nested') => {
    createScopeBlock.mutate({
      entity_type: 'estimate',
      entity_id: estimateId!,
      block_type: blockType,
      title: `New ${blockType}`,
      sort_order: scopeBlocks.length,
      is_visible: true,
    });
  };

  const handleDuplicate = async () => {
    const result = await duplicateEstimate.mutateAsync(estimateId!);
    if (result) {
      navigate(`/estimates/${result.id}`);
    }
  };

  const handleApprove = () => {
    if (confirm('Approve this estimate? This will mark it as ready to sync to project budget.')) {
      approveEstimate.mutate(estimateId!);
    }
  };

  const subtotal = calculateTotal();
  const tax = subtotal * 0.0 ; // Can be configured
  const total = subtotal + tax;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'pending':
        return 'default';
      case 'accepted':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {editingTitle ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="text-3xl font-bold"
                autoFocus
              />
            ) : (
              <h1
                className="text-3xl font-bold cursor-pointer hover:text-primary"
                onClick={() => {
                  setTitle(estimate.title);
                  setEditingTitle(true);
                }}
              >
                {estimate.title}
              </h1>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Version {estimate.version}</span>
              <span>•</span>
              <Badge variant={getStatusColor(estimate.status)}>{estimate.status}</Badge>
              {estimate.approved_at && (
                <>
                  <span>•</span>
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Approved
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDuplicate}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </Button>
            {estimate.status === 'draft' && (
              <Button onClick={handleApprove}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate(`/estimates/${estimateId}/settings`)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Subtotal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tax
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="builder" className="w-full">
          <TabsList>
            <TabsTrigger value="builder">
              <FileText className="w-4 h-4 mr-2" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="history">
              Change History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-6">
            {/* Add Scope Block Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Add Scope Block</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleAddScopeBlock('section')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Section
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAddScopeBlock('cost_items')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Cost Items
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAddScopeBlock('text')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Text Block
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAddScopeBlock('image')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Image
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Scope Blocks */}
            <div className="space-y-4">
              {scopeBlocks.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No scope blocks yet. Add your first block to get started.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                scopeBlocks.map((block) => (
                  <ScopeBlockEditor
                    key={block.id}
                    block={block}
                    entityType="estimate"
                    entityId={estimateId!}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Version history and change tracking coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
