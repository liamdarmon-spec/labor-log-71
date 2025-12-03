import { useMemo } from "react";
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

  // Memoize filtered units
  const units = useMemo(() => {
    return categoryFilter
      ? allUnits.filter((u) => u.category === categoryFilter)
      : allUnits;
  }, [allUnits, categoryFilter]);

  // Memoize grouped units - prevents recomputation on every render
  const groupedUnits = useMemo(() => {
    return units.reduce((acc, unit) => {
      const cat = unit.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(unit);
      return acc;
    }, {} as Record<string, typeof units>);
  }, [units]);

  // Memoize whether to show grouped
  const showGrouped = useMemo(() => {
    return !categoryFilter && Object.keys(groupedUnits).length > 1;
  }, [categoryFilter, groupedUnits]);

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
