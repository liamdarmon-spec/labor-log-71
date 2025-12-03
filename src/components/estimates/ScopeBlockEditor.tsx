// src/components/estimates/ScopeBlockEditor.tsx
// Section-level editor for non-cost-item blocks (text, image).
// cost_items blocks are now rendered by ProjectEstimateEditor.

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Image,
} from "lucide-react";
import {
  ScopeBlock,
  useUpdateScopeBlock,
  useDeleteScopeBlock,
} from "@/hooks/useScopeBlocks";

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

  // For cost_items blocks, we delegate to ProjectEstimateEditor at page level
  // This component only handles text and image blocks
  if (block.block_type === "cost_items") {
    return null; // Rendered elsewhere
  }

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
    if (confirm("Are you sure you want to delete this block?")) {
      deleteBlock.mutate({ id: block.id, entityType, entityId });
    }
  };

  const blockIcon =
    block.block_type === "text" ? (
      <FileText className="w-4 h-4" />
    ) : block.block_type === "image" ? (
      <Image className="w-4 h-4" />
    ) : null;

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

          {blockIcon}

          {isEditingTitle ? (
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
              className="flex-1 h-8"
              autoFocus
            />
          ) : (
            <h3
              className="font-semibold flex-1 cursor-pointer hover:text-primary text-sm"
              onClick={() => setIsEditingTitle(true)}
            >
              {block.title || "Untitled Block"}
            </h3>
          )}

          <Badge variant="secondary" className="text-xs">
            {block.block_type}
          </Badge>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleToggleVisibility}>
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
              className="resize-y"
            />
          )}

          {block.block_type === "image" && (
            <div className="space-y-3">
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
                  className="w-full max-h-64 object-contain rounded-lg border bg-muted"
                />
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
