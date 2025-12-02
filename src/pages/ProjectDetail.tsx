import { Layout } from '@/components/Layout';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectHeader } from '@/components/project/ProjectHeader';
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
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

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
        .select('*')
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

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate('/projects')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
          <Skeleton className="h-96" />
        </div>
      </Layout>
    );
  }

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

  return (
    <Layout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/projects')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>

        <ProjectHeader
          projectId={project.id}
          projectName={project.project_name}
          clientName={project.client_name}
          address={project.address}
          status={project.status}
          companyId={project.company_id}
        />

        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          {/* Mobile: Scrollable horizontal tabs */}
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-1">
            <TabsList className="inline-flex w-auto min-w-full lg:grid lg:w-full lg:grid-cols-12 h-auto">
              <TabsTrigger value="overview" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
                Overview
              </TabsTrigger>
              <TabsTrigger value="estimates" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
                Estimates
              </TabsTrigger>
              <TabsTrigger value="proposals" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
                Proposals
              </TabsTrigger>
              <TabsTrigger value="budget" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
                Budget
              </TabsTrigger>
              <TabsTrigger value="billing" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
                Billing
              </TabsTrigger>
              <TabsTrigger value="financials" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
                Financials
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="labor" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
                Labor
              </TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
                Tasks
              </TabsTrigger>
              <TabsTrigger value="schedule" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
                Schedule
              </TabsTrigger>
              <TabsTrigger value="subs" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
                Subs
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
                Documents
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <ProjectOverviewTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="estimates">
            <ProjectEstimatesV3 projectId={project.id} />
          </TabsContent>

          <TabsContent value="proposals">
            <ProjectProposalsTabV3 projectId={project.id} />
          </TabsContent>

          <TabsContent value="budget">
            <ProjectBudgetTabV2 projectId={project.id} />
          </TabsContent>

          <TabsContent value="billing">
            <ProjectBillingTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="financials">
            <ProjectFinancialsTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="dashboard">
            <ProjectFinancialDashboard projectId={project.id} />
          </TabsContent>

          <TabsContent value="labor">
            <ProjectLaborTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="tasks">
            <ProjectTasksTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="schedule">
            <ProjectScheduleTabV2 projectId={project.id} />
          </TabsContent>

          <TabsContent value="subs">
            <ProjectSubsTabV3 projectId={project.id} />
          </TabsContent>

          <TabsContent value="documents">
            <ProjectDocumentsTab projectId={project.id} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ProjectDetail;
