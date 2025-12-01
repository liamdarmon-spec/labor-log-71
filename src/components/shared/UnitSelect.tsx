import { useMeasurementUnits } from "@/hooks/useMeasurementUnits";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UnitSelectProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  categoryFilter?: string;
  className?: string;
}

export function UnitSelect({
  value,
  onChange,
  placeholder = "Unit",
  categoryFilter,
  className,
}: UnitSelectProps) {
  const { data: allUnits = [] } = useMeasurementUnits();

  // Filter by category if specified
  const units = categoryFilter
    ? allUnits.filter((u) => u.category === categoryFilter)
    : allUnits;

  return (
    <Select value={value ?? ""} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {units.map((unit) => (
          <SelectItem key={unit.id} value={unit.code}>
            {unit.code} – {unit.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
