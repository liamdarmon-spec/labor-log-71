// This is the monthly calendar view for scheduling
// Path: src/components/scheduling/MonthlyScheduleView.tsx
// 
// KEY FEATURES:
// - Monthly calendar grid showing scheduled shifts
// - Groups shifts by worker per day
// - Shows project chips with color coding
// - Supports edit, delete, and split operations
// - Responsive design for mobile and desktop
// - Tooltips for detailed shift information

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Split, Clock, User, Briefcase, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, startOfWeek, endOfWeek, isPast, isWeekend } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { EditScheduleDialog } from "./EditScheduleDialog";
import { ScheduleEditButton } from "./ScheduleEditButton";
import { ScheduleDeleteButton } from "./ScheduleDeleteButton";
import { SplitScheduleDialog } from "@/components/dashboard/SplitScheduleDialog";

// ... See full file at src/components/scheduling/MonthlyScheduleView.tsx
