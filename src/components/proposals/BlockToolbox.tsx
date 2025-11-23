import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  List,
  DollarSign,
  Sparkles,
  Calendar,
  Shield,
  Image,
  Type,
  Plus,
} from 'lucide-react';

interface BlockToolboxProps {
  onAddBlock: (type: string) => void;
}

export function BlockToolbox({ onAddBlock }: BlockToolboxProps) {
  const blocks = [
    { type: 'intro', label: 'Introduction', icon: FileText },
    { type: 'scope', label: 'Scope of Work', icon: List },
    { type: 'pricing', label: 'Pricing', icon: DollarSign },
    { type: 'options', label: 'Optional Upgrades', icon: Sparkles },
    { type: 'timeline', label: 'Timeline', icon: Calendar },
    { type: 'warranty', label: 'Warranty', icon: Shield },
    { type: 'gallery', label: 'Photo Gallery', icon: Image },
    { type: 'custom', label: 'Custom Text', icon: Type },
  ];

  return (
    <Card className="p-4 sticky top-6">
      <h3 className="text-sm font-semibold mb-4">Add Blocks</h3>
      <div className="space-y-2">
        {blocks.map((block) => (
          <Button
            key={block.type}
            variant="outline"
            className="w-full justify-start"
            onClick={() => onAddBlock(block.type)}
          >
            <block.icon className="h-4 w-4 mr-2" />
            {block.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
