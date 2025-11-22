import { Layout } from '@/components/Layout';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { ProjectOverviewOS } from '@/components/project/ProjectOverviewOS';
import { ProjectEstimatesV3 } from '@/components/project/ProjectEstimatesV3';
import { ProjectScheduleTabV2 } from '@/components/project/ProjectScheduleTabV2';
import { ProjectWorkforceTab } from '@/components/project/ProjectWorkforceTab';
import { ProjectFinancialsTab } from '@/components/project/ProjectFinancialsTab';
import { ProjectSubsTabV2 } from '@/components/project/ProjectSubsTabV2';
import { ProjectDocumentsTab } from '@/components/project/ProjectDocumentsTab';

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

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="estimates">Estimates</TabsTrigger>
            <TabsTrigger value="budget">Budget & Costs</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="workforce">Workforce</TabsTrigger>
            <TabsTrigger value="subs">Subs</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ProjectOverviewOS projectId={project.id} />
          </TabsContent>

          <TabsContent value="estimates">
            <ProjectEstimatesV3 projectId={project.id} />
          </TabsContent>

          <TabsContent value="budget">
            <ProjectFinancialsTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="schedule">
            <ProjectScheduleTabV2 projectId={project.id} />
          </TabsContent>

          <TabsContent value="workforce">
            <ProjectWorkforceTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="subs">
            <ProjectSubsTabV2 projectId={project.id} />
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
