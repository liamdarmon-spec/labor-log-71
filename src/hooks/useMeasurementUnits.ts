// src/hooks/useMeasurementUnits.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MeasurementUnit {
  id: string;
  code: string;
  label: string;
  category: string;
  sort_order: number;
}

const FALLBACK_UNITS: MeasurementUnit[] = [
  { id: "ea", code: "ea", label: "Each", category: "count", sort_order: 10 },
  { id: "hr", code: "hr", label: "Hour", category: "time", sort_order: 20 },
  { id: "day", code: "day", label: "Day", category: "time", sort_order: 30 },
  { id: "lf", code: "lf", label: "Linear Foot", category: "length", sort_order: 40 },
  { id: "sf", code: "sf", label: "Square Foot", category: "area", sort_order: 50 },
  { id: "ls", code: "ls", label: "Lump Sum", category: "other", sort_order: 90 },
];

export function useMeasurementUnits() {
  return useQuery({
    queryKey: ["measurement_units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("measurement_units")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Failed to load measurement units", error);
        // graceful fallback – do NOT break UI
        return FALLBACK_UNITS;
      }

      if (!data || data.length === 0) {
        return FALLBACK_UNITS;
      }

      return data as MeasurementUnit[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
