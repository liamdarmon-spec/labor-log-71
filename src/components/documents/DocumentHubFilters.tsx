import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDocumentTypeOptions, DocumentType } from '@/lib/documents/storagePaths';
import { useDebounce } from '@/hooks/use-debounce';

interface DocumentHubFiltersProps {
  projectId?: string | null;
  onProjectChange?: (projectId: string | null) => void;
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  showProjectFilter?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  invoice: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
  receipt: 'bg-green-500/20 text-green-700 border-green-500/30',
  contract: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
  permit: 'bg-red-500/20 text-red-700 border-red-500/30',
  plan: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  photo: 'bg-pink-500/20 text-pink-700 border-pink-500/30',
  proposal: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  COI: 'bg-cyan-500/20 text-cyan-700 border-cyan-500/30',
  license: 'bg-indigo-500/20 text-indigo-700 border-indigo-500/30',
  other: 'bg-muted text-muted-foreground border-border',
};

export function DocumentHubFilters({
  projectId,
  onProjectChange,
  selectedTypes,
  onTypesChange,
  searchTerm,
  onSearchChange,
  showProjectFilter = true,
}: DocumentHubFiltersProps) {
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const debouncedSearch = useDebounce(localSearch, 300);

  useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  const { data: projects } = useQuery({
    queryKey: ['projects-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name')
        .order('project_name');
      if (error) throw error;
      return data;
    },
    enabled: showProjectFilter,
  });

  const documentTypes = getDocumentTypeOptions();

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const clearFilters = () => {
    onTypesChange([]);
    setLocalSearch('');
    onSearchChange('');
    if (onProjectChange) onProjectChange(null);
  };

  const hasActiveFilters = selectedTypes.length > 0 || searchTerm || projectId;

  return (
    <div className="space-y-4">
      {/* Search and Project Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {showProjectFilter && onProjectChange && (
          <Select 
            value={projectId || 'all'} 
            onValueChange={(v) => onProjectChange(v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.project_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Document Type Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {documentTypes.map((type) => {
          const isSelected = selectedTypes.includes(type.value);
          return (
            <Badge
              key={type.value}
              variant={isSelected ? 'default' : 'outline'}
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? TYPE_COLORS[type.value] 
                  : 'hover:bg-muted'
              }`}
              onClick={() => toggleType(type.value)}
            >
              {type.label}
              {isSelected && (
                <X className="ml-1 h-3 w-3" />
              )}
            </Badge>
          );
        })}
        
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="h-6 px-2 text-xs"
          >
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}
