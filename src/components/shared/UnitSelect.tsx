import { useMeasurementUnits } from "@/hooks/useMeasurementUnits";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface UnitSelectProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  categoryFilter?: string;
  className?: string;
  compact?: boolean;
}

const CATEGORY_ORDER = ["count", "time", "length", "area", "volume", "weight", "packaging", "other"];

export function UnitSelect({
  value,
  onChange,
  placeholder = "Unit",
  categoryFilter,
  className,
  compact = false,
}: UnitSelectProps) {
  const { data: allUnits = [] } = useMeasurementUnits();

  // Filter by category if specified
  const units = categoryFilter
    ? allUnits.filter((u) => u.category === categoryFilter)
    : allUnits;

  // Group units by category
  const groupedUnits = units.reduce((acc, unit) => {
    const cat = unit.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(unit);
    return acc;
  }, {} as Record<string, typeof units>);

  // Show grouped if no filter
  const showGrouped = !categoryFilter && Object.keys(groupedUnits).length > 1;

  return (
    <Select value={value ?? ""} onValueChange={onChange}>
      <SelectTrigger className={cn(compact && "h-8 text-xs", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showGrouped ? (
          CATEGORY_ORDER.map((cat) => {
            const unitsInCat = groupedUnits[cat];
            if (!unitsInCat || unitsInCat.length === 0) return null;
            return (
              <SelectGroup key={cat}>
                <SelectLabel className="text-xs text-muted-foreground capitalize">
                  {cat}
                </SelectLabel>
                {unitsInCat.map((unit) => (
                  <SelectItem key={unit.id} value={unit.code}>
                    {unit.code} – {unit.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })
        ) : (
          units.map((unit) => (
            <SelectItem key={unit.id} value={unit.code}>
              {unit.code} – {unit.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
