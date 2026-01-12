import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useCostCodesForSelect } from "@/hooks/useCostCodes";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CostCode {
  id: string;
  code: string;
  name: string | null;
  category: string | null;
}

interface CostCodeSelectProps {
  value: string | null;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: string;
  error?: string;
  compact?: boolean;
}

// ============================================================================
// ROOT CAUSE FIX (2026-01-12):
// DB enum is: 'labor' | 'material' | 'sub' (singular)
// Old code used: 'labor' | 'materials' | 'subs' (plural) → mismatch → hidden codes
// ============================================================================
const CATEGORY_ORDER = ["labor", "material", "sub", "other"];
const CATEGORY_COLORS: Record<string, string> = {
  labor: "bg-blue-500/10 text-blue-700 border-blue-200",
  sub: "bg-orange-500/10 text-orange-700 border-orange-200",
  material: "bg-green-500/10 text-green-700 border-green-200",
  other: "bg-gray-500/10 text-gray-700 border-gray-200",
};

const RECENTLY_USED_KEY = "costcode_recently_used";
const MAX_RECENT = 5;

function getRecentlyUsed(): string[] {
  try {
    const stored = localStorage.getItem(RECENTLY_USED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addToRecentlyUsed(id: string) {
  const recent = getRecentlyUsed().filter((r) => r !== id);
  recent.unshift(id);
  localStorage.setItem(RECENTLY_USED_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export function CostCodeSelect({
  value,
  onChange,
  label,
  placeholder = "Select cost code",
  required = false,
  disabled = false,
  className,
  helperText,
  error,
  compact = false,
}: CostCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedRef = useRef<HTMLDivElement>(null);

  // Use shared React Query hook - cached across all instances
  const { data: codes = [], isLoading: loading } = useCostCodesForSelect();

  // Group codes by category - memoized
  const groupedCodes = useMemo(() => {
    const filtered = search
      ? codes.filter(
          (c) =>
            c.code.toLowerCase().includes(search.toLowerCase()) ||
            c.name?.toLowerCase().includes(search.toLowerCase())
        )
      : codes;

    const groups: Record<string, CostCode[]> = {};
    for (const code of filtered) {
      const cat = code.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(code);
    }
    
    // DEV DIAGNOSTIC: Ensure CATEGORY_ORDER matches actual DB categories
    if (import.meta.env.DEV && codes.length > 0) {
      const actualCategories = Object.keys(groups);
      const missingInOrder = actualCategories.filter(c => !CATEGORY_ORDER.includes(c) && c !== 'other');
      if (missingInOrder.length > 0) {
        console.warn('[CostCodeSelect] Categories in DB but missing from CATEGORY_ORDER:', missingInOrder);
        console.warn('[CostCodeSelect] CATEGORY_ORDER should be:', actualCategories);
      }
      // Log counts by category
      console.debug('[CostCodeSelect] Category counts:', Object.fromEntries(
        Object.entries(groups).map(([k, v]) => [k, v.length])
      ));
    }
    
    return groups;
  }, [codes, search]);

  // Recently used codes - stable reference
  const recentIds = useMemo(() => getRecentlyUsed(), []);
  const recentCodes = useMemo(
    () => recentIds.map((id) => codes.find((c) => c.id === id)).filter(Boolean) as CostCode[],
    [codes, recentIds]
  );

  const selectedCode = useMemo(
    () => codes.find((c) => c.id === value),
    [codes, value]
  );

  const handleSelect = useCallback((id: string) => {
    onChange(id);
    addToRecentlyUsed(id);
    setOpen(false);
    setSearch("");
  }, [onChange]);

  // Auto-scroll to selected item when dropdown opens
  useEffect(() => {
    if (open && selectedRef.current) {
      const timer = setTimeout(() => {
        selectedRef.current?.scrollIntoView({ block: "nearest" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const displayValue = selectedCode
    ? `${selectedCode.code}${selectedCode.name ? ` – ${selectedCode.name}` : ""}`
    : placeholder;

  const categoryLabel = (cat: string) => {
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <div className="flex items-center gap-1">
          <Label className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading}
            className={cn(
              "justify-between font-normal",
              !selectedCode && "text-muted-foreground",
              error && "border-destructive",
              compact && "h-8 text-xs px-2"
            )}
          >
            <span className="truncate flex-1 text-left">
              {loading ? "Loading..." : displayValue}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search cost codes..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>No cost code found.</CommandEmpty>

              {/* Recently Used */}
              {!search && recentCodes.length > 0 && (
                <>
                  <CommandGroup heading={
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Recently Used
                    </span>
                  }>
                    {recentCodes.map((code) => (
                      <CommandItem
                        key={`recent-${code.id}`}
                        value={code.id}
                        onSelect={() => handleSelect(code.id)}
                        className="flex items-center gap-2"
                      >
                        <Check
                          className={cn(
                            "h-4 w-4",
                            value === code.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0", CATEGORY_COLORS[code.category || "other"])}
                        >
                          {(code.category || "other").slice(0, 3).toUpperCase()}
                        </Badge>
                        <span className="font-mono text-xs">{code.code}</span>
                        {code.name && (
                          <span className="text-muted-foreground text-xs truncate">
                            {code.name}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {/* Grouped by Category */}
              {CATEGORY_ORDER.map((cat) => {
                const codesInCat = groupedCodes[cat];
                if (!codesInCat || codesInCat.length === 0) return null;

                return (
                  <CommandGroup key={cat} heading={categoryLabel(cat)}>
                    {codesInCat.map((code) => (
                      <CommandItem
                        key={code.id}
                        value={code.id}
                        onSelect={() => handleSelect(code.id)}
                        className="flex items-center gap-2"
                        ref={value === code.id ? selectedRef : undefined}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4",
                            value === code.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0", CATEGORY_COLORS[cat])}
                        >
                          {cat.slice(0, 3).toUpperCase()}
                        </Badge>
                        <span className="font-mono text-xs">{code.code}</span>
                        {code.name && (
                          <span className="text-muted-foreground text-xs truncate">
                            {code.name}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {error ? (
        <p className="text-xs text-destructive mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
      ) : null}
    </div>
  );
}
