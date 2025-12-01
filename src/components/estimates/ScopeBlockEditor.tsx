// src/components/estimates/ScopeBlockEditor.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  ScopeBlock,
  useUpdateScopeBlock,
  useDeleteScopeBlock,
  useCreateCostItem,
  useUpdateCostItem,
  useDeleteCostItem,
} from "@/hooks/useScopeBlocks";
import { CostCodeSelect } from "@/components/cost-codes/CostCodeSelect";

interface ScopeBlockEditorProps {
  block: ScopeBlock;
  entityType: "estimate" | "proposal";
  entityId: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function ScopeBlockEditor({
  block,
  entityType,
  entityId,
  onDragStart,
  onDragEnd,
}: ScopeBlockEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(block.title || "");

  const updateBlock = useUpdateScopeBlock();
  const deleteBlock = useDeleteScopeBlock();
  const createCostItem = useCreateCostItem();
  const updateCostItem = useUpdateCostItem();
  const deleteCostItem = useDeleteCostItem();

  const handleTitleSave = () => {
    if (editedTitle !== block.title) {
      updateBlock.mutate({ id: block.id, title: editedTitle });
    }
    setIsEditingTitle(false);
  };

  const handleToggleVisibility = () => {
    updateBlock.mutate({ id: block.id, is_visible: !block.is_visible });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this scope block?")) {
      deleteBlock.mutate({ id: block.id, entityType, entityId });
    }
  };

  const handleAddCostItem = () => {
    createCostItem.mutate({
      scopeBlockId: block.id,
      item: {
        category: "labor",
        description: "New item",
        quantity: 1,
        unit: "ea",
        unit_price: 0,
        markup_percent: 0,
        margin_percent: 0,
        line_total: 0,
        sort_order: block.scope_block_cost_items?.length || 0,
      },
    });
  };

  const calculateTotal = () => {
    return (block.scope_block_cost_items || []).reduce(
      (sum, item) => sum + item.line_total,
      0
    );
  };

  return (
    <Card className={`${!block.is_visible ? "opacity-50" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div
            className="cursor-move"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>

          {isEditingTitle ? (
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
              className="flex-1"
              autoFocus
            />
          ) : (
            <h3
              className="font-semibold flex-1 cursor-pointer hover:text-primary"
              onClick={() => setIsEditingTitle(true)}
            >
              {block.title || "Untitled Section"}
            </h3>
          )}

          <Badge variant="secondary">{block.block_type}</Badge>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleVisibility}
            >
              {block.is_visible ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </Button>

            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {block.description && (
          <p className="text-sm text-muted-foreground mt-2">
            {block.description}
          </p>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {block.block_type === "cost_items" && (
            <div className="space-y-4">
              {/* Cost Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium">
                        Category
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium">
                        Cost Code
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium">
                        Description
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium w-20">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium w-20">
                        Unit
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium w-28">
                        Rate
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium w-24">
                        Markup %
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium w-28">
                        Total
                      </th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(block.scope_block_cost_items || []).map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">
                          <Select
                            value={item.category}
                            onValueChange={(value) =>
                              updateCostItem.mutate({
                                id: item.id,
                                category: value as any,
                              })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="labor">Labor</SelectItem>
                              <SelectItem value="materials">
                                Materials
                              </SelectItem>
                              <SelectItem value="subs">Subs</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <CostCodeSelect
                            value={item.cost_code_id}
                            required
                            onChange={(val) =>
                              updateCostItem.mutate({
                                id: item.id,
                                cost_code_id: val,
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={item.description}
                            onChange={(e) =>
                              updateCostItem.mutate({
                                id: item.id,
                                description: e.target.value,
                              })
                            }
                            className="h-8"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateCostItem.mutate({
                                id: item.id,
                                quantity:
                                  parseFloat(e.target.value) || 0,
                              })
                            }
                            className="h-8"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={item.unit}
                            onChange={(e) =>
                              updateCostItem.mutate({
                                id: item.id,
                                unit: e.target.value,
                              })
                            }
                            className="h-8"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) =>
                              updateCostItem.mutate({
                                id: item.id,
                                unit_price:
                                  parseFloat(e.target.value) || 0,
                              })
                            }
                            className="h-8"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={item.markup_percent}
                            onChange={(e) =>
                              updateCostItem.mutate({
                                id: item.id,
                                markup_percent:
                                  parseFloat(e.target.value) || 0,
                              })
                            }
                            className="h-8"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          ${item.line_total.toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              deleteCostItem.mutate(item.id)
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted font-semibold">
                    <tr>
                      <td colSpan={7} className="px-3 py-2 text-right">
                        Section Total:
                      </td>
                      <td className="px-3 py-2 text-right">
                        ${calculateTotal().toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCostItem}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Cost Item
              </Button>
            </div>
          )}

          {block.block_type === "text" && (
            <Textarea
              value={block.content_richtext || ""}
              onChange={(e) =>
                updateBlock.mutate({
                  id: block.id,
                  content_richtext: e.target.value,
                })
              }
              placeholder="Enter text content..."
              rows={6}
            />
          )}

          {block.block_type === "image" && (
            <div className="space-y-2">
              <Input
                value={block.image_url || ""}
                onChange={(e) =>
                  updateBlock.mutate({
                    id: block.id,
                    image_url: e.target.value,
                  })
                }
                placeholder="Image URL..."
              />
              {block.image_url && (
                <img
                  src={block.image_url}
                  alt={block.title || ""}
                  className="w-full max-h-64 object-contain rounded-lg"
                />
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
