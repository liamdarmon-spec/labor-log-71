// Dialog for editing existing schedule entries
// Path: src/components/scheduling/EditScheduleDialog.tsx
// 
// KEY FEATURES:
// - Locks editing if time log exists for past/today dates
// - Shows warning with link to edit time log instead
// - Allows future schedule edits
// - Auto-syncs with daily_logs via triggers

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerWithPresets } from "@/components/ui/date-picker-with-presets";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isFuture, parseISO } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ExternalLink } from "lucide-react";

// ... See full file at src/components/scheduling/EditScheduleDialog.tsx
