import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  FileText,
  Wallet,
  DollarSign,
  Receipt,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Users,
  FolderOpen,
  Camera,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
  FileDiff,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'estimates', label: 'Estimates', icon: FileText },
  { id: 'proposals', label: 'Proposals', icon: Receipt },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'billing', label: 'Billing', icon: Receipt },
  { id: 'change-orders', label: 'Change Orders', icon: FileDiff },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'checklists', label: 'Checklists', icon: ClipboardList },
  { id: 'subs', label: 'Subs', icon: Users },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'labor', label: 'Labor Logs', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface ProjectSidebarProps {
  projectId: string;
  projectName?: string;
}

const STORAGE_KEY = 'project-sidebar-collapsed';

export function ProjectSidebar({ projectId, projectName }: ProjectSidebarProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const handleNavClick = (tabId: string) => {
    // Change Orders lives in project nav, but routes to canonical Change Orders page.
    // Canonical CO route: /change-orders?projectId=<id>
    if (tabId === 'change-orders') {
      navigate(`/change-orders?projectId=${projectId}`);
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabId);
    setSearchParams(next);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'sticky top-0 h-screen flex flex-col border-r border-border bg-sidebar-background transition-all duration-300 ease-in-out',
          collapsed ? 'w-[72px]' : 'w-[240px]'
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center h-14 px-3 border-b border-sidebar-border',
          collapsed ? 'justify-center' : 'justify-between'
        )}>
          {!collapsed && (
            <span className="font-semibold text-sm text-sidebar-foreground truncate pr-2">
              {projectName || 'Project'}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 shrink-0 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;

              const button = (
                <button
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );

              if (collapsed) {
                return (
                  <li key={item.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              }

              return <li key={item.id}>{button}</li>;
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className={cn(
          'p-3 border-t border-sidebar-border text-xs text-sidebar-foreground/50',
          collapsed && 'text-center'
        )}>
          {collapsed ? '•' : 'Project Hub'}
        </div>
      </aside>
    </TooltipProvider>
  );
}
