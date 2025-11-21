// This dialog allows splitting a single schedule entry across multiple projects
// Path: src/components/dashboard/SplitScheduleDialog.tsx
// 
// KEY FEATURES:
// - Splits one schedule into multiple project entries
// - Creates linked time logs automatically via RPC function
// - Validates total hours match original
// - Supports trade selection per project
// - Calls split_schedule_for_multi_project() DB function

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ... See full file at src/components/dashboard/SplitScheduleDialog.tsx
