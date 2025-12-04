import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { ProjectShell } from '@/components/project/ProjectShell';
import { ProjectOverviewTab } from '@/components/project/ProjectOverviewTab';
import { ProjectEstimatesV3 } from '@/components/project/ProjectEstimatesV3';
import { ProjectProposalsTabV3 } from '@/components/project/ProjectProposalsTabV3';
import { ProjectScheduleTabV2 } from '@/components/project/ProjectScheduleTabV2';
import { ProjectBudgetTabV2 } from '@/components/project/ProjectBudgetTabV2';
import { ProjectBillingTab } from '@/components/project/ProjectBillingTab';
import { ProjectFinancialDashboard } from '@/components/project/ProjectFinancialDashboard';
import { ProjectFinancialsTab } from '@/components/project/ProjectFinancialsTab';
import { ProjectSubsTabV3 } from '@/components/project/ProjectSubsTabV3';
import { ProjectDocumentsTab } from '@/components/project/ProjectDocumentsTab';
import { ProjectLaborTab } from '@/components/project/ProjectLaborTab';
import { ProjectTasksTab } from '@/components/project/ProjectTasksTab';
import { ProjectChecklistsTab } from '@/components/checklists/ProjectChecklistsTab';

const VALID_TABS = [
  'overview', 'estimates', 'proposals', 'budget', 'billing', 
  'financials', 'dashboard', 'labor', 'tasks', 'checklists', 
  'schedule', 'subs', 'documents', 'photos', 'settings'
] as const;
type TabValue = typeof VALID_TABS[number];

interface Project {
  id: string;
  project_name: string;
  client_name: string;
  status: string;
  address: string | null;
  project_manager: string | null;
  company_id: string | null;
}

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Get active tab from URL, default to 'overview'
  const tabParam = searchParams.get('tab');
  const activeTab: TabValue = VALID_TABS.includes(tabParam as TabValue)
    ? (tabParam as TabValue)
    : 'overview';

  useEffect(() => {
    if (projectId) {
      fetchProjectData(projectId);
    }
  }, [projectId]);

  const fetchProjectData = async (projectId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name, client_name, status, address, project_manager, company_id')
        .eq('id', projectId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProject(data);
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Layout hideNav>
        <div className="flex min-h-screen">
          <div className="hidden lg:block w-[240px] border-r bg-sidebar-background">
            <Skeleton className="h-full" />
          </div>
          <div className="flex-1 p-6 space-y-6">
            <Button variant="ghost" onClick={() => navigate('/projects')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-32" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </Layout>
    );
  }

  // Not found state
  if (!project) {
    return (
      <Layout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate('/projects')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Project not found</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Render the appropriate tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ProjectOverviewTab projectId={project.id} />;
      case 'estimates':
        return <ProjectEstimatesV3 projectId={project.id} />;
      case 'proposals':
        return <ProjectProposalsTabV3 projectId={project.id} />;
      case 'budget':
        return <ProjectBudgetTabV2 projectId={project.id} />;
      case 'billing':
        return <ProjectBillingTab projectId={project.id} />;
      case 'financials':
        return <ProjectFinancialsTab projectId={project.id} />;
      case 'dashboard':
        return <ProjectFinancialDashboard projectId={project.id} />;
      case 'labor':
        return <ProjectLaborTab projectId={project.id} />;
      case 'tasks':
        return <ProjectTasksTab projectId={project.id} />;
      case 'checklists':
        return <ProjectChecklistsTab projectId={project.id} />;
      case 'schedule':
        return <ProjectScheduleTabV2 projectId={project.id} />;
      case 'subs':
        return <ProjectSubsTabV3 projectId={project.id} />;
      case 'documents':
        return <ProjectDocumentsTab projectId={project.id} />;
      case 'photos':
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Photos feature coming soon</p>
          </div>
        );
      case 'settings':
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Project settings coming soon</p>
          </div>
        );
      default:
        return <ProjectOverviewTab projectId={project.id} />;
    }
  };

  return (
    <Layout hideNav>
      <ProjectShell 
        project={project} 
        activeTab={activeTab}
        showSummaryBar={activeTab === 'overview'}
      >
        {renderTabContent()}
      </ProjectShell>
    </Layout>
  );
};

export default ProjectDetail;
