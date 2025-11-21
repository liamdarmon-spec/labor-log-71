// Main project detail page with tabbed navigation
// Path: src/pages/ProjectDetail.tsx
// 
// KEY FEATURES:
// - 7 tabs: Overview, Estimates, Budget & Costs, Subs, Invoices, Tasks, Schedule
// - Snapshot cards showing total hours, cost, workers, last activity
// - Project status badge
// - Navigation back to projects list
// - Uses project_dashboard_view for aggregated data

import { Layout } from '@/components/Layout';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, DollarSign, User, Calendar } from 'lucide-react';

// ... See full file at src/pages/ProjectDetail.tsx
