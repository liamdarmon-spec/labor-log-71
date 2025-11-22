import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DocumentSearchFiltersProps {
  complianceFilter: string;
  onComplianceFilterChange: (value: string) => void;
}

export function DocumentSearchFilters({ complianceFilter, onComplianceFilterChange }: DocumentSearchFiltersProps) {
  return (
    <Select value={complianceFilter} onValueChange={onComplianceFilterChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Compliance Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Documents</SelectItem>
        <SelectItem value="expiring">Expiring Soon (90d)</SelectItem>
        <SelectItem value="expired">Expired</SelectItem>
      </SelectContent>
    </Select>
  );
}