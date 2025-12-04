import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ArrowLeft, Menu } from 'lucide-react';
import { ProjectSidebar } from './ProjectSidebar';
import { ProjectSummaryBar } from './ProjectSummaryBar';
import { FinancialOSLink } from './FinancialOSLink';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  project_name: string;
  client_name: string;
  status: string;
  address: string | null;
  project_manager: string | null;
  company_id: string | null;
}

interface ProjectShellProps {
  project: Project;
  activeTab: string;
  showSummaryBar?: boolean;
  children: ReactNode;
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'bg-success/10 text-success border-success/20';
    case 'pending':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400';
    case 'completed':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'on hold':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function ProjectShell({ project, activeTab, showSummaryBar = false, children }: ProjectShellProps) {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close mobile nav on tab change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [activeTab]);

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <ProjectSidebar projectId={project.id} projectName={project.project_name} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <ProjectSidebar projectId={project.id} projectName={project.project_name} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Top bar with back button and project info */}
          <div className="flex flex-col gap-3">
            {/* Back + Mobile menu */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/projects')}
                className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Projects</span>
                <span className="sm:hidden">Back</span>
              </Button>

              {/* Mobile menu trigger */}
              <div className="lg:hidden ml-auto">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMobileNavOpen(true)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Project header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold truncate">
                  {project.project_name}
                </h1>
                <Badge className={cn('shrink-0', getStatusColor(project.status))}>
                  {project.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <FinancialOSLink projectId={project.id} />
              </div>
            </div>

            {/* Client info */}
            <div className="flex flex-col text-sm text-muted-foreground">
              <span className="font-medium">{project.client_name}</span>
              {project.address && <span>{project.address}</span>}
            </div>
          </div>

          {/* Summary Bar (only on overview tab) */}
          {showSummaryBar && (
            <ProjectSummaryBar projectId={project.id} />
          )}

          {/* Page content */}
          <div>{children}</div>
        </div>
      </main>
    </div>
  );
}
