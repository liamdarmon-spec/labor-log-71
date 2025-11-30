import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
}

export function CostCodeSelect({
  value,
  onChange,
  label = "Cost Code",
  placeholder = "Select a cost code",
  required = true,
  disabled = false,
  className,
  helperText,
  error,
}: CostCodeSelectProps) {
  const [codes, setCodes] = useState<CostCode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchCodes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("cost_codes")
        .select("id, code, name, category")
        .order("code", { ascending: true });

      if (!isMounted) return;

      if (error) {
        console.error("Error loading cost codes", error);
        setCodes([]);
      } else {
        setCodes(data || []);
      }
      setLoading(false);
    };

    fetchCodes();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayLabel = (c: CostCode) => {
    const base = c.code || "N/A";
    const name = c.name ? ` – ${c.name}` : "";
    return `${base}${name}`;
  };

  const handleChange = (val: string) => {
    onChange(val);
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

      <Select
        value={value || undefined}
        onValueChange={handleChange}
        disabled={disabled || loading}
      >
        <SelectTrigger className={cn(error && "border-destructive")}>
          <SelectValue placeholder={loading ? "Loading cost codes…" : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {codes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {displayLabel(c)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error ? (
        <p className="text-xs text-destructive mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
      ) : null}
    </div>
  );
}
